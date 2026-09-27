import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { PassportGate } from '@/components/PassportGate';
import { PassportProvider } from '@/lib/passport-store';

// Plain stack for now — no tab bar while the app has one main screen.
// When the map (or road trips) arrives, move passport into an (app)/(tabs)
// group; route URLs like /passport don't change when files move into groups.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PassportProvider>
        <StatusBar style="auto" />
        <PassportGate>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="passport" options={{ headerShown: false, title: 'Passport' }} />
            <Stack.Screen name="reserve/[id]" options={{ title: '' }} />
            <Stack.Screen name="capture" options={{ title: 'New stamp', presentation: 'modal' }} />
          </Stack>
        </PassportGate>
      </PassportProvider>
    </ThemeProvider>
  );
}
