import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { useFavorites } from '@/hooks/useFavorites';
import { Card } from '@/components/primitives/Card';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { favorites, loading, toggleFavorite } = useFavorites();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.ink }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
          Favorites
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
            Loading favorites...
          </Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: tokens.font.display }]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
            Tap the ♡ icon on any dish to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card variant="outlined" padding="md" style={styles.favoriteCard}>
              <View style={styles.favoriteContent}>
                <Text style={[styles.dishName, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
                  {item.dishName}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleFavorite(item.dishId)}
                  style={styles.removeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from favorites"
                >
                  <Text style={styles.removeIcon}>♥</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    gap: tokens.space.sm,
    paddingTop: tokens.space.xxl,
  },
  backButton: {
    padding: tokens.space.xs,
    minWidth: tokens.touchTarget.min,
    minHeight: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: tokens.fontSize.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.xl,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.h2,
    fontWeight: '700',
    marginBottom: tokens.space.sm,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
  },
  listContent: {
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  favoriteCard: {
    marginBottom: tokens.space.xs,
  },
  favoriteContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishName: {
    fontSize: tokens.fontSize.body,
    flex: 1,
  },
  removeButton: {
    padding: tokens.space.xs,
    minWidth: tokens.touchTarget.min,
    minHeight: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 20,
    color: '#db2777',
  },
});
