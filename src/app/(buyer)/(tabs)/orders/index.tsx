import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen, StatusPill } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';
import { type Order, orderStatusLabel } from '@/lib/orders';

const pastStatuses = new Set(['delivered', 'cancelled', 'declined']);

export default function Orders() {
  const [tab, setTab] = useState<'Active' | 'Past'>('Active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void api<Order[]>('orders/list').then((result) => {
      if (active) setOrders(result);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load orders.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []));

  const visible = orders.filter((order) => pastStatuses.has(order.status) === (tab === 'Past'));
  return <Screen eyebrow="Your purchases" title="Orders">
    <View className="mb-6 flex-row rounded-2xl bg-[#E9ECEA] p-1">
      {(['Active', 'Past'] as const).map((item) => <Pressable key={item} onPress={() => setTab(item)} className={`flex-1 items-center rounded-xl py-3 ${tab === item ? 'bg-white' : ''}`}><Text className={`font-sans text-sm font-bold ${tab === item ? 'text-forest' : 'text-muted'}`}>{item}</Text></Pressable>)}
    </View>
    {loading ? <Text className="font-sans text-sm text-muted">Loading orders…</Text> : error ? <Text className="font-sans text-sm text-[#A3483A]">{error}</Text> : visible.length === 0 ? <Text className="font-sans text-sm text-muted">No {tab.toLowerCase()} orders.</Text> : visible.map((order) => <Pressable key={order.id} onPress={() => router.push({ pathname: '/(buyer)/order-detail', params: { id: String(order.id) } })} className="mb-4 rounded-3xl border border-line bg-white p-5">
      <View className="flex-row justify-between"><Text className="font-sans text-xs font-bold text-muted">{order.order_number}</Text><StatusPill>{orderStatusLabel(order.status)}</StatusPill></View>
      <Text className="mt-2 font-sans text-lg font-bold text-ink">{order.currency} {order.total_amount}</Text>
      <Text className="mt-2 font-sans text-xs text-muted">{order.delivery_window_label ?? order.placed_at}</Text>
    </Pressable>)}
  </Screen>;
}
