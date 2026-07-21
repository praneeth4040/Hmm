import fs from 'fs';
import { google } from 'googleapis';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../utils/custom-errors.js';
import { logger } from '../../utils/logger.js';

export class YouTubeService {
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  private async getYouTubeClient(userId: string) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!account) {
      throw new UnauthorizedError('Google account connection not found. Please log in with Google first.');
    }

    if (!account.refreshToken) {
      throw new UnauthorizedError('Offline access token missing. Please re-authenticate and grant offline permissions.');
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiresAt ? account.expiresAt.getTime() : undefined,
      scope: account.scope || undefined,
    });

    // Automatically update token in DB when refreshed by the client
    oauth2Client.on('tokens', async (tokens) => {
      logger.info(`Refreshing Google OAuth token for account ID: ${account.id}`);
      
      const updateData: Record<string, any> = {
        accessToken: tokens.access_token,
      };
      
      if (tokens.refresh_token) {
        updateData.refreshToken = tokens.refresh_token;
      }
      if (tokens.expiry_date) {
        updateData.expiresAt = new Date(tokens.expiry_date);
      }
      if (tokens.scope) {
        updateData.scope = tokens.scope;
      }

      await prisma.account.update({
        where: { id: account.id },
        data: updateData,
      });
      logger.info('Google OAuth token updated successfully in the database.');
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  async getChannels(userId: string) {
    const youtube = await this.getYouTubeClient(userId);
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true,
      });
      return response.data.items || [];
    } catch (error) {
      throw new BadRequestError(`Failed to fetch YouTube channels: ${(error as Error).message}`);
    }
  }

  async getChannelStats(userId: string) {
    const youtube = await this.getYouTubeClient(userId);
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });
      
      const channels = response.data.items || [];
      if (channels.length === 0) {
        throw new NotFoundError('No YouTube channel found for this account.');
      }
      
      return channels.map((channel) => ({
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        customUrl: channel.snippet?.customUrl,
        thumbnails: channel.snippet?.thumbnails,
        stats: {
          viewCount: channel.statistics?.viewCount,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount,
        },
      }));
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new BadRequestError(`Failed to fetch YouTube channel stats: ${(error as Error).message}`);
    }
  }

  async uploadVideo(
    userId: string,
    options: {
      title: string;
      description: string;
      filePath: string;
      privacyStatus?: 'public' | 'private' | 'unlisted';
    }
  ) {
    const youtube = await this.getYouTubeClient(userId);
    
    if (!fs.existsSync(options.filePath)) {
      throw new NotFoundError(`Video file not found at path: ${options.filePath}`);
    }

    try {
      logger.info(`Starting upload of ${options.filePath} to YouTube for user ${userId}`);
      
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: options.title,
            description: options.description,
          },
          status: {
            privacyStatus: options.privacyStatus || 'private',
          },
        },
        media: {
          body: fs.createReadStream(options.filePath),
        },
      });

      logger.info(`Successfully uploaded video. Video ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      throw new BadRequestError(`YouTube video upload failed: ${(error as Error).message}`);
    }
  }
}

export const youtubeService = new YouTubeService();
export default youtubeService;
