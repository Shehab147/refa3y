import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { ListRow, PrimaryButton } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api, ApiError } from '@/lib/api';
import { orderStatusLabel } from '@/lib/orders';

type TeamMember = { id: number; full_name: string; role: string; access_status: string };

export default function Team() {
  const load = useCallback(() => api<TeamMember[]>('team/list'), []);
  const { data: team, loading, error, refresh } = useFocusApi(load);
  const { refresh: refreshStore } = useAppStore();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const remove = async (id: number) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setActionError(null);
    try { await api('team/remove', { method: 'DELETE', body: { id } }); refresh(); await refreshStore(); }
    catch (caught) { setActionError(caught instanceof ApiError ? caught.message : 'Unable to remove access.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <DetailShell title="Team access" footer={<PrimaryButton onPress={() => router.push('/(vendor)/team-form')}>Invite team member</PrimaryButton>}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading team…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : !team?.length ? <Text className="font-sans text-sm text-muted">No team members found.</Text> : <View className="rounded-3xl border border-line bg-white px-4">{team.map((member) => <View key={member.id}><ListRow icon="person.crop.circle" title={member.full_name} subtitle={`${orderStatusLabel(member.role)} · ${orderStatusLabel(member.access_status)}`} />{member.role !== 'owner' ? <Pressable disabled={busy} onPress={() => void remove(member.id)} className="pb-3"><Text className="text-right font-sans text-xs font-bold text-[#A3483A]">Remove access</Text></Pressable> : null}</View>)}</View>}
    {actionError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{actionError}</Text> : null}
  </DetailShell>;
}
