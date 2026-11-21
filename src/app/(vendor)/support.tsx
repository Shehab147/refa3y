import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { ListRow } from '@/components/market-ui';

export default function VendorSupport() {
  return <DetailShell title="Vendor support"><Text className="mb-5 font-sans text-sm leading-6 text-muted">A support contact is not configured yet.</Text><View className="rounded-3xl border border-line bg-white px-4"><ListRow onPress={() => router.push('/(vendor)/documents')} icon="doc.text" title="Farm documents" /><ListRow onPress={() => router.push('/(vendor)/payouts')} icon="banknote" title="Payout details" /></View></DetailShell>;
}
