import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { PrimaryButton, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { orderStatusLabel } from '@/lib/orders';

type Appeal = { id: number; appeal_number: string; order_id: number; status: string; reason_type: string; description: string; vendor_response: string | null; resolution_note: string | null };

export default function Appeals() {
  const load = useCallback(() => api<Appeal[]>('appeals/list'), []);
  const { data: appeals, loading, error, refresh } = useFocusApi(load);
  return <DetailShell title="Returns and appeals">
    {loading ? <Text className="font-sans text-sm text-muted">Loading appeals…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : !appeals?.length ? <Text className="font-sans text-sm text-muted">No appeals found.</Text> : appeals.map((appeal) => <View key={appeal.id} className="mb-4 rounded-3xl border border-line bg-white p-5">
      <View className="flex-row justify-between"><Text className="font-sans text-xs font-bold text-muted">{appeal.appeal_number}</Text><StatusPill tone={appeal.status === 'response_needed' ? 'gold' : 'green'}>{orderStatusLabel(appeal.status)}</StatusPill></View>
      <Text className="mt-3 font-sans text-lg font-bold text-ink">{orderStatusLabel(appeal.reason_type)}</Text><Text className="mt-2 font-sans text-sm text-muted">{appeal.description}</Text>
      {appeal.vendor_response ? <Text className="mt-4 font-sans text-sm text-ink">Your response: {appeal.vendor_response}</Text> : null}
      {appeal.resolution_note ? <Text className="mt-4 font-sans text-sm text-muted">Resolution: {appeal.resolution_note}</Text> : null}
      {appeal.status === 'response_needed' ? <View className="mt-4"><PrimaryButton onPress={() => router.push({ pathname: '/(vendor)/sheets/appeal-response', params: { id: String(appeal.id), number: appeal.appeal_number } })}>Respond</PrimaryButton></View> : null}
    </View>)}
  </DetailShell>;
}
