import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type DiningHallSectionProps = {
    dininghall: string;
    color: string;
    children?: React.ReactNode;
  };

export default function DiningHallSection({ dininghall, color, children }: DiningHallSectionProps) {
    return (
      <View style={styles.schoolSection}>
        <Text style={[styles.diningHallName, { color }]}>{dininghall}</Text>
        {children}
      </View>
    );
  }

const styles = StyleSheet.create({
  schoolSection: { paddingHorizontal: 0, paddingVertical: 10 },
  diningHallName: { fontWeight: "bold", fontSize: 16 },
});