import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function PaymentForm() {
  const { refresh } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await api('payments/create', { method: 'POST', body: { method_type: 'cash_on_delivery' } });
      await refresh();
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to add the payment method.');
    } finally {
      setSaving(false);
    }
  };

  return <DetailShell title="Add payment method" footer={<PrimaryButton onPress={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Add cash on delivery'}</PrimaryButton>}>
    <Text className="font-sans text-sm leading-6 text-muted">Cash on delivery is the available payment method. Card payments are not currently supported.</Text>
    {error ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </DetailShell>;
}
