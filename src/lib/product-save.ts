import type { DocumentPickerAsset } from 'expo-document-picker';
import { api } from '@/lib/api';
import { uploadForm } from '@/lib/uploads';

export class ProductPhotoUploadError extends Error {
  constructor(error: unknown) {
    super(error instanceof Error ? error.message : 'Unable to upload the photo.');
  }
}

export async function saveProductWithPhoto({
  productId,
  body,
  photo,
  onCreated,
}: {
  productId: number | null;
  body: Record<string, unknown>;
  photo: DocumentPickerAsset | null;
  onCreated: (id: number) => void;
}): Promise<void> {
  const form = photo ? uploadForm(photo, {}) : null;
  const result = await api<{ id: number } | null>('vendor/product/save', {
    method: productId === null ? 'POST' : 'PATCH',
    body: { ...body, ...(productId === null ? {} : { id: productId }) },
  });
  let savedId = productId;
  if (savedId === null) {
    savedId = Number(result?.id);
    if (!Number.isSafeInteger(savedId) || savedId <= 0) {
      throw new Error('The server did not return a valid product ID. Check your products before retrying.');
    }
    onCreated(savedId);
  }
  if (form) {
    form.append('product_id', String(savedId));
    try {
      await api('vendor/product/upload', { method: 'POST', form });
    } catch (error) {
      throw new ProductPhotoUploadError(error);
    }
  }
}
