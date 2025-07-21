import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WeeklySubscription = ({ navigation }) => {
  const handleSubscribe = () => {
    // Navigate to the PaymentPage first, then after payment success navigate to PaymentSuccessPage
    navigation.navigate('PaymentPage', {
      planType: 'Weekly',
      cost: 400,
    });
  };

  const handlePaymentSuccess = () => {
    navigation.navigate('PaymentSuccess', {
      planType: 'Weekly',
      cost: 400,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Weekly Subscription Plan</Text>
      <Text style={styles.description}>
        Welcome to the Weekly Plan! Here are the details of your subscription:
      </Text>
      <View style={styles.detailsCard}>
        <Text style={styles.detailItem}>✔ Cost: R400 / week</Text>
        <Text style={styles.detailItem}>✔ Access to premium features</Text>
        <Text style={styles.detailItem}>✔ Priority support</Text>
        <Text style={styles.detailItem}>✔ Cancel anytime</Text>
      </View>
      <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.viewSubscriptionButton}
        onPress={() => navigation.navigate('CurrentSubscription')}
      >
        <Text style={styles.buttonText}>View Current Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => navigation.navigate('ManageSubscription')}
      >
        <Text style={styles.buttonText}>Manage Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.accountButton}
        onPress={() => navigation.navigate('AccountDetails')}
      >
        <Text style={styles.buttonText}>Account Details</Text>
      </TouchableOpacity>
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
  subscribeButton: {
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  viewSubscriptionButton: {
    backgroundColor: '#f57c00',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
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

export default WeeklySubscription;
