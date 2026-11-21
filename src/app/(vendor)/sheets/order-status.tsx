import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { PrimaryButton } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';
import { api, ApiError } from '@/lib/api';
import { nextVendorOrderStatus, orderStatusLabel } from '@/lib/orders';

export default function OrderStatus() {
  const { id, status } = useLocalSearchParams<{ id?: string; status?: string }>();
  const next = status ? nextVendorOrderStatus(status) : undefined;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const valid = !!id && /^[1-9]\d*$/.test(id) && !!next;

  const save = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await api('orders/status', { method: 'POST', body: { order_id: Number(id), status: next } });
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to update the order.'} Check the order status before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <SheetShell title="Update order status" subtitle="The customer will see the new status." footer={<PrimaryButton disabled={!valid || saving} onPress={() => void save()}>{saving ? 'Saving…' : 'Save status'}</PrimaryButton>}>
    <Text className="font-sans text-sm text-ink">{next ? `Change status to ${orderStatusLabel(next)}.` : 'Select an eligible order to update its status.'}</Text>
    {error ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </SheetShell>;
}
