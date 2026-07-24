import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../api/client';
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
  fileSizeBytes: string | null;
  status: VideoStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VideosResponse  { status: string; data: UserVideo[]; }
interface VideoResponse   { status: string; data: UserVideo; }

export interface PrepareResult {
  sessionId: string;
  title: string;
  author: string;
  source: VideoSource;
}

export function useVideos() {
  const { token } = useAuth();
  const [videos,     setVideos]     = useState<UserVideo[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [preparing,  setPreparing]  = useState(false);

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

  /**
   * Download a URL into a server-side edit session.
   * Returns session metadata — does NOT yet save anything.
   */
  const prepareVideo = useCallback(
    async (url: string): Promise<PrepareResult> => {
      if (!token) throw new Error('Not authenticated');
      setPreparing(true);
      try {
        const res = await apiPost<{ status: string; data: PrepareResult }>(
          '/api/v1/video/prepare',
          { url },
          token,
        );
        return res.data;
      } finally {
        setPreparing(false);
      }
    },
    [token],
  );

  /**
   * Save an edit session to HF + DB. Appends the new record to the list.
   */
  const saveVideo = useCallback(
    async (
      sessionId: string,
      trim?: { startSec: number; endSec: number },
    ): Promise<UserVideo> => {
      if (!token) throw new Error('Not authenticated');
      const res = await apiPost<VideoResponse>(
        `/api/v1/video/session/${sessionId}/save`,
        { trim },
        token,
      );
      setVideos((prev) => [res.data, ...prev]);
      return res.data;
    },
    [token],
  );

  /**
   * Discard an edit session without saving (user backed out).
   */
  const discardSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!token) return;
      await apiDelete(`/api/v1/video/session/${sessionId}`, token).catch(() => {/* best-effort */});
    },
    [token],
  );

  /**
   * Delete a saved video from HF + DB.
   */
  const deleteVideo = useCallback(
    async (videoId: string): Promise<void> => {
      if (!token) throw new Error('Not authenticated');
      await apiDelete(`/api/v1/video/${videoId}`, token);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    },
    [token],
  );

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return {
    videos, loading, error, preparing,
    refetch: fetchVideos,
    prepareVideo, saveVideo, discardSession, deleteVideo,
  };
}
