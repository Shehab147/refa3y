import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { DetailShell } from '@/components/detail-ui';
import { FormField } from '@/components/form-ui';
import { PrimaryButton } from '@/components/market-ui';
import { api } from '@/lib/api';
import { uploadForm } from '@/lib/uploads';

export default function DocumentForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const choose = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true, base64: false });
      if (!result.canceled) setFile(result.assets[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to select a document.');
    } finally { inFlight.current = false; setBusy(false); }
  };

  const submit = async () => {
    if (!file || !name.trim() || !type.trim() || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const form = uploadForm(file, { document_name: name.trim(), document_type: type.trim() });
      await api('documents/upload', { method: 'POST', form });
      router.back();
    } catch (caught) {
      setError(`${caught instanceof Error ? caught.message : 'Unable to upload the document.'} Check the document list before retrying.`);
    } finally { inFlight.current = false; setBusy(false); }
  };

  return <DetailShell title="Add farm document" footer={<PrimaryButton disabled={busy || !file || !name.trim() || !type.trim()} onPress={() => void submit()}>{busy ? 'Please wait…' : 'Submit document'}</PrimaryButton>}>
    <Text className="mb-4 font-sans text-sm leading-6 text-muted">PDF, JPEG or PNG, up to 5 MB. Your document is stored encrypted.</Text>
    <FormField label="Document name" value={name} onChangeText={setName} />
    <FormField label="Document type" value={type} onChangeText={setType} />
    <Pressable disabled={busy} onPress={() => void choose()} className="mb-4 rounded-2xl border border-line bg-white p-4"><Text className="font-sans text-sm font-bold text-forest">{file ? 'Change file' : 'Choose file'}</Text><Text className="mt-1 font-sans text-xs text-muted">{file?.name ?? 'No file selected'}</Text></Pressable>
    {error ? <Text className="mb-4 font-sans text-sm text-[#A3483A]">{error}</Text> : null}
  </DetailShell>;
}
