import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { ListRow, PrimaryButton, StatusPill } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api, ApiError } from '@/lib/api';
import { orderStatusLabel } from '@/lib/orders';

type Document = { id: number; document_name: string; status: string; created_at: string };

export default function Documents() {
  const load = useCallback(() => api<Document[]>('documents/list'), []);
  const { data: documents, loading, error, refresh } = useFocusApi(load);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const remove = async (id: number) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setActionError(null);
    try { await api('documents/delete', { method: 'DELETE', body: { id } }); refresh(); }
    catch (caught) { setActionError(caught instanceof ApiError ? caught.message : 'Unable to remove the document.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <DetailShell title="Farm documents" footer={<PrimaryButton onPress={() => router.push('/(vendor)/document-form')}>Add document</PrimaryButton>}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading documents…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : !documents?.length ? <Text className="font-sans text-sm text-muted">No documents found.</Text> : <View className="rounded-3xl border border-line bg-white px-4">{documents.map((document) => <View key={document.id}><ListRow icon="doc.text" title={document.document_name} subtitle={document.created_at} trailing={<StatusPill tone={document.status === 'pending' ? 'gold' : 'green'}>{orderStatusLabel(document.status)}</StatusPill>} />{document.status === 'pending' ? <Pressable disabled={busy} onPress={() => void remove(document.id)} className="pb-3"><Text className="text-right font-sans text-xs font-bold text-[#A3483A]">Remove</Text></Pressable> : null}</View>)}</View>}
    {actionError ? <Text className="mt-4 font-sans text-sm text-[#A3483A]">{actionError}</Text> : null}
  </DetailShell>;
}
