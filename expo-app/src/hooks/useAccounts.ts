import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export interface PersonaVoice {
  voiceShortName: string;
  /** Speed multiplier: 0.75 = slow, 1 = normal, 1.25 / 1.5 / 1.75 / 2 = fast */
  rate: number;
  /** Pitch offset in semitones (stored, not yet applied — edge-tts has no pitch control) */
  pitch: number;
}

export interface ConnectedAccount {
  id: string;
  provider: string;
  email: string;
  youtubeChannelId: string | null;
  /** Username injected into Reddit / X card templates */
  cardUsername: string | null;
  /** Avatar URL injected into Reddit / X card templates */
  cardAvatarUrl: string | null;
  /** Narration content type ID (from categories.json) */
  contentTypeId: string | null;
  /** Selected TTS voices with per-voice pitch / rate settings */
  voices: PersonaVoice[];
  createdAt: string;
}

interface AccountsResponse {
  status: string;
  results: number;
  data: { accounts: ConnectedAccount[] };
}

interface UpdatePersonaResponse {
  status: string;
  data: { account: Omit<ConnectedAccount, 'createdAt'> };
}

export function useAccounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<AccountsResponse>('/api/v1/auth/accounts', token);
      // Normalise voices — Prisma returns Json which may be null
      const normalised = res.data.accounts.map((a) => ({
        ...a,
        voices: (a.voices as unknown as PersonaVoice[] | null) ?? [],
      }));
      setAccounts(normalised);
    } catch {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const updatePersona = useCallback(
    async (
      accountId: string,
      patch: {
        cardUsername?: string;
        cardAvatarUrl?: string | null;
        contentTypeId?: string | null;
        voices?: PersonaVoice[];
      }
    ): Promise<ConnectedAccount> => {
      const res = await apiPatch<UpdatePersonaResponse>(
        `/api/v1/auth/accounts/${accountId}`,
        patch,
        token
      );
      const updated = res.data.account;
      const normalised: ConnectedAccount = {
        ...updated,
        voices: (updated.voices as unknown as PersonaVoice[] | null) ?? [],
        createdAt: '',
      };
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, ...normalised } : a))
      );
      return normalised;
    },
    [token]
  );

  return { accounts, loading, error, refetch: fetchAccounts, updatePersona };
}
