import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';

type RuleProps = {
  variant?: 'thin' | 'thick' | 'double';
  spacing?: 'sm' | 'md' | 'lg';
};

export function Rule({ variant = 'thin', spacing = 'md' }: RuleProps) {
  const { colors } = useTheme();

  const getHeight = () => {
    switch (variant) {
      case 'thick':
        return 3;
      case 'double':
        return 1; // Will render two lines
      default:
        return 1;
    }
  };

  const getMargin = () => {
    switch (spacing) {
      case 'sm':
        return tokens.space.sm;
      case 'lg':
        return tokens.space.xl;
      default:
        return tokens.space.md;
    }
  };

  if (variant === 'double') {
    return (
      <View style={[styles.container, { marginVertical: getMargin() }]}>
        <View style={[styles.line, { backgroundColor: colors.border, height: 1 }]} />
        <View style={{ height: 3 }} />
        <View style={[styles.line, { backgroundColor: colors.border, height: 1 }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: variant === 'thick' ? colors.borderStrong : colors.border,
          height: getHeight(),
          marginVertical: getMargin(),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  line: {
    width: '100%',
  },
});
