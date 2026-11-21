import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { PrimaryButton } from '@/components/market-ui';

export default function Entry() {
  const { ready, loading, user, sessionError, needsVendorOnboarding, refresh, signOut } = useAppStore();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  if (!ready || (loading && !user)) return <View className="flex-1 items-center justify-center bg-cream"><Text className="font-sans text-sm text-muted">Restoring your session…</Text></View>;
  if (user) {
    if (user.role === 'vendor' && needsVendorOnboarding) return <Redirect href="/(auth)/vendor-onboarding" />;
    return <Redirect href={user.role === 'vendor' ? '/(vendor)/(tabs)' : '/(buyer)/(tabs)'} />;
  }
  if (sessionError) return <View className="flex-1 justify-center bg-cream px-6">
    <Text className="mb-3 font-sans text-2xl font-bold text-ink">Unable to restore your session</Text>
    <Text className="mb-5 font-sans text-sm text-muted">{sessionError}</Text>
    <PrimaryButton disabled={loading || signingOut} onPress={() => void refresh()}>{loading ? 'Trying again…' : 'Try again'}</PrimaryButton>
    <Pressable disabled={loading || signingOut} onPress={() => {
      setSigningOut(true); setSignOutError(null);
      void signOut().catch(() => setSignOutError('Unable to clear the saved session. Please try again.')).finally(() => setSigningOut(false));
    }} className="mt-5 items-center"><Text className="font-sans text-sm font-bold text-forest">Sign in instead</Text></Pressable>
    {signOutError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{signOutError}</Text> : null}
  </View>;
  return <Redirect href="/(auth)" />;
}
