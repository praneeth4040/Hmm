import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface YouTubeChannel {
  id: string;
  accountId: string;
  accountEmail: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    viewCount?: string;
    subscriberCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

interface ChannelsResponse {
  status: string;
  results: number;
  data: { channels: YouTubeChannel[] };
}

export function useYouTubeChannels() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ChannelsResponse>('/api/v1/youtube/channels', token);
      setChannels(res.data.channels);
    } catch {
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return { channels, loading, error, refetch: fetchChannels };
}
