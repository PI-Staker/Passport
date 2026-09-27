// Self-contained camera: handles permission, shows the preview, takes the
// photo and shrinks it. Hands back a local file uri via onCaptured — it knows
// nothing about stamps or uploads.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { compressPhoto, deleteLocalFile, pickFromGallery } from '@/lib/photos';

type Props = {
  onCaptured: (localUri: string) => void;
};

export function CameraCapture({ onCaptured }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  // Permission still being checked
  if (!permission) {
    return (
      <ThemedView type="backgroundElement" style={styles.frame}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  const chooseFromGallery = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await pickFromGallery();
      if (picked) onCaptured(picked);
      else setBusy(false); // cancelled
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  if (!permission.granted) {
    return (
      <ThemedView type="backgroundElement" style={[styles.frame, styles.message]}>
        <ThemedText style={styles.center}>
          To collect a stamp, photograph the reserve’s entrance sign.
        </ThemedText>
        {permission.canAskAgain ? (
          <PrimaryButton label="Allow camera" onPress={requestPermission} />
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Camera access is turned off for this app. Turn it on in your phone’s settings.
            </ThemedText>
            <PrimaryButton label="Open settings" onPress={() => Linking.openSettings()} />
          </>
        )}
        <Pressable onPress={chooseFromGallery} accessibilityRole="button">
          <ThemedText type="linkPrimary">or choose a photo from your gallery</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      const small = await compressPhoto(picture.uri);
      deleteLocalFile(picture.uri); // full-size original no longer needed
      onCaptured(small);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <View style={styles.frame}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.overlay}>
        {error ? (
          <ThemedText type="small" style={styles.error}>
            Couldn’t take photo: {error}
          </ThemedText>
        ) : null}
        <View style={styles.controls}>
          <Pressable
            onPress={chooseFromGallery}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            style={({ pressed }) => [styles.sideButton, pressed && styles.shutterDim]}>
            <ThemedText type="smallBold" style={styles.sideButtonText}>
              Gallery
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={!ready || busy}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            style={({ pressed }) => [
              styles.shutter,
              (pressed || !ready || busy) && styles.shutterDim,
            ]}>
            {busy ? <ActivityIndicator color="#000" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={styles.sideButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  error: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
  },
  sideButton: {
    width: 72,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  sideButtonText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDim: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
