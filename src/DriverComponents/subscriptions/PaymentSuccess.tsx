import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import axios from "axios"
import { api } from "../../../api" // Keeping the original import structure

const PaymentSuccess = ({ route, navigation }) => {
  const { planType, cost, reference } = route.params
  const [loading, setLoading] = useState(true)
  const [transaction, setTransaction] = useState(null)
  const [latestSubscriptionCode, setLatestSubscriptionCode] = useState(null)
  console.log("PaymentSuccess route params:", route.params)

  useEffect(() => {
    const verifyTransaction = async () => {
      try {
        console.log("Verifying transaction with reference:", reference)

        const response = await axios.post(api + "payment-callback", {
          reference,
        })

        console.log("Transaction Verification Response:", response.data)

        if (response.data.success) {
          setTransaction(response.data.transactionDetails)
        } else {
          console.error("Transaction failed:", response.data.error)
          setTransaction(null)
        }
        fetchSubscriptions()
      } catch (error) {
        console.error("Error verifying transaction:", error)
        setTransaction(null)
      } finally {
        setLoading(false)
      }
    }

    verifyTransaction()
  }, [reference, planType])

  const fetchSubscriptions = async () => {
    if (!transaction || !transaction.customerId) return null

    const customer_id = transaction.customerId
    console.log("Fetching subscriptions for customer ID:", customer_id)

    try {
      const response = await fetch(api + `subscription?customer=${customer_id}`)

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

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DCAF0" />
          <Text style={styles.loadingText}>Verifying your payment...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
          </View>

          {transaction ? (
            <View style={styles.contentContainer}>
              <View style={styles.card}>
                <Text style={styles.message}>
                  Thank you, {transaction.first_name} {transaction.last_name}, for subscribing to the {transaction.name}{" "}
                  plan.
                </Text>

                <View style={styles.divider} />

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>{transaction.name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{transaction.description}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>R{transaction.amount}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Interval</Text>
                    <Text style={styles.detailValue}>{transaction.interval}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Paid At</Text>
                    <Text style={styles.detailValue}>{formatDate(transaction.paidAt)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Card</Text>
                    <Text style={styles.detailValue}>**** **** **** {transaction.last4}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{transaction.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.referenceContainer}>
                  <Text style={styles.referenceLabel}>Reference ID</Text>
                  <Text style={styles.referenceValue}>{transaction.reference}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() =>
                  navigation.navigate("Subscriptions", {
                    // customerId: transaction.customerId,
                    // interval: transaction.interval,
                    // latestSubscriptionCode: latestSubscriptionCode,
                    status: transaction.status,
                  })
                }
              >
                <Text style={styles.buttonText}>View Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error verifying subscription details.</Text>
              <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
                <Text style={styles.errorButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4B5563",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0DCAF0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 40,
    color: "white",
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  contentContainer: {
    width: "100%",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4B5563",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 15,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    flex: 2,
    textAlign: "right",
  },
  statusBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#065F46",
    fontSize: 14,
    fontWeight: "500",
  },
  referenceContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 16,
  },
  referenceLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  referenceValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#0DCAF0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
})

export default PaymentSuccess
