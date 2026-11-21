import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { ListRow, RoundButton, Screen, SectionTitle, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { type Order, orderStatusLabel } from '@/lib/orders';

type Appeal = { id: number; status: string };

export default function Dashboard() {
  const { farmProfile } = useAppStore();
  const load = useCallback(async () => {
    const [orders, appeals] = await Promise.all([api<Order[]>('orders/list'), api<Appeal[]>('appeals/list')]);
    return { orders, appeals };
  }, []);
  const { data, loading, error, refresh } = useFocusApi(load);
  return <Screen eyebrow="Vendor dashboard" title={farmProfile.farm || 'Your farm'} action={<RoundButton label="Inbox" icon="bell" onPress={() => router.push('/(vendor)/(tabs)/inbox')} />}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading dashboard…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : data ? <>
      <View className="rounded-3xl border border-line bg-white px-4">
        <ListRow onPress={() => router.push('/(vendor)/(tabs)/orders')} icon="shippingbox.fill" title={`${data.orders.filter((order) => order.status === 'new').length} new orders`} />
        <ListRow onPress={() => router.push('/(vendor)/appeals')} icon="exclamationmark.bubble" title={`${data.appeals.filter((appeal) => appeal.status === 'response_needed').length} appeals need a response`} />
        <ListRow onPress={() => router.push('/(vendor)/analytics')} icon="chart.bar.fill" title="Order overview" />
      </View>
      <SectionTitle title="Recent orders" link="See all" onPress={() => router.push('/(vendor)/(tabs)/orders')} />
      {!data.orders.length ? <Text className="font-sans text-sm text-muted">No orders yet.</Text> : <View className="rounded-3xl border border-line bg-white px-4">{data.orders.slice(0, 5).map((order) => <ListRow key={order.id} onPress={() => router.push({ pathname: '/(vendor)/order-detail', params: { id: String(order.id) } })} icon="person.crop.circle" title={order.order_number} subtitle={`${order.buyer_name_snapshot} · ${order.currency} ${order.total_amount}`} trailing={<StatusPill>{orderStatusLabel(order.status)}</StatusPill>} />)}</View>}
    </> : null}
  </Screen>;
}
