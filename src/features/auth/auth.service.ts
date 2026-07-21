import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../utils/custom-errors.js';

export class AuthService {
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl() {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
      ],
    });
  }

  async handleGoogleCallback(code: string) {
    const oauth2Client = this.getOAuth2Client();
    
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Fetch user profile from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile.email) {
        throw new BadRequestError('Google profile did not contain an email address');
      }

      if (!profile.id) {
        throw new BadRequestError('Google profile did not contain a unique ID');
      }

      // 1. Upsert the User record
      const user = await prisma.user.upsert({
        where: { email: profile.email },
        update: { name: profile.name },
        create: {
          email: profile.email,
          name: profile.name,
        },
      });

      // 2. Upsert the Account connection
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: profile.id,
          },
        },
        update: {
          email: profile.email,
          accessToken: tokens.access_token,
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }), // Keep old if not provided
          expiresAt,
          scope: tokens.scope,
        },
        create: {
          userId: user.id,
          provider: 'google',
          providerAccountId: profile.id,
          email: profile.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope,
        },
      });

      // 3. Issue a JWT session token
      const sessionToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        user,
        token: sessionToken,
      };
    } catch (error) {
      throw new BadRequestError(`Google authentication failed: ${(error as Error).message}`);
    }
  }
}

export const authService = new AuthService();
