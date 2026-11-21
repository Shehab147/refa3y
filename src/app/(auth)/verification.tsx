import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { AuthShell, Field } from '@/components/auth-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function Verification() {
  const { user, refresh } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api('auth/verify-phone', { method: 'POST', body: { code } });
      await refresh();
      router.replace(user?.role === 'vendor' ? '/(vendor)/(tabs)' : '/(buyer)/(tabs)');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to verify your phone.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Check your phone" subtitle={user?.phone ? `Enter the verification code for ${user.phone}.` : 'Enter your phone verification code.'}>
    <Field label="Verification code" placeholder="000000" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <PrimaryButton disabled={code.length !== 6 || loading || !user} onPress={() => void verify()}>{loading ? 'Verifying…' : 'Verify account'}</PrimaryButton>
  </AuthShell>;
}
