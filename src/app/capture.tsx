// Capture flow, Step 1 version: the camera is faked (tap the box to "take" a
// photo). Step 3 replaces the placeholder with CameraCapture — permissions,
// compression, offline handling — built and tested on its own first.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePassport } from '@/lib/passport-store';

export default function CaptureScreen() {
  const params = useLocalSearchParams<{ reserveId?: string }>();
  const { reserves, getReserve, addStamp } = usePassport();
  const theme = useTheme();

  const [reserveId, setReserveId] = useState(params.reserveId);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [writeUp, setWriteUp] = useState('');
  const [saving, setSaving] = useState(false);

  const reserve = reserveId ? getReserve(reserveId) : undefined;

  // Opened from the passport's "Stamp a reserve" button: pick the reserve first.
  // (Later this could suggest the nearest reserve from GPS.)
  if (!reserve) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <FlatList
            data={reserves}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <ThemedText type="smallBold" themeColor="textSecondary">
                WHICH RESERVE ARE YOU AT?
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setReserveId(item.id)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.pickRow}>
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[item.org, item.province].filter(Boolean).join(' · ')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await addStamp({ reserveId: reserve.id, writeUp: writeUp.trim() || null });
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Couldn’t save your stamp', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.content}>
          <View>
            <ThemedText type="smallBold" themeColor="textSecondary">
              STAMPING
            </ThemedText>
            <ThemedText style={styles.reserveName}>{reserve.name}</ThemedText>
          </View>

          <Pressable
            onPress={() => setPhotoTaken(true)}
            accessibilityRole="button"
            accessibilityLabel="Take photo of the entrance sign">
            <ThemedView
              type={photoTaken ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.camera, { borderColor: photoTaken ? theme.accent : theme.slotOutline }]}>
              <ThemedText themeColor={photoTaken ? 'text' : 'textSecondary'} style={styles.cameraText}>
                {photoTaken
                  ? '✓ Photo taken (placeholder)'
                  : 'Tap to photograph the entrance sign\n(camera arrives in Step 3)'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          <TextInput
            value={writeUp}
            onChangeText={setWriteUp}
            placeholder="Add a write-up (optional)"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />
        </View>
        <View style={styles.footer}>
          <PrimaryButton
            label={saving ? 'Saving…' : 'Get the stamp'}
            onPress={save}
            disabled={!photoTaken || saving}
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
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
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
  camera: {
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  cameraText: {
    textAlign: 'center',
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
