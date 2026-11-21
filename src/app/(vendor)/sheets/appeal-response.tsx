import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { PrimaryButton } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';
import { api, ApiError } from '@/lib/api';

export default function AppealResponse() {
  const { id, number } = useLocalSearchParams<{ id?: string; number?: string }>();
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const valid = !!id && /^[1-9]\d*$/.test(id) && !!response.trim();
  const submit = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await api('appeals/respond', { method: 'POST', body: { appeal_id: Number(id), vendor_response: response.trim() } });
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to submit your response.'} Check the appeal before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <SheetShell title="Respond to appeal" subtitle={number} footer={<PrimaryButton disabled={!valid || saving} onPress={() => void submit()}>{saving ? 'Submitting…' : 'Submit response'}</PrimaryButton>}>
    <TextInput value={response} onChangeText={setResponse} maxLength={5000} multiline textAlignVertical="top" className="h-32 rounded-2xl border border-line bg-cream p-4 font-sans text-sm text-ink" placeholder="Explain what happened" />
    {error ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </SheetShell>;
}
