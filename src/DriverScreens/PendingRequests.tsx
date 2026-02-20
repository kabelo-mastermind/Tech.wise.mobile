"use client"

import { useState, useEffect, useRef } from "react"
import { StyleSheet, View, Dimensions, TouchableOpacity, BackHandler, Text, Animated, Linking, Alert, Platform, AppState } from "react-native"
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Icon } from "react-native-elements"
import { colors } from "../global/styles"
import MapComponent from "../components/MapComponent"
import * as Location from "expo-location"
import * as TaskManager from 'expo-task-manager';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
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
const BELL_RING_SIZE = 64;
const BELL_RING_STROKE = 4;
const BELL_RING_RADIUS = (BELL_RING_SIZE - BELL_RING_STROKE) / 2;
const BELL_RING_CIRCUMFERENCE = 2 * Math.PI * BELL_RING_RADIUS;

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

        if (location) {
          const { latitude, longitude } = location.coords;
          console.log('📍 Background location update received:', { latitude, longitude });

          // Save to Firebase only if user_id is valid AND driver is online
          try {
            // Get user_id from the component - may be null in background context
            if (!user_id || user_id === null || user_id === undefined) {
              console.warn('⚠️ user_id is not available, skipping Firebase location save');
              return;
            }
            
            // Check if driver is online from AsyncStorage
            const isOnlineStatus = await AsyncStorage.getItem(`driverOnlineStatus_${user_id}`);
            if (isOnlineStatus !== 'online') {
              console.log('🚫 Driver is offline, skipping location save to Firebase');
              return;
            }
            
            console.log('💾 Saving background driver location to Firebase for user:', user_id);
            const driverLocationRef = doc(db, "driver_locations", String(user_id));
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
            console.log('✅ Background location saved successfully to Firebase!', { latitude, longitude, user_id });
          } catch (error) {
            console.error("❌ Error saving background driver location:", error);
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

  // Restore trip state from cache on component mount
  useEffect(() => {
    const restoreTripState = async () => {
      if (!user_id) return;

      try {
        const cachedTripState = await AsyncStorage.getItem(`activeTripState_${user_id}`);
        if (cachedTripState) {
          const tripState = JSON.parse(cachedTripState);
          console.log('🔄 Restoring trip state from cache:', tripState);

          // Restore trip state
          setTripStarted(tripState.tripStarted || false);
          setShowStartButton(tripState.showStartButton || false);
          setShowEndButton(tripState.showEndButton || false);
          setUserOrigin(tripState.userOrigin || { latitude: 0, longitude: 0 });
          setUserDestination(tripState.userDestination || { latitude: 0, longitude: 0 });
          setEta(tripState.eta || "N/A");
          setDistance(tripState.distance || "N/A");
          
          // Restore background tracking if trip was ongoing
          if (tripState.tripStarted && !isBackgroundTrackingActive) {
            await startBackgroundLocationTracking();
          }

          console.log('✅ Trip state restored successfully');
        }
      } catch (error) {
        console.error('❌ Error restoring trip state:', error);
      }
    };

    restoreTripState();
  }, [user_id]);

  // console.log("Trip ID from Redux:", trip_id);
  // Timer state and ref
  const [secondsOnline, setSecondsOnline] = useState(0)
  // const timerRef = useRef(null)
  const [loading, setLoading] = useState(true)

  const [remainingTime, setRemainingTime] = useState(0)
  const [bellCountdown, setBellCountdown] = useState(0)
  const [userOrigin, setUserOrigin] = useState({ latitude: 0, longitude: 0 });
  const [userDestination, setUserDestination] = useState({ latitude: 0, longitude: 0 });
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  // Cache trip state whenever it changes
  useEffect(() => {
    const cacheTripState = async () => {
      if (!user_id) return;

      // Only cache if there's an active trip (accepted or ongoing)
      if (tripStatusAccepted === 'accepted' || tripStatusAccepted === 'on-going' || tripStarted) {
        const tripState = {
          tripStarted,
          showStartButton,
          showEndButton,
          userOrigin,
          userDestination,
          eta,
          distance,
          tripData: selectedRequest,
          tripStatusAccepted,
          timestamp: new Date().toISOString(),
        };

        await AsyncStorage.setItem(`activeTripState_${user_id}`, JSON.stringify(tripState));
        console.log('💾 Trip state cached:', { tripStarted, tripStatusAccepted });
      }
    };

    cacheTripState();
  }, [tripStarted, showStartButton, showEndButton, userOrigin, userDestination, eta, distance, tripStatusAccepted, user_id]);

  useEffect(() => {
    fetch(api + `/driver/remainingTime/${user_id}`)
      .then((res) => res.json())
      .then(async (data) => {
        setRemainingTime(data.remainingSeconds)
        startCountdown(data.remainingSeconds)
        
        // Cache remaining time
        await AsyncStorage.setItem(`cachedRemainingTime_${user_id}`, JSON.stringify(data))
        console.log('Remaining time cached successfully')
      })
      .catch(async (err) => {
        console.error(err, "-----------------")
        
        // Load from cache on network failure
        try {
          const cached = await AsyncStorage.getItem(`cachedRemainingTime_${user_id}`)
          if (cached) {
            const cachedData = JSON.parse(cached)
            setRemainingTime(cachedData.remainingSeconds)
            startCountdown(cachedData.remainingSeconds)
            console.log('Loaded remaining time from cache (offline mode)')
          }
        } catch (cacheErr) {
          console.error('Error loading cached remaining time:', cacheErr)
        }
      })
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
  const lastTripCountRef = useRef(0) // ref to persist trip count across re-renders
  const bellTimerRef = useRef(null)
  const foregroundSoundRef = useRef(null)
  const foregroundSoundIntervalRef = useRef(null)
  const SOUND_REPEAT_MS = 6000

  const getRemainingSecondsFromTrip = (trip) => {
    if (trip?.currentDate) {
      const tripTime = new Date(trip.currentDate).getTime();
      const ageInSeconds = (Date.now() - tripTime) / 1000;
      return Math.max(0, Math.floor(40 - ageInSeconds));
    }
    return 40;
  };

  const updateBellCountdownFromTrips = (pendingTrips) => {
    if (!pendingTrips || pendingTrips.length === 0) {
      setBellCountdown(0);
      return;
    }

    const latestRemaining = pendingTrips.reduce((maxRemaining, trip) => {
      return Math.max(maxRemaining, getRemainingSecondsFromTrip(trip));
    }, 0);

    setBellCountdown(latestRemaining);
  };

  useEffect(() => {
    if (isOnline) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => Math.max(prev - 1, 0))
      }, 1000)

      return () => clearInterval(timerRef.current)
    }
  }, [isOnline]) // depend on isOnline

  useEffect(() => {
    if (bellCountdown <= 0) {
      if (bellTimerRef.current) {
        clearInterval(bellTimerRef.current)
        bellTimerRef.current = null
      }
      return
    }

    if (bellTimerRef.current) return

    bellTimerRef.current = setInterval(() => {
      setBellCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(bellTimerRef.current)
          bellTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (bellTimerRef.current) {
        clearInterval(bellTimerRef.current)
        bellTimerRef.current = null
      }
    }
  }, [bellCountdown])



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
      if (foregroundSoundIntervalRef.current) {
        clearInterval(foregroundSoundIntervalRef.current)
        foregroundSoundIntervalRef.current = null
      }
      if (foregroundSoundRef.current) {
        foregroundSoundRef.current.unloadAsync()
        foregroundSoundRef.current = null
      }
    };
  }, []);

  const playForegroundSound = async () => {
    try {
      if (foregroundSoundRef.current) {
        await foregroundSoundRef.current.unloadAsync()
        foregroundSoundRef.current = null
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/trip_alert.wav'),
        { shouldPlay: true }
      )

      foregroundSoundRef.current = sound
    } catch (error) {
      console.error('❌ Error playing foreground sound:', error)
    }
  }

  useEffect(() => {
    if (AppState.currentState !== 'active') {
      if (foregroundSoundIntervalRef.current) {
        clearInterval(foregroundSoundIntervalRef.current)
        foregroundSoundIntervalRef.current = null
      }
      return
    }

    if (bellCountdown > 0 && !foregroundSoundIntervalRef.current) {
      playForegroundSound()
      foregroundSoundIntervalRef.current = setInterval(() => {
        if (bellCountdown <= 0) {
          clearInterval(foregroundSoundIntervalRef.current)
          foregroundSoundIntervalRef.current = null
          return
        }
        playForegroundSound()
      }, SOUND_REPEAT_MS)
    }

    if (bellCountdown <= 0 && foregroundSoundIntervalRef.current) {
      clearInterval(foregroundSoundIntervalRef.current)
      foregroundSoundIntervalRef.current = null
    }
  }, [bellCountdown])

  //go online button and offline button

  // Helper function to open security settings
  const openSecuritySettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.SECURITY_SETTINGS');
    } else {
      // iOS doesn't allow direct access to security settings
      Linking.openSettings();
    }
  };

  // Biometric authentication function
  const authenticateDriver = async () => {
    try {
      // Try to get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('🔐 Supported authentication types:', supportedTypes);

      // Check if any authentication is available (biometric OR device credentials)
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      console.log('🔐 Hardware available:', hasHardware, '| Security level:', securityLevel);

      // Attempt authentication directly (works with biometric, PIN, pattern, password)
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '🔐 Authenticate to go online',
        fallbackLabel: 'Use Device Credentials',
        disableDeviceFallback: false, // Allow fallback to PIN/pattern/password
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        console.log('✅ Authentication successful');
        return true;
      } else if (result.error === 'user_cancel') {
        console.log('❌ User cancelled authentication');
        return false;
      } else if (result.error === 'not_enrolled' || result.error === 'lockout' || result.error === 'passcode_not_set') {
        Alert.alert(
          '🔒 No Authentication Set Up',
          'For security purposes, you must set up device authentication before going online.\n\nPlease set up:\n• Fingerprint\n• Face ID\n• PIN, pattern, or password\n\nin your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSecuritySettings }
          ]
        );
        return false;
      } else {
        console.log('❌ Authentication failed:', result.error);
        Alert.alert(
          'Authentication Failed',
          'You must authenticate to go online as a driver.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'An error occurred during authentication. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleGoOffline = async () => {
    // Use session_id and user_id from above
    console.log("handleGoOffline called", session_id);

    animateButton();

    if (!user_id) {
      console.warn("Missing user_id or session_id");
      return;
    }

    // Prevent going offline if there's an active trip
    if (tripStatusAccepted === 'accepted' || tripStatusAccepted === 'on-going' || tripStarted) {
      Alert.alert(
        'Active Trip',
        'You cannot go offline while you have an active or ongoing trip. Please complete or cancel the trip first.',
        [{ text: 'OK' }]
      );
      console.log('🚫 Cannot go offline - active trip exists');
      return;
    }

    try {
      // Fetch current driver state before updating
      console.log("Fetching current driver state...");

      const fetchResponse = await fetch(`${api}getDriverState?userId=${user_id}`);
      const fetchData = await fetchResponse.json();
      const currentState = fetchData.state;

      if (currentState === "online") {
        const newState = "offline";
        console.log("Driver is online, setting to offline...");

        const updateResponse = await fetch(`${api}updateDriverState`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id,
            state: newState,
            onlineDuration: secondsOnline,
            last_online_timestamp: new Date().toISOString(),
          }),
        });

        if (updateResponse.ok) {
          console.log("Driver state updated to offline.");

          // ✅ ADD: Update driver_session end_time by session_id
          try {
            console.log("Updating driver_session end_time...");

            const sessionUpdateResponse = await fetch(`${api}endDriverSession`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id, // pass session_id
                end_time: new Date().toISOString(),
                workedSeconds: secondsOnline,
              }),
            });

            if (sessionUpdateResponse.ok) {
              console.log("Driver session end_time stored successfully for session_id:", session_id);
            } else {
              console.warn("Failed to store end_time in driver_session. Status:", sessionUpdateResponse.status);
            }
          } catch (sessionError) {
            console.error("Error updating driver_session:", sessionError.response?.data || sessionError.message);
          }

          setIsOnline(false);
          stopTimer(); // Stop the timer when going offline
          
          // Store offline status in AsyncStorage
          await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'offline');
          console.log('📴 Driver status stored as offline in AsyncStorage');
          
          // Clear trip cache when going offline (no active trips at this point)
          await AsyncStorage.removeItem(`activeTripState_${user_id}`);
          console.log('🗑️ Trip state cache cleared');

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
        // If driver is offline, authenticate before going online
        console.log('🔐 Attempting authentication before going online...');
        const isAuthenticated = await authenticateDriver();

        if (!isAuthenticated) {
          console.log('🚫 Authentication failed - cannot go online');
          return; // Exit if authentication fails
        }

        console.log('✅ Authentication successful - proceeding to go online');

        // If driver is offline and authenticated, set them to online
        const updateResponse = await fetch(`${api}updateDriverState`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id,
            state: "online",
            onlineDuration: 0,
          }),
        });

        if (updateResponse.ok) {
          setIsOnline(true);
          setSecondsOnline(0);
          
          // Store online status in AsyncStorage
          await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'online');
          console.log('📶 Driver status stored as online in AsyncStorage');
          
          console.log("Driver is now online.");
          navigation.navigate("PendingRequests", { user_id, session_id });
        } else if (updateResponse.status === 403) {
          alert("You have reached the 12-hour daily limit. Please try again tomorrow.");
        }
      }
    } catch (error) {
      console.error("Failed to update driver status:", error.message);
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
    if (!selectedRequest) {
      setUserOrigin({ latitude: 0, longitude: 0 });
      setUserDestination({ latitude: 0, longitude: 0 });
      setShowStartButton(false);
      return;
    }

    const toNumber = (value) => {
      const parsed = typeof value === "string" ? parseFloat(value) : value;
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const pickupLatitude = toNumber(
      selectedRequest.pickUpLatitude ??
      selectedRequest.pickupLatitude ??
      selectedRequest.pickUpCoordinates?.latitude ??
      selectedRequest.pickupCoordinates?.latitude
    );
    const pickupLongitude = toNumber(
      selectedRequest.pickUpLongitude ??
      selectedRequest.pickupLongitude ??
      selectedRequest.pickUpCoordinates?.longitude ??
      selectedRequest.pickupCoordinates?.longitude
    );
    const dropoffLatitude = toNumber(
      selectedRequest.dropOffLatitude ??
      selectedRequest.dropoffLatitude ??
      selectedRequest.dropOffCoordinates?.latitude ??
      selectedRequest.dropoffCoordinates?.latitude
    );
    const dropoffLongitude = toNumber(
      selectedRequest.dropOffLongitude ??
      selectedRequest.dropoffLongitude ??
      selectedRequest.dropOffCoordinates?.longitude ??
      selectedRequest.dropoffCoordinates?.longitude
    );

    setUserOrigin({
      latitude: pickupLatitude,
      longitude: pickupLongitude,
    });
    setUserDestination({
      latitude: dropoffLatitude,
      longitude: dropoffLongitude,
    });

    if (tripStatusAccepted !== "accepted" && !tripStarted) {
      setShowStartButton(false);
    }

    console.log("user destination ---------------", userDestination)
  }, [selectedRequest, tripStatusAccepted, tripStarted]);

  const getTripStatus = (trip) => {
    const statuses = trip?.statuses;
    if (Array.isArray(statuses) && statuses.length > 0) {
      const lastStatus = statuses[statuses.length - 1];
      if (typeof lastStatus === 'string') return lastStatus;
      return lastStatus?.status || null;
    }
    if (typeof statuses === 'string') return statuses;
    return null;
  };

  const isTripPending = (trip) => getTripStatus(trip) === 'pending';

  useEffect(() => {
    if (!selectedRequest) return;
    const statusFromSelected = getTripStatus(selectedRequest);
    if (statusFromSelected) {
      setTripStatusAccepted(statusFromSelected);
    }
  }, [selectedRequest]);


  // Load initial pending trips count on mount
  useEffect(() => {
    const loadInitialPendingTrips = async () => {
      if (!user_id || !isOnline) return;

      try {
        console.log('🔍 Loading initial pending trips count...');
        const response = await fetch(`${api}/driverTrips?driverId=${user_id}`);
        const data = await response.json();

        const tripsList = data.trips || [];
        const now = new Date().getTime();
        
        // Filter for pending trips only AND not older than 40 seconds
        const pendingTrips = tripsList.filter(trip => {
          if (!isTripPending(trip)) return false;
          
          // Check if trip is not older than 40 seconds
          if (trip.currentDate) {
            const tripTime = new Date(trip.currentDate).getTime();
            const ageInSeconds = (now - tripTime) / 1000;
            if (ageInSeconds > 40) {
              console.log(`⏰ Trip ${trip.id} expired (${Math.round(ageInSeconds)}s old)`);
              return false;
            }
          }
          
          return true;
        });

        const pendingCount = pendingTrips.length;
        updateBellCountdownFromTrips(pendingTrips);
        
        if (pendingCount > 0) {
          setNotificationCount(pendingCount);
          lastTripCountRef.current = pendingCount; // Update ref to prevent double counting
          console.log(`✅ Initial pending trips count: ${pendingCount}`);
        } else {
          lastTripCountRef.current = 0;
          setNotificationCount(0);
        }
      } catch (error) {
        console.error('❌ Error loading initial pending trips:', error);
      }
    };

    loadInitialPendingTrips();
  }, [user_id, isOnline]);

  // socket notifications
  useEffect(() => {
    if (!user_id) return;

    const userType = "driver";
    let isMounted = true;

    const setupSocket = async () => {
      await connectSocket(user_id, userType);
      // Wait for socket to be connected before registering listeners
      const { default: socketIOClient } = await import("socket.io-client");
      const config = require("../configSocket/config").default;
      const socket = socketIOClient(config.SOCKET_URL);

      socket.on("connect", () => {
        if (!isMounted) return;

        listenToNewTripRequests(async (tripData) => {
          if (!tripData) {
            console.error("❌ tripData is undefined or null on frontend!");
            return;
          }

          // Refresh notification count based on latest pending trips
          try {
            const response = await fetch(`${api}/driverTrips?driverId=${user_id}`);
            const data = await response.json();
            const tripsList = data.trips || [];
            const now = new Date().getTime();

            const pendingTrips = tripsList.filter(trip => {
              if (!isTripPending(trip)) return false;

              if (trip.currentDate) {
                const tripTime = new Date(trip.currentDate).getTime();
                const ageInSeconds = (now - tripTime) / 1000;
                if (ageInSeconds > 40) {
                  return false;
                }
              }

              return true;
            });

            const currentTripCount = pendingTrips.length;
            updateBellCountdownFromTrips(pendingTrips);
            setNotificationCount(currentTripCount);
            lastTripCountRef.current = currentTripCount;
            console.log(`🔔 Notification count refreshed (socket): ${currentTripCount}`);
          } catch (error) {
            console.error('❌ Error refreshing pending trips count (socket):', error);
          }

          // Play notification sound
          playNotificationSound();

          // Store the trip data
          setTripRequest(tripData);

          // Dispatch user details to Redux
          dispatch(
            setTripData({
              id: tripData.tripId, // Make sure we're using the correct property
              customer_id: tripData.user_id,
            }),
          );
        });

        listenCancelTrip(async (tripData) => {
          // Clear trip state cache when customer cancels
          await AsyncStorage.removeItem(`activeTripState_${user_id}`);
          console.log('🗑️ Trip cache cleared - customer cancelled trip');
          // Clear all state when trip is canceled
          await clearTripState();
          handleUpdateDriverState();
          setShowCancelAlert(true);
        });

        listenToChatMessages((messageData) => {
          // Increment notification count
          setNotificationCountChat((prevCount) => prevCount + 1);
          dispatch(
            addMessage({
              id: Date.now().toString(),
              senderId: tripRequestSocket?.customerId,
              receiverId: user_id,
              tripId: tripRequestSocket?.tripId,
              message: messageData?.message,
              timestamp: new Date().toISOString(),
            })
          );
        });
      });
    };

    setupSocket();

    return () => {
      isMounted = false;
    };
  }, [user_id]);

  // Polling mechanism to check for pending trips (backup for when socket is offline)
  useEffect(() => {
    // Don't poll if driver is offline or has an active trip
    if (!user_id || !isOnline || tripStatusAccepted === 'accepted' || tripStatusAccepted === 'on-going') {
      return;
    }

    let pollingInterval = null;

    const checkForPendingTrips = async () => {
      try {
        console.log('🔍 Checking for pending trip requests...');
        const response = await fetch(`${api}/driverTrips?driverId=${user_id}`);
        const data = await response.json();

        const tripsList = data.trips || [];
        const now = new Date().getTime();
        
        // Filter for pending trips only (not accepted, on-going, completed, or canceled) AND not older than 40 seconds
        const pendingTrips = tripsList.filter(trip => {
          if (!isTripPending(trip)) return false;
          
          // Check if trip is not older than 40 seconds
          if (trip.currentDate) {
            const tripTime = new Date(trip.currentDate).getTime();
            const ageInSeconds = (now - tripTime) / 1000;
            if (ageInSeconds > 40) {
              console.log(`⏰ Trip ${trip.id} expired (${Math.round(ageInSeconds)}s old)`);
              return false;
            }
          }
          
          return true;
        });

        const currentTripCount = pendingTrips.length;
        updateBellCountdownFromTrips(pendingTrips);
        
        // Only update if trip count changed (use ref to persist across re-renders)
        if (currentTripCount !== lastTripCountRef.current) {
          console.log(`📊 Pending trips count changed: ${lastTripCountRef.current} → ${currentTripCount}`);
          
          if (currentTripCount > lastTripCountRef.current) {
            // New trip(s) detected
            const newTripsCount = currentTripCount - lastTripCountRef.current;
            setNotificationCount((prevCount) => {
              const newCount = prevCount + newTripsCount;
              console.log(`🔔 Notification count updated: ${prevCount} → ${newCount}`);
              return newCount;
            });
            
            // Play notification sound
            playNotificationSound();
            
            // Trigger bell animation
            animateBell();
          } else if (currentTripCount < lastTripCountRef.current) {
            // Trip(s) were handled (accepted/rejected/expired)
            const decreaseCount = lastTripCountRef.current - currentTripCount;
            setNotificationCount((prevCount) => {
              const newCount = Math.max(0, prevCount - decreaseCount);
              console.log(`🔔 Notification count decreased: ${prevCount} → ${newCount}`);
              return newCount;
            });
          }
          
          lastTripCountRef.current = currentTripCount;
        }
      } catch (error) {
        console.error('❌ Error checking for pending trips:', error);
      }
    };

    // Initial check
    checkForPendingTrips();

    // Poll every 5 seconds
    pollingInterval = setInterval(checkForPendingTrips, 5000);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('🛑 Stopped polling for pending trips');
      }
    };
  }, [user_id, isOnline, tripStatusAccepted]);

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
            console.log('📍 Foreground location update received on PendingRequests screen:', { latitude, longitude });

            try {
              if (!user_id || user_id === null || user_id === undefined) {
                console.warn('⚠️ user_id is not available, skipping Firebase location save');
                return;
              }
              
              // Only save to Firebase if driver is online
              if (!isOnline) {
                console.log('🚫 Driver is offline, skipping location save to Firebase');
                return;
              }
              
              console.log('💾 Saving foreground driver location to Firebase for user:', user_id);
              const driverLocationRef = doc(db, "driver_locations", String(user_id));
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
              console.log('✅ Foreground location saved successfully to Firebase!', { latitude, longitude, user_id, timestamp: new Date().toISOString() });
            } catch (error) {
              console.error("❌ Error saving driver location:", error);
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


  // Enhanced navigation: use current GPS as origin, check offline
  const openNavigation = async (origin, destination, app = 'google') => {
    // 1. Check network status
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'You are offline. Please connect to the internet to use navigation.');
      return;
    }

    // 2. Get current location for origin
    let oLat, oLng;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      oLat = currentLoc.coords.latitude;
      oLng = currentLoc.coords.longitude;
    } catch (e) {
      // fallback to passed origin if GPS fails
      oLat = origin?.latitude;
      oLng = origin?.longitude;
    }
    const dLat = destination?.latitude;
    const dLng = destination?.longitude;
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

  // Configure notifications
  useEffect(() => {
    const configureNotifications = async () => {
      try {
        console.log('🔔 Configuring notifications...');
        
        // Set notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // Request permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Notification permissions not granted');
        } else {
          console.log('✅ Notification permissions granted');
        }

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('trip-requests-v3', {
            name: 'Trip Requests',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'trip_alert', // Custom sound from android/app/src/main/res/raw/
            enableVibrate: true,
          });
          console.log('✅ Android notification channel configured with custom sound');
        }
      } catch (error) {
        console.error('❌ Error configuring notifications:', error);
      }
    };

    configureNotifications();
  }, []);

  // Function to play notification sound
  const playNotificationSound = async () => {
    try {
      console.log('🔊 Playing notification sound...');

      if (AppState.currentState === 'active') {
        await playForegroundSound()
        console.log('✅ Foreground sound played');
        return
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚖 New Trip Request!',
          body: 'You have a new ride request. Tap to view details.',
          channelId: 'trip-requests-v3',
          sound: Platform.OS === 'android' ? 'trip_alert' : require('../../assets/sounds/trip_alert.wav'),
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Show immediately
      });
      console.log('✅ Notification sound played');
    } catch (error) {
      console.error('❌ Error playing notification sound:', error);
    }
  };

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
        const response = await fetch(`${api}trips/statuses/${user_id}`);
        const data = await response.json();
        if (response.ok) {
          // console.log("🚀 Trip statuses fetched:", data.latestTrip?.statuses);
          const nextStatus = getTripStatus(data.latestTrip) || data.latestTrip?.statuses || null;
          if (tripStatusAccepted === "accepted" && nextStatus === "pending") {
            return;
          }
          setTripStatusAccepted(nextStatus);
          
          // Cache trip statuses
          await AsyncStorage.setItem(`cachedTripStatuses_${user_id}`, JSON.stringify(data))
          console.log('Trip statuses cached successfully')
        }
      } catch (error) {
        console.error("⚠️ Error fetching trip statuses:", error)
        
        // Load from cache on network failure
        try {
          const cached = await AsyncStorage.getItem(`cachedTripStatuses_${user_id}`)
          if (cached) {
            const cachedData = JSON.parse(cached)
            const nextStatus = getTripStatus(cachedData.latestTrip) || cachedData.latestTrip?.statuses || null;
            if (tripStatusAccepted === "accepted" && nextStatus === "pending") {
              return;
            }
            setTripStatusAccepted(nextStatus)
            console.log('Loaded trip statuses from cache (offline mode)')
          }
        } catch (cacheErr) {
          console.error('Error loading cached trip statuses:', cacheErr)
        }
      }
    }

    fetchTripStatuses()
    // console.log("Trip Status Accepted:", tripStatusAccepted);

    const intervalId = setInterval(fetchTripStatuses, 5000) // Fetch every 5 seconds

    return () => clearInterval(intervalId) // Cleanup interval on unmount
  }, [user_id, tripStatusAccepted])

