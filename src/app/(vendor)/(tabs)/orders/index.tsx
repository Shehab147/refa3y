import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { type Order, orderStatusLabel } from '@/lib/orders';

const tabs = ['All', 'New', 'In progress', 'Past'] as const;
const pastStatuses = new Set(['delivered', 'cancelled', 'declined']);

export default function VendorOrders() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const load = useCallback(() => api<Order[]>('orders/list'), []);
  const { data: orders, loading, error, refresh } = useFocusApi(load);
  const visible = (orders ?? []).filter((order) => tab === 'All' || (tab === 'New' ? order.status === 'new' : tab === 'Past' ? pastStatuses.has(order.status) : order.status !== 'new' && !pastStatuses.has(order.status)));
  return <Screen eyebrow="Farm operations" title="Orders">
    <View className="mb-6 flex-row rounded-2xl bg-[#E9ECEA] p-1">{tabs.map((item) => <Pressable onPress={() => setTab(item)} key={item} className={`flex-1 items-center rounded-xl py-3 ${tab === item ? 'bg-white' : ''}`}><Text className={`font-sans text-xs font-bold ${tab === item ? 'text-forest' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>
    {loading ? <Text className="font-sans text-sm text-muted">Loading orders…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : visible.length === 0 ? <Text className="font-sans text-sm text-muted">No orders found.</Text> : visible.map((order) => <Pressable key={order.id} onPress={() => router.push({ pathname: '/(vendor)/order-detail', params: { id: String(order.id) } })} className="mb-3 rounded-3xl border border-line bg-white p-5">
      <View className="flex-row justify-between"><Text className="font-sans text-xs font-bold text-muted">{order.order_number}</Text><StatusPill tone={order.status === 'new' ? 'gold' : 'green'}>{orderStatusLabel(order.status)}</StatusPill></View>
      <Text className="mt-2 font-sans text-lg font-bold text-ink">{order.buyer_name_snapshot}</Text><Text className="mt-1 font-sans text-sm text-muted">{order.currency} {order.total_amount} · {order.placed_at}</Text>
    </Pressable>)}
  </Screen>;
}
