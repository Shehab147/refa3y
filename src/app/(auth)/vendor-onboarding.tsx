import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthShell, Field } from '@/components/auth-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function VendorOnboarding() {
  const [farm, setFarm] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [produce, setProduce] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = !!farm.trim() && !!governorate.trim() && !!produce.trim();

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api('farm/onboard', { method: 'POST', body: { name: farm.trim(), governorate: governorate.trim(), grower_types: produce.trim() } });
      router.push('/(auth)/verification');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to submit your farm.');
    } finally {
      setLoading(false);
    }
  };
  return <AuthShell title="Tell us about your farm" subtitle="This information helps buyers know who grows their food.">
    <Field label="Farm or business name" placeholder="Farm name" value={farm} onChangeText={setFarm} />
    <Field label="Governorate" placeholder="Governorate" value={governorate} onChangeText={setGovernorate} />
    <Field label="What do you grow?" placeholder="Vegetables, fruit, dairy…" value={produce} onChangeText={setProduce} />
    <Text className="mb-4 font-sans text-sm text-muted">Your farm will require verification before appearing in the marketplace.</Text>
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <PrimaryButton disabled={!valid || loading} onPress={() => void submit()}>{loading ? 'Submitting…' : 'Submit and continue'}</PrimaryButton>
  </AuthShell>;
}
