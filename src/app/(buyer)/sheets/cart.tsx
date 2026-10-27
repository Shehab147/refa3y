import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAppStore } from '@/components/app-store';
import { Icon, PrimaryButton, palette } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';

export default function Cart() {
  const {
    cart,
    cartNote,
    removeCartItem,
    setCartNote,
    updateCartQuantity,
  } = useAppStore();
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = () => {
    router.replace('/(buyer)/checkout');
  };

  return (
    <SheetShell
      title="Your basket"
      subtitle={
        itemCount
          ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready for checkout`
          : 'Add fresh produce from the market to get started.'
      }
      footer={
        <PrimaryButton disabled={!cart.length} onPress={checkout}>
          {cart.length ? `Checkout · EGP ${subtotal}` : 'Your basket is empty'}
        </PrimaryButton>
      }
    >
      <ScrollView
        contentContainerClassName="pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {cart.length ? (
          <>
            <View className="gap-3">
              {cart.map((item) => (
                <View
                  className="rounded-3xl border border-line bg-white p-4"
                  key={item.id}
                >
                  <View className="flex-row items-start">
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-mint">
                      <Icon name="leaf.fill" color={palette.forest} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans text-[15px] font-bold text-ink">
                        {item.name}
                      </Text>
                      <Text className="mt-1 font-sans text-xs text-muted">
                        EGP {item.price} / {item.unit}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Remove ${item.name} from basket`}
                      accessibilityRole="button"
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#EEF0EF]"
                      onPress={() => removeCartItem(item.id)}
                    >
                      <Icon name="trash" size={16} color={palette.muted} />
                    </Pressable>
                  </View>

                  <View className="mt-4 flex-row items-center">
                    <View className="flex-row items-center rounded-full bg-mint p-1">
                      <Pressable
                        accessibilityLabel={`Decrease ${item.name} quantity`}
                        accessibilityRole="button"
                        className="h-9 w-9 items-center justify-center rounded-full bg-white"
                        onPress={() =>
                          updateCartQuantity(item.id, item.quantity - 1)
                        }
                      >
                        <Text className="font-sans text-lg text-forest">−</Text>
                      </Pressable>
                      <Text className="min-w-12 text-center font-sans text-sm font-bold text-ink">
                        {item.quantity}
                      </Text>
                      <Pressable
                        accessibilityLabel={`Increase ${item.name} quantity`}
                        accessibilityRole="button"
                        className="h-9 w-9 items-center justify-center rounded-full bg-forest"
                        onPress={() =>
                          updateCartQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Text className="font-sans text-lg text-white">+</Text>
                      </Pressable>
                    </View>
                    <Text className="ml-auto font-sans text-base font-bold text-forest">
                      EGP {item.price * item.quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text className="mb-2 mt-6 font-sans text-sm font-bold text-ink">
              Note for the grower
            </Text>
            <TextInput
              className="min-h-24 rounded-2xl border border-line bg-white p-4 font-sans text-sm text-ink"
              multiline
              onChangeText={setCartNote}
              placeholder="Packing or delivery instructions"
              placeholderTextColor={palette.muted}
              textAlignVertical="top"
              value={cartNote}
            />

            <View className="mt-6 flex-row items-center rounded-2xl bg-mint p-4">
              <Text className="flex-1 font-sans text-base font-bold text-ink">
                Subtotal
              </Text>
              <Text className="font-sans text-lg font-bold text-forest">
                EGP {subtotal}
              </Text>
            </View>
            <Text className="mt-2 text-center font-sans text-xs text-muted">
              Delivery and service fees are calculated at checkout.
            </Text>
          </>
        ) : (
          <View className="items-center rounded-3xl border border-line bg-white px-6 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-mint">
              <Icon name="cart" size={26} color={palette.forest} />
            </View>
            <Text className="mt-4 font-sans text-lg font-bold text-ink">
              Your basket is empty
            </Text>
            <Text className="mt-2 text-center font-sans text-sm leading-5 text-muted">
              Close this basket and choose fresh produce from the market.
            </Text>
          </View>
        )}
      </ScrollView>
    </SheetShell>
  );
}
