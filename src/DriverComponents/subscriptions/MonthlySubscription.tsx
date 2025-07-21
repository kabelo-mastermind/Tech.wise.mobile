import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios'; // For making API requests

const MonthlySubscription = ({ navigation }) => {
  const [currentSubscription, setCurrentSubscription] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Monthly Subscription Plan</Text>
      <Text style={styles.description}>
        Welcome to the Monthly Plan! Here are the details of your subscription:
      </Text>
      <View style={styles.detailsCard}>
        <Text style={styles.detailItem}>✔ Cost: R1500 / month</Text>
        <Text style={styles.detailItem}>✔ Access to all premium features</Text>
        <Text style={styles.detailItem}>✔ Exclusive monthly rewards</Text>
        <Text style={styles.detailItem}>✔ Priority support</Text>
        <Text style={styles.detailItem}>✔ Cancel anytime</Text>
      </View>

      <Text style={styles.sectionTitle}>More Features</Text>
      <View style={styles.additionalFeatures}>
        <Text style={styles.featureItem}>✔ Monthly newsletters</Text>
        <Text style={styles.featureItem}>✔ Invitations to special events</Text>
        <Text style={styles.featureItem}>✔ Free trials for new features</Text>
      </View>

      {/* Redirect to PaymentPage on subscription */}
      <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
        <Text style={styles.buttonText}>Upgrade Now</Text>
      </TouchableOpacity>


      {/* Back to Subscriptions */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back to Subscriptions</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  additionalFeatures: {
    backgroundColor: '#e7f3fe',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  featureItem: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  manageButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  accountButton: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  subscribeButton: {
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  currentSubscriptionButton: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#7cc',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MonthlySubscription;
