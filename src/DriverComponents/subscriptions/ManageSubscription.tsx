"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import axios from "axios"
import { useSelector } from "react-redux"
import WebView from "react-native-webview"
import { api } from "../../../api"
import CustomDrawer from "../../components/CustomDrawer"
import { Icon } from "react-native-elements"

const ManageSubscription = ({ navigation, route }) => {
  const { customerId, interval, latestSubscriptionCode } = route.params
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)
  const [isWebViewVisible, setIsWebViewVisible] = useState(false)
  const [webViewUrl, setWebViewUrl] = useState("")
  const userId = useSelector((state) => state.auth.user?.user_id || "")
  const email = useSelector((state) => state.auth.user?.email || "")
  const [emailToken, setEmailToken] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        console.log("Fetching subscriptions for customer ID:", customerId, latestSubscriptionCode)

        const response = await fetch(api + `subscription?customer=${customerId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch subscriptions")
        }

        const subscriptions = await response.json()
        console.log("Fetched Subscriptions66666666666666666666666666666:", subscriptions[0].email_token)

        if (subscriptions.length > 0) {
          setSubscription(subscriptions[0]) // Assuming you want the first subscription
          setEmailToken(subscriptions[0].email_token) // Store email_token
        } else {
          setSubscription(null)
          console.log("No active subscriptions found for the customer.")
        }
      } catch (error) {
        console.error("Error fetching subscriptions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (customerId) {
      fetchSubscriptions()
    }
  }, [customerId])

  const handleUpdateCard = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(api + "update-payment-method", {
        email,
        subscription_code: latestSubscriptionCode,
      })

      const paystackLink = response.data.link

      if (paystackLink) {
        Linking.openURL(paystackLink) // Open Paystack page
        navigation.navigate("Subscriptions")
      } else {
        Alert.alert("Error", "Could not get update link.")
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Something went wrong")
    }
    setIsLoading(false)
  }

  // const handleUpgrade = async () => {
  //   setIsLoading(true)
  //   try {
  //     if (!subscription || !subscription.subscription_code || !emailToken) {
  //       Alert.alert("Error", "Invalid subscription details.")
  //       console.log("Subscription Code:", subscription?.subscription_code || "N/A")
  //       console.log("Email Token:", emailToken || "N/A")
  //       setIsLoading(false)
  //       return
  //     }

  //     console.log("Cancelling subscription for code:", subscription.subscription_code)

  //     const cancelResponse = await axios.post(api + "cancel-subscription", {
  //       code: subscription.subscription_code,
  //       token: emailToken,
  //     })

  //     console.log("Cancel response:", cancelResponse.data)

  //     if (cancelResponse.status === 200) {
  //       const { message } = cancelResponse.data

  //       if (message === "Subscription is non-renewing and will expire at the end of the term") {
  //         // Navigate to Subscriptions page if the subscription is non-renewing
  //         Alert.alert("Info", "Your subscription is set to expire at the end of the term.")
  //         navigation.navigate("Subscriptions", { status: "non-renewing" }) // Pass 'status' as param
  //       } else {
  //         Alert.alert("Success", "Subscription canceled. Please choose a new plan.")
  //         navigation.navigate("Subscriptions")
  //       }
  //     } else {
  //       Alert.alert("Error", cancelResponse.data?.message || "Failed to cancel the current subscription.")
  //     }
  //   } catch (error) {
  //     console.error("Error upgrading subscription:", error)

  //     if (error.response) {
  //       console.log("Error Response:", error.response.data)

  //       if (error.response.data?.message?.includes("Subscription is non-renewing")) {
  //         Alert.alert("Info", "Your subscription is already set to expire at the end of the term.")
  //         navigation.navigate("Subscriptions", { status: "non-renewing" }) // Navigate here for non-renewing status
  //       } else {
  //         Alert.alert("Error", error.response.data?.message || "Something went wrong. Please try again.")
  //       }
  //     } else {
  //       Alert.alert("Error", "Network error or server is unreachable.")
  //     }
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  const handleChangeSubscription = async () => {
    try {
      const cancelResponse = await axios.post(api + "cancel-subscription", {
        code: latestSubscriptionCode,
        token: subscription.email_token,
      });

      if (cancelResponse.status === 200) {
        const { message, subscription_status } = cancelResponse.data;
        navigation.navigate("Subscriptions", { status: "non-renewing" });
        Alert.alert("Success", message || "Subscription canceled. Please choose a new plan.");
        // // If subscription is now non-renewing, navigate
        // if (subscription.status === "non-renewing") {
        //   navigation.navigate("Subscriptions", { status: "non-renewing" });
        // }
      } else {
        Alert.alert("Error", "Failed to cancel the current subscription.");
      }
    } catch (error) {
      console.error("Error downgrading subscription:", error);

      const errorMessage =
        error.response?.data?.message || "Something went wrong. Please try again.";

      Alert.alert("Error", errorMessage);
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DCAF0" />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {isWebViewVisible ? (
        <WebView source={{ uri: webViewUrl }} style={{ flex: 1 }} />
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
              <Icon type="material-community" name="menu" color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Subscription</Text>
            <View style={styles.menuButtonPlaceholder} />
          </View>
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Your Subscription</Text>
              <Text style={styles.heroSubtitle}>
                Manage your plan and payment details
              </Text>
            </View>

            {subscription ? (
              <View style={styles.card}>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{subscription.plan.name}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: subscription.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: subscription.status === 'active' ? '#10B981' : '#F59E0B' }
                    ]}>
                      {subscription.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {subscription.customer.first_name} {subscription.customer.last_name}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>{subscription.plan.name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{subscription.plan.description}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>R{(subscription.amount / 100).toFixed(2)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Billing Cycle</Text>
                    <Text style={styles.detailValue}>{subscription.plan.interval}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Start Date</Text>
                    <Text style={styles.detailValue}>{new Date(subscription.createdAt).toLocaleDateString()}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>**** {subscription.authorization.last4}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subscription ID</Text>
                    <Text style={styles.detailValue}>{subscription.subscription_code.substring(0, 10)}...</Text>
                  </View>
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateCard}>
                    <Icon type="material-community" name="credit-card-outline" color="#FFFFFF" size={20} style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Update Payment Method</Text>
                  </TouchableOpacity>

                  {subscription.plan.interval === "weekly" ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleChangeSubscription}>
                      <Icon type="material-community" name="arrow-up-circle-outline" color="#0DCAF0" size={20} style={styles.buttonIcon} />
                      <Text style={styles.secondaryButtonText}>Upgrade to Monthly</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleChangeSubscription}>
                      <Icon type="material-community" name="arrow-down-circle-outline" color="#0DCAF0" size={20} style={styles.buttonIcon} />
                      <Text style={styles.secondaryButtonText}>Downgrade to Weekly</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Icon type="material-community" name="alert-circle-outline" color="#0DCAF0" size={60} style={styles.emptyStateIcon} />
                <Text style={styles.emptyStateTitle}>No Active Subscription</Text>
                <Text style={styles.emptyStateText}>You don't have any active subscriptions at the moment.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Subscriptions")}>
                  <Text style={styles.buttonText}>Browse Plans</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Icon type="material-community" name="arrow-left" color="#FFFFFF" size={20} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FAFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0FAFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0DCAF0",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPlaceholder: {
    width: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: "#0DCAF0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  userInfo: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 20,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 16,
    color: "#64748B",
    flex: 1,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    textAlign: "right",
  },
  actionsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#0DCAF0",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "rgba(13, 202, 240, 0.1)",
    borderWidth: 1,
    borderColor: "#0DCAF0",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#0DCAF0",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonIcon: {
    marginRight: 8,
  },
  backButton: {
    backgroundColor: "#64748B",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyStateContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
})

export default ManageSubscription