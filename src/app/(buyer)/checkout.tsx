import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { Icon, ListRow, PrimaryButton } from '@/components/market-ui';
import { ApiError } from '@/lib/api';

export default function Checkout() {
  const { cart, addresses, payments, placeOrder } = useAppStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = cart.length ? subtotal + 43 : 0;
  const address = addresses.find((item) => item.isDefault);
  const payment = payments.find((item) => item.isDefault);
  const fees: readonly (readonly [string, number])[] = cart.length
    ? [['Subtotal', subtotal], ['Delivery', 35], ['Service fee', 8]]
    : [['Subtotal', 0]];

  return <DetailShell
    title="Checkout"
    footer={<PrimaryButton
      disabled={!cart.length || !address || !payment || submitting}
      onPress={() => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setError(null);
        void placeOrder().then((orderNumber) => {
          router.replace({ pathname: '/(buyer)/sheets/order-success', params: { orderNumber } });
        }).catch((caught: unknown) => {
          const message = caught instanceof ApiError ? caught.message : 'Unable to place the order.';
          setError(`${message} Check your orders before trying again.`);
        }).finally(() => { submittingRef.current = false; setSubmitting(false); });
      }}
    >{submitting ? 'Placing order…' : `Place order · EGP ${total}`}</PrimaryButton>}
  >
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    <View className="rounded-3xl border border-line bg-white px-4">
      <ListRow onPress={() => router.push('/(buyer)/addresses')} icon="mappin.and.ellipse" title={address ? `Deliver to ${address.label.toLowerCase()}` : 'Choose an address'} subtitle={address?.details} />
    </View>
    <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Your basket</Text>
    <View className="rounded-3xl border border-line bg-white p-5">
      {cart.length ? cart.map((item) => <View key={item.id} className="mb-3 flex-row">
        <Text className="flex-1 font-sans text-sm text-muted">{item.name} × {item.quantity}</Text>
        <Text className="font-sans text-sm text-ink">EGP {item.price * item.quantity}</Text>
      </View>) : <Text className="mb-3 font-sans text-sm text-muted">Your basket is empty. Add produce before checking out.</Text>}
      <View className="my-2 h-px bg-line" />
      {fees.map(([label, amount]) => <View key={label} className="mb-3 flex-row">
        <Text className="flex-1 font-sans text-sm text-muted">{label}</Text>
        <Text className="font-sans text-sm text-ink">EGP {amount}</Text>
      </View>)}
      <View className="flex-row"><Text className="flex-1 font-sans text-base font-bold text-ink">Total</Text><Text className="font-sans text-base font-bold text-forest">EGP {total}</Text></View>
    </View>
    <Text className="mb-3 mt-7 font-sans text-xl font-bold text-ink">Payment</Text>
    <View className="mb-6 rounded-3xl border-2 border-forest bg-mint px-4">
      <ListRow onPress={() => router.push('/(buyer)/sheets/payment')} icon={payment?.label.startsWith('Cash') ? 'banknote' : 'creditcard'} title={payment?.label ?? 'Choose payment'} subtitle={payment?.details} trailing={<Icon name="chevron.right" />} />
    </View>
  </DetailShell>;
}
