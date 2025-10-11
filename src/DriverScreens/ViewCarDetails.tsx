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
  FlatList,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import { useSelector } from "react-redux"
import axios from "axios"
import { api } from "../../api"

const { width } = Dimensions.get("window")

const ViewCarDetails = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [carListings, setCarListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const sortedCarListings = response.data.carListings.sort((a, b) => b.id - a.id)
        setCarListings(sortedCarListings)
      } else {
        setCarListings([])
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
    })
    return unsubscribe
  }, [user_id, navigation, fetchCarDetails])

  const handleAddNewCar = () => {
    // If user has existing cars, pass the first one as template data
    if (carListings.length > 0) {
      // Pass the most recent car as template for pre-population
      const templateCar = carListings[0];
      navigation.navigate("CarListing", { carDetails: templateCar });
    } else {
      // No existing cars, navigate without data for fresh form
      navigation.navigate("CarListing");
    }
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
            onPress={handleAddNewCar}
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

    return (
      <View style={styles.card}>
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
      </View>
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
      <FlatList
        data={carListings}
        renderItem={renderCarItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Your Car Details:</Text>
            <Text style={styles.instructionsText}>
              • Below are your current car listings
            </Text>
            <Text style={styles.instructionsText}>
              • To add another car, tap the "Add New Car" button below
            </Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.footerButtonsContainer}>
            {/* Add New Car Button */}
            <TouchableOpacity style={styles.addNewCarButton} onPress={handleAddNewCar}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
              <Text style={styles.addButtonText}>Add New Car</Text>
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
    marginTop: 10,
  },
  addNewCarButton: {
    backgroundColor: "#28a745",
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
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
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
})

export default ViewCarDetails