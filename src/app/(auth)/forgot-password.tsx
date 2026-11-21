import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthShell, Field } from '@/components/auth-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function ForgotPassword() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = phone.replace(/\D/g, '').length >= 10;

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api('auth/forgot-password', { method: 'POST', authenticated: false, body: { phone } });
      router.push({ pathname: '/(auth)/reset-password', params: { phone } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to request a verification code.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Reset your password" subtitle="Enter your phone number to request a verification code.">
    <Field label="Phone number" placeholder="+20…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <PrimaryButton disabled={!valid || loading} onPress={() => void submit()}>{loading ? 'Sending…' : 'Send verification code'}</PrimaryButton>
  </AuthShell>;
}
