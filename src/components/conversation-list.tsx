import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RoundButton, Screen } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

type Conversation = { id: number; participant_name: string | null; last_message_at: string | null };

export function ConversationList({ role }: { role: 'buyer' | 'vendor' }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void api<Conversation[]>('conversations/list').then((rows) => {
      if (active) setConversations(rows);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load conversations.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []));

  return <Screen eyebrow={role === 'buyer' ? 'Stay connected' : 'Customer care'} title="Inbox" action={role === 'buyer' ? <RoundButton label="New message" icon="square.and.pencil" onPress={() => router.push('/(buyer)/new-message')} /> : undefined}>
    {loading ? <Text className="font-sans text-sm text-muted">Loading conversations…</Text> : error ? <Text className="font-sans text-sm text-[#A3483A]">{error}</Text> : conversations.length === 0 ? <Text className="font-sans text-sm text-muted">No conversations yet.</Text> : <View className="rounded-3xl border border-line bg-white px-4">
      {conversations.map((conversation) => <Pressable key={conversation.id} onPress={() => router.push({ pathname: role === 'buyer' ? '/(buyer)/chat' : '/(vendor)/chat', params: { id: String(conversation.id), title: conversation.participant_name ?? 'Conversation' } })} className="border-b border-line py-4">
        <Text className="font-sans text-[15px] font-bold text-ink">{conversation.participant_name ?? 'Conversation'}</Text>
        {conversation.last_message_at ? <Text className="mt-1 font-sans text-xs text-muted">{conversation.last_message_at}</Text> : null}
      </Pressable>)}
    </View>}
  </Screen>;
}
