import { Text, TextInput, View } from 'react-native';
import { palette } from './market-ui';

export function FormField({ label, value, onChangeText, placeholder, keyboardType, multiline = false, secureTextEntry = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default'|'email-address'|'phone-pad'|'number-pad'; multiline?: boolean; secureTextEntry?: boolean }) {
  return <View className="mb-4"><Text className="mb-2 font-sans text-sm font-bold text-ink">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.muted} keyboardType={keyboardType} multiline={multiline} secureTextEntry={secureTextEntry} textAlignVertical={multiline?'top':'center'} className={`rounded-2xl border border-line bg-white px-4 font-sans text-[15px] text-ink ${multiline?'min-h-28 py-4':'h-14'}`}/></View>;
}
