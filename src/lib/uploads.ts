import type { DocumentPickerAsset } from 'expo-document-picker';
import { File as LocalFile } from 'expo-file-system';
import { Platform } from 'react-native';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateUploadAsset(asset: DocumentPickerAsset): void {
  if (asset.size !== undefined && (asset.size === 0 || asset.size > MAX_UPLOAD_BYTES)) {
    throw new Error('Choose a non-empty file no larger than 5 MB.');
  }
  if (Platform.OS === 'web' && !asset.file) throw new Error('The selected file is unavailable. Please choose it again.');
}

export function uploadForm(asset: DocumentPickerAsset, fields: Record<string, string>): FormData {
  validateUploadAsset(asset);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('file', asset.file ?? new LocalFile(asset.uri), asset.name);
  return form;
}
