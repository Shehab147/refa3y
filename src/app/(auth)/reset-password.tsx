import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthShell, Field } from '@/components/auth-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

export default function ResetPassword() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = !!phone && code.length === 6 && password.length >= 8 && password === confirm;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api('auth/reset-password', { method: 'POST', authenticated: false, body: { phone, code, new_password: password } });
      router.replace('/(auth)/sign-in');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Choose a new password" subtitle="If an account exists for the phone number, a code has been requested.">
    <Field label="Verification code" placeholder="Six-digit code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
    <Field label="New password" placeholder="New password" secure value={password} onChangeText={setPassword} />
    <Field label="Confirm password" placeholder="Enter it again" secure value={confirm} onChangeText={setConfirm} />
    {!phone ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">Start again from the password reset screen.</Text> : null}
    {confirm && password !== confirm ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">Passwords do not match.</Text> : null}
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <PrimaryButton disabled={!valid || loading} onPress={() => void submit()}>{loading ? 'Updating…' : 'Update password'}</PrimaryButton>
  </AuthShell>;
}
