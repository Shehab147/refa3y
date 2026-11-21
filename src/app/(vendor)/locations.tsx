import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { Icon, ListRow, PrimaryButton } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api, ApiError } from '@/lib/api';

type Location = { id: number; label: string; address_text: string; is_default: number };

export default function Locations() {
  const load = useCallback(() => api<Location[]>('farm/locations'), []);
  const { data: locations, loading, error, refresh } = useFocusApi(load);
  const { refresh: refreshStore } = useAppStore();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const change = async (id: number, remove: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setActionError(null);
    try { await api(remove ? 'farm/location/delete' : 'farm/location/default', { method: remove ? 'DELETE' : 'POST', body: { id } }); refresh(); await refreshStore(); }
    catch (caught) { setActionError(caught instanceof ApiError ? caught.message : 'Unable to update the location.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <DetailShell title="Pickup locations" footer={<PrimaryButton onPress={() => router.push('/(vendor)/location-form')}>Add pickup location</PrimaryButton>}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading locations…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : !locations?.length ? <Text className="font-sans text-sm text-muted">No locations found.</Text> : <View className="gap-3">{locations.map((item) => <View key={item.id} className={`rounded-3xl border bg-white px-4 ${Number(item.is_default) ? 'border-2 border-forest' : 'border-line'}`}><ListRow onPress={busy ? undefined : () => void change(item.id, false)} icon="mappin.and.ellipse" title={item.label} subtitle={item.address_text} trailing={Number(item.is_default) ? <Icon name="checkmark.circle.fill" color="#123C2E" /> : undefined} /><Pressable disabled={busy} onPress={() => void change(item.id, true)} className="pb-3"><Text className="text-right font-sans text-xs font-bold text-[#A3483A]">Remove</Text></Pressable></View>)}</View>}
    {actionError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{actionError}</Text> : null}
  </DetailShell>;
}
