import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useAppStore } from '@/components/app-store';
import { Icon, PrimaryButton, palette } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';

export default function OrderSuccess() {
  const { deliveryWindow, lastOrderItems } = useAppStore();
  const itemCount = lastOrderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const subtotal = lastOrderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = lastOrderItems.length ? subtotal + 43 : 0;
  const viewOrders = () => router.replace('/(buyer)/(tabs)/orders');

  return (
    <SheetShell
      title="Order confirmed"
      subtitle="Order #RF-2930"
      onClose={viewOrders}
      footer={<PrimaryButton onPress={viewOrders}>View your orders</PrimaryButton>}
    >
      <View className="flex-1 items-center justify-center pb-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-mint">
          <Icon name="checkmark.circle.fill" size={42} color={palette.forest} />
        </View>
        <Text className="mt-5 text-center font-sans text-2xl font-bold text-ink">
          Your order is on its way to the farm
        </Text>
        <Text className="mt-3 text-center font-sans text-sm leading-6 text-muted">
          The grower will confirm your order shortly. You can follow its progress
          from the Orders tab.
        </Text>

        <View className="mt-7 w-full rounded-3xl border border-line bg-white p-5">
          <View className="flex-row items-center">
            <Icon name="shippingbox.fill" color={palette.leaf} />
            <Text className="ml-3 flex-1 font-sans text-sm text-muted">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
            <Text className="font-sans text-base font-bold text-ink">
              EGP {total}
            </Text>
          </View>
          <View className="my-4 h-px bg-line" />
          <View className="flex-row items-center">
            <Icon name="clock.fill" color={palette.leaf} />
            <View className="ml-3 flex-1">
              <Text className="font-sans text-xs text-muted">Delivery window</Text>
              <Text className="mt-1 font-sans text-sm font-bold text-ink">
                {deliveryWindow}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SheetShell>
  );
}
