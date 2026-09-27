import { router } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipRow } from '@/components/ChipRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StampCard } from '@/components/StampCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStoredChoice } from '@/hooks/use-stored-state';
import { useTheme } from '@/hooks/use-theme';
import {
  buildSections,
  chunk,
  GROUP_BY_OPTIONS,
  SHOW_OPTIONS,
  type GroupBy,
  type ShowFilter,
} from '@/lib/grouping';
import { usePassport } from '@/lib/passport-store';
import type { Reserve } from '@/lib/types';

const GROUP_VALUES = GROUP_BY_OPTIONS.map((o) => o.value);
const SHOW_VALUES = SHOW_OPTIONS.map((o) => o.value);

export default function PassportScreen() {
  const { reserves, stamps } = usePassport();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [groupBy, setGroupBy] = useStoredChoice<GroupBy>('passport.groupBy', 'province', GROUP_VALUES);
  const [show, setShow] = useStoredChoice<ShowFilter>('passport.show', 'all', SHOW_VALUES);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const columns = contentWidth > 520 ? 5 : 3;
  const slotSize = Math.floor(contentWidth / columns);

  const visitCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stamps) counts.set(s.reserve_id, (counts.get(s.reserve_id) ?? 0) + 1);
    return counts;
  }, [stamps]);
  const stampedCount = visitCounts.size;

  // SectionList has no grid mode, so each section's reserves are split into rows.
  const sections = useMemo(
    () =>
      buildSections(reserves, (id) => visitCounts.has(id), groupBy, show).map((section) => ({
        ...section,
        data: chunk(section.reserves, columns),
      })),
    [reserves, visitCounts, groupBy, show, columns],
  );

  const emptyMessage =
    show === 'stamped'
      ? 'No stamps yet — go collect your first one!'
      : show === 'unstamped'
        ? 'You’ve stamped every reserve. Legend.'
        : 'No reserves to show.';

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(row: Reserve[]) => row.map((r) => r.id).join('|')}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
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
              <View style={styles.controls}>
                <ChipRow label="Group" options={GROUP_BY_OPTIONS} value={groupBy} onChange={setGroupBy} />
                <ChipRow label="Show" options={SHOW_OPTIONS} value={show} onChange={setShow} />
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {emptyMessage}
            </ThemedText>
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">{section.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {section.stampedCount}/{section.totalCount}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map((reserve) => (
                <StampCard
                  key={reserve.id}
                  reserve={reserve}
                  visitCount={visitCounts.get(reserve.id) ?? 0}
                  size={slotSize}
                  onPress={() => router.push({ pathname: '/reserve/[id]', params: { id: reserve.id } })}
                />
              ))}
            </View>
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
    paddingBottom: Spacing.two,
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
  controls: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
