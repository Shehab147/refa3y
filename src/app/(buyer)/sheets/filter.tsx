import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAppStore } from '@/components/app-store';
import { Icon, PrimaryButton, palette } from '@/components/market-ui';
import { SheetShell } from '@/components/sheet-ui';

const distances = ['Any distance', 'Under 10 km', 'Under 25 km'];
const farmingMethods = ['Organic certified', 'No synthetic pesticides'];

export default function MarketFilters() {
  const { marketDistance, marketMethods, setMarketFilters } = useAppStore();
  const [distance, setDistance] = useState(marketDistance);
  const [methods, setMethods] = useState(marketMethods);

  const toggleMethod = (method: string) => {
    setMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  const clearFilters = () => {
    setDistance('Any distance');
    setMethods([]);
  };

  const applyFilters = () => {
    setMarketFilters(distance, methods);
    router.back();
  };

  return (
    <SheetShell
      title="Filter produce"
      subtitle="Narrow the market by distance and farming method."
      footer={<PrimaryButton onPress={applyFilters}>Apply filters</PrimaryButton>}
    >
      <ScrollView
        contentContainerClassName="pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 flex-row items-center justify-between">
          <Text className="font-sans text-base font-bold text-ink">Distance</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={clearFilters}
            className="rounded-full bg-mint px-4 py-2"
          >
            <Text className="font-sans text-xs font-bold text-forest">Clear all</Text>
          </Pressable>
        </View>

        <View className="mb-8 gap-3">
          {distances.map((option) => {
            const selected = distance === option;

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option}
                onPress={() => setDistance(option)}
                className={`flex-row items-center rounded-2xl border p-4 ${
                  selected ? 'border-forest bg-mint' : 'border-line bg-white'
                }`}
              >
                <Text className="flex-1 font-sans text-sm font-bold text-ink">
                  {option}
                </Text>
                {selected ? (
                  <Icon name="checkmark.circle.fill" color={palette.forest} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-3 font-sans text-base font-bold text-ink">
          Farming method
        </Text>
        <Text className="mb-4 font-sans text-sm leading-5 text-muted">
          Select any methods you prefer. Leave all unselected to show every method.
        </Text>
        <View className="gap-3">
          {farmingMethods.map((method) => {
            const selected = methods.includes(method);

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={method}
                onPress={() => toggleMethod(method)}
                className={`flex-row items-center rounded-2xl border p-4 ${
                  selected ? 'border-forest bg-mint' : 'border-line bg-white'
                }`}
              >
                <Text className="flex-1 font-sans text-sm font-bold text-ink">
                  {method}
                </Text>
                <Icon
                  name={selected ? 'checkmark.square.fill' : 'square'}
                  color={selected ? palette.forest : palette.muted}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SheetShell>
  );
}
