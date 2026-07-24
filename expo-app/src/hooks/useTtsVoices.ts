import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';

export interface TtsVoice {
  /** Edge-TTS short name, used as the voice identifier e.g. "en-US-AriaNeural" */
  ShortName: string;
  /** Human-friendly display name */
  FriendlyName: string;
  Gender: 'Male' | 'Female';
  Locale: string;
}

interface VoicesResponse {
  voices: TtsVoice[];
}

export function useTtsVoices() {
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<VoicesResponse>('/api/v1/tts/voices')
      .then((res) => setVoices(res.voices))
      .catch(() => setError('Failed to load voices'))
      .finally(() => setLoading(false));
  }, []);

  return { voices, loading, error };
}
