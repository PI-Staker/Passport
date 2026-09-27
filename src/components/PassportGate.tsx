// Shows a loading / error screen until the passport data is ready, so every
// screen behind it can assume signed-in user + loaded data.
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePassport } from '@/lib/passport-store';

export function PassportGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = usePassport();
  const theme = useTheme();

  if (status === 'ready') return children;

  return (
    <ThemedView style={styles.screen}>
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText themeColor="textSecondary">Opening your passport…</ThemedText>
        </>
      ) : (
        <>
          <ThemedText type="smallBold">Couldn’t load your passport</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
            Check your connection and try again.{'\n'}({error})
          </ThemedText>
          <PrimaryButton label="Try again" onPress={retry} />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  error: {
    textAlign: 'center',
  },
});
