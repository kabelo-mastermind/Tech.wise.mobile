"use client"

import { useState, useEffect, useRef } from "react"
import { StyleSheet, View, Dimensions, TouchableOpacity, BackHandler, Text, Animated, Linking, Alert } from "react-native"
import { Icon } from "react-native-elements"
import { colors } from "../global/styles"
import MapComponent from "../components/MapComponent"
import * as Location from "expo-location"
import * as TaskManager from 'expo-task-manager';
import { SafeAreaView } from "react-native-safe-area-context"
import { db } from "../../FirebaseConfig"
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore"
import { useDispatch, useSelector } from "react-redux"
import {
  connectSocket,
  listenToNewTripRequests,
  emitStartTrip,
  emitEndTrip,
  emitArrival,
  emitCancelTrip,
  listenCancelTrip,
  listenToChatMessages,
} from "../configSocket/socketConfig" // import your socket functions
import axios from "axios"
import { api } from "../../api"
import TripCancellationModal from "../components/TripCancelationModal"
import { setTripData } from "../redux/actions/tripActions"
import { addMessage, clearMessages } from "../redux/actions/messageAction"
import { formatTime } from "../utils/timeTracker"
import CancelAlertModal from "../components/CancelAlertModal"
import RideRatingModal from "./RideRatingScreen"
import { Ionicons } from '@expo/vector-icons';
import TripRequestModal from "../DriverComponents/Modals/TripRequestModal"


const SCREEN_HEIGHT = Dimensions.get("window").height
const SCREEN_WIDTH = Dimensions.get("window").width
const BUTTON_WIDTH = 140; // optional for consistency

// Define theme colors
const THEME = {
  background: "#121212",
  card: "#1A1D26",
  primary: "#00D8F0", // Bright cyan
  text: {
    primary: "#FFFFFF",
    secondary: "#AAAAAA",
  },
}
const BACKGROUND_LOCATION_TASK = 'background-location-task';


