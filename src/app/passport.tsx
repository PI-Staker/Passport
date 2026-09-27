import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterSheet, type ProvinceProgress } from '@/components/FilterSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
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
  PROVINCES,
  SHOW_OPTIONS,
  type GroupBy,
  type ShowFilter,
} from '@/lib/grouping';
import { usePassport } from '@/lib/passport-store';
import { buildSearchIndex, matchesQuery } from '@/lib/search';
import type { Reserve } from '@/lib/types';

const GROUP_VALUES = GROUP_BY_OPTIONS.map((o) => o.value);
const SHOW_VALUES = SHOW_OPTIONS.map((o) => o.value);
const PROVINCE_VALUES = ['all', ...PROVINCES];

export default function PassportScreen() {
  const { reserves, stamps } = usePassport();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [groupBy, setGroupBy] = useStoredChoice<GroupBy>('passport.groupBy', 'province', GROUP_VALUES);
  const [show, setShow] = useStoredChoice<ShowFilter>('passport.show', 'all', SHOW_VALUES);
  const [province, setProvince] = useStoredChoice<string>('passport.province', 'all', PROVINCE_VALUES);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const columns = contentWidth > 520 ? 5 : 3;
  const slotSize = Math.floor(contentWidth / columns);

  const visitCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stamps) counts.set(s.reserve_id, (counts.get(s.reserve_id) ?? 0) + 1);
    return counts;
  }, [stamps]);

  const searchIndex = useMemo(() => buildSearchIndex(reserves), [reserves]);

  const provinceProgress = useMemo<ProvinceProgress[]>(() => {
    const byProvince = new Map<string, ProvinceProgress>();
    for (const r of reserves) {
      const key = r.province ?? 'Other';
      const p = byProvince.get(key) ?? { province: key, stamped: 0, total: 0 };
      p.total++;
      if (visitCounts.has(r.id)) p.stamped++;
      byProvince.set(key, p);
    }
    return [...byProvince.values()].sort((a, b) => a.province.localeCompare(b.province));
  }, [reserves, visitCounts]);

  // Header progress follows the province filter: "Western Cape: 3 of 36".
  const scope = province === 'all' ? null : provinceProgress.find((p) => p.province === province);
  const scopeStamped = scope ? scope.stamped : visitCounts.size;
  const scopeTotal = scope ? scope.total : reserves.length;

  // SectionList has no grid mode, so each section's reserves are split into rows.
  const sections = useMemo(() => {
    const include = (r: Reserve) =>
      (province === 'all' || r.province === province) && matchesQuery(searchIndex, r.id, query);
    return buildSections(reserves, (id) => visitCounts.has(id), groupBy, show, include).map((section) => ({
      ...section,
      data: chunk(section.reserves, columns),
    }));
  }, [reserves, visitCounts, groupBy, show, province, query, searchIndex, columns]);

  const activeFilters = [
    province !== 'all' && { key: 'province', label: province, clear: () => setProvince('all') },
    show !== 'all' && {
      key: 'show',
      label: SHOW_OPTIONS.find((o) => o.value === show)?.label ?? show,
      clear: () => setShow('all'),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resetFilters = () => {
    setProvince('all');
    setShow('all');
    setGroupBy('province');
  };

  const emptyMessage = query.trim()
    ? `No reserves match “${query.trim()}”${activeFilters.length ? ' with these filters' : ''}.`
    : show === 'stamped'
      ? 'No stamps here yet — go collect one!'
      : show === 'unstamped'
        ? 'You’ve stamped every reserve here. Legend.'
        : 'No reserves to show.';

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              My Passport
            </ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {scope ? `${scope.province}: ` : ''}
              {scopeStamped} of {scopeTotal}
            </ThemedText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.accent,
                  width: `${(scopeStamped / Math.max(scopeTotal, 1)) * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.searchRow}>
            <SearchBar value={query} onChangeText={setQuery} />
            <Pressable
              onPress={() => setFiltersOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Filters${activeFilters.length ? `, ${activeFilters.length} active` : ''}`}
              style={({ pressed }) => [
                styles.filterButton,
                { backgroundColor: activeFilters.length ? theme.accent : theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: activeFilters.length ? theme.onAccent : theme.text }}>
                Filters{activeFilters.length ? ` · ${activeFilters.length}` : ''}
              </ThemedText>
            </Pressable>
          </View>
          {activeFilters.length > 0 && (
            <View style={styles.activeRow}>
              {activeFilters.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={f.clear}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove filter ${f.label}`}
                  style={[styles.activeChip, { borderColor: theme.accent }]}>
                  <ThemedText type="small" themeColor="accent">
                    {f.label} ✕
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(row: Reserve[]) => row.map((r) => r.id).join('|')}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        provinces={provinceProgress}
        province={province}
        onProvince={setProvince}
        show={show}
        onShow={setShow}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        onReset={resetFilters}
      />
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
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  filterButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  activeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  activeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
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
