import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ApiError } from '@/lib/api';

export function useFocusApi<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<{ revision: number; data: T } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void load().then((data) => {
      if (active) setResult({ revision, data });
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load data.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load, revision]));

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { data: result?.revision === revision ? result.data : null, loading, error, refresh };
}
