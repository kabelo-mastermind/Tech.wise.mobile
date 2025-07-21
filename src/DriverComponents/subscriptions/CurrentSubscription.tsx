import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CurrentSubscription = ({ navigation }) => {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Simulated fetch from backend or local storage
    const fetchSubscription = async () => {
      // Replace this with an actual API call or storage retrieval logic
      const subscriptionData = {
        planType: 'Monthly', // Change this to 'Weekly' or 'Monthly'
        cost: 1500, // Update cost based on the plan type
        startDate: '2025-01-01',
        expiryDate: '2025-01-31', // Adjust expiry date for weekly/monthly
        features: [
          'Access to all premium features',
          'Exclusive rewards',
          'Priority support',
          'Cancel anytime',
        ],
      };

      // Adjust cost and expiry date for weekly or monthly subscriptions
      if (subscriptionData.planType === 'Weekly') {
        subscriptionData.expiryDate = '2025-01-07'; // Weekly expiry
        subscriptionData.cost = 400; // Weekly cost
      } else if (subscriptionData.planType === 'Monthly') {
        subscriptionData.expiryDate = '2025-01-31'; // Monthly expiry
        subscriptionData.cost = 1500; // Monthly cost
      }
      setSubscription(subscriptionData);
    };

    fetchSubscription();
  }, []);

  if (!subscription) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Current Subscription</Text>
      <View style={styles.detailsCard}>
        <Text style={styles.detailItem}>Plan Type: {subscription.planType}</Text>
        <Text style={styles.detailItem}>
          Cost: R{subscription.cost}/{subscription.planType === 'Weekly' ? 'week' : 'month'}
        </Text>
        <Text style={styles.detailItem}>Start Date: {subscription.startDate}</Text>
        <Text style={styles.detailItem}>Expiry Date: {subscription.expiryDate}</Text>
        <Text style={styles.sectionTitle}>Features:</Text>
        {subscription.features.map((feature, index) => (
          <Text key={index} style={styles.featureItem}>
            {feature}
          </Text>
        ))}
      </View>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => navigation.navigate('ManageSubscription')}
      >
        <Text style={styles.buttonText}>Manage Subscription</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    marginTop: 10,
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  manageButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default CurrentSubscription;
