import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ProductCard, RoundButton, Screen, Search, products } from '@/components/market-ui';
import { useAppStore } from '@/components/app-store';
import { MarketMap } from '@/components/market-map';

const categories = ['All produce', 'Vegetables', 'Fruit', 'Herbs', 'Dairy', 'Pantry'];
export default function Market() {
  const params=useLocalSearchParams<{category?:string;query?:string}>();
  const category = categories.find((item) => item === params.category) ?? 'All produce';
  const [query, setQuery] = useState(params.query??'');
  const {marketDistance,marketMethods,savedProducts,toggleSavedProduct}=useAppStore();
  const visible = useMemo(() => products.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (category==='All produce'||item.category===category) && (marketDistance==='Any distance'||item.distance<=(marketDistance==='Under 10 km'?10:25)) && (!marketMethods.length||marketMethods.includes(item.method))), [query,category,marketDistance,marketMethods]);
  return <Screen eyebrow="Grown with care" title="The market" action={<RoundButton label="Basket" icon="cart" dark onPress={() => router.push('/(buyer)/sheets/cart')} />}>
    <Search value={query} onChangeText={setQuery} onFilter={() => router.push('/(buyer)/sheets/filter')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">{categories.map((item) => <Pressable key={item} onPress={() => router.setParams({ category: item })} className={`mr-2 rounded-full px-4 py-2 ${category === item ? 'bg-forest' : 'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${category === item ? 'text-white' : 'text-muted'}`}>{item}</Text></Pressable>)}</ScrollView>
    <View className="mb-6">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="font-sans text-xl font-bold tracking-[-0.4px] text-ink">Markets near you</Text>
          <Text className="mt-1 font-sans text-xs text-muted">Tap a marker to see what is fresh there</Text>
        </View>
        <View className="rounded-full bg-mint px-3 py-1.5">
          <Text className="font-sans text-[11px] font-bold text-forest">{visible.length} locations</Text>
        </View>
      </View>
      <MarketMap products={visible} onSelectProduct={(product) => router.push({ pathname: '/(buyer)/product', params: { name: product.name } })} />
    </View>
    <Text className="mb-4 font-sans text-sm text-muted">{visible.length} {category === 'All produce' ? 'products' : category.toLowerCase()} nearby</Text>
    <View className="gap-4">{visible.map((product) => <ProductCard key={product.name} product={product} wide saved={savedProducts.includes(product.name)} onToggleSaved={()=>toggleSavedProduct(product.name)} onPress={() => router.push({ pathname: '/(buyer)/product', params: { name: product.name } })} />)}{visible.length === 0 ? <View className="items-center rounded-3xl border border-line bg-white p-8"><Text className="font-sans text-base font-bold text-ink">No produce found</Text><Text className="mt-2 text-center font-sans text-sm text-muted">Try another search or clear the filters.</Text></View> : null}</View>
  </Screen>;
}
