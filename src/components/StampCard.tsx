// One slot on the passport "loyalty card": an empty dashed circle until the
// reserve is visited, then an inked stamp. Visual design is placeholder —
// restyle freely, but keep the props so the grid doesn't need to change.
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { stampLabel } from '@/lib/format';
import type { Reserve } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  reserve: Reserve;
  visitCount: number;
  size: number;
  onPress: () => void;
};

export function StampCard({ reserve, visitCount, size, onPress }: Props) {
  const theme = useTheme();
  const stamped = visitCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${reserve.name}, ${stamped ? `stamped ${visitCount} time${visitCount > 1 ? 's' : ''}` : 'not yet stamped'}`}
      style={({ pressed }) => [styles.slot, { width: size }, pressed && styles.pressed]}>
      <View
        style={[
          styles.circle,
          { width: size - Spacing.three, height: size - Spacing.three },
          stamped
            ? [styles.stamped, { borderColor: theme.stampInk }]
            : [styles.empty, { borderColor: theme.slotOutline }],
        ]}>
        {stamped && (
          <View style={[styles.innerRing, { borderColor: theme.stampInk }]}>
            <ThemedText
              style={[styles.stampText, { color: theme.stampInk }]}
              numberOfLines={2}
              adjustsFontSizeToFit>
              {stampLabel(reserve.name)}
            </ThemedText>
          </View>
        )}
        {visitCount > 1 && (
          <View style={[styles.badge, { backgroundColor: theme.stampInk }]}>
            <ThemedText style={[styles.badgeText, { color: theme.onAccent }]}>×{visitCount}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText
        type="small"
        themeColor={stamped ? 'text' : 'textSecondary'}
        style={styles.name}
        numberOfLines={2}>
        {reserve.name}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  stamped: {
    borderWidth: 3,
    padding: 4,
    transform: [{ rotate: '-8deg' }],
  },
  innerRing: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  stampText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: 800,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 999,
    paddingHorizontal: 6,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 18,
    fontWeight: 700,
  },
  name: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
  },
});
