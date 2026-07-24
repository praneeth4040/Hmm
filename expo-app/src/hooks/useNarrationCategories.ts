import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface NarrationCategory {
  id: string;
  name: string;
  description: string;
  tone: string;
}

interface CategoriesResponse {
  status: string;
  data: NarrationCategory[];
}

export function useNarrationCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<NarrationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGet<CategoriesResponse>('/api/v1/narration/categories', token)
      .then((res) => setCategories(res.data))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, [token]);

  return { categories, loading, error };
}
