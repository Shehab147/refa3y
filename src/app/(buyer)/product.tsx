import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { Icon, PrimaryButton, StatusPill, palette, products } from '@/components/market-ui';
import { useAppStore } from '@/components/app-store';

export default function Product() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const product = products.find((item) => item.name === name) ?? products[0];
  const [quantity, setQuantity] = useState(1);
  const { addCartItem, savedProducts, toggleSavedProduct } = useAppStore();
  const saved=savedProducts.includes(product.name);
  const unitPrice = Number(product.price.match(/\d+/)?.[0] ?? 18);
  const unit = product.price.split('/')[1]?.trim() ?? 'item';
  return <DetailShell title="Product details" action={<Pressable accessibilityLabel={saved?'Remove from saved':'Save product'} onPress={() => toggleSavedProduct(product.name)}><Icon name={saved ? 'heart.fill' : 'heart'} color={palette.forest} /></Pressable>} footer={<PrimaryButton onPress={() => { addCartItem(product.name,unit,unitPrice,quantity); router.push('/(buyer)/sheets/cart'); }}>Add to basket · EGP {unitPrice * quantity}</PrimaryButton>}>
    <Image source={product.image} contentFit="cover" style={{ width: '100%', height: 300, borderRadius: 28 }} />
    <View className="mt-5 flex-row items-center justify-between gap-3"><StatusPill large>{product.tag}</StatusPill><View className="rounded-full bg-mint px-5 py-3"><Text className="font-sans text-sm font-bold text-forest">4.9 ★</Text></View></View><Text className="mt-3 font-sans text-[28px] font-bold text-ink">{product.name}</Text><Text className="mt-1 font-sans text-base font-bold text-forest">{product.price}</Text>
    <Text className="mt-5 font-sans text-sm leading-6 text-muted">Fresh, carefully selected produce grown without synthetic pesticides. Picked recently and packed at the farm.</Text>
    <View className="my-6 h-px bg-line"/><View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-full bg-mint"><Icon name="leaf.fill" color={palette.forest}/></View><View className="ml-3 flex-1"><Text className="font-sans text-base font-bold text-ink">{product.farm}</Text><Text className="mt-1 font-sans text-xs text-muted">Verified grower · Giza, 18 km away</Text></View></View>
    <View className="mt-6 rounded-3xl border border-line bg-white p-5"><Text className="font-sans text-base font-bold text-ink">Choose quantity</Text><View className="mt-4 flex-row items-center"><Pressable accessibilityLabel="Decrease quantity" onPress={() => setQuantity(Math.max(1, quantity - 1))} className="h-11 w-11 items-center justify-center rounded-full bg-mint"><Text className="text-xl text-forest">−</Text></Pressable><Text className="mx-6 font-sans text-lg font-bold text-ink">{quantity} {unit}</Text><Pressable accessibilityLabel="Increase quantity" onPress={() => setQuantity(quantity + 1)} className="h-11 w-11 items-center justify-center rounded-full bg-forest"><Text className="text-xl text-white">+</Text></Pressable><Text className="ml-auto font-sans text-lg font-bold text-ink">EGP {unitPrice * quantity}</Text></View></View>
  </DetailShell>;
}
