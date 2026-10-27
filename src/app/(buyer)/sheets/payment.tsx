import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppStore } from '@/components/app-store';
import { Icon, PrimaryButton, palette } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';

export default function PaymentMethod() {
  const { payments, setDefaultPayment } = useAppStore();
  const defaultPayment = payments.find((payment) => payment.isDefault);
  const [selectedId, setSelectedId] = useState(
    defaultPayment?.id ?? payments[0]?.id,
  );

  const savePayment = () => {
    if (selectedId === undefined) return;

    setDefaultPayment(selectedId);
    router.back();
  };

  return (
    <SheetShell
      title="Payment method"
      subtitle="Choose how you would like to pay for this order."
      footer={
        <PrimaryButton
          disabled={selectedId === undefined}
          onPress={savePayment}
        >
          Use this payment method
        </PrimaryButton>
      }
    >
      <View className="gap-3">
        {payments.map((payment) => {
          const selected = payment.id === selectedId;
          const isCash = payment.label.startsWith('Cash');

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={`flex-row items-center rounded-2xl border p-4 ${
                selected ? 'border-forest bg-mint' : 'border-line bg-white'
              }`}
              key={payment.id}
              onPress={() => setSelectedId(payment.id)}
            >
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Icon
                  name={isCash ? 'banknote' : 'creditcard'}
                  color={palette.forest}
                />
              </View>
              <View className="flex-1">
                <Text className="font-sans text-sm font-bold text-ink">
                  {payment.label}
                </Text>
                <Text className="mt-1 font-sans text-xs text-muted">
                  {payment.details}
                </Text>
              </View>
              {selected ? (
                <Icon name="checkmark.circle.fill" color={palette.forest} />
              ) : null}
            </Pressable>
          );
        })}

        {!payments.length ? (
          <View className="items-center rounded-3xl border border-line bg-white p-8">
            <Text className="font-sans text-base font-bold text-ink">
              No payment methods
            </Text>
            <Text className="mt-2 text-center font-sans text-sm text-muted">
              Add a payment method from your profile before checking out.
            </Text>
          </View>
        ) : null}
      </View>
    </SheetShell>
  );
}
