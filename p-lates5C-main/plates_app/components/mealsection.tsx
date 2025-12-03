import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MealSectionProps = {
    title: string;
    children?: React.ReactNode;
  };

export default function MealSection({ title, children }: MealSectionProps) {
    return (
      <View style={styles.mealSection}>
        <Text style={styles.mealTitle}>{title.toUpperCase()}</Text>
        {children}
      </View>
    );
  }

const styles = StyleSheet.create({
  mealSection: { paddingHorizontal: 20, paddingVertical: 10 },
  mealTitle: { fontSize: 18, fontWeight: 'bold' },
});