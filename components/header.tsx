import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>plates5C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
});
