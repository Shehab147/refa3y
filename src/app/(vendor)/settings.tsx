import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

type FarmAddress = { governorate: string | null; area: string | null; address_text: string | null };

export default function Settings() {
  const { farmProfile, refresh } = useAppStore();
  const [farm, setFarm] = useState(farmProfile.farm);
  const [bio, setBio] = useState(farmProfile.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const save = async () => {
    if (farm.trim().length < 3 || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const current = await api<FarmAddress>('farm/get');
      await api('farm/update', { method: 'PATCH', body: { name: farm.trim(), public_description: bio.trim(), governorate: current.governorate, area: current.area, address_text: current.address_text } });
      await refresh();
      router.back();
    } catch (caught) {
      setError(`${caught instanceof ApiError ? caught.message : 'Unable to update the farm.'} Check your settings before retrying.`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return <DetailShell title="Farm settings" footer={<PrimaryButton onPress={() => void save()} disabled={farm.trim().length < 3 || saving}>{saving ? 'Saving…' : 'Save changes'}</PrimaryButton>}>
    <FormField label="Farm name" value={farm} onChangeText={setFarm} /><FormField label="Public description" value={bio} onChangeText={setBio} multiline />
    {error ? <Text className="font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </DetailShell>;
}
