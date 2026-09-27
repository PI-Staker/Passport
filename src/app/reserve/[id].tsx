import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VisitCard } from '@/components/VisitCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { reserveNames } from '@/lib/names';
import { usePassport } from '@/lib/passport-store';

export default function ReserveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getReserve, stampsFor, photoUrlFor, deleteStamp } = usePassport();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const reserve = getReserve(id);

  const confirmDelete = (stampId: string) => {
    Alert.alert(
      'Delete this visit?',
      'Its photo and write-up will be permanently deleted. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(stampId);
            try {
              await deleteStamp(stampId);
            } catch (e) {
              Alert.alert(
                'Couldn’t delete this visit',
                `Try again when you have signal.\n\n(${e instanceof Error ? e.message : String(e)})`,
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  if (!reserve) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Reserve not found.</ThemedText>
      </ThemedView>
    );
  }

  const visits = stampsFor(reserve.id);
  const names = reserveNames(reserve.name);
  const subtitle = [reserve.org, reserve.province].filter(Boolean).join(' · ');

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            {names.park ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {names.park.toUpperCase()}
              </ThemedText>
            ) : null}
            <ThemedText type="subtitle" style={styles.title}>
              {names.section ?? names.display}
            </ThemedText>
            {names.alias ? (
              <ThemedText type="small" themeColor="textSecondary">
                Also known as {names.alias}
              </ThemedText>
            ) : null}
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
              <VisitCard
                key={visit.id}
                visit={visit}
                photoUrl={photoUrlFor(visit)}
                reserveName={names.display}
                busy={deletingId === visit.id}
                onEdit={() => router.push({ pathname: '/visit/[id]', params: { id: visit.id } })}
                onDelete={() => confirmDelete(visit.id)}
              />
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
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
