import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { PrimaryButton, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api, ApiError } from '@/lib/api';
import { type OrderDetail, nextVendorOrderStatus, orderStatusLabel } from '@/lib/orders';

export default function VendorOrderDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const load = useCallback(() => {
    if (!id || !/^[1-9]\d*$/.test(id)) return Promise.reject(new ApiError('Select an order from your orders list.', 400));
    return api<OrderDetail>('orders/detail', { query: { id } });
  }, [id]);
  const { data: order, loading, error, refresh } = useFocusApi(load);
  const canAdvance = order && nextVendorOrderStatus(order.status);
  const canDecline = order && ['new', 'confirmed'].includes(order.status);
  return <DetailShell title={order ? `Order ${order.order_number}` : 'Order details'} footer={order && !loading && !error && (canAdvance || canDecline) ? <View className="flex-row gap-3">
    {canDecline ? <View className="flex-1"><PrimaryButton light onPress={() => router.push({ pathname: '/(vendor)/sheets/decline-order', params: { id: String(order.id) } })}>Decline</PrimaryButton></View> : null}
    {canAdvance ? <View className="flex-[2]"><PrimaryButton onPress={() => router.push({ pathname: '/(vendor)/sheets/order-status', params: { id: String(order.id), status: order.status } })}>Update status</PrimaryButton></View> : null}
  </View> : undefined}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading order…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : order ? <>
      <View className="rounded-3xl border border-line bg-white p-5"><StatusPill>{orderStatusLabel(order.status)}</StatusPill><Text className="mt-4 font-sans text-lg font-bold text-ink">{order.buyer_name_snapshot}</Text><Text className="mt-1 font-sans text-sm text-muted">{order.placed_at}</Text><Text className="mt-4 font-sans text-sm font-bold text-ink">Delivery address</Text><Text className="mt-2 font-sans text-sm text-muted">{order.delivery_address_snapshot}</Text>{order.delivery_window_label ? <Text className="mt-2 font-sans text-sm text-muted">{order.delivery_window_label}</Text> : null}</View>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Items to prepare</Text><View className="rounded-3xl border border-line bg-white p-5">{order.items.map((item) => <View key={item.id} className="flex-row py-2"><Text className="flex-1 font-sans text-sm text-ink">{item.product_name_snapshot} × {item.quantity} ({item.selling_unit_snapshot})</Text><Text className="font-sans text-sm text-ink">{order.currency} {item.line_total}</Text></View>)}<Text className="mt-4 font-sans text-base font-bold text-forest">Total: {order.currency} {order.total_amount}</Text></View>
      <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Order progress</Text>{order.history.map((entry, index) => <View key={`${entry.created_at}-${index}`} className="mb-4"><Text className="font-sans text-sm font-bold text-ink">{orderStatusLabel(entry.status)}</Text><Text className="mt-1 font-sans text-xs text-muted">{entry.created_at}{entry.note ? ` · ${entry.note}` : ''}</Text></View>)}
    </> : null}
  </DetailShell>;
}
