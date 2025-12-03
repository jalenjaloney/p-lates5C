import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function RateDishButton() {
  return (
    <TouchableOpacity style={styles.rateButton}>
      <Text style={styles.buttonText}>Rate a Dish</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rateButton: { backgroundColor: '#ddd', margin: 20, padding: 14, borderRadius: 5, alignItems: 'center' },
  buttonText: { fontWeight: 'bold', fontSize: 16 },
});