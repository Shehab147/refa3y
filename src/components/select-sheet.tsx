import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { SheetShell } from './sheet-ui';
import { Icon, PrimaryButton } from './market-ui';

export function SelectSheet({ title, subtitle, options, button, initial = 0, destructive = false, onConfirm }: { title: string; subtitle?: string; options: string[]; button: string; initial?: number; destructive?: boolean; onConfirm?: (value:string)=>void }) {
  const [selected, setSelected] = useState(initial);
  return <SheetShell title={title} subtitle={subtitle} footer={<PrimaryButton onPress={() => { onConfirm?.(options[selected]); router.back(); }}>{button}</PrimaryButton>}>
    {options.map((option, index) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === index }} onPress={() => setSelected(index)} key={option} className={`mb-3 flex-row items-center rounded-2xl border p-4 ${selected === index ? destructive ? 'border-[#A3483A] bg-[#FFF0ED]' : 'border-forest bg-mint' : 'border-line bg-white'}`}><Text className="flex-1 font-sans text-sm font-bold text-ink">{option}</Text>{selected === index ? <Icon name="checkmark.circle.fill" color={destructive ? '#A3483A' : '#123C2E'} /> : null}</Pressable>)}
  </SheetShell>;
}
