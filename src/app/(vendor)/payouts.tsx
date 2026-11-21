import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { PrimaryButton, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { orderStatusLabel } from '@/lib/orders';

type PayoutsData = {
  account: { bank_name: string; account_last_four: string } | null;
  payouts: { id: number; payout_number: string; currency: string; net_amount: string; status: string; scheduled_for: string | null; paid_at: string | null }[];
};

export default function Payouts() {
  const load = useCallback(() => api<PayoutsData>('payouts/list'), []);
  const { data, loading, error, refresh } = useFocusApi(load);
  return <DetailShell title="Payouts" footer={<PrimaryButton onPress={() => router.push('/(vendor)/payout-form')}>Update payout account</PrimaryButton>}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading payouts…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : data ? <>
      <Text className="mb-2 font-sans text-xs font-bold text-muted">PAYOUT ACCOUNT</Text><Text className="font-sans text-sm font-bold text-ink">{data.account ? `${data.account.bank_name} · ending in ${data.account.account_last_four}` : 'No payout account configured.'}</Text>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Payouts</Text>
      {!data.payouts.length ? <Text className="font-sans text-sm text-muted">No payouts found.</Text> : data.payouts.map((payout) => <View key={payout.id} className="mb-3 rounded-3xl border border-line bg-white p-5"><View className="flex-row justify-between"><Text className="font-sans text-sm font-bold text-ink">{payout.currency} {payout.net_amount}</Text><StatusPill>{orderStatusLabel(payout.status)}</StatusPill></View><Text className="mt-2 font-sans text-xs text-muted">{payout.payout_number}{payout.paid_at ? ` · Paid ${payout.paid_at}` : payout.scheduled_for ? ` · Scheduled ${payout.scheduled_for}` : ''}</Text></View>)}
    </> : null}
  </DetailShell>;
}
