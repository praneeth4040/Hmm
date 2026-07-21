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

  getAuthUrl(userId?: string) {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state: userId || undefined,
      scope: [
        // ── Identity ────────────────────────────────────────────────────────
        // Fetch the user's email and basic profile on login.
        'openid',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',

        // ── YouTube Data API (Core) ──────────────────────────────────────────
        // force-ssl: Google's recommended write scope — covers channels.list,
        // videos.update, captions, ratings, comments. Supersedes youtube +
        // youtube.readonly so those are intentionally omitted.
        'https://www.googleapis.com/auth/youtube.force-ssl',

        // upload: explicitly required for videos.insert (resumable uploads).
        'https://www.googleapis.com/auth/youtube.upload',

        // download: allows downloading the user's own public YouTube videos.
        'https://www.googleapis.com/auth/youtube.download',

        // ── YouTube Channel Memberships ──────────────────────────────────────
        // List active channel members, their tier, and join date.
        'https://www.googleapis.com/auth/youtube.channel-memberships.creator',

        // ── YouTube Third-Party Linking ──────────────────────────────────────
        // Link the app to the user's YouTube channel and manage app info.
        'https://www.googleapis.com/auth/youtube.third-party-link.creator',

        // ── YouTube Partner (Content ID / Asset Management) ─────────────────
        // Manage assets, claims, policies, and associated partner content.
        'https://www.googleapis.com/auth/youtubepartner',

        // ── YouTube Analytics ────────────────────────────────────────────────
        // Standard analytics: views, watch time, traffic sources, demographics.
        'https://www.googleapis.com/auth/yt-analytics.readonly',

        // Monetary analytics: revenue, estimated earnings, ad performance.
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
      ],
    });
  }

  async handleGoogleCallback(code: string, state?: string) {
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

      let user;

      // Case 1: Linking a Brand Channel or Account to an active user session
      if (state) {
        const existingUser = await prisma.user.findUnique({
          where: { id: state },
        });

        if (!existingUser) {
          throw new BadRequestError('User session associated with Google login was not found');
        }

        user = existingUser;
      } else {
        // Case 2: Fresh Login/Registration
        // Block brand accounts from starting fresh signups
        if (profile.email.endsWith('@pages.plusgoogle.com')) {
          throw new BadRequestError(
            'Cannot authenticate directly using a YouTube Brand Account. Please sign in with your primary Google Account first, then connect your YouTube channel.'
          );
        }

        // Upsert primary user
        user = await prisma.user.upsert({
          where: { email: profile.email },
          update: { name: profile.name },
          create: {
            email: profile.email,
            name: profile.name,
          },
        });
      }

      // Upsert the Account connection under the resolved user
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
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
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

      // Issue/Refresh the JWT session token
      const sessionToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        user,
        token: sessionToken,
      };
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Google authentication failed: ${(error as Error).message}`);
    }
  }
}

export const authService = new AuthService();
