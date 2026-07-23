import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export type VideoSource = 'REDDIT' | 'YOUTUBE';
export type VideoStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface UserVideo {
  id: string;
  userId: string;
  source: VideoSource;
  url: string;
  postId: string;
  title: string | null;
  author: string | null;
  subreddit: string | null;
  hfBucketUri: string | null;
  fileSizeBytes: string | null; // serialized BigInt
  status: VideoStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VideosResponse {
  status: string;
  data: UserVideo[];
}

export function useVideos() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<VideosResponse>('/api/v1/video', token);
      setVideos(res.data);
    } catch {
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}
