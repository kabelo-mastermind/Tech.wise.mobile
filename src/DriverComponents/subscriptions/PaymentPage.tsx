import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import axios from "axios";
import { useSelector } from "react-redux";

const API_BASE_URL = "http://10.0.2.2:3000/api";

const PaymentPage = ({ route, navigation }) => {
  const { planType, cost } = route.params;
  const userEmail = useSelector((state) => state.auth.user?.email || "");

  const [email, setEmail] = useState(userEmail);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/initialize-transaction-with-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          cost: 50000, // replace this with dynamic cost if needed
          plan: planType,
        }),
      });
      
      const data = await response.json(); // assuming the response will be a JSON containing the authorization URL
      
      if (data.authorization_url) {
        setAuthorizationUrl(data.authorization_url);
      } else {
        Alert.alert("Error", "Failed to initialize transaction.");
      }
    } catch (error) {
      console.error("Axios Error:", error.response?.data || error.message);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (authorizationUrl) {
    return (
      <WebView
        source={{ uri: authorizationUrl }}
        onNavigationStateChange={(navState) => {
          if (navState.url.includes("payment-success")) {
            const reference = new URLSearchParams(navState.url.split('?')[1]).get('reference');
            setAuthorizationUrl(null);
            navigation.replace("PaymentSuccess", { planType, cost, reference });
          } else if (navState.url.includes("payment-error")) {
            setAuthorizationUrl(null);
            Alert.alert("Error", "Payment failed. Please try again.");
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment for {planType} Subscription</Text>
      <Text style={styles.planInfo}>Cost: R{cost}</Text>

      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />

      <Button
        title={isProcessing ? "Processing..." : "Complete Payment"}
        onPress={handlePayment}
        disabled={isProcessing}
      />

      <Button
        title="Cancel Payment"
        onPress={() => navigation.goBack()}
        color="red"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  planInfo: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: "#e7f3fe",
  },
});

export default PaymentPage;
