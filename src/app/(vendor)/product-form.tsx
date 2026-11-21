import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/components/app-store';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { PrimaryButton } from '@/components/market-ui';
import { useFocusApi } from '@/hooks/use-focus-api';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { ProductPhotoUploadError, saveProductWithPhoto } from '@/lib/product-save';
import { uploadForm, validateUploadAsset } from '@/lib/uploads';

type Category = { id: number; name: string };
type ProductImage = { id: number; image_url: string; is_primary: number };
type Product = { id: number; name: string; category_id: number | null; price: string; selling_unit: string; stock_quantity: string; description: string | null; farming_method: string | null; quality_tag: string | null; is_active: number; image_url?: string | null };
const units = [
  { value: 'per kg', stockLabel: 'kg' },
  { value: 'per item', stockLabel: 'items' },
  { value: 'per bunch', stockLabel: 'bunches' },
  { value: 'per box', stockLabel: 'boxes' },
  { value: 'per litre', stockLabel: 'litres' },
];

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const load = useCallback(async () => {
    if (id && !/^[1-9]\d*$/.test(id)) throw new ApiError('Invalid product.', 400);
    const [categories, products, images] = await Promise.all([
      api<Category[]>('catalog/categories', { authenticated: false }),
      id ? api<Product[]>('vendor/products') : Promise.resolve([]),
      id ? api<ProductImage[]>('vendor/product/images/list', { query: { product_id: id } }) : Promise.resolve([]),
    ]);
    const product = id ? products.find((item) => Number(item.id) === Number(id)) : undefined;
    if (id && !product) throw new ApiError('Product not found.', 404);
    return { categories, product, images };
  }, [id]);
  const { data, loading, error, refresh } = useFocusApi(load);
  if (loading) return <DetailShell title="Product"><Text className="font-sans text-sm text-muted">Loading product…</Text></DetailShell>;
  if (error || !data) return <DetailShell title="Product"><Pressable onPress={refresh}><Text className="font-sans text-sm text-[#A3483A]">{error ?? 'Unable to load product.'} Tap to retry.</Text></Pressable></DetailShell>;
  return <ProductEditor key={id ?? 'new'} categories={data.categories} current={data.product} initialImages={data.images} />;
}

