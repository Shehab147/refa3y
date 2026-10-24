import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { Icon, ListRow, PrimaryButton } from '@/components/market-ui';

export default function Checkout() {
  const { cart, addresses, payments, deliveryWindow, placeOrder } = useAppStore();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = cart.length ? subtotal + 43 : 0;
  const address = addresses.find((item) => item.isDefault);
  const payment = payments.find((item) => item.isDefault);
  const fees: ReadonlyArray<readonly [string, number]> = cart.length
    ? [['Subtotal', subtotal], ['Delivery', 35], ['Service fee', 8]]
    : [['Subtotal', 0]];

  return <DetailShell
    title="Checkout"
    footer={<PrimaryButton
      disabled={!cart.length || !address || !payment}
      onPress={() => { placeOrder(); router.replace('/(buyer)/sheets/order-success'); }}
    >Place order · EGP {total}</PrimaryButton>}
  >
    <View className="rounded-3xl border border-line bg-white px-4">
      <ListRow onPress={() => router.push('/(buyer)/addresses')} icon="mappin.and.ellipse" title={address ? `Deliver to ${address.label.toLowerCase()}` : 'Choose an address'} subtitle={address?.details} />
      <ListRow onPress={() => router.push('/(buyer)/sheets/delivery')} icon="clock" title="Delivery window" subtitle={deliveryWindow} />
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
