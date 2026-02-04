import React from 'react';
import { TouchableOpacity, Text, TextInput, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type SearchBarProps = {
  mode?: 'button' | 'input';
  onPress?: () => void;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
};

export function SearchBar({
  mode = 'button',
  onPress,
  placeholder = 'Search',
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
}: SearchBarProps) {
  const { colors } = useTheme();

  if (mode === 'button') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open search"
        accessibilityHint="Search for dishes, tags, and dining halls"
      >
        <View style={styles.content}>
          <Text
            style={[
              styles.placeholder,
              {
                color: colors.inkMuted,
                fontFamily: tokens.font.body,
              },
            ]}
          >
            {placeholder}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
      accessibilityRole="search"
      accessibilityLabel="Search"
    >
      <View style={styles.content}>
        <TextInput
          style={[
            styles.placeholder,
            {
              color: colors.inkMuted,
              fontFamily: tokens.font.body,
              outlineStyle: 'none',
              outlineWidth: 0,
              boxShadow: 'none',
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.ink}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    minHeight: 40,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    fontSize: tokens.fontSize.body,
  },
});
