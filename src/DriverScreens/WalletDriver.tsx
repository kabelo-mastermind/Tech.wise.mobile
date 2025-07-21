import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

export default function DriverWallet({ navigation,route }) {
  // Placeholder states for dynamic data
  const [driverName, setDriverName] = useState("Driver Name");
  const [balance, setBalance] = useState("R3,500.00");
  const amount = route.params?.amount || 0; // Default to 0 if no amount is passed
console.log('amount============',amount)
  // Placeholder data for quick actions and performance metrics
  const quickActions = [
    { icon: "history", label: "History", route: "HistoryScreen" },
    { icon: "car", label: "Trips", route: "TripsScreen" },
    { icon: "wallet", label: "Earnings", route: "EarningsScreen" },
    { icon: "chart-line", label: "Stats", route: "StatsScreen" },
  ];

  const performanceMetrics = [
    { value: "12", label: "Trips", icon: "car" },
    { value: "8h", label: "Online", icon: "clock" },
    { value: "R180", label: "Earned", icon: "dollar-sign" },
  ];

  // Placeholder function for withdrawing
  const handleWithdraw = () => {
    navigation.navigate('PaymentMethodsScreen')
    // Add Paystack integration or navigate to a Withdraw screen here
  };

  // Placeholder function to fetch driver name and balance
  useEffect(() => {
    setTimeout(() => {
      setDriverName("John Doe");
      
      // Convert balance to a number
      const currentBalance = parseFloat(balance.replace("R", "").replace(",", "")); 
      
      // Subtract amount if available
      const newBalance = currentBalance - amount;
      
      // Ensure balance doesn't go negative
      setBalance(`R${newBalance > 0 ? newBalance.toFixed(2) : "0.00"}`);
    }, 1000);
  }, [amount]);
  

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Withdrawal Method</Text>
      </View>
      <ScrollView>
        {/* Header Section */}
        <View style={styles.header}>
          <Image
            source={{
              uri: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Capture.PNG-SQMaOr7UC1cYV3bbrUfwsk41PXzknf.png",
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.name}>{driverName}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceText}>My Balance</Text>
            <Text style={styles.balanceAmount}>{balance}</Text>
          </View>
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={handleWithdraw}
          >
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickAction}
              onPress={() => navigation.navigate(item.route)}
            >
              <FontAwesome5 name={item.icon} size={24} color="#FFF" />
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Today's Performance</Text>
        <View style={styles.metrics}>
          {performanceMetrics.map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <Feather name={metric.icon} size={24} color="#FFF" />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        {/* Promotions */}
        <View style={styles.promotions}>
          <View style={styles.promotionsHeader}>
            <Text style={styles.sectionTitle}>Special Offers</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promotionCard}>
            <View style={styles.promotionIcon}>
              <FontAwesome5 name="car" size={24} color="#FFF" />
            </View>
            <View style={styles.promotionContent}>
              <Text style={styles.promotionTitle}>Complete 20 Trips</Text>
              <Text style={styles.promotionSubtitle}>
                Earn R50 bonus this weekend
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  greeting: {
    color: "#333",
    fontSize: 14,
  },
  name: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
  },
  balanceCard: {
    backgroundColor: "lightgrey",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  balanceText: {
    color: "#333",
    fontSize: 14,
  },
  balanceAmount: {
    color: "#333",
    fontSize: 24,
    fontWeight: "bold",
  },
  withdrawButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  withdrawButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
  },
  quickActionLabel: {
    color: "#333",
    fontSize: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metricCard: {
    alignItems: "center",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  metricValue: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
  },
  metricLabel: {
    color: "#333",
    fontSize: 12,
  },
  promotions: {
    marginBottom: 24,
  },
  promotionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAll: {
    color: "#0DCAF0",
  },
  promotionCard: {
    flexDirection: "row",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
  },
  promotionIcon: {
    backgroundColor: "#0DCAF0",
    padding: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
});
