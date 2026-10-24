import '@/global.css';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppStoreProvider } from '@/components/app-store';
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: '#123C2E', background: '#F7F6F1', card: '#FFFFFF', text: '#17211D', border: '#E2E7E3' } };
export default function RootLayout() { return <ThemeProvider value={theme}><AppStoreProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F6F1' } }}><Stack.Screen name="index" /><Stack.Screen name="(auth)" /><Stack.Screen name="(buyer)" /><Stack.Screen name="(vendor)" /></Stack></AppStoreProvider></ThemeProvider>; }
