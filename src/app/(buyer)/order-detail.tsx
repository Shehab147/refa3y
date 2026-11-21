import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { StatusPill } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';
import { type OrderDetail, orderStatusLabel } from '@/lib/orders';

export default function BuyerOrderDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [result, setResult] = useState<{ id: string; order?: OrderDetail; error?: string } | null>(null);
  const validId = !!id && /^[1-9]\d*$/.test(id);
  const order = result && result.id === id ? result.order : undefined;
  const error = !validId ? 'Select an order from your orders list.' : result && result.id === id ? result.error : undefined;

  useEffect(() => {
    let active = true;
    if (!id || !/^[1-9]\d*$/.test(id)) {
      return () => { active = false; };
    }
    void api<OrderDetail>('orders/detail', { query: { id } }).then((result) => {
      if (active) setResult({ id, order: result });
    }).catch((caught: unknown) => {
      if (active) setResult({ id, error: caught instanceof ApiError ? caught.message : 'Unable to load this order.' });
    });
    return () => { active = false; };
  }, [id]);

  return <DetailShell title={order ? `Order ${order.order_number}` : 'Order details'}>
    {error ? <Text className="font-sans text-sm text-[#A3483A]">{error}</Text> : !order ? <Text className="font-sans text-sm text-muted">Loading order…</Text> : <>
      <View className="rounded-3xl border border-line bg-white p-5">
        <StatusPill>{orderStatusLabel(order.status)}</StatusPill>
        <Text className="mt-4 font-sans text-sm font-bold text-ink">Delivery address</Text>
        <Text className="mt-2 font-sans text-sm text-muted">{order.delivery_address_snapshot}</Text>
        {order.delivery_window_label ? <Text className="mt-2 font-sans text-sm text-muted">{order.delivery_window_label}</Text> : null}
      </View>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Items</Text>
      <View className="rounded-3xl border border-line bg-white p-5">
        {order.items.map((item) => <View key={item.id} className="flex-row py-2"><Text className="flex-1 font-sans text-sm text-ink">{item.product_name_snapshot} × {item.quantity} ({item.selling_unit_snapshot})</Text><Text className="font-sans text-sm text-ink">{order.currency} {item.line_total}</Text></View>)}
        <Text className="mt-4 font-sans text-base font-bold text-forest">Total: {order.currency} {order.total_amount}</Text>
      </View>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Order progress</Text>
      {order.history.map((entry, index) => <View key={`${entry.created_at}-${index}`} className="mb-4"><Text className="font-sans text-sm font-bold text-ink">{orderStatusLabel(entry.status)}</Text><Text className="mt-1 font-sans text-xs text-muted">{entry.created_at}{entry.note ? ` · ${entry.note}` : ''}</Text></View>)}
    </>}
  </DetailShell>;
}
