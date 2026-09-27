// One visit on a reserve's detail screen: photo, date, write-up, and
// Edit / Delete actions.
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatVisitDate } from '@/lib/format';
import type { Stamp } from '@/lib/types';

type Props = {
  visit: Stamp;
  photoUrl: string | undefined;
  reserveName: string;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function VisitCard({ visit, photoUrl, reserveName, busy, onEdit, onDelete }: Props) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, busy && styles.busy]}>
      {photoUrl ? (
        <Image
          // cacheKey = storage path, so the photo stays cached even though
          // its signed URL changes every session
          source={{ uri: photoUrl, cacheKey: visit.photo_url }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Photo from your visit to ${reserveName}`}
        />
      ) : (
        <ThemedView type="backgroundSelected" style={[styles.photo, styles.placeholder]}>
          <ThemedText type="small" themeColor="textSecondary">
            {visit.photo_url ? 'Photo unavailable' : 'No photo'}
          </ThemedText>
        </ThemedView>
      )}
      <View style={styles.body}>
        <ThemedText type="smallBold">{formatVisitDate(visit.visited_at)}</ThemedText>
        <ThemedText type="small" themeColor={visit.write_up ? 'text' : 'textSecondary'}>
          {visit.write_up ?? 'No write-up.'}
        </ThemedText>
        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary">
            {visit.is_public ? 'Public' : 'Private'}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable onPress={onEdit} disabled={busy} accessibilityRole="button" hitSlop={8}>
              <ThemedText type="smallBold" themeColor="accent">
                Edit
              </ThemedText>
            </Pressable>
            <Pressable onPress={onDelete} disabled={busy} accessibilityRole="button" hitSlop={8}>
              <ThemedText type="smallBold" themeColor="danger">
                {busy ? 'Deleting…' : 'Delete'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  busy: {
    opacity: 0.5,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
