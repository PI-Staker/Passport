// Edit a visit: change the write-up and/or replace the photo (camera or
// gallery). Replacing the photo asks for confirmation, since the old one is
// deleted.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatVisitDate } from '@/lib/format';
import { usePassport } from '@/lib/passport-store';
import { deleteLocalFile } from '@/lib/photos';

export default function EditVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStamp, getReserve, photoUrlFor, updateStamp } = usePassport();
  const theme = useTheme();
  const stamp = getStamp(id);

  const [writeUp, setWriteUp] = useState(stamp?.write_up ?? '');
  const [replacing, setReplacing] = useState(false); // camera open
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!stamp) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Visit not found.</ThemedText>
      </ThemedView>
    );
  }

  const reserve = getReserve(stamp.reserve_id);
  const currentPhoto = photoUrlFor(stamp);
  const trimmed = writeUp.trim() || null;
  const dirty = trimmed !== (stamp.write_up ?? null) || newPhotoUri !== null;

  const cancelReplace = () => {
    if (newPhotoUri) deleteLocalFile(newPhotoUri);
    setNewPhotoUri(null);
    setReplacing(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await updateStamp(stamp.id, { writeUp: trimmed, newPhotoUri: newPhotoUri ?? undefined });
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert(
        'Couldn’t save your changes',
        `Nothing was changed — try again when you have signal.\n\n(${e instanceof Error ? e.message : String(e)})`,
      );
    }
  };

  const save = () => {
    if (newPhotoUri) {
      Alert.alert('Replace photo?', 'Your old photo for this visit will be deleted.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: doSave },
      ]);
    } else {
      doSave();
    }
  };

  const shownPhoto = newPhotoUri ?? currentPhoto;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {formatVisitDate(stamp.visited_at).toUpperCase()}
              </ThemedText>
              <ThemedText style={styles.reserveName}>{reserve?.name ?? 'Visit'}</ThemedText>
            </View>

            {replacing && !newPhotoUri ? (
              <View style={styles.gap}>
                <CameraCapture onCaptured={setNewPhotoUri} />
                <Pressable onPress={cancelReplace} accessibilityRole="button" style={styles.textButton}>
                  <ThemedText type="linkPrimary">Keep the current photo</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.gap}>
                {shownPhoto ? (
                  <Image
                    source={
                      newPhotoUri ? { uri: newPhotoUri } : { uri: shownPhoto, cacheKey: stamp.photo_url }
                    }
                    style={styles.photo}
                    contentFit="cover"
                  />
                ) : (
                  <ThemedView type="backgroundSelected" style={[styles.photo, styles.placeholder]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      No photo
                    </ThemedText>
                  </ThemedView>
                )}
                {newPhotoUri ? (
                  <Pressable onPress={cancelReplace} accessibilityRole="button" style={styles.textButton}>
                    <ThemedText type="linkPrimary">Undo — keep the old photo</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setReplacing(true)}
                    disabled={saving}
                    accessibilityRole="button"
                    style={styles.textButton}>
                    <ThemedText type="linkPrimary">Replace photo</ThemedText>
                  </Pressable>
                )}
              </View>
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
              label={saving ? 'Saving…' : 'Save changes'}
              onPress={save}
              disabled={!dirty || saving}
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
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  gap: {
    gap: Spacing.one,
  },
  reserveName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
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
