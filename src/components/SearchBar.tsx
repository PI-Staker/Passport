import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search reserves', autoFocus }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText themeColor="textSecondary" style={styles.icon}>
        ⌕
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={[styles.input, { color: theme.text }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}>
          <ThemedText themeColor="textSecondary" style={styles.clear}>
            ✕
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    minHeight: 44,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  clear: {
    fontSize: 14,
    paddingHorizontal: Spacing.one,
  },
});
