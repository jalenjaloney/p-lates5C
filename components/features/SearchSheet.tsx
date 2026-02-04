import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Modal, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { useSearchDishes } from '@/hooks/useSearchDishes';
import { Badge } from '../primitives/Badge';
import { getHallDisplayName } from '@/constants/hall-hours';

type SearchSheetProps = {
  selectedDate: string;
  onDishSelect: (dishName: string, hallName: string) => void;
};

export type SearchSheetRef = {
  open: () => void;
  close: () => void;
};

export const SearchSheet = forwardRef<SearchSheetRef, SearchSheetProps>(
  ({ selectedDate, onDishSelect }, ref) => {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const { query, setQuery, results, loading } = useSearchDishes(selectedDate);

    useImperativeHandle(ref, () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
    }));

    const handleDishSelect = (dishName: string, hallName: string) => {
      onDishSelect(dishName, hallName);
      setVisible(false);
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
                  Search Dishes
                </Text>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                  <Text style={[styles.closeIcon, { color: colors.ink }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search dishes, tags, halls..."
                placeholderTextColor={colors.inkMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.ink,
                    fontFamily: tokens.font.body,
                  },
                ]}
                autoFocus
              />

              {loading && (
                <Text style={[styles.statusText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  Searching...
                </Text>
              )}

              {!loading && query && results.length === 0 && (
                <Text style={[styles.statusText, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  No results found
                </Text>
              )}

              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.dish.id}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleDishSelect(item.dish.displayName, item.hallName)}
                  >
                    <View style={styles.resultContent}>
                      <Text style={[styles.dishName, { color: colors.ink, fontFamily: tokens.font.bodySemibold }]}>
                        {item.dish.displayName}
                      </Text>
                      <View style={styles.resultMeta}>
                        <Text style={[styles.metaText, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                          {getHallDisplayName(item.hallName)} · {item.meal}
                        </Text>
                        {item.dish.tags && item.dish.tags.length > 0 && (
                          <View style={styles.tagRow}>
                            {item.dish.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} label={tag} variant="muted" size="sm" />
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }
);

SearchSheet.displayName = 'SearchSheet';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '80%',
    borderTopLeftRadius: tokens.radius.xxl,
    borderTopRightRadius: tokens.radius.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.md,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '700',
  },
  closeButton: {
    padding: tokens.space.xs,
    minWidth: tokens.touchTarget.min,
    minHeight: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
  },
  input: {
    height: 48,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.fontSize.body,
    marginBottom: tokens.space.md,
  },
  statusText: {
    fontSize: tokens.fontSize.caption,
    textAlign: 'center',
    paddingVertical: tokens.space.lg,
  },
  listContent: {
    paddingBottom: tokens.space.xl,
  },
  resultItem: {
    paddingVertical: tokens.space.md,
    borderBottomWidth: 1,
  },
  resultContent: {
    gap: tokens.space.xs,
  },
  dishName: {
    fontSize: tokens.fontSize.body,
  },
  resultMeta: {
    gap: tokens.space.xs,
  },
  metaText: {
    fontSize: tokens.fontSize.caption,
  },
  tagRow: {
    flexDirection: 'row',
    gap: tokens.space.xs,
    flexWrap: 'wrap',
  },
});
