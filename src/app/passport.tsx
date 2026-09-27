import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StampCard } from '@/components/StampCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePassport } from '@/lib/passport-store';

export default function PassportScreen() {
  const { reserves, stamps } = usePassport();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const columns = contentWidth > 520 ? 5 : 3;
  const slotSize = Math.floor(contentWidth / columns);

  const visitCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stamps) counts.set(s.reserve_id, (counts.get(s.reserve_id) ?? 0) + 1);
    return counts;
  }, [stamps]);
  const stampedCount = visitCounts.size;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <FlatList
          key={columns} // numColumns can't change on the fly without a remount
          data={reserves}
          keyExtractor={(r) => r.id}
          numColumns={columns}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">My Passport</ThemedText>
              <ThemedText themeColor="textSecondary">
                {stampedCount} of {reserves.length} reserves stamped
              </ThemedText>
              <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accent,
                      width: `${(stampedCount / Math.max(reserves.length, 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <StampCard
              reserve={item}
              visitCount={visitCounts.get(item.id) ?? 0}
              size={slotSize}
              onPress={() => router.push({ pathname: '/reserve/[id]', params: { id: item.id } })}
            />
          )}
        />
        <View style={styles.footer}>
          <PrimaryButton label="Stamp a reserve" onPress={() => router.push('/capture')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  header: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
