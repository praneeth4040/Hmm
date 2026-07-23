import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface ChannelVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration: string | null; // ISO 8601 e.g. PT4M13S
  privacyStatus: string;
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface ChannelVideosResponse {
  status: string;
  results: number;
  data: { videos: ChannelVideo[] };
}

/** Parses an ISO 8601 duration (e.g. PT4M13S) to a human-readable "4:13" */
export function parseDuration(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function useChannelVideos(channelId: string, maxResults = 20) {
  const { token } = useAuth();
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!token || !channelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ChannelVideosResponse>(
        `/api/v1/youtube/channels/${channelId}/videos?maxResults=${maxResults}`,
        token
      );
      setVideos(res.data.videos);
    } catch {
      setError('Failed to load channel videos');
    } finally {
      setLoading(false);
    }
  }, [token, channelId, maxResults]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}
