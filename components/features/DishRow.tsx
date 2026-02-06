import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import RatingStars from '../rating-stars';

type DishRowProps = {
  name: string;
  tags?: string[] | null;
  rating?: number | null;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
};

export function DishRow({
  name,
  tags,
  rating,
  onFavoritePress,
  isFavorite = false,
}: DishRowProps) {
  const { colors } = useTheme();
  const dietaryTags = (tags || [])
    .map((tag) => tag.toLowerCase())
    .map((tag) => {
      if (tag.includes('gluten')) return 'GF';
      if (tag.includes('vegan') || tag === 'vg') return 'VG';
      if (tag.includes('vegetarian') || tag === 'veg') return 'V';
      if (tag.includes('beef')) return 'B';
      if (tag.includes('lamb')) return 'L';
      if (tag.includes('poultry') || tag.includes('chicken') || tag.includes('turkey')) return 'P';
      if (tag.includes('pork')) return 'PK';
      if (tag.includes('halal')) return 'H';
      return null;
    })
    .filter(Boolean) as Array<'V' | 'VG' | 'GF' | 'B' | 'L' | 'P' | 'PK' | 'H'>;

  const tagColors: Record<string, { bg: string; fg: string }> = {
    VG: { bg: '#2E7D32', fg: '#FFFFFF' },  // vegan green
    V: { bg: '#9E9D24', fg: '#FFFFFF' },   // vegetarian yellow-green
    GF: { bg: '#1976D2', fg: '#FFFFFF' },  // gluten-free blue
    B: { bg: '#C62828', fg: '#FFFFFF' },   // red
    L: { bg: '#6A1B9A', fg: '#FFFFFF' },   // violet
    P: { bg: '#EF6C00', fg: '#FFFFFF' },   // orange
    PK: { bg: '#5D4037', fg: '#FFFFFF' },  // brown
    H: { bg: '#1565C0', fg: '#FFFFFF' },   // blue
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.inkSoft, fontFamily: tokens.font.bodySemibold }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {name}
            </Text>
            {dietaryTags.length > 0 && (
              <View style={styles.tagRow}>
                {dietaryTags.map((tag, idx) => {
                  const color = tagColors[tag] || { bg: colors.surfaceAlt, fg: colors.inkMuted };
                  return (
                    <View
                      key={`${tag}-${idx}`}
                      style={[styles.dietTag, { backgroundColor: color.bg, borderColor: color.bg }]}
                    >
                      <Text style={[styles.dietTagText, { color: color.fg, fontFamily: tokens.font.mono }]}>
                        {tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          {rating !== null && rating !== undefined ? (
            <RatingStars rating={rating} interactive={false} />
          ) : null}
          {onFavoritePress && (
            <TouchableOpacity
              onPress={onFavoritePress}
              style={styles.favoriteButton}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Text style={styles.favoriteIcon}>{isFavorite ? '♥' : '♡'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: tokens.space.sm,
  },
  content: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    gap: tokens.space.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  name: {
    fontSize: tokens.fontSize.body,
    fontWeight: '600',
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: 'row',
    gap: tokens.space.xs,
  },
  dietTag: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dietTagText: {
    fontSize: 8,
    letterSpacing: tokens.letterSpacing.wide,
    fontWeight: '600',
  },
  actions: {
    gap: tokens.space.xs,
    alignItems: 'flex-end',
  },
  favoriteButton: {
    padding: tokens.space.xxs,
    minWidth: tokens.touchTarget.min,
    minHeight: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#db2777',
  },
});
