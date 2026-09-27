// Capture flow: pick reserve (if not given) → photograph the entrance sign →
// optional write-up → save. The camera itself lives in CameraCapture; upload
// and saving live in the passport store.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraCapture } from '@/components/CameraCapture';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePassport } from '@/lib/passport-store';
import { reserveNames } from '@/lib/names';
import { deleteLocalFile } from '@/lib/photos';
import { buildSearchIndex, matchesQuery } from '@/lib/search';

export default function CaptureScreen() {
  const params = useLocalSearchParams<{ reserveId?: string }>();
  const { reserves, getReserve, addStamp } = usePassport();
  const theme = useTheme();

  const [reserveId, setReserveId] = useState(params.reserveId);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [writeUp, setWriteUp] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const searchIndex = useMemo(() => buildSearchIndex(reserves), [reserves]);

  const reserve = reserveId ? getReserve(reserveId) : undefined;

  // Opened from the passport's "Stamp a reserve" button: pick the reserve first.
  // (Later this could suggest the nearest reserve from GPS.)
  if (!reserve) {
    const matches = reserves.filter((r) => matchesQuery(searchIndex, r.id, query));
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.pickHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              WHICH RESERVE ARE YOU AT?
            </ThemedText>
            <View style={styles.searchRow}>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, park or province" />
            </View>
          </View>
          <FlatList
            data={matches}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.pickList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.center}>
                No reserves match “{query.trim()}”.
              </ThemedText>
            }
            renderItem={({ item }) => {
              const names = reserveNames(item.name);
              return (
                <Pressable
                  onPress={() => setReserveId(item.id)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.pickRow}>
                    <ThemedText>{names.display}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[item.org, item.province].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }
  const names = reserveNames(reserve.name);

  const retake = () => {
    if (photoUri) deleteLocalFile(photoUri);
    setPhotoUri(null);
  };

  const save = async () => {
    if (!photoUri) return;
    setSaving(true);
    try {
      await addStamp({ reserveId: reserve.id, writeUp: writeUp.trim() || null, photoUri });
      router.back();
    } catch (e) {
      setSaving(false);
      // The photo stays on screen, so the user can just tap again once they have signal.
      Alert.alert(
        'Couldn’t save your stamp',
        `Your photo is still here — try again when you have signal.\n\n(${e instanceof Error ? e.message : String(e)})`,
      );
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View>
              <ThemedText type="smallBold" themeColor="textSecondary">
                STAMPING
              </ThemedText>
              <ThemedText style={styles.reserveName}>{names.display}</ThemedText>
            </View>

            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
                <Pressable
                  onPress={retake}
                  disabled={saving}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.retake, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.retakeText}>
                    Retake
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <CameraCapture onCaptured={setPhotoUri} />
            )}

            <TextInput
              value={writeUp}
              onChangeText={setWriteUp}
              placeholder="Add a write-up (optional)"
              placeholderTextColor={theme.textSecondary}
              multiline
              editable={!saving}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={saving ? 'Saving…' : photoUri ? 'Get the stamp' : 'Take a photo first'}
              onPress={save}
              disabled={!photoUri || saving}
            />
          </View>
        </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  pickHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
  },
  pickList: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  pickRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  reserveName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  preview: {
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
  },
  retake: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  retakeText: {
    color: '#fff',
  },
  input: {
    minHeight: 100,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
