import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Icon, PrimaryButton, palette } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';

export default function OrderSuccess() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber?: string }>();
  const viewOrders = () => router.replace('/(buyer)/(tabs)/orders');

  return <SheetShell
    title={orderNumber ? 'Order placed' : 'Orders'}
    subtitle={orderNumber ? `Order ${orderNumber}` : 'View your orders for the latest status.'}
    onClose={viewOrders}
    footer={<PrimaryButton onPress={viewOrders}>View your orders</PrimaryButton>}
  >
    {orderNumber ? <View className="flex-1 items-center justify-center pb-8">
      <Icon name="checkmark.circle.fill" size={42} color={palette.forest} />
      <Text className="mt-5 text-center font-sans text-2xl font-bold text-ink">Your order was sent to the farm</Text>
      <Text className="mt-3 text-center font-sans text-sm leading-6 text-muted">The grower can now review your order. Follow its progress from the Orders tab.</Text>
    </View> : null}
  </SheetShell>;
}
