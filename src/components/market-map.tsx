import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { palette, type MarketProduct } from '@/components/market-ui';

type MarketMapProps = {
  products: MarketProduct[];
  onSelectProduct: (product: MarketProduct) => void;
};

const cairoRegion = {
  latitude: 30.0444,
  longitude: 31.2357,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export function MarketMap({ products, onSelectProduct }: MarketMapProps) {
  const mapRef = useRef<MapView>(null);
  const isExpoGoOnIOS = Platform.OS === 'ios' && Constants.expoGoConfig !== null;

  useEffect(() => {
    if (!products.length) return;

    if (products.length === 1) {
      mapRef.current?.animateToRegion(
        {
          ...products[0].location,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        350,
      );
      return;
    }

    mapRef.current?.fitToCoordinates(
      products.map((product) => product.location),
      {
        animated: true,
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      },
    );
  }, [products]);

  if (!products.length) {
    return (
      <View className="h-72 items-center justify-center rounded-3xl border border-line bg-mint px-8">
        <Text className="font-sans text-base font-bold text-forest">No markets on the map</Text>
        <Text className="mt-2 text-center font-sans text-sm text-muted">Clear a filter to bring nearby growers back into view.</Text>
      </View>
    );
  }

  return (
    <View className="h-72 overflow-hidden rounded-3xl border border-line bg-mint">
      <MapView
        ref={mapRef}
        provider={isExpoGoOnIOS ? undefined : PROVIDER_GOOGLE}
        initialRegion={cairoRegion}
        mapPadding={{ top: 12, right: 12, bottom: 12, left: 12 }}
        rotateEnabled={false}
        scrollEnabled={false}
        toolbarEnabled={false}
        style={{ flex: 1 }}
      >
        {products.map((product) => (
          <Marker
            key={product.name}
            coordinate={product.location}
            pinColor={palette.forest}
            title={product.farm}
            description={`${product.name} · ${product.distance} km away`}
          >
            <Callout onPress={() => onSelectProduct(product)}>
              <View className="w-48 py-1">
                <Text className="font-sans text-sm font-bold text-ink">{product.farm}</Text>
                <Text className="mt-1 font-sans text-xs text-muted">{product.name}</Text>
                <Text className="mt-2 font-sans text-xs font-bold text-forest">{product.price} · View produce</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
