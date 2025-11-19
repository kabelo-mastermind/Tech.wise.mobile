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
import LoadingScreen from "../components/LoadingScreen";

const { width } = Dimensions.get("window")

const ViewCarDetails = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [carListings, setCarListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 👇 Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id || null

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  // 👇 Main fetch function with retry logic
  const fetchCarDetails = useCallback(async () => {
    // Check if user_id is available
    if (!user_id) {
      setError("User ID not found. Please log in.")
      setLoading(false)
      return
    }

    try {
      setError(null);
      setLoading(true);

      const response = await axios.get(`${api}car_listing/user/${user_id}`)
      if (response.data && response.data.carListings && response.data.carListings.length > 0) {
        const sortedCarListings = response.data.carListings.sort((a, b) => b.id - a.id)
        setCarListings(sortedCarListings)
      } else {
        setCarListings([])
      }

      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error("Error fetching car details:", err)

      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);

        // Auto-retry after 2 seconds
        setTimeout(() => {
          fetchCarDetails();
        }, 2000);
      } else {
        // Max retries reached
        setError("Unable to load car details. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user_id, retryCount])

  // 👇 Manual retry function for LoadingScreen
  const retryFetchData = () => {
    if (retryCount >= MAX_RETRIES) {
      setRetryCount(0);
    }
    fetchCarDetails();
  };

  useEffect(() => {
    if (user_id) {
      fetchCarDetails();
    } else {
      // If no user_id, show error immediately
      setError("User ID not found. Please log in.");
      setLoading(false);
    }

    const unsubscribe = navigation.addListener("focus", () => {
      if (user_id) {
        fetchCarDetails();
      }
    });

    return unsubscribe;
  }, [user_id, navigation, fetchCarDetails]);

  const handleAddNewCar = () => {
    // If user has existing cars, pass the first one as template data
    if (carListings.length > 0) {
      const templateCar = carListings[0];
      navigation.navigate("CarListing", { carDetails: templateCar });
    } else {
      navigation.navigate("CarListing");
    }
  }



  // 👇 Use LoadingScreen for loading state
  if (loading) {
    return (
      <LoadingScreen
        loading={loading}
        error={error}
        onRetry={retryFetchData}
      />
    );
  }

  // 👇 Show login error screen if user_id is not found
  if (error && !user_id) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="log-in-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>Please Log In</Text>
        <Text style={styles.errorSubText}>
          You need to be logged in to view your car details.
        </Text>
        {/* <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 👇 Error state after max retries for network issues
  if (error && user_id) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryInfo}>
          {retryCount > 0 && `Retry attempts: ${retryCount}/${MAX_RETRIES}`}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryFetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Empty state - no cars found but user is logged in
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
            <Text style={styles.listCarButtonText}>Add My Car</Text>
          </TouchableOpacity>
        </View>
        <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
      </SafeAreaView>
    );
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
    );
  };

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
            <TouchableOpacity style={styles.addNewCarButton} onPress={handleAddNewCar}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
              <Text style={styles.addButtonText}>Add New Car</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  );
};

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
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0DCAF0",
    minWidth: 120,
  },
  backButtonText: {
    color: "#0DCAF0",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
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
  errorSubText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryInfo: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: "#0DCAF0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 120,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
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