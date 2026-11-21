import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { ListRow, RoundButton, Screen, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';
import { orderStatusLabel } from '@/lib/orders';

type Farm = { name: string; verification_status: string; governorate: string | null };

export default function FarmProfile() {
  const { farmProfile, locations, team, signOut } = useAppStore();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const load = useCallback(() => api<Farm>('farm/get'), []);
  const { data: farm, loading, error, refresh } = useFocusApi(load);
  const name = farm?.name ?? farmProfile.farm;
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <Screen eyebrow="Farm account" title={name || 'Your farm'} action={<RoundButton label="Farm settings" icon="gearshape" onPress={() => router.push('/(vendor)/settings')} />}>
    {loading ? <Text className="mb-4 font-sans text-sm text-muted">Loading farm…</Text> : error ? <Pressable onPress={refresh}><Text className="mb-4 font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : null}
    <View className="mb-6 rounded-3xl border border-line bg-white p-5"><View className="flex-row items-center"><View className="h-16 w-16 items-center justify-center rounded-2xl bg-mint"><Text className="font-sans text-lg font-bold text-forest">{initials}</Text></View><View className="ml-4 flex-1"><Text className="font-sans text-lg font-bold text-ink">{farmProfile.owner}</Text>{farm?.governorate ? <Text className="mt-1 font-sans text-sm text-muted">{farm.governorate}</Text> : null}</View>{farm ? <StatusPill>{orderStatusLabel(farm.verification_status)}</StatusPill> : null}</View></View>
    <View className="rounded-3xl border border-line bg-white px-4"><ListRow onPress={() => router.push('/(vendor)/documents')} icon="building.2" title="Farm profile and documents" /><ListRow onPress={() => router.push('/(vendor)/payouts')} icon="banknote" title="Payout details" /><ListRow onPress={() => router.push('/(vendor)/locations')} icon="mappin.and.ellipse" title="Pickup locations" subtitle={`${locations.length} locations`} /><ListRow onPress={() => router.push('/(vendor)/team')} icon="person.2" title="Team access" subtitle={`${team.length} members`} /><ListRow onPress={() => router.push('/(vendor)/appeals')} icon="arrow.uturn.left.circle" title="Returns and appeals" /><ListRow onPress={() => router.push('/(vendor)/support')} icon="questionmark.circle" title="Vendor support" /></View>
    {signOutError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{signOutError}</Text> : null}
    <Pressable onPress={() => { void signOut().then(() => router.replace('/(auth)')).catch(() => setSignOutError('Unable to sign out. Please try again.')); }} className="mt-7 items-center rounded-2xl bg-mint py-4"><Text className="font-sans text-sm font-bold text-forest">Sign out</Text></Pressable>
  </Screen>;
}
