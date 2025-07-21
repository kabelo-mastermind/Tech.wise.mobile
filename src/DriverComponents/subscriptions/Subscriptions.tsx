"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useSelector } from "react-redux"
import WebView from "react-native-webview"
import { api } from "../../../api"
import CustomDrawer from "../../components/CustomDrawer"
import { Icon } from "react-native-elements"

const SubscriptionPage = ({ navigation, route }) => {
  const [isFirstTime, setIsFirstTime] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [latestSubscriptionCode, setLatestSubscriptionCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const userEmail = useSelector((state) => state.auth.user?.email || "")
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const [customerId, setCustomerId] = useState(null)
  const [authorizationUrl, setAuthorizationUrl] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPlanType, setSelectedPlanType] = useState(null)
  const [selectedCost, setSelectedCost] = useState(null)
  const { status } = route.params || {} // Provide an empty object as fallback
  console.log("statusooooooooooooo--------", status)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  // fetch customer ID and subscriptions when the component mounts
  useEffect(() => {
    const fetchCustomerIdAndSubscriptions = async () => {
      const id = await fetchCustomerId(user_id)
      if (id) {
        setCustomerId(id)
        const subscriptionData = await fetchSubscriptions(id)
        setSubscription(subscriptionData)
        console.log("Subscription data------------------:", subscriptionData)
      } else {
        // Continue with subscription if no customer ID is found
        setCustomerId(null) // Set to null
        setSubscription(null) // Proceed without subscription data
      }
      setLoading(false) // Set loading to false once data is fetched
    }

    if (user_id) {
      fetchCustomerIdAndSubscriptions()
    }
  }, [user_id])

  const fetchCustomerId = async (user_id) => {
    try {
      const response = await fetch(`${api}get-customer-id?user_id=${user_id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch customer ID")
      }

      const data = await response.json()
      console.log("Parsed data from backend:", data) // ✅ Properly log the JSON data

      return data.customer_id || null // Return null if not found
    } catch (error) {
      // console.error("Error fetching customer ID:", error.message);
      Alert.alert("Choose subscription option")
      return null
    }
  }

  // Function to fetch subscriptions based on customer ID
  const fetchSubscriptions = async (customerId) => {
    console.log("Fetching subscriptions for customer ID:", customerId)

    try {
      const response = await fetch(api + `subscription?customer=${customerId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions")
      }

      const subscriptions = await response.json()

      if (subscriptions.length > 0) {
        // Assuming there's a 'createdAt' field in the subscription object
        const latestSubscription = subscriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

        const latestSubscriptionCode = latestSubscription.subscription_code

        setLatestSubscriptionCode(latestSubscriptionCode)
        console.log("Latest subscription code:", latestSubscriptionCode)
        return latestSubscriptionCode
      } else {
        console.log("No subscriptions found.")
        return null
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      return null
    }
  }

  // Function to handle subscription button press
  const handleSubscribe = async (planType, cost) => {
    if (!userEmail) {
      Alert.alert("Error", "Please enter your email.")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(api + "initialize-transaction-with-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          cost: cost,
          planType: planType,
          user_id: user_id, // Include the user_id for verification
        }),
      })

      const data = await response.json()
      console.log("Response from backend:", data) // Log the backend response

      if (data.authorization_url) {
        setSelectedPlanType(planType)
        setSelectedCost(cost)
        setAuthorizationUrl(data.authorization_url)
      } else {
        Alert.alert("Error", "Failed to initialize transaction.")
      }
    } catch (error) {
      console.error("Error:", error.message)
      Alert.alert("Error", "Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (authorizationUrl) {
    return (
      <WebView
        source={{ uri: authorizationUrl }}
        onNavigationStateChange={(navState) => {
          if (navState.url.includes("payment-success")) {
            // Extract reference correctly
            const urlParams = new URLSearchParams(navState.url.split("?")[1])
            const reference = urlParams.get("reference")

            // Ensure reference is not null
            if (reference) {
              setAuthorizationUrl(null)
              navigation.replace("PaymentSuccess", {
                planType: selectedPlanType,
                cost: selectedCost,
                reference: reference,
              })
            }
          } else if (navState.url.includes("payment-error")) {
            setAuthorizationUrl(null)
            Alert.alert("Error", "Payment failed. Please try again.")
          }
        }}
      />
    )
  }

  const handleViewSubscription = () => {
    const planType = subscription?.planType || "N/A"
    const cost = subscription?.cost || 0
    if (!latestSubscriptionCode) {
      Alert.alert("Error", "No active subscription found.")
      return
    }

    navigation.navigate("ManageSubscription", {
      customerId: customerId,
      latestSubscriptionCode: latestSubscriptionCode,
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DCAF0" />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.description}>
            Select the subscription that best fits your needs and unlock premium features
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {/* Weekly Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Weekly</Text>
              </View>
              <Text style={styles.planPrice}>R400</Text>
              <Text style={styles.planPeriod}>per week</Text>
            </View>

            <View style={styles.planFeatures}>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Access to premium features</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Priority support</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Cancel anytime</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Weekly billing cycle</Text>
              </View>
            </View>

            {(!customerId || (subscription && (subscription.status === "canceled" || status === "non-renewing"))) && (
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={() => handleSubscribe("Weekly", 400)}
                disabled={isProcessing}
              >
                {isProcessing && selectedPlanType === "Weekly" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Subscribe Now</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Monthly Plan Card */}
          <View style={[styles.planCard, styles.featuredPlanCard]}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>

            <View style={styles.planHeader}>
              <View style={[styles.planBadge, styles.featuredPlanBadge]}>
                <Text style={styles.planBadgeText}>Monthly</Text>
              </View>
              <Text style={styles.planPrice}>R1500</Text>
              <Text style={styles.planPeriod}>per month</Text>
            </View>

            <View style={styles.planFeatures}>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Access to premium features</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Priority support</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Cancel anytime</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Monthly billing cycle</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" type="feather" color="#0DCAF0" size={20} />
                <Text style={styles.featureText}>Save 6% compared to weekly</Text>
              </View>
            </View>

            {(!customerId || (subscription && (subscription.status === "canceled" || status === "non-renewing"))) && (
              <TouchableOpacity
                style={[styles.subscribeButton, styles.featuredSubscribeButton]}
                onPress={() => handleSubscribe("Monthly", 1500)}
                disabled={isProcessing}
              >
                {isProcessing && selectedPlanType === "Monthly" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Subscribe Now</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* View Subscription Button */}
        {subscription && (
          <TouchableOpacity style={styles.viewSubscriptionButton} onPress={handleViewSubscription}>
            <Icon name="eye" type="feather" color="#FFFFFF" size={20} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View Current Subscription</Text>
          </TouchableOpacity>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("DriverStats")}>
          <Icon name="arrow-left" type="feather" color="#FFFFFF" size={20} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBFD",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FBFD",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "90%",
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    position: "relative",
  },
  featuredPlanCard: {
    borderWidth: 2,
    borderColor: "#0DCAF0",
    paddingTop: 32,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    marginLeft: -80,
    backgroundColor: "#0DCAF0",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    width: 160,
    alignItems: "center",
  },
  recommendedText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  planHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  planBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  featuredPlanBadge: {
    backgroundColor: "#0DCAF0",
  },
  planBadgeText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 14,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0F172A",
  },
  planPeriod: {
    fontSize: 16,
    color: "#64748B",
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 15,
    color: "#334155",
  },
  subscribeButton: {
    backgroundColor: "#0DCAF0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredSubscribeButton: {
    backgroundColor: "#0DCAF0",
  },
  viewSubscriptionButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    backgroundColor: "#64748B",
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
})

export default SubscriptionPage
