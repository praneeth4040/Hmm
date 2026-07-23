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

  private async getYouTubeClientForAccount(account: {
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
    scope: string | null;
  }) {
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

    // Persist refreshed tokens back to DB automatically
    oauth2Client.on('tokens', async (tokens) => {
      logger.info(`Refreshing Google OAuth token for account ID: ${account.id}`);
      const updateData: Record<string, unknown> = { accessToken: tokens.access_token };
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date)   updateData.expiresAt   = new Date(tokens.expiry_date);
      if (tokens.scope)         updateData.scope        = tokens.scope;
      await prisma.account.update({ where: { id: account.id }, data: updateData });
      logger.info('Google OAuth token updated successfully in the database.');
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  private async getYouTubeClient(userId: string) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!account) {
      throw new UnauthorizedError('Google account connection not found. Please log in with Google first.');
    }

    return this.getYouTubeClientForAccount(account);
  }

  async getChannels(userId: string) {
    // Fetch all connected Google accounts for this user
    const accounts = await prisma.account.findMany({
      where: { userId, provider: 'google' },
    });

    if (accounts.length === 0) {
      return [];
    }

    // Fetch YouTube channels from every connected Google account in parallel
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        const youtube = await this.getYouTubeClientForAccount(account);
        const response = await youtube.channels.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          mine: true,
        });
        // Tag each channel with the accountId so the client can reference it
        return (response.data.items || []).map((ch) => ({
          ...ch,
          accountId: account.id,
          accountEmail: account.email,
        }));
      })
    );

    // Flatten fulfilled results; log but skip failed accounts
    const channels: ReturnType<typeof Object.assign>[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        channels.push(...result.value);
      } else {
        logger.warn(`Failed to fetch channels for one account: ${(result.reason as Error).message}`);
      }
    }

    return channels;
  }

  async getChannelStats(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId, provider: 'google' },
    });

    if (accounts.length === 0) {
      throw new NotFoundError('No Google account connected.');
    }

    const allStats: object[] = [];

    for (const account of accounts) {
      try {
        const youtube = await this.getYouTubeClientForAccount(account);
        const response = await youtube.channels.list({
          part: ['snippet', 'statistics'],
          mine: true,
        });
        const items = response.data.items || [];
        for (const channel of items) {
          allStats.push({
            accountId: account.id,
            accountEmail: account.email,
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
          });
        }
      } catch (err) {
        logger.warn(`Skipping account ${account.id}: ${(err as Error).message}`);
      }
    }

    if (allStats.length === 0) {
      throw new NotFoundError('No YouTube channels found across connected accounts.');
    }

    return allStats;
  }

  async getChannelById(userId: string, channelId: string) {
    // Find the account that owns this channel
    const accounts = await prisma.account.findMany({
      where: { userId, provider: 'google' },
    });

    if (accounts.length === 0) {
      throw new UnauthorizedError('No Google account connected.');
    }

    // Try each account until we find the one that has this channel
    for (const account of accounts) {
      try {
        const youtube = await this.getYouTubeClientForAccount(account);
        const response = await youtube.channels.list({
          part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
          id: [channelId],
        });
        const channel = response.data.items?.[0];
        if (channel) {
          return { ...channel, accountId: account.id, accountEmail: account.email };
        }
      } catch {
        // Try next account
      }
    }

    throw new NotFoundError(`Channel ${channelId} not found in any connected account.`);
  }

  async getChannelVideos(userId: string, channelId: string, maxResults = 20) {
    // Find the account that owns this channel
    const accounts = await prisma.account.findMany({
      where: { userId, provider: 'google' },
    });

    for (const account of accounts) {
      try {
        const youtube = await this.getYouTubeClientForAccount(account);

        // First get the uploads playlist ID from contentDetails
        const channelRes = await youtube.channels.list({
          part: ['contentDetails'],
          id: [channelId],
        });

        const uploadsPlaylistId =
          channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) continue;

        // Fetch videos from the uploads playlist
        const playlistRes = await youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: uploadsPlaylistId,
          maxResults,
        });

        const items = playlistRes.data.items || [];
        if (items.length === 0) return [];

        // Fetch full video details (statistics, duration) in one batch call
        const videoIds = items
          .map((i) => i.contentDetails?.videoId)
          .filter(Boolean) as string[];

        const videosRes = await youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails', 'status'],
          id: videoIds,
        });

        return (videosRes.data.items || []).map((v) => ({
          id: v.id,
          title: v.snippet?.title,
          description: v.snippet?.description,
          publishedAt: v.snippet?.publishedAt,
          thumbnail:
            v.snippet?.thumbnails?.medium?.url ||
            v.snippet?.thumbnails?.default?.url,
          duration: v.contentDetails?.duration, // ISO 8601 e.g. PT4M13S
          privacyStatus: v.status?.privacyStatus,
          statistics: {
            viewCount: v.statistics?.viewCount,
            likeCount: v.statistics?.likeCount,
            commentCount: v.statistics?.commentCount,
          },
        }));
      } catch {
        // Try next account
      }
    }

    throw new NotFoundError(`Could not fetch videos for channel ${channelId}.`);
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
