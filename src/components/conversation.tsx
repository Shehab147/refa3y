import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { Icon, palette } from '@/components/market-ui';
import { api, ApiError } from '@/lib/api';

type Message = { id: number; sender_user_id: number; body: string; created_at: string };

export function Conversation() {
  const { id, farmId, title } = useLocalSearchParams<{ id?: string; farmId?: string; title?: string }>();
  const { user } = useAppStore();
  const [conversationId, setConversationId] = useState(id && /^[1-9]\d*$/.test(id) ? id : undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id && /^[1-9]\d*$/.test(id));
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const validFarm = !!farmId && /^[1-9]\d*$/.test(farmId);

  const load = useCallback(async (currentId: string) => {
    const rows = await api<Message[]>('messages/list', { query: { conversation_id: currentId } });
    setMessages(rows);
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    void api<Message[]>('messages/list', { query: { conversation_id: conversationId } }).then((rows) => {
      if (active) setMessages(rows);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'Unable to load messages.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [conversationId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sendingRef.current || (!conversationId && !validFarm)) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const result = await api<{ conversation_id: number }>('messages/send', { method: 'POST', body: { body, ...(conversationId ? { conversation_id: Number(conversationId) } : { farm_id: Number(farmId) }) } });
      setDraft('');
      const currentId = String(result.conversation_id);
      if (!conversationId) {
        setConversationId(currentId);
      } else {
        try {
          await load(currentId);
        } catch {
          setError('Message sent, but messages could not be refreshed. Reopen this conversation to refresh.');
        }
      }
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : 'Unable to send the message.';
      setError(`${message} Check the conversation before retrying.`);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const canSend = !!conversationId || validFarm;
  const composer = canSend ? <View className="flex-row items-center rounded-[22px] border border-line bg-white px-4 py-2">
    <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void send()} returnKeyType="send" placeholder="Write a message" placeholderTextColor={palette.muted} className="min-h-12 flex-1 font-sans text-[15px] text-ink" />
    <Pressable accessibilityLabel="Send message" onPress={() => void send()} disabled={!draft.trim() || sending} className="h-11 w-11 items-center justify-center rounded-full bg-forest"><Icon name="arrow.up" color="#fff" size={20} /></Pressable>
  </View> : undefined;

  return <DetailShell title={title || 'Conversation'} footer={composer}>
    {!canSend ? <Text className="font-sans text-sm text-muted">Select a conversation from your inbox.</Text> : null}
    {loading ? <Text className="font-sans text-sm text-muted">Loading messages…</Text> : null}
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <View className="gap-3">{messages.map((message) => {
      const mine = Number(message.sender_user_id) === Number(user?.id);
      return <View key={message.id} className={`max-w-[84%] rounded-[22px] px-5 py-4 ${mine ? 'self-end bg-forest' : 'self-start bg-white'}`}><Text className={`font-sans text-[15px] leading-6 ${mine ? 'text-white' : 'text-ink'}`}>{message.body}</Text><Text className={`mt-1 font-sans text-xs ${mine ? 'text-white' : 'text-muted'}`}>{message.created_at}</Text></View>;
    })}</View>
  </DetailShell>;
}
