import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function LocationForm() {
  const [label, setLabel] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const { refresh } = useAppStore();
  const save = async () => {
    if (!label.trim() || !details.trim() || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await api('farm/location/save', { method: 'POST', body: { label: label.trim(), address_text: details.trim() } });
      await refresh();
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to save the location.'} Check your locations before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <DetailShell title="Add pickup location" footer={<PrimaryButton onPress={() => void save()} disabled={!label.trim() || !details.trim() || saving}>{saving ? 'Saving…' : 'Save location'}</PrimaryButton>}>
    <FormField label="Location name" value={label} onChangeText={setLabel} placeholder="Farm gate, collection point…" /><FormField label="Address" value={details} onChangeText={setDetails} placeholder="Street, area, governorate" multiline />
    {error ? <Text className="font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </DetailShell>;
}
