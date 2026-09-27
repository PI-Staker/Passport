import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatVisitDate } from '@/lib/format';
import { usePassport } from '@/lib/passport-store';

export default function ReserveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getReserve, stampsFor } = usePassport();
  const reserve = getReserve(id);

  if (!reserve) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Reserve not found.</ThemedText>
      </ThemedView>
    );
  }

  const visits = stampsFor(reserve.id);
  const subtitle = [reserve.org, reserve.province].filter(Boolean).join(' · ');

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <ThemedText type="subtitle" style={styles.title}>
              {reserve.name}
            </ThemedText>
            {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            {visits.length === 0
              ? 'NOT STAMPED YET'
              : `${visits.length} VISIT${visits.length > 1 ? 'S' : ''}`}
          </ThemedText>

          {visits.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              Visit this reserve and photograph the entrance sign to collect its stamp.
            </ThemedText>
          ) : (
            visits.map((visit) => (
              <ThemedView key={visit.id} type="backgroundElement" style={styles.visit}>
                <ThemedView type="backgroundSelected" style={styles.photoPlaceholder}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Photo
                  </ThemedText>
                </ThemedView>
                <View style={styles.visitBody}>
                  <ThemedText type="smallBold">{formatVisitDate(visit.visited_at)}</ThemedText>
                  <ThemedText
                    type="small"
                    themeColor={visit.write_up ? 'text' : 'textSecondary'}>
                    {visit.write_up ?? 'No write-up.'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {visit.is_public ? 'Public' : 'Private'}
                  </ThemedText>
                </View>
              </ThemedView>
            ))
          )}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton
            label={visits.length ? 'Stamp another visit' : 'Stamp this reserve'}
            onPress={() => router.push({ pathname: '/capture', params: { reserveId: reserve.id } })}
          />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heading: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  visit: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitBody: {
    flex: 1,
    gap: Spacing.half,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