const handleCancel = async (reason) => {
  setCancelReason(reason);
  const tripId = selectedRequest?.id;
  
  try {
    const response = await fetch(`${api}trips/${tripId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "canceled",
        cancellation_reason: reason,
        cancel_by: "customer",
        distance_traveled: null,
      }),
    });

    if (response.ok) {
      // Stop background tracking
      if (isBackgroundTrackingActive) {
        await stopBackgroundLocationTracking();
      }
      
      // Clear trip state cache
      await AsyncStorage.removeItem(`activeTripState_${user_id}`);
      console.log('🗑️ Trip cache cleared after cancellation');
      
      // Clear ALL state
      await clearTripState();
      
      // Clear Redux messages
      dispatch(clearMessages());
      
      // Notify customer
      emitCancelTrip(tripId, selectedRequest.customerId);
      
      // Update driver state
      handleUpdateDriverState();
      
      setCancelModalVisible(false);
    }
  } catch (error) {
    console.error("Error canceling trip:", error);
  }
};

  //if trip is declined it should reset user origin
  useEffect(() => {
    const handleDeclinedTrip = async () => {
      if (tripStatusAccepted === "declined" || tripStatusAccepted === "no-response") {
        setUserOrigin({ latitude: null, longitude: null })
        setUserDestination({ latitude: null, longitude: null })
        
        // Clear trip cache when trip is declined or no-response
        if (user_id) {
          await AsyncStorage.removeItem(`activeTripState_${user_id}`);
          console.log('🗑️ Trip cache cleared - trip declined/no-response');
        }
      }
    };
    
    handleDeclinedTrip();
  }, [tripStatusAccepted, user_id])

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
        const response = await fetch(`${api}getDriverState?userId=${user_id}`);
        const data = await response.json();
        const { state } = data;

        if (state === "online") {
          setIsOnline(true)
          await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'online')
          console.log('📶 Driver is online - location tracking enabled')
          // startTimer() // Start the timer if driver is already online
        } else {
          setIsOnline(false)
          await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'offline')
          console.log('📴 Driver is offline - location tracking disabled')
          stopTimer() // Stop the timer if driver is offline
        }
        
        // Cache driver state
        await AsyncStorage.setItem(`cachedDriverState_${user_id}`, JSON.stringify(data))
        console.log('Driver state cached successfully')
      } catch (error) {
        console.error("Error fetching driver state:", error.message)
        
        // Load from cache on network failure
        try {
          const cached = await AsyncStorage.getItem(`cachedDriverState_${user_id}`)
          if (cached) {
            const cachedData = JSON.parse(cached)
            const { state } = cachedData
            if (state === "online") {
              setIsOnline(true)
              await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'online')
            } else {
              setIsOnline(false)
              await AsyncStorage.setItem(`driverOnlineStatus_${user_id}`, 'offline')
              stopTimer()
            }
            console.log('Loaded driver state from cache (offline mode)')
          }
        } catch (cacheErr) {
          console.error('Error loading cached driver state:', cacheErr)
        }
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
    // Reset notification count when driver views pending trips
    setNotificationCount(0);
    console.log('🔔 Notification count reset - driver viewing pending trips');
    navigation.navigate("PendingTripsBottomSheet", { tripAccepted: true })
  }

  useEffect(() => {
    animateBell() // Start bell animation when component mounts
  }, [])

  // Start Button (Driver → Pickup Location)
  useEffect(() => {
    const fetchRouteDetails = () => {
      if (tripStatusAccepted !== "accepted" && !tripStarted) return;
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
  }, [userOrigin, driverLocation, userDestination, showStartButton, tripStatusAccepted, tripStarted])

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
      const response = await fetch(`${api}trips/${tripData?.id}/status`, {
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
    const response = await fetch(api + "driver/updateStatus", {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user_id,
        state: "online",
      }),
    });

    if (response.ok) {
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
    
    // Stop background tracking
    await stopBackgroundLocationTracking();
    
    // Clear trip state cache
    await AsyncStorage.removeItem(`activeTripState_${user_id}`);
    console.log('🗑️ Trip cache cleared after completion');
    
    // Clear ALL state BEFORE navigation
    await clearTripState();
    
    // Clear Redux messages
    dispatch(clearMessages());
    
    // Update driver state and notify
    handleUpdateDriverState();
    emitEndTrip(tripData.id, tripData.customerId);
    
    // Open rating modal
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

  const clearTripState = async () => {
  setTripStarted(false);
  setTripRequest(null);
  setShowStartButton(false);
  setShowEndButton(false);
  setEta("N/A");
  setDistance("N/A");
  setDistanceTraveld("N/A");
  setUserOrigin({ latitude: null, longitude: null });
  setUserDestination({ latitude: null, longitude: null });
  
  // Clear trip cache
  if (user_id) {
    await AsyncStorage.removeItem(`activeTripState_${user_id}`);
    console.log('🗑️ Trip state cleared and cache removed');
  }
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
        tripAccepted={tripStatusAccepted === "accepted" || tripStarted}
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
            <View style={styles.bellRingWrapper}>
              {bellCountdown > 0 && (
                <Svg width={BELL_RING_SIZE} height={BELL_RING_SIZE} style={styles.bellRingSvg}>
                  <Circle
                    cx={BELL_RING_SIZE / 2}
                    cy={BELL_RING_SIZE / 2}
                    r={BELL_RING_RADIUS}
                    stroke="rgba(255, 215, 0, 0.3)"
                    strokeWidth={BELL_RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={BELL_RING_SIZE / 2}
                    cy={BELL_RING_SIZE / 2}
                    r={BELL_RING_RADIUS}
                    stroke="#FFD700"
                    strokeWidth={BELL_RING_STROKE}
                    fill="none"
                    strokeDasharray={`${BELL_RING_CIRCUMFERENCE} ${BELL_RING_CIRCUMFERENCE}`}
                    strokeDashoffset={BELL_RING_CIRCUMFERENCE * (1 - Math.min(Math.max(bellCountdown / 40, 0), 1))}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${BELL_RING_SIZE / 2}, ${BELL_RING_SIZE / 2}`}
                  />
                </Svg>
              )}
              <TouchableOpacity style={[styles.actionButton, styles.bellActionButton]} onPress={handleNotificationClick}>
                <Icon type="material-community" name="bell" color="#FFFFFF" size={24} />
                {notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {bellCountdown > 0 && (
                <View style={styles.bellCountdownBadge}>
                  <Text style={styles.bellCountdownText}>{bellCountdown}s</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Cancel Button (Existing) */}
        {tripStatusAccepted === "accepted" && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCancelTrip}>
            <Icon type="material-community" name="close-circle" color="#FFFFFF" size={24} />
          </TouchableOpacity>
        )}
      </View>

      {/* Start Trip Button */}
      {showStartButton &&
        tripStatusAccepted !== "on-going" &&
        tripStatusAccepted !== "canceled" && 
        tripStatusAccepted !== "no-response" && 
        (
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

      {/* Navigation Buttons - Only show when trip is accepted or ongoing */}
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

      {/* Floating SOS Button - bottom right */}
      {(tripStatusAccepted === "accepted" || tripStarted) && (
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => Alert.alert('SOS', 'Emergency assistance requested!')}
        >
          <Ionicons name="alert-circle" size={28} color="white" />
        </TouchableOpacity>
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
  sosButton: {
    position: 'absolute',
    top: 120,
    right: 14,
    backgroundColor: '#FF3B30',
    borderRadius: 32,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
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
  bellRingWrapper: {
    width: BELL_RING_SIZE,
    height: BELL_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bellRingSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  bellActionButton: {
    marginVertical: 0,
  },
  bellCountdownBadge: {
    position: "absolute",
    bottom: -18,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bellCountdownText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "700",
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
