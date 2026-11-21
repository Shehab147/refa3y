import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { PrimaryButton } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';
import { api, ApiError } from '@/lib/api';

export default function DeclineOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const valid = !!id && /^[1-9]\d*$/.test(id) && !!reason.trim();
  const save = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await api('orders/status', { method: 'POST', body: { order_id: Number(id), status: 'declined', decline_reason: reason.trim() } });
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to decline the order.'} Check the order status before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <SheetShell title="Decline this order?" subtitle="Provide a reason for declining the order." footer={<PrimaryButton disabled={!valid || saving} onPress={() => void save()}>{saving ? 'Submitting…' : 'Decline order'}</PrimaryButton>}>
    <TextInput value={reason} onChangeText={setReason} maxLength={255} multiline placeholder="Reason for declining" className="min-h-28 rounded-2xl border border-line bg-cream p-4 font-sans text-sm text-ink" />
    {error ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </SheetShell>;
}
