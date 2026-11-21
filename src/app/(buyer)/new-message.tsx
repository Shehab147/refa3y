import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { Icon, palette } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

type Farm = { id: number; name: string };
type FarmPage = { items: Farm[]; pagination: { page: number; per_page: number } };

export default function NewMessage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = async (nextPage: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await api<FarmPage>('catalog/farms', { authenticated: false, query: { page: nextPage, per_page: 100 } });
      setFarms((current) => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(nextPage);
      setMore(result.items.length === result.pagination.per_page);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to load farms.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadingRef.current = true;
    void api<FarmPage>('catalog/farms', { authenticated: false, query: { page: 1, per_page: 100 } }).then((result) => {
      if (!active) return;
      setFarms(result.items);
      setPage(1);
      setMore(result.items.length === result.pagination.per_page);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load farms.');
    }).finally(() => {
      if (active) {
        loadingRef.current = false;
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return <DetailShell title="New message">
    <Text className="mb-4 font-sans text-sm text-muted">Choose a farm to start a conversation.</Text>
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <View className="rounded-3xl border border-line bg-white px-4">
      {farms.map((farm) => <Pressable key={farm.id} onPress={() => router.replace({ pathname: '/(buyer)/chat', params: { farmId: String(farm.id), title: farm.name } })} className="flex-row items-center border-b border-line py-4">
        <Text className="flex-1 font-sans text-sm font-bold text-ink">{farm.name}</Text><Icon name="chevron.right" color={palette.muted} />
      </Pressable>)}
      {!loading && !error && farms.length === 0 ? <Text className="py-4 font-sans text-sm text-muted">No farms available.</Text> : null}
    </View>
    {loading ? <Text className="mt-4 font-sans text-sm text-muted">Loading farms…</Text> : error || more ? <Pressable onPress={() => void load(page + 1)} className="mt-4 p-3"><Text className="text-center font-sans text-sm font-bold text-forest">{error ? 'Try again' : 'Load more'}</Text></Pressable> : null}
  </DetailShell>;
}
