import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function PayoutForm() {
  const [bank, setBank] = useState('');
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const valid = !!bank.trim() && /^[A-Za-z0-9]{8,34}$/.test(account.replace(/\s/g, ''));
  const save = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await api('payouts/account/save', { method: 'POST', body: { bank_name: bank.trim(), account_holder_name: holder.trim() || null, account_number: account.replace(/\s/g, '') } });
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to save the payout account.'} Check the account before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <DetailShell title="Payout account" footer={<PrimaryButton onPress={() => void save()} disabled={!valid || saving}>{saving ? 'Saving…' : 'Save payout account'}</PrimaryButton>}>
    <FormField label="Bank name" value={bank} onChangeText={setBank} /><FormField label="Account holder name (optional)" value={holder} onChangeText={setHolder} /><FormField label="Account number" value={account} onChangeText={setAccount} />
    <Text className="font-sans text-xs text-muted">Enter 8–34 letters or digits.</Text>{error ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </DetailShell>;
}
