import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Icon } from 'react-native-elements';
import { colors, parameters } from '../global/styles';

const PaymentScreen = ({ navigation }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const paymentMethods = [
    { id: '1', name: 'Credit Card', cardNumber: '2148642115648' },
    { id: '2', name: 'Cash' },
  ];

  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    return `**** **** **** ${cardNumber.slice(-4)}`;
  };

  const handlePayment = () => {
    if (selectedPaymentMethod) {
      Alert.alert(
        'Payment Confirmation',
        `You have selected ${selectedPaymentMethod}. Proceeding with payment...`
      );
      // Implement actual payment logic here
    } else {
      Alert.alert('Error', 'Please select a payment method.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.view1}>
        <Icon
          type="material-community"
          name="arrow-left"
          color={colors.grey1}
          size={32}
          onPress={() => navigation.goBack()}
        />
      </View>
      <Text style={styles.headerText}>Choose Payment Method</Text>

      {/* Payment Card */}
      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Selected Payment Method</Text>
        <Text style={styles.cardMethod}>
          {selectedPaymentMethod ? selectedPaymentMethod : 'None'}
        </Text>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentContainer}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentOption,
              selectedPaymentMethod === method.name ||
              selectedPaymentMethod === maskCardNumber(method.cardNumber)
                ? styles.selectedOption
                : null,
            ]}
            onPress={() =>
              setSelectedPaymentMethod(
                method.name === 'Credit Card'
                  ? maskCardNumber(method.cardNumber)
                  : method.name
              )
            }
          >
            <Text style={styles.paymentText}>
              {method.name === 'Credit Card'
                ? maskCardNumber(method.cardNumber)
                : method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Button */}
      <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
        <Text style={styles.buttonText}>Confirm Payment</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: parameters.statusBarHeight,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  view1: {
    position: 'absolute',
    top: 25,
    left: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    zIndex: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.grey1,
    marginVertical: 20,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardMethod: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  paymentContainer: {
    marginVertical: 20,
  },
  paymentOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.grey2,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: colors.green1, // Highlight selected option
    borderColor: colors.green1,
  },
  paymentText: {
    fontSize: 18,
    color: colors.grey1,
  },
  paymentButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
