import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { ListRow } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { type Order, orderStatusLabel } from '@/lib/orders';

export default function Analytics() {
  const load = useCallback(() => api<Order[]>('orders/list'), []);
  const { data: orders, loading, error, refresh } = useFocusApi(load);
  const counts = (orders ?? []).reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, {});
  return <DetailShell title="Order overview">
    {loading ? <Text className="font-sans text-sm text-muted">Loading orders…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : <>
      <View className="rounded-3xl bg-forest p-5"><Text className="font-sans text-sm text-white">Total orders</Text><Text className="mt-2 font-sans text-[32px] font-bold text-white">{orders?.length ?? 0}</Text></View>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Orders by status</Text>
      <View className="rounded-3xl border border-line bg-white px-4">{Object.entries(counts).map(([status, count]) => <ListRow key={status} icon="shippingbox.fill" title={orderStatusLabel(status)} subtitle={`${count} ${count === 1 ? 'order' : 'orders'}`} />)}{!Object.keys(counts).length ? <Text className="py-4 font-sans text-sm text-muted">No orders found.</Text> : null}</View>
    </>}
  </DetailShell>;
}