function ProductEditor({ categories, current, initialImages }: { categories: Category[]; current?: Product; initialImages: ProductImage[] }) {
  const { refresh } = useAppStore();
  const [name, setName] = useState(current?.name ?? '');
  const [category, setCategory] = useState(current?.category_id ? String(current.category_id) : '');
  const [price, setPrice] = useState(current?.price ?? '');
  const [unit, setUnit] = useState(current?.selling_unit ?? 'per kg');
  const [stock, setStock] = useState(current?.stock_quantity ?? '');
  const [description, setDescription] = useState(current?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState(initialImages);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [uploadUnconfirmed, setUploadUnconfirmed] = useState(false);
  const productId = useRef<number | null>(current ? Number(current.id) : null);
  const inFlight = useRef(false);
  const unitConfig = units.find((item) => item.value === unit);
  const categoryValid = !category || categories.some((item) => String(item.id) === category);
  const valid = !!name.trim() && !!price.trim() && Number.isFinite(Number(price)) && Number(price) >= 0.01 && !!stock.trim() && Number.isFinite(Number(stock)) && Number(stock) >= 0 && !!unitConfig && categoryValid;

  const save = async () => {
    if (!valid || !unitConfig || inFlight.current || uploadUnconfirmed) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      await saveProductWithPhoto({
        productId: productId.current,
        body: { name: name.trim(), category_id: category ? Number(category) : null, price: Number(price), selling_unit: unit, stock_quantity: Number(stock), stock_unit: unitConfig.stockLabel, description: description.trim(), ...(current ? { farming_method: current.farming_method, quality_tag: current.quality_tag, is_active: !!Number(current.is_active) } : {}) },
        photo: current ? null : selectedPhoto,
        onCreated: (id) => { productId.current = id; setCreatedId(id); },
      });
      await refresh();
      router.back();
    } catch (caught) {
      if (caught instanceof ProductPhotoUploadError) {
        setUploadUnconfirmed(true);
        setError(`The product was saved, but its photo upload could not be confirmed: ${caught.message} Review the saved product before trying again.`);
      } else {
        setError(`${caught instanceof Error ? caught.message : 'Unable to save product.'} Check your products before retrying.`);
      }
    } finally { inFlight.current = false; setSaving(false); }
  };
  const chooseNewPhoto = async () => {
    if (inFlight.current || uploadUnconfirmed) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true, base64: false });
      if (!result.canceled) {
        validateUploadAsset(result.assets[0]);
        setSelectedPhoto(result.assets[0]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to select the photo.');
    } finally { inFlight.current = false; setSaving(false); }
  };
  const archive = async () => {
    if (!current || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null);
    try { await api('vendor/product/delete', { method: 'DELETE', body: { id: current.id } }); await refresh(); router.back(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Unable to archive product.'); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const uploadPhoto = async () => {
    if (!current || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null); setImageMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true, base64: false });
      if (result.canceled) return;
      const form = uploadForm(result.assets[0], { product_id: String(current.id) });
      const uploaded = await api<{ id: number; image_url: string }>('vendor/product/upload', { method: 'POST', form });
      setImages((previous) => [{ ...uploaded, is_primary: 1 }, ...previous.map((item) => ({ ...item, is_primary: 0 }))]);
      setImageMessage('Photo uploaded and set as the main product photo.');
      void refresh();
    } catch (caught) {
      setError(`${caught instanceof Error ? caught.message : 'Unable to upload the photo.'} Reopen the product to check its photos before retrying.`);
    } finally { inFlight.current = false; setSaving(false); }
  };
  const removePhoto = async (imageId: number) => {
    if (!current || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null); setImageMessage(null);
    try {
      const remaining = await api<ProductImage[]>('vendor/product/images/delete', { method: 'DELETE', body: { product_id: current.id, image_id: imageId } });
      setImages(remaining);
      setImageMessage('Photo removed.');
      void refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove the photo. Reopen this product to refresh its photos.');
    } finally { inFlight.current = false; setSaving(false); }
  };

  return <DetailShell title={current ? 'Edit product' : 'New product'} footer={<PrimaryButton disabled={!valid || saving || uploadUnconfirmed} onPress={() => void save()}>{saving ? 'Please wait…' : 'Save product'}</PrimaryButton>}>
    {current && !Number(current.is_active) ? <Text className="mb-4 font-sans text-sm text-muted">This product is archived.</Text> : null}
    {images.map((image) => <View key={image.id} className="mb-4"><Image source={mediaUrl(image.image_url)} contentFit="cover" style={{ width: '100%', height: 180, borderRadius: 16 }} /><View className="mt-2 flex-row justify-between"><Text className="font-sans text-xs text-muted">{Number(image.is_primary) ? 'Main photo' : 'Product photo'}</Text><Pressable disabled={saving} onPress={() => void removePhoto(image.id)}><Text className="font-sans text-xs font-bold text-[#A3483A]">Remove photo</Text></Pressable></View></View>)}
    {selectedPhoto ? <View className="mb-4"><Image source={selectedPhoto.uri} contentFit="cover" style={{ width: '100%', height: 180, borderRadius: 16 }} /><Text className="mt-2 font-sans text-xs text-muted">{selectedPhoto.name} · Uploads when you save</Text>{!uploadUnconfirmed ? <Pressable disabled={saving} onPress={() => setSelectedPhoto(null)} className="mt-2"><Text className="font-sans text-xs font-bold text-[#A3483A]">Remove selected photo</Text></Pressable> : null}</View> : null}
    <Pressable disabled={saving || uploadUnconfirmed} onPress={() => void (current ? uploadPhoto() : chooseNewPhoto())} className="mb-4 rounded-2xl border border-line bg-white p-4"><Text className="font-sans text-sm font-bold text-forest">{current ? 'Upload product photo' : selectedPhoto ? 'Change product photo' : 'Choose product photo'}</Text><Text className="mt-1 font-sans text-xs text-muted">JPEG or PNG, up to 5 MB. {current ? 'The latest photo becomes the main photo.' : 'The photo uploads when you save the product.'}</Text></Pressable>
    {uploadUnconfirmed && createdId ? <Pressable disabled={saving} onPress={() => router.replace({ pathname: '/(vendor)/product-form', params: { id: String(createdId) } })} className="mb-4"><Text className="font-sans text-sm font-bold text-forest">Review saved product</Text></Pressable> : null}
    {imageMessage ? <Text className="mb-4 font-sans text-sm text-leaf">{imageMessage}</Text> : null}
    <FormField label="Product name" value={name} onChangeText={setName} />
    <Text className="mb-2 font-sans text-sm font-bold text-ink">Category (optional)</Text>
    {!categoryValid ? <Text className="mb-2 font-sans text-sm text-[#A3483A]">The previous category is unavailable. Select another category or clear it.</Text> : null}
    <View className="mb-4 flex-row flex-wrap gap-2"><Pressable onPress={() => setCategory('')} className={`rounded-full px-4 py-3 ${!category ? 'bg-forest' : 'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${!category ? 'text-white' : 'text-muted'}`}>None</Text></Pressable>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(String(item.id))} className={`rounded-full px-4 py-3 ${category === String(item.id) ? 'bg-forest' : 'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${category === String(item.id) ? 'text-white' : 'text-muted'}`}>{item.name}</Text></Pressable>)}</View>
    <FormField label="Price (EGP)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
    <Text className="mb-2 font-sans text-sm font-bold text-ink">Selling unit</Text><View className="mb-4 flex-row flex-wrap gap-2">{units.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: unit === item.value }} key={item.value} onPress={() => setUnit(item.value)} className={`rounded-full px-4 py-3 ${unit === item.value ? 'bg-forest' : 'border border-line bg-white'}`}><Text className={`font-sans text-xs font-bold ${unit === item.value ? 'text-white' : 'text-muted'}`}>{item.value}</Text></Pressable>)}</View>
    <FormField label={`Available stock${unitConfig ? ` (${unitConfig.stockLabel})` : ''}`} value={stock} onChangeText={setStock} keyboardType="number-pad" /><FormField label="Description" value={description} onChangeText={setDescription} multiline />
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
    {current && Number(current.is_active) ? <Pressable disabled={saving} onPress={() => void archive()}><Text className="mt-2 text-center font-sans text-sm font-bold text-[#A3483A]">Archive this product</Text></Pressable> : null}
  </DetailShell>;
}
