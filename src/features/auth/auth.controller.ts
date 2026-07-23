import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';

export const redirectToGoogle = (req: Request, res: Response): void => {
  let userId: string | undefined;

  const token = req.query.token as string | undefined;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      // Invalid/expired token — treat as a fresh unauthenticated login
    }
  }

  // Accept a custom redirectUri from the client (used by Expo Go / mobile)
  const redirectUri = req.query.redirectUri as string | undefined;

  const url = authService.getAuthUrl(userId, redirectUri);
  res.redirect(url);
};

export const handleGoogleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, state } = req.query as { code: string; state?: string };
    const result = await authService.handleGoogleCallback(code, state);

    // Decode the app's redirect URI from state
    let appRedirectUri = 'expoapp://auth/callback';
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
        if (parsed.redirectUri) appRedirectUri = parsed.redirectUri;
      } catch {
        // legacy plain userId state — use default
      }
    }

    const deepLinkUrl = `${appRedirectUri}?token=${result.token}`;

    // Serve an HTML page that redirects to the deep link.
    // This is necessary because browsers block direct redirects to custom/exp:// schemes.
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signing you in...</title>
          <meta http-equiv="refresh" content="0;url=${deepLinkUrl}" />
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center;
                   align-items: center; height: 100vh; margin: 0; background: #f0f4ff; }
            .box { text-align: center; padding: 2rem; }
            a { color: #4285F4; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="box">
            <p>Redirecting you back to the app...</p>
            <a href="${deepLinkUrl}">Tap here if not redirected</a>
          </div>
          <script>window.location.href = "${deepLinkUrl}";</script>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

