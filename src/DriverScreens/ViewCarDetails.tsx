"use client"
import { useState, useEffect, useCallback } from "react"
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList, // Using FlatList for better performance with lists
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import { useSelector } from "react-redux"
import axios from "axios"
import { api } from "../../api" // Adjust path to your api.js

const { width } = Dimensions.get("window")

const ViewCarDetails = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [carListings, setCarListings] = useState([]) // Changed to an array
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState(null) // State for selected car ID

  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id || null

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const fetchCarDetails = useCallback(async () => {
    if (!user_id) {
      setError("User ID not found. Please log in.")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await axios.get(`${api}car_listing/user/${user_id}`)
      if (response.data && response.data.carListings && response.data.carListings.length > 0) {
        // Sort by ID in descending order to show newest first, or by any preferred order
        const sortedCarListings = response.data.carListings.sort((a, b) => b.id - a.id)
        setCarListings(sortedCarListings) // Set the entire sorted array
      } else {
        setCarListings([]) // No cars found, set to empty array
      }
    } catch (err) {
      console.error("Error fetching car details:", err)
      setError("Failed to fetch car details. Please try again.")
      Alert.alert("Error", "Failed to fetch car details. Please ensure your car is listed.")
    } finally {
      setLoading(false)
    }
  }, [user_id])

  useEffect(() => {
    fetchCarDetails()
    const unsubscribe = navigation.addListener("focus", () => {
      fetchCarDetails()
      setSelectedCarId(null) // Deselect card when screen is focused again
    })
    return unsubscribe
  }, [user_id, navigation, fetchCarDetails])

  const handleCardPress = (carId) => {
    // Toggle selection: if already selected, deselect; otherwise, select
    setSelectedCarId(selectedCarId === carId ? null : carId)
  }

  // Find the currently selected car object
  const selectedCarObject = carListings.find((car) => car.id === selectedCarId)

  const handleEditPress = () => {
    if (!selectedCarObject) {
      Alert.alert("Selection Required", "Please tap a car card to select it before editing.")
      return
    }
    Alert.alert(
      "Confirm Edit",
      "You are about to edit your car details. Please note that all changes will be reviewed by admin and may take up to 24 hours to reflect. Do you wish to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setSelectedCarId(null), // Deselect on cancel
        },
        {
          text: "Proceed",
          onPress: () => {
            navigation.navigate("CarListing", { carDetails: selectedCarObject }) // Pass the selected car object
            setSelectedCarId(null) // Deselect after navigating
          },
        },
      ],
    )
  }

  const handleDelete = async () => {
    if (!selectedCarObject) {
      Alert.alert("Selection Required", "Please tap a car card to select it before deleting.")
      return
    }
    Alert.alert("Confirm Deletion", "Are you sure you want to delete this car listing? This action cannot be undone.", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setSelectedCarId(null), // Deselect on cancel
      },
      {
        text: "Delete",
        onPress: async () => {
          setIsDeleting(true)
          try {
            const response = await axios.delete(`${api}car_listing/${selectedCarObject.id}`)
            if (response.status === 200 || response.status === 204) {
              Alert.alert("Success", "Car listing deleted successfully!", [
                {
                  text: "OK",
                  onPress: () => {
                    fetchCarDetails() // Re-fetch all cars to update the list
                    setSelectedCarId(null) // Deselect after action
                  },
                },
              ])
            } else {
              Alert.alert("Error", response.data.error || "Failed to delete car listing.")
            }
          } catch (error) {
            console.error("Delete error:", error)
            Alert.alert("Error", "Failed to delete car listing. Please try again.")
          } finally {
            setIsDeleting(false)
          }
        },
        style: "destructive",
      },
    ])
  }

  const handleAddNewCar = () => {
    navigation.navigate("CarListing") // Navigate without carDetails to trigger creation mode
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DCAF0" />
        <Text style={styles.loadingText}>Loading car details...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (carListings.length === 0) {
    // Check if the array is empty
    return (
      <SafeAreaView style={styles.noCarContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <Icon type="material-community" name="menu" color="#0F172A" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Car Details</Text>
        </View>
        <View style={styles.noCarContent}>
          <Ionicons name="car-outline" size={60} color="#6c757d" />
          <Text style={styles.noCarText}>No car details found.</Text>
          <Text style={styles.noCarSubText}>Start by listing your first car!</Text>
          <TouchableOpacity
            style={styles.listCarButton}
            onPress={handleAddNewCar} // Use the new handler
          >
            <Text style={styles.listCarButtonText}>List My Car</Text>
          </TouchableOpacity>
        </View>
        <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
      </SafeAreaView>
    )
  }

  // Render individual car item for FlatList
  const renderCarItem = ({ item: car }) => {
    let carClassText
    if (car.class === null || car.class === undefined) {
      carClassText = "Status: Not Approved"
    } else if (car.class === 1) {
      carClassText = "Class: nthome_black"
    } else if (car.class === 2) {
      carClassText = "Class: nthome_x"
    } else {
      carClassText = `Class: ${car.class}`
    }

    const isCurrentCarSelected = selectedCarId === car.id

    return (
      <TouchableOpacity
        style={[styles.card, isCurrentCarSelected && styles.selectedCardBorder]}
        onPress={() => handleCardPress(car.id)}
        activeOpacity={0.8} // Give feedback on press
      >
        {isCurrentCarSelected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={30} color="#0DCAF0" />
          </View>
        )}
        {car.car_image ? (
          <Image source={{ uri: car.car_image }} style={styles.carImage} />
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="image-outline" size={60} color="#adb5bd" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
        <View style={styles.detailsContainer}>
          <Text style={styles.carName}>
            {car.car_make} {car.car_model} ({car.car_year})
          </Text>
          <View style={styles.detailRow}>
            <Ionicons name="color-fill-outline" size={20} color="#6c757d" style={styles.detailIcon} />
            <Text style={styles.detailText}>Color: {car.car_colour}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#6c757d" style={styles.detailIcon} />
            <Text style={styles.detailText}>Seats: {car.number_of_seats}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={20} color="#6c757d" style={styles.detailIcon} />
            <Text style={styles.detailText}>License Plate: {car.license_plate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={20} color="#6c757d" style={styles.detailIcon} />
            <Text style={styles.detailText}>{carClassText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Car Details</Text>
      </View>
      <FlatList // Changed from ScrollView to FlatList
        data={carListings}
        renderItem={renderCarItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to Manage Your Car Details:</Text>
            <Text style={styles.instructionsText}>
              • Tap on a car card below to select it. Once selected, you can edit or delete its details.
            </Text>
            <Text style={styles.instructionsText}>
              • To update any car information, select the car and tap "Edit Car Details".
            </Text>
            <Text style={styles.instructionsText}>• To add a new car, tap the "Add New Car" button below.</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.footerButtonsContainer}>
            {/* Edit Button */}
            <TouchableOpacity
              style={[styles.editButton, !selectedCarObject && styles.actionButtonDisabled]}
              onPress={handleEditPress}
              disabled={!selectedCarObject}
            >
              <Ionicons name="pencil-outline" size={20} color="#fff" style={styles.editIcon} />
              <Text style={styles.editButtonText}>Edit Car Details</Text>
            </TouchableOpacity>
            {/* Delete Button */}
            <TouchableOpacity
              style={[
                styles.deleteButton,
                !selectedCarObject && styles.actionButtonDisabled,
                isDeleting && styles.deleteButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={!selectedCarObject || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#fff" style={styles.deleteIcon} />
                  <Text style={styles.deleteButtonText}>Delete Car</Text>
                </>
              )}
            </TouchableOpacity>
            {/* Add New Car Button */}
            <TouchableOpacity style={styles.addNewCarButton} onPress={handleAddNewCar}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.editIcon} />
              <Text style={styles.editButtonText}>Add New Car</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#0DCAF0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noCarContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  noCarContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noCarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 15,
  },
  noCarSubText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 5,
    textAlign: "center",
  },
  listCarButton: {
    marginTop: 30,
    backgroundColor: "#0DCAF0",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listCarButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  header: {
    backgroundColor: "#0DCAF0",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
  },
  flatListContent: {
    // New style for FlatList content container
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
    position: "relative", // Needed for absolute positioning of checkmark
  },
  selectedCardBorder: {
    // New style for selected card
    borderColor: "#0DCAF0",
    borderWidth: 3,
  },
  checkmarkContainer: {
    // New style for checkmark icon
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1, // Ensure it's above the image
    backgroundColor: "white",
    borderRadius: 15,
    padding: 2,
  },
  carImage: {
    width: "100%",
    height: width * 0.6,
    resizeMode: "cover",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  noImagePlaceholder: {
    width: "100%",
    height: width * 0.6,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  noImageText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6c757d",
  },
  detailsContainer: {
    padding: 20,
  },
  carName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 15,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
    width: 24,
  },
  detailText: {
    fontSize: 16,
    color: "#495057",
  },
  footerButtonsContainer: {
    // New container for action buttons
    marginTop: 10,
  },
  editButton: {
    backgroundColor: "#0DCAF0",
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonDisabled: {
    backgroundColor: "#e9a8af",
  },
  actionButtonDisabled: {
    // New style for disabled action buttons
    opacity: 0.5,
  },
  deleteIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  instructionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 5,
    lineHeight: 20,
  },
  addNewCarButton: {
    // New style for the "Add New Car" button
    backgroundColor: "#28a745", // Green color for add
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})

export default ViewCarDetails
