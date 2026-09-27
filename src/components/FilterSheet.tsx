// Bottom sheet holding the passport's view options: Province, Show, Group by.
// Keeps the main screen uncluttered — only a Filters button and chips for
// whatever is active.
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipRow } from '@/components/ChipRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GROUP_BY_OPTIONS, SHOW_OPTIONS, type GroupBy, type ShowFilter } from '@/lib/grouping';

export type ProvinceProgress = { province: string; stamped: number; total: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  provinces: ProvinceProgress[];
  province: string; // 'all' or a province name
  onProvince: (value: string) => void;
  show: ShowFilter;
  onShow: (value: ShowFilter) => void;
  groupBy: GroupBy;
  onGroupBy: (value: GroupBy) => void;
  onReset: () => void;
};

export function FilterSheet(props: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const totalStamped = props.provinces.reduce((n, p) => n + p.stamped, 0);
  const total = props.provinces.reduce((n, p) => n + p.total, 0);

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel="Close filters" />
      <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.handle, { backgroundColor: theme.slotOutline }]} />
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.title}>
            Filter your passport
          </ThemedText>
          <Pressable onPress={props.onReset} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="smallBold" themeColor="accent">
              Reset
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            PROVINCE
          </ThemedText>
          <View style={styles.provinceGrid}>
            <ProvinceChip
              label="All provinces"
              progress={`${totalStamped}/${total}`}
              selected={props.province === 'all'}
              onPress={() => props.onProvince('all')}
            />
            {props.provinces.map((p) => (
              <ProvinceChip
                key={p.province}
                label={p.province}
                progress={`${p.stamped}/${p.total}`}
                selected={props.province === p.province}
                onPress={() => props.onProvince(p.province)}
              />
            ))}
          </View>

          <View style={styles.rows}>
            <ChipRow label="Show" options={SHOW_OPTIONS} value={props.show} onChange={props.onShow} />
            <ChipRow label="Group" options={GROUP_BY_OPTIONS} value={props.groupBy} onChange={props.onGroupBy} />
          </View>
        </ScrollView>

        <PrimaryButton label="Done" onPress={props.onClose} />
      </ThemedView>
    </Modal>
  );
}

function ProvinceChip({
  label,
  progress,
  selected,
  onPress,
}: {
  label: string;
  progress: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${progress} stamped`}
      style={[
        styles.provinceChip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
        },
      ]}>
      <ThemedText
        type="small"
        numberOfLines={1}
        style={[styles.provinceLabel, { color: selected ? theme.onAccent : theme.text }]}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: selected ? theme.onAccent : theme.textSecondary }}>
        {progress}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 18,
  },
  content: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  provinceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  provinceChip: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  provinceLabel: {
    flexShrink: 1,
  },
  rows: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
