import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CancelSubscription = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cancel Subscription</Text>
      <Text style={styles.description}>
        Are you sure you want to cancel your subscription? You will lose all benefits.
      </Text>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => {/* Implement cancel logic here */}}
      >
        <Text style={styles.buttonText}>Confirm Cancellation</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e0f7f7', // Light turquoise for background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#007f7f', // Dark turquoise for title
  },
  description: {
    fontSize: 16,
    color: '#005f5f', // Medium turquoise for description text
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: '#40e0d0', // Turquoise for "Confirm Cancellation" button
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#007f7f', // Dark turquoise for "Back" button
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff', // White text for buttons
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CancelSubscription;
