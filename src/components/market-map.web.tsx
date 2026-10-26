import { Linking, Pressable, Text, View } from 'react-native';

import { type MarketProduct } from '@/components/market-ui';

type MarketMapProps = {
  products: MarketProduct[];
  onSelectProduct: (product: MarketProduct) => void;
};

export function MarketMap({ products, onSelectProduct }: MarketMapProps) {
  if (!products.length) {
    return (
      <View className="h-72 items-center justify-center rounded-3xl border border-line bg-mint px-8">
        <Text className="font-sans text-base font-bold text-forest">No markets on the map</Text>
        <Text className="mt-2 text-center font-sans text-sm text-muted">Clear a filter to bring nearby growers back into view.</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-line bg-mint p-4">
      <Text className="mb-3 font-sans text-xs font-bold uppercase tracking-[1px] text-leaf">Nearby growers</Text>
      {products.map((product) => (
        <View key={product.name} className="mb-2 flex-row items-center rounded-2xl bg-white px-4 py-3 last:mb-0">
          <Pressable accessibilityRole="button" onPress={() => onSelectProduct(product)} className="mr-3 flex-1 flex-row items-center">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-forest">
              <Text className="font-sans text-xs font-bold text-white">{product.distance}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans text-sm font-bold text-ink">{product.farm}</Text>
              <Text className="mt-0.5 font-sans text-xs text-muted">{product.name} · {product.distance} km away</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${product.farm} in Google Maps`}
            onPress={() => {
              void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${product.location.latitude},${product.location.longitude}`);
            }}
            className="rounded-full bg-mint px-3 py-2"
          >
            <Text className="font-sans text-[11px] font-bold text-forest">Map</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
