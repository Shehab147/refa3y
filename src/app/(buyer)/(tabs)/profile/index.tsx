import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListRow, RoundButton, Screen, StatusPill } from '@/components/market-ui';
import { useAppStore } from '@/components/app-store';

export default function Profile() {
  const { addresses, savedProducts, payments, buyerProfile, signOut } = useAppStore();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const initials = buyerProfile.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const leave = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError(null);
    try { await signOut(); router.replace('/(auth)'); }
    catch { setSignOutError('Unable to sign out. Please try again.'); }
    finally { setSigningOut(false); }
  };
  return <Screen eyebrow="Your space" title="Profile" action={<RoundButton label="Account settings" icon="gearshape" onPress={() => router.push('/(buyer)/settings')} />}>
    <View className="mb-6 flex-row items-center rounded-3xl border border-line bg-white p-5"><View className="h-16 w-16 items-center justify-center rounded-full bg-mint"><Text className="font-sans text-xl font-bold text-forest">{initials}</Text></View><View className="ml-4 flex-1"><Text className="font-sans text-xl font-bold text-ink">{buyerProfile.name}</Text><Text className="mt-1 font-sans text-xs text-muted">Buyer since 2024</Text></View><StatusPill>Verified</StatusPill></View>
    <View className="rounded-3xl border border-line bg-white px-4"><ListRow onPress={() => router.push('/(buyer)/addresses')} icon="mappin.and.ellipse" title="Saved addresses" subtitle={`${addresses.length} saved`} /><ListRow onPress={() => router.push('/(buyer)/saved')} icon="heart" title="Saved products" subtitle={`${savedProducts.length} saved`} /><ListRow onPress={() => router.push('/(buyer)/payments')} icon="creditcard" title="Payment methods" subtitle={`${payments.length} available`} /><ListRow onPress={() => router.push('/(buyer)/notifications')} icon="bell" title="Notifications" /><ListRow onPress={() => router.push('/(buyer)/support')} icon="questionmark.circle" title="Help and support" /></View>
    {signOutError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{signOutError}</Text> : null}
    <Pressable disabled={signingOut} onPress={() => void leave()} className="mt-7 items-center rounded-2xl bg-mint py-4"><Text className="font-sans text-sm font-bold text-forest">{signingOut ? 'Signing out…' : 'Sign out'}</Text></Pressable>
  </Screen>;
}
