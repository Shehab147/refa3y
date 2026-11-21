import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, PrimaryButton, RoundButton, Screen, Search, palette } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api } from '@/lib/api';

type Product = { id: number; name: string; price: string; selling_unit: string; stock_quantity: string; stock_unit: string; is_active: number };

export default function Products() {
  const [query, setQuery] = useState('');
  const load = useCallback(() => api<Product[]>('vendor/products'), []);
  const { data: products, loading, error, refresh } = useFocusApi(load);
  const visible = useMemo(() => (products ?? []).filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query, products]);
  return <Screen eyebrow="Your inventory" title="Products" action={<RoundButton label="Add product" icon="plus" dark onPress={() => router.push('/(vendor)/product-form')} />}>
    <Search value={query} onChangeText={setQuery} placeholder="Search your products" />
    <PrimaryButton onPress={() => router.push('/(vendor)/product-form')}>Add a new product</PrimaryButton>
    <View className="mt-6">{loading ? <Text className="font-sans text-sm text-muted">Loading products…</Text> : error ? <Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error} Tap to retry.</Text></Pressable> : visible.length === 0 ? <Text className="py-10 text-center font-sans text-sm text-muted">No products match your search.</Text> : visible.map((product) => <Pressable key={product.id} onPress={() => router.push({ pathname: '/(vendor)/product-form', params: { id: String(product.id) } })} className="mb-3 flex-row items-center rounded-3xl border border-line bg-white p-4">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-mint"><Icon name="leaf.fill" color={palette.leaf} /></View><View className="ml-3 flex-1"><Text className="font-sans text-[15px] font-bold text-ink">{product.name}</Text><Text className="mt-1 font-sans text-xs text-muted">EGP {product.price} {product.selling_unit} · {product.stock_quantity} {product.stock_unit}{Number(product.is_active) ? '' : ' · Archived'}</Text></View><Icon name="chevron.right" size={14} />
    </Pressable>)}</View>
  </Screen>;
}
