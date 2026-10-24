import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './market-ui';

export function DetailShell({title,children,action,footer}:{title:string;children:ReactNode;action?:ReactNode;footer?:ReactNode}){
  return <SafeAreaView className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS==='ios'?'padding':undefined}>
    <View className="flex-row items-center px-5 py-3"><Pressable accessibilityLabel="Back" onPress={()=>router.back()} className="h-11 w-11 items-center justify-center rounded-full border border-line bg-white"><Icon name="chevron.left"/></Pressable><Text className="flex-1 text-center font-sans text-lg font-bold text-ink">{title}</Text><View className="h-11 w-11 items-center justify-center">{action}</View></View>
    <ScrollView contentContainerClassName={`px-5 ${footer?'pb-8':'pb-12'}`} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    {footer?<View className="bg-cream px-4 pb-2 pt-3">{footer}</View>:null}
  </KeyboardAvoidingView></SafeAreaView>;
}
