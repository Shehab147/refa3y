import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { Icon, PrimaryButton } from '@/components/market-ui';
import { useAppStore } from '@/components/app-store';

const categories=['Vegetables','Fruit','Herbs','Dairy','Pantry'];
const units=[
  {value:'per kg',stockLabel:'kg'},
  {value:'per item',stockLabel:'items'},
  {value:'per bunch',stockLabel:'bunches'},
  {value:'per box',stockLabel:'boxes'},
  {value:'per litre',stockLabel:'litres'},
];

export default function ProductForm(){
  const params=useLocalSearchParams<{id?:string}>();
  const id=params.id?Number(params.id):undefined;
  const {vendorProducts,saveVendorProduct,removeVendorProduct}=useAppStore();
  const current=vendorProducts.find(item=>item.id===id);
  const [name,setName]=useState(current?.name??'');
  const [category,setCategory]=useState(current?.category??'Vegetables');
  const [price,setPrice]=useState(current?.price??'');
  const [unit,setUnit]=useState(current?.unit??'per kg');
  const [stock,setStock]=useState(current?.stock.match(/[\d.]+/)?.[0]??'');
  const [description,setDescription]=useState(current?.description??'');
  const [photos,setPhotos]=useState(current?1:0);
  const priceNumber=Number(price);
  const stockNumber=Number(stock);
  const unitConfig=units.find(item=>item.value===unit)??units[0];
  const errors=useMemo(()=>({price:price.length>0&&(!Number.isFinite(priceNumber)||priceNumber<=0),stock:stock.length>0&&(!Number.isFinite(stockNumber)||stockNumber<=0)}),[price,priceNumber,stock,stockNumber]);
  const valid=Boolean(name.trim()&&Number.isFinite(priceNumber)&&priceNumber>0&&Number.isFinite(stockNumber)&&stockNumber>0&&unit);
  const save=()=>{if(!valid)return;saveVendorProduct({name:name.trim(),category,price:priceNumber.toFixed(2).replace(/\.00$/,''),unit,stock:`${stockNumber} ${unitConfig.stockLabel}`,description:description.trim()},id);router.back()};

  return <DetailShell title={current?'Edit product':'New product'} footer={<PrimaryButton disabled={!valid} onPress={save}>Save product</PrimaryButton>}>
    <Pressable onPress={()=>setPhotos(photos?0:1)} className={`mb-6 h-48 items-center justify-center rounded-3xl border border-dashed ${photos?'border-forest bg-mint':'border-leaf bg-white'}`}><Icon name={photos?'checkmark.circle.fill':'photo.badge.plus'} size={32}/><Text className="mt-3 font-sans text-sm font-bold text-forest">{photos?'1 product photo selected':'Add product photos'}</Text></Pressable>
    <FormField label="Product name" value={name} onChangeText={setName}/>
    <Text className="mb-2 font-sans text-sm font-bold text-ink">Category</Text><View className="mb-4 flex-row flex-wrap gap-2">{categories.map(item=><Pressable key={item} onPress={()=>setCategory(item)} className={`rounded-full px-4 py-3 ${category===item?'bg-forest':'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${category===item?'text-white':'text-muted'}`}>{item}</Text></Pressable>)}</View>
    <FormField label="Price (EGP)" value={price} onChangeText={(value)=>setPrice(value.replace(/[^\d.]/g,''))} keyboardType="number-pad"/>{errors.price?<Text className="-mt-2 mb-4 font-sans text-xs text-[#A3483A]">Enter a price greater than zero.</Text>:null}
    <Text className="mb-2 font-sans text-sm font-bold text-ink">Selling unit</Text><View className="mb-4 flex-row flex-wrap gap-2">{units.map(item=><Pressable accessibilityRole="radio" accessibilityState={{checked:unit===item.value}} key={item.value} onPress={()=>setUnit(item.value)} className={`rounded-full px-4 py-3 ${unit===item.value?'bg-forest':'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${unit===item.value?'text-white':'text-muted'}`}>{item.value}</Text></Pressable>)}</View>
    <FormField label={`Available stock (${unitConfig.stockLabel})`} value={stock} onChangeText={(value)=>setStock(value.replace(/[^\d.]/g,''))} keyboardType="number-pad"/>{errors.stock?<Text className="-mt-2 mb-4 font-sans text-xs text-[#A3483A]">Stock must be greater than zero.</Text>:null}
    <FormField label="Description" value={description} onChangeText={setDescription} multiline/>
    {current?<Pressable onPress={()=>{removeVendorProduct(current.id);router.back()}}><Text className="mt-2 text-center font-sans text-sm font-bold text-[#A3483A]">Remove this product</Text></Pressable>:null}
  </DetailShell>;
}
