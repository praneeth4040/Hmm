import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function useCurrentUser() {
  const { token } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    apiGet<{ status: string; data: { user: CurrentUser } }>('/api/v1/auth/me', token)
      .then((res) => setUser(res.data.user))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  return { user, loading, error };
}