export default function PendingRequests({ navigation, route }) {
  const dispatch = useDispatch() // Redux dispatch function
  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id || null
  const [tripStarted, setTripStarted] = useState(false)
  const selectedRequest = useSelector((state) => state.trip.selectedRequest)
  const session_id = selectedRequest?.session_id;
  const [modalVisible, setModalVisible] = useState(false);
  const [isBackgroundTrackingActive, setIsBackgroundTrackingActive] = useState(false);

  // Define the background location task INSIDE the component
  useEffect(() => {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        const location = locations[0];

        if (location && user_id) { // Check if user_id is available
          const { latitude, longitude } = location.coords;

          // Update driver location in state
          setDriverLocation({ latitude, longitude });

          // Save to Firebase
          try {
            const driverLocationRef = doc(db, "driver_locations", user_id.toString());
            await setDoc(
              driverLocationRef,
              {
                userId: user_id,
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
                background: true,
              },
              { merge: true },
            );
            console.log('Background location saved successfully!');
          } catch (error) {
            console.log("Error saving background driver location:", error);
          }
        }
      }
    });
  }, [user_id]); // Add user_id as dependency

  const startBackgroundLocationTracking = async () => {
    try {
      // Request background permissions
      const { status } = await Location.requestBackgroundPermissionsAsync();

      if (status === 'granted') {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Trip in progress',
            notificationBody: 'Tracking your location in the background',
            notificationColor: '#00D8F0',
          },
        });

        setIsBackgroundTrackingActive(true);
        console.log('Background location tracking started');
      } else {
        console.warn('Background location permission not granted');
        Alert.alert(
          'Permission Required',
          'Background location permission is required to track your trip when the app is in the background.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error starting background location tracking:', error);
    }
  };

  const stopBackgroundLocationTracking = async () => {
    try {
      let hasStarted = false;
      try {
        hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch (error) {
        console.log('Could not check if location updates started:', error);
      }

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      setIsBackgroundTrackingActive(false);
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  };
  // console.log("Selected Request from Redux in ---------------------------------:", selectedRequest)
  // const openDrawer = route.params?.openDrawer
  // const state = route.params?.newState
  // console.log(state, "state from pending requests")
  // console.log(openDrawer, "openDrawer from pending requests")

  //from TripRequestModal
  // const tripAccepted = route.params?.tripAccepted
  //from TrpRequestModal
  const tripData = selectedRequest
  // console.log("Trip Data from Redux in PendingRequests:", tripData?.customerId);

  useEffect(() => {
    if (tripData) {
      console.log("✅ tripId:", tripData.id) // 'id' is tripId
      console.log("✅ customerId:", tripData.customerId)
    } else {
      console.log("❌ tripData is undefined")
    }
  }, [])

  // console.log("Received tripData from route params:", tripData)

  const [tripRequestSocket, setTripRequest] = useState(selectedRequest)
  console.log("Trip Request from Redux in PendingRequests:", tripRequestSocket)
  // const tripRequestSocket = useSelector((state) => state.trip.tripData)

  const [eta, setEta] = useState("N/A")
  const [distance, setDistance] = useState("N/A")
  const [showStartButton, setShowStartButton] = useState(false)
  const [showEndButton, setShowEndButton] = useState(false)
  const [distanceTraveld, setDistanceTraveld] = useState("N/A")
  const [messages, setMessages] = useState([])

  // console.log("Trip ID from Redux:", trip_id);
  // Timer state and ref
  const [secondsOnline, setSecondsOnline] = useState(0)
  // const timerRef = useRef(null)
  const [loading, setLoading] = useState(true)

  const [remainingTime, setRemainingTime] = useState(0)
  const [userOrigin, setUserOrigin] = useState({ latitude: 0, longitude: 0 });
  const [userDestination, setUserDestination] = useState({ latitude: 0, longitude: 0 });
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  useEffect(() => {
    axios
      .get(api + `/driver/remainingTime/${user_id}`)
      .then((res) => {
        setRemainingTime(res.data.remainingSeconds)
        startCountdown(res.data.remainingSeconds)
      })
      .catch((err) => console.error(err, "-----------------"))
  }, [user_id])
  // Timer functions

  const startCountdown = (initialSeconds) => {
    let seconds = initialSeconds
    const interval = setInterval(() => {
      seconds--
      setRemainingTime(seconds)
      if (seconds <= 0) {
        clearInterval(interval)
        handleGoOffline()
      }
    }, 1000)
  }
  const timerRef = useRef(null) // ref to hold the timer id

  useEffect(() => {
    if (isOnline) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => Math.max(prev - 1, 0))
      }, 1000)

      return () => clearInterval(timerRef.current)
    }
  }, [isOnline]) // depend on isOnline


  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null // optional: clear ref so it can't clear again
      console.log("Timer stopped")
    }
  }
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  //go online button and offline button

  const handleGoOffline = async () => {
    // Use session_id and user_id from above
    console.log("handleGoOffline called", session_id);

    animateButton();

    if (!user_id) {
      console.warn("Missing user_id or session_id");
      return;
    }

    try {
      // Fetch current driver state before updating
      console.log("Fetching current driver state...");

      const fetchResponse = await axios.get(`${api}getDriverState?userId=${user_id}`);
      const currentState = fetchResponse.data.state;

      if (currentState === "online") {
        const newState = "offline";
        console.log("Driver is online, setting to offline...");

        const updateResponse = await axios.put(`${api}updateDriverState`, {
          user_id,
          state: newState,
          onlineDuration: secondsOnline,
          last_online_timestamp: new Date().toISOString(),
        });

        if (updateResponse.status === 200) {
          console.log("Driver state updated to offline.");

          // ✅ ADD: Update driver_session end_time by session_id
          try {
            console.log("Updating driver_session end_time...");

            const sessionUpdateResponse = await axios.put(`${api}endDriverSession`, {
              session_id, // pass session_id
              end_time: new Date().toISOString(),
              workedSeconds: secondsOnline,
            });

            if (sessionUpdateResponse.status === 200) {
              console.log("Driver session end_time stored successfully for session_id:", session_id);
            } else {
              console.warn("Failed to store end_time in driver_session. Status:", sessionUpdateResponse.status);
            }
          } catch (sessionError) {
            console.error("Error updating driver_session:", sessionError.response?.data || sessionError.message);
          }

          setIsOnline(false);
          stopTimer(); // Stop the timer when going offline

          console.log("Driver is now offline navigating.", secondsOnline);

          // ✅ Redirect AFTER storing end_time
          navigation.navigate("DriverStats", {
            user_id,
            session_id,
            workedSeconds: secondsOnline,
            state: newState,
          });
        } else {
          console.warn("Failed to update driver state. Status:", updateResponse.status);
        }
      } else {
        // If driver is offline, set them to online
        const updateResponse = await axios.put(`${api}updateDriverState`, {
          user_id,
          state: "online",
          onlineDuration: 0,
        });

        if (updateResponse.status === 200) {
          setIsOnline(true);
          setSecondsOnline(0);
          console.log("Driver is now online.");
          navigation.navigate("PendingRequests", { user_id, session_id });
        } else if (updateResponse.status === 403) {
          alert("You have reached the 12-hour daily limit. Please try again tomorrow.");
        }
      }
    } catch (error) {
      console.error("Failed to update driver status:", error.response?.data || error.message);
    }
  };
  useEffect(() => {
    const onBackPress = () => {
      handleGoOffline();
      return true; // Prevent default back navigation
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [handleGoOffline]);
  // Extracting user origin and destination from tripData
  useEffect(() => {
    if (selectedRequest) {
      setUserOrigin({
        latitude: selectedRequest.pickUpLatitude ?? 0,
        longitude: selectedRequest.pickUpLongitude ?? 0,
      });
      setUserDestination({
        latitude: selectedRequest.dropOffLatitude ?? 0,
        longitude: selectedRequest.dropOffLongitude ?? 0,
      });
    }
    console.log("user destination ---------------", userDestination)
  }, [selectedRequest]);
  // socket notifications
  useEffect(() => {
    if (!user_id) return

    const userType = "driver"
    connectSocket(user_id, userType) // Ensure the driver is connected

    listenToNewTripRequests((tripData) => {
      if (!tripData) {
        console.error("❌ tripData is undefined or null on frontend!")
        return
      }

      // Show an alert
      alert(`New Trip Request Received!`)
      // console.log("Trip request received::::::::::::::---------:", tripData)

      // Increment notification count - ensure this runs
      setNotificationCount((prevCount) => {
        console.log("Incrementing notification count from", prevCount, "to", prevCount + 1)
        return prevCount + 1
      })

      // Store the trip data
      setTripRequest(tripData)

      // Dispatch user details to Redux
      dispatch(
        setTripData({
          id: tripData.tripId, // Make sure we're using the correct property
          customer_id: tripData.user_id,
        }),
      )
    })
    console.log("Trip Request Socket Data::::::::::::::::::::", tripRequestSocket);

    listenCancelTrip((tripData) => {
      setUserOrigin({ latitude: null, longitude: null });
      setUserDestination({ latitude: null, longitude: null })
      handleUpdateDriverState()
      setShowCancelAlert(true); // show alert
    });

    listenToChatMessages((messageData) => {
      // Increment notification count
      setNotificationCountChat((prevCount) => prevCount + 1)
      dispatch(
        addMessage({
          id: Date.now().toString(),
          senderId: tripData?.customerId,
          receiverId: user_id,
          tripId: tripData?.tripId,
          message: messageData?.message,
          timestamp: new Date().toISOString(),
        })
      );
    })
  }, [user_id])

  //setting user origin and destination from socket
  useEffect(() => {
    if (tripRequestSocket?.pickUpLocation) {
      setUserOrigin({
        latitude: tripRequestSocket.pickUpLatitude,
        longitude: tripRequestSocket.pickUpLongitude,
      })
    }

    if (tripRequestSocket?.dropOffLocation && tripStarted) {
      setUserDestination({
        latitude: tripRequestSocket.dropOffLatitude,
        longitude: tripRequestSocket.dropOffLongitude,
      })
    }
  }, [tripRequestSocket])

  const [driverLocation, setDriverLocation] = useState({
    latitude: 0,
    longitude: 0,
  })
  //driver location
  // Update the driver location useEffect
  useEffect(() => {
    let watchId;

    (async () => {
      // Only track foreground location if background tracking is not active
      if (!isBackgroundTrackingActive) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          return;
        }

        watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 1,
          },
          async (position) => {
            const { latitude, longitude } = position.coords;
            setDriverLocation({ latitude, longitude });

            try {
              const driverLocationRef = doc(db, "driver_locations", user_id.toString());
              await setDoc(
                driverLocationRef,
                {
                  userId: user_id,
                  latitude,
                  longitude,
                  timestamp: new Date().toISOString(),
                  background: false, // Mark as foreground location
                },
                { merge: true },
              );
            } catch (error) {
              console.log("Error saving driver location:", error);
            }
          },
        );
      }
    })();

    return () => {
      if (watchId) {
        watchId.remove();
      }
    };
  }, [user_id, isBackgroundTrackingActive]); // Add isBackgroundTrackingActive as dependency

  // Clean up background tracking on component unmount
  useEffect(() => {
    return () => {
      if (isBackgroundTrackingActive) {
        stopBackgroundLocationTracking();
      }
    };
  }, [isBackgroundTrackingActive]);

  // Haversine formula for distance calculation
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Earth radius in meters
    const toRadians = (angle) => (angle * Math.PI) / 180

    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Function to estimate ETA (assuming an average speed of 40 km/h or 11.11 m/s)
  const estimateETA = (distanceInMeters, speedInMps = 11.11) => {
    const timeInSeconds = distanceInMeters / speedInMps
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes} min ${seconds} sec`
  }


  const openNavigation = async (origin, destination, app = 'google') => {
    const { latitude: oLat, longitude: oLng } = origin;
    const { latitude: dLat, longitude: dLng } = destination;

    if (!oLat || !oLng || !dLat || !dLng) {
      Alert.alert('Invalid locations');
      return;
    }

    let url = '';

    if (app === 'google') {
      url = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
    } else if (app === 'waze') {
      url = `https://waze.com/ul?ll=${dLat},${dLng}&navigate=yes`;
    } else {
      Alert.alert('Unsupported navigation app');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`Cannot open the ${app} URL`);
      }
    } catch (err) {
      Alert.alert('Failed to open navigation: ' + err.message);
    }
  };

  const [animationValue] = useState(new Animated.Value(1))
  const [isOnline, setIsOnline] = useState(true)
  const [bellAnimation] = useState(new Animated.Value(1))
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationCountChat, setNotificationCountChat] = useState(0)
  // Trip Cancellation Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [tripStatusAccepted, setTripStatusAccepted] = useState(null)

  const handleCancelTrip = () => {
    setCancelModalVisible(true) // Show cancellation modal
  }
  const handleCloseModal = () => {
    setCancelModalVisible(false) // Close modal
  }
  // Fetch trip statuses
  useEffect(() => {
    const fetchTripStatuses = async () => {
      if (!user_id) return

      try {
        const response = await axios.get(`${api}trips/statuses/${user_id}`)
        if (response.status === 200) {
          // console.log("🚀 Trip statuses fetched:", response.data.latestTrip?.statuses);
          setTripStatusAccepted(response.data.latestTrip?.statuses)
        }
      } catch (error) {
        console.error("⚠️ Error fetching trip statuses:", error)
      }
    }

    fetchTripStatuses()
    // console.log("Trip Status Accepted:", tripStatusAccepted);

    const intervalId = setInterval(fetchTripStatuses, 5000) // Fetch every 5 seconds

    return () => clearInterval(intervalId) // Cleanup interval on unmount
  }, [user_id])

  const handleCancel = async (reason) => {
    setCancelReason(reason)
    // console.log("Trip Cancelled for reason:", tripRequestSocket?.id);
    setShowStartButton(false);
    // Assuming you have the tripId, cancel_by (user ID or admin), and distance_traveled (if applicable)
    const tripId = selectedRequest?.id // Replace with the actual trip ID you want to cancel
    const distanceTraveled = null // Replace with the actual distance if relevant

    try {
      const response = await fetch(`${api}trips/${tripId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "canceled",
          cancellation_reason: reason,
          cancel_by: "customer",
          distance_traveled: distanceTraveled,
        }),
      })

      const responseData = await response.json()
      console.log("Response:", responseData)

      if (response.ok) {
        console.log("Trip successfully canceled.")
        // Stop background tracking if it was active
        if (isBackgroundTrackingActive) {
          await stopBackgroundLocationTracking();
        }

        setUserOrigin({ latitude: null, longitude: null })
        setUserDestination({ latitude: null, longitude: null })
        emitCancelTrip(tripId, selectedRequest.customerId)
        setShowStartButton(false);
        dispatch(clearMessages());
        handleUpdateDriverState()

        //  navigation.navigate("PendingRequests")// it causes re rendering
      } else {
        console.log("Failed to update trip:", responseData.message)
        alert(responseData.message || "Error updating trip status, try again later.")
      }
    } catch (error) {
      console.error("Error canceling the trip:", error)
    }
  }

  //if trip is declined it should reset user origin
  useEffect(() => {
    if (tripStatusAccepted === "declined" || tripStatusAccepted === "no-response") {
      setUserOrigin({ latitude: null, longitude: null })
      setUserDestination({ latitude: null, longitude: null })
    }
  }, [tripStatusAccepted])

  //animated button
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(animationValue, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }
  //animated bell
  const animateBell = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bellAnimation, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }

  // Check driver state on component mount and start timer if online
  useEffect(() => {
    const checkDriverState = async () => {
      if (!user_id) return

      try {
        const response = await axios.get(`${api}getDriverState?userId=${user_id}`)
        const { state } = response.data

        if (state === "online") {
          setIsOnline(true)
          // startTimer() // Start the timer if driver is already online
        } else {
          setIsOnline(false)
          stopTimer() // Stop the timer if driver is offline
        }
      } catch (error) {
        console.error("Error fetching driver state:", error.message)
      }
    }

    checkDriverState()

    stopTimer() // Stop the timer when component mounts
  }, [user_id])

  //update notifications to pending from firebase
  useEffect(() => {
    animateBell()
  }, [])

  //update notifications to pending from firebase
  const handleNotificationClick = () => {
    if (notificationCount > 0) {
      setNotificationCount(notificationCount - 1) // Decrease notification count on click
    }
    navigation.navigate("PendingTripsBottomSheet", { tripAccepted: true })
  }

  useEffect(() => {
    animateBell() // Start bell animation when component mounts
  }, [])

  // Start Button (Driver → Pickup Location)
  useEffect(() => {
    const fetchRouteDetails = () => {
      if (!userOrigin.latitude || !driverLocation.latitude || !userDestination.latitude) return

      // Calculate distance using Haversine function from Driver to Pickup Location
      const distanceToPickupInMeters = haversineDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        userOrigin.latitude,
        userOrigin.longitude,
      )

      // Calculate distance using Haversine function from Pickup Location to Dropoff Location (userDestination)
      const distanceToDestinationInMeters = haversineDistance(
        userOrigin.latitude,
        userOrigin.longitude,
        userDestination.latitude,
        userDestination.longitude,
      )

      // Estimate ETA based on whether the startButton is clicked or not
      if (showStartButton) {
        // Estimate ETA for Destination
        const etaValueForDestination = estimateETA(distanceToDestinationInMeters)
        setEta(etaValueForDestination)
        setDistance(`${(distanceToDestinationInMeters / 1000).toFixed(2)}`)
      } else {
        // Estimate ETA for Pickup Location
        const etaValueForPickup = estimateETA(distanceToPickupInMeters)
        setEta(etaValueForPickup)
        setDistance(`${(distanceToPickupInMeters / 1000).toFixed(2)}`)
      }

      // Check if driver is within 5 m of pickup location
      const distanceInMetersRandom = 250
      if (distanceToPickupInMeters <= distanceInMetersRandom) {
        console.log("Driver is within 5m of pickup location")
        setShowStartButton(true)
        emitArrival(tripRequestSocket.id, tripRequestSocket.customerId)
      }

      // Optionally handle distance to destination if needed
      // console.log(`Distance to destination: ${(distanceToDestinationInMeters / 1000).toFixed(2)} km`);
    }

    fetchRouteDetails()
  }, [userOrigin, driverLocation, userDestination, showStartButton])

  // End Button (Pickup → Destination)
  useEffect(() => {
    const fetchRouteDetails = () => {
      // Only run this logic if trip has started
      if (!showStartButton) return // 👈 Prevent End button before Start is clicked

      if (!userOrigin.latitude || !userDestination.latitude) return

      // Calculate distance using Haversine function
      const distanceInMeters = haversineDistance(
        userOrigin.latitude,
        userOrigin.longitude,
        userDestination.latitude,
        userDestination.longitude,
      )

      // Estimate ETA
      const etaValue = estimateETA(distanceInMeters)

      setEta(etaValue)
      setDistanceTraveld(`${(distanceInMeters / 1000).toFixed(2)} km`)

      // Show End button only when trip has started AND within range (e.g. 150m)
      setShowEndButton(showStartButton && distanceInMeters <= 150)
    }

    fetchRouteDetails()
  }, [userOrigin, userDestination, showStartButton]) // 👈 Add showStartButton as a dependency


  //update trip and notify customer when driver clicks start trip
  const handleStartTrip = async () => {
    try {
      // 1️⃣ Update trip status
      const response = await fetch(`${api}trips/${tripData.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "on-going",
          cancellation_reason: null,
          cancel_by: null,
          distance_traveled: distance,
        }),
      })

      if (!response.ok) throw new Error("Error updating trip status")

      // 2️⃣ Update payment status to success
      const paymentResponse = await fetch(`${api}payments/user/${tripData.customerId}/trip/${tripData.id}/status`, {
        method: "PUT",
      })

      if (!paymentResponse.ok) throw new Error("Error updating payment status")

      console.log("Payment status updated to success")
      // 3️⃣ Start background location tracking
      await startBackgroundLocationTracking();

      // 3️⃣ Alert customer
      emitStartTrip(tripData.id, tripData.customerId)
      setTripStarted(true) // Set tripStarted to true
      setShowStartButton(false) // Hide start button after trip starts
      console.log("Trip successfully started.", tripStarted)
    } catch (error) {
      console.error("Error starting trip:", error)
    }
  }

  const handleUpdateDriverState = async () => {
    const response = await axios.put(api + "driver/updateStatus", {
      userId: user_id,
      state: "online",
    })

    if (response.status === 200) {
      console.log("Driver is online")
    } else {
      console.log("Driver status not updated to online")
    }
  }
  const [showRating, setShowRating] = useState(false);
  const [ratingTripId, setRatingTripId] = useState(null);
  const [ratingUserId, setRatingUserId] = useState(null);

  //update trip and notify customer when driver clicks end trip

  const handleEndRide = async () => {
    try {
      if (!tripData?.id) return;

      const response = await fetch(`${api}trips/${tripData.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          distance_traveled: distance,
        }),
      });

      if (!response.ok) throw new Error("Error updating trip status");
      // Stop background location tracking
      await stopBackgroundLocationTracking();

      handleUpdateDriverState();
      emitEndTrip(tripData.id, tripData.customerId);

      // Clear UI
      setTripStarted(false);
      setUserOrigin({ latitude: null, longitude: null });
      setUserDestination({ latitude: null, longitude: null });
      setShowStartButton(false);
      setShowEndButton(false);
      dispatch(clearMessages());
      setEta("N/A");
      setDistance("N/A");
      setDistanceTraveld("N/A");
      setTripRequest(null);

      if (mapRef?.current) {
        mapRef.current.animateToRegion({
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }

      // ✅ Open rating modal
      setRatingTripId(tripData.id);
      setRatingUserId(tripData.driverId);
      setShowRating(true);
    } catch (error) {
      console.error("Error ending trip:", error);
    }
  };
  // console.log("Trip successfully ended.", tripData.id, tripData.driverId);

  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  // if (loading) {
  //   return (
  //     <View style={styles.container}>
  //       <ActivityIndicator size="large" color="#0000ff" />
  //     </View>
  //   );
  // }
  // Add a mapRef to access the map from MapComponent
  const mapRef = useRef(null)

  const handleViewCustomer = () => {
    setModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
              <Icon type="material-community" name="menu" color="#0F172A" size={24} />
            </TouchableOpacity>
            {/* <Text style={styles.headerTitle}>Driver Dashboard</Text> 
            <View style={{ width: 40 }} />
          </View> */}

      {/* Update the MapComponent to pass the ref */}
      <MapComponent
        driverLocation={driverLocation}
        userOrigin={userOrigin}
        userDestination={userDestination}
        tripStart={tripStarted}
        mapRef={mapRef}
      />

      {/* Timer display */}
      <View style={styles.timerContainer}>
        {/* <Text style={styles.timerText}>Online Time: {formatTime(secondsOnline)}</Text> */}
        <Text style={styles.timerText}>Remaining Time: {formatTime(remainingTime)}</Text>
      </View>

      {tripStatusAccepted !== "accepted" && !tripStarted && tripStatusAccepted !== "on-going" && (
        <TouchableOpacity style={styles.goOnlineButton} onPress={handleGoOffline}>
          <Text style={styles.goOnlineText}>OFF</Text>
        </TouchableOpacity>
      )}
      {/* </Animated.View> */}
      {/* Action Buttons */}

      <View style={styles.actionButtonsContainer}>
        {/* Phone Button (Existing) 
        {tripStatusAccepted === "accepted" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("CustomerCommunicationBottomSheet", {
                tripId: tripData.id,
                customerId: tripData.customerId,
              })
            }
          >
            <Icon type="material-community" name="phone" color="#FFFFFF" size={24} />
            {notificationCountChat > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{notificationCountChat}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
*/}
        {/* Bell Button (Existing) */}
        {tripStatusAccepted !== "on-going" && tripStatusAccepted !== "accepted" && (
          <Animated.View style={[{ transform: [{ scale: bellAnimation }] }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleNotificationClick}>
              <Icon type="material-community" name="bell" color="#FFFFFF" size={24} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Cancel Button (Existing) */}
        {tripStatusAccepted === "accepted" && !tripStarted && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCancelTrip}>
            <Icon type="material-community" name="close-circle" color="#FFFFFF" size={24} />
          </TouchableOpacity>
        )}
      </View>

      {/* Start Trip Button */}
      {showStartButton &&
        tripStatusAccepted !== "on-going" &&
        tripStatusAccepted !== "canceled" && (
          <TouchableOpacity
            style={[styles.commonButton, styles.startButton]}
            onPress={handleStartTrip}
          >
            <Text style={styles.buttonText}>Start Trip</Text>
          </TouchableOpacity>
        )}

      {/* End Ride Button */}
      {showEndButton && (
        <TouchableOpacity
          style={[styles.commonButton, styles.endRideButton]}
          onPress={handleEndRide}
        >
          <Text style={styles.buttonText}>End Ride</Text>
        </TouchableOpacity>
      )}

      {/* Navigation Buttons - Only show when trip is accepted but not completed */}
      {(tripStatusAccepted === "accepted" || tripStarted) && (
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity
            style={[styles.navButton, styles.googleButton]}
            onPress={() => openNavigation(driverLocation, tripStarted ? userDestination : userOrigin, 'google')}
          >
            <Ionicons name="logo-google" size={20} color="white" />
            <Text style={styles.navButtonText}>Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customerNav, styles.customerButton]}
            onPress={() => handleViewCustomer()}
          >
            <Ionicons name="person" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.wazeButton]}
            onPress={() => openNavigation(driverLocation, tripStarted ? userDestination : userOrigin, 'waze')}
          >
            <Ionicons name="car-sport" size={20} color="white" />
            <Text style={styles.navButtonText}>Waze</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Trip Cancellation Modal */}
      <TripCancellationModal isVisible={cancelModalVisible} onClose={handleCloseModal} onCancel={handleCancel} />
      {/* <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} /> */}
      <CancelAlertModal
        visible={showCancelAlert}
        message="Trip was cancelled."
        onClose={() => setShowCancelAlert(false)}
      />

      <RideRatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        tripId={ratingTripId}
        userId={ratingUserId}
      />

      <TripRequestModal
        onClose={() => setModalVisible(false)}
        isVisible={modalVisible}
        hideActions={true}  // <-- hide buttons and reason input
      />


    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop: parameters.statusBarHeight,
    backgroundColor: colors.white,
  },
  view1: {
    position: "absolute",
    top: 25,
    left: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    zIndex: 10,
  },
  profilePictureContainer: {
    position: "absolute",
    top: 70,
    right: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    zIndex: 10,
  },
  profilePicture: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  goOnlineButton: {
    position: "absolute",
    bottom: 110, // Adjust as needed
    left: SCREEN_WIDTH / 2 - 30, // Center the button horizontally
    backgroundColor: "#0DCAF0", // Updated to the requested color
    borderRadius: 30, // Circular shape
    width: 60, // Diameter
    height: 60, // Diameter
    justifyContent: "center", // Center text vertically
    alignItems: "center", // Center text horizontally
    elevation: 5, // Shadow effect for Android
    shadowColor: "#0DCAF0", // Shadow color
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  goOnlineText: {
    color: "#fff", // Text color
    fontSize: 24, // Font size for "GO"
    fontWeight: "bold", // Bold text
  },
  bellContainer: {
    position: "absolute",
    top: 120,
    right: 20,
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    right: -10,
    top: -10,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  header: {
    position: "absolute", // Ensures it floats on top of the screen
    top: 60, // Adjust for slight padding at the top
    left: 10, // Adjust for slight padding at the left
    zIndex: 100, // Ensures it's above other elements
  },
  roundButton: {
    backgroundColor: "#fff", // Add a background color
    borderRadius: 30, // Make it round (half of the width/height)
    width: 50, // Diameter of the circle
    height: 50, // Diameter of the circle
    justifyContent: "center", // Center the icon vertically
    alignItems: "center", // Center the icon horizontally
    shadowColor: "#000", // Add shadow (optional)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Elevation for Android
  },
  commonButton: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - 70, // Center horizontally
    width: 140,
    height: 55,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 5,
  },

  startButton: {
    bottom: 260, // slightly above the End Ride button
    backgroundColor: "#0DCAF0",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  endRideButton: {
    bottom: 200, // same base position
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  buttonText: {
    color: "#fff", // White text color for both buttons
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  endRideButtonText: {
    color: "#fff", // White text for end button
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 20,
    gap: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 100,
  },
  customerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 10,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  wazeButton: {
    backgroundColor: '#33CCFF',
  },
  customerButton: {
    backgroundColor: '#82fab0ff',
  },
  navButtonText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 14,
  },
  profilePictureContainer: {
    position: "absolute",
    top: 25,
    right: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    zIndex: 10,
  },
  timerContainer: {
    position: "absolute",
    top: 30,
    left: "40%",
    transform: [{ translateX: -100 }], // Adjust -100 based on your view's approximate width
    backgroundColor: "#1A1D26",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
    zIndex: 10,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  timerText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0DCAF0",
    marginLeft: 8,
  },
  cancelButtonContainer: {
    top: 140, // Adjust this to position the cancel button below the call button
    right: 12, // Same alignment as the call button
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
    left: 10,
  },
  infoContainer: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  actionButtonsContainer: {
    position: "absolute",
    top: 20,
    right: 16,
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginVertical: 8,
  },
})
