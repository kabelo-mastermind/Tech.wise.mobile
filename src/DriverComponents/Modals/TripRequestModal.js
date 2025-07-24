"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView, // Import ScrollView
} from "react-native"
import { Icon } from "react-native-elements"
import { useNavigation } from "@react-navigation/native"
import { api } from "../../../api"
import driverImage from "../../../assets/driver.png"
import { emitAcceptTrip, emitCancelTrip } from "../../configSocket/socketConfig"
import { useSelector } from "react-redux"
import { useDispatch } from 'react-redux';
import { setSelectedRequest } from "../../redux/actions/tripActions"
 // Adjust the import path as necessary


const { width, height } = Dimensions.get("window")

const TripRequestModal = ({ isVisible, request, onClose, onTripUpdate }) => {
  const navigation = useNavigation()
  const [customerDetails, setCustomerDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(height))
  const selectedRequest = useSelector((state) => state.trip.selectedRequest)
  console.log("Selected Request from redux:", selectedRequest)
  const dispatch = useDispatch();

  const customerId = useSelector((state) => state.trip.selectedRequest?.customerId)
  const tripId = useSelector((state) => state.trip.selectedRequest?.id)

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isVisible])

  useEffect(() => {
    if (isVisible && customerId) {
      fetchCustomerDetails(customerId)
    }
  }, [isVisible, customerId])

  const fetchCustomerDetails = async (customerId) => {
    setLoading(true)
    try {
      const apiUrl = `${api}customer/${customerId}`

      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)

      const data = await response.json()
      setCustomerDetails(data)
    } catch (error) {
      console.error("❌ Error fetching customer details:", error)
      setCustomerDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      // Update trip status via your backend API
      const response = await fetch(`${api}trips/${tripId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
          cancellation_reason: null,
          cancel_by: null,
        }),
      })

      if (!response.ok) throw new Error("Error updating trip status")

      emitAcceptTrip(tripId, customerId)
      onTripUpdate(tripId) // Remove trip from the pending list
      onClose()
      dispatch(setSelectedRequest(selectedRequest));

      // navigation.navigate("PendingRequests", { tripAccepted: true, tripData: selectedRequest })
    } catch (error) {
      console.error("Error updating trip status:", error)
    }
  }

  const handleDecline = async () => {
    try {
      if (!cancellationReason) {
        // Show a prompt or alert if the cancellation reason is empty (optional)
        return alert("Please provide a cancellation reason.")
      }

      // Update trip status via your backend API
      const response = await fetch(`${api}trips/${tripId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "declined",
          cancellation_reason: cancellationReason || null,
          cancel_by: "driver", // Assuming 'driver' is the cancel_by value
        }),
      })

      if (!response.ok) throw new Error("Error updating trip status")

      emitCancelTrip(tripId, customerId)
      onTripUpdate(tripId) // Remove trip from the pending list
      onClose()
      dispatch(setSelectedRequest(null));
      // navigation.navigate("PendingRequests", { tripAccepted: false, tripData: request })
    } catch (error) {
      console.error("Error updating trip status:", error)
    }
  }

  if (!isVisible || !selectedRequest) return null

  // Calculate trip details
  const pickupLocation = selectedRequest?.pickUpLocation || "Not specified"
  const dropoffLocation = selectedRequest?.dropOffLocation || "Not specified"
  const estimatedDistance = selectedRequest?.distance ? `${selectedRequest.distance} km` : "Not available"
  const estimatedFare = selectedRequest?.fare ? `$${selectedRequest.fare}` : "Not available"

  return (
    <Modal animationType="none" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerHandle} />
            <Text style={styles.headerText}>New Trip Request</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" color="#64748b" size={22} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0DCAF0" />
              <Text style={styles.loadingText}>Loading customer details...</Text>
            </View>
          ) : customerDetails ? (
            <ScrollView contentContainerStyle={styles.scrollContentContainer}>
              <View style={styles.customerContainer}>
                <View style={styles.profileImageContainer}>
                  <Image
                    source={customerDetails.profile_picture ? { uri: customerDetails.profile_picture } : driverImage}
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customerDetails.name || "Customer"}</Text>
                  <View style={styles.customerDetail}>
                    <Icon name="person" type="material" size={16} color="#64748b" />
                    <Text style={styles.customerDetailText}>{customerDetails.gender || "Not specified"}</Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" type="material" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>4.8</Text>
                    <Text style={styles.tripCountText}>(124 trips)</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripDetailsContainer}>
                <Text style={styles.sectionTitle}>Trip Details</Text>

                <View style={styles.tripDetail}>
                  <View style={styles.iconContainer}>
                    <Icon name="location-pin" type="material" size={20} color="#0DCAF0" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Pickup</Text>
                    <Text style={styles.detailValue}>{pickupLocation}</Text>
                  </View>
                </View>

                <View style={styles.tripDetail}>
                  <View style={styles.iconContainer}>
                    <Icon name="flag" type="material" size={20} color="#0DCAF0" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Dropoff</Text>
                    <Text style={styles.detailValue}>{dropoffLocation}</Text>
                  </View>
                </View>

                {/* <View style={styles.tripMetrics}>
                  <View style={styles.metricItem}>
                    <Icon name="map" type="material" size={18} color="#0DCAF0" />
                    <Text style={styles.metricValue}>{estimatedDistance}</Text>
                    <Text style={styles.metricLabel}>Distance</Text>
                  </View>
                  
                  <View style={styles.metricDivider} />
                  
                  <View style={styles.metricItem}>
                    <Icon name="attach-money" type="material" size={18} color="#0DCAF0" />
                    <Text style={styles.metricValue}>{estimatedFare}</Text>
                    <Text style={styles.metricLabel}>Fare</Text>
                  </View>
                </View> */}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Reason for declining (required)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter reason if declining the trip"
                  value={cancellationReason}
                  onChangeText={setCancellationReason}
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                  numberOfLines={2}
                />
              </View>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={handleDecline}
                  activeOpacity={0.8}
                >
                  <Icon name="close" type="material" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]} 
                  onPress={handleAccept}
                  activeOpacity={0.8}
                >
                  <Icon name="check" type="material" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" type="material" size={48} color="#f43f5e" />
              <Text style={styles.errorText}>Failed to load customer details</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchCustomerDetails(customerId)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  scrollContentContainer: {
    // New style for ScrollView content
    padding: 20,
    paddingBottom: 40, // Add some extra padding at the bottom if needed
  },
  contentContainer: {
    // Remove padding from this if it's now inside ScrollView
    // padding: 20, // Remove this line
  },
  modalHeader: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e0",
    position: "absolute",
    top: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#f43f5e",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  customerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginRight: 16,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  customerDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  customerDetailText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    marginLeft: 4,
  },
  tripCountText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
  },
  tripDetailsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
  },
  tripDetail: {
    flexDirection: "row",
    marginBottom: 10,
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: "#1e293b",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    textAlignVertical: "top", // Align text to the top in multiline input
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#34d399",
  },
  declineButton: {
    backgroundColor: "#f43f5e",
  },
})

export default TripRequestModal
