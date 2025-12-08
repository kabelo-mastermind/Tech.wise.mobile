import React, { useState, useEffect, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Alert,
    RefreshControl,
    Dimensions,
    Animated,
    FlatList,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import CustomDrawer from '../components/CustomDrawer';
import { Icon } from 'react-native-elements';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from '../../api';
import { connectSocket, disconnectSocket, emitOrderStatus } from "../configSocket/socketConfig"
import MapComponent from './components/MapComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define task outside component to avoid multiple definitions
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

            try {
                // Get userId from AsyncStorage since we're in background
                const userId = await AsyncStorage.getItem('currentUserId');
                
                if (userId) {
                    // Get current order from storage
                    const storedOrder = await AsyncStorage.getItem('currentDeliveryOrder');
                    const currentOrder = storedOrder ? JSON.parse(storedOrder) : null;

                    // Save to Firebase - ONLY LOCATION DATA
                    const driverLocationRef = doc(db, "driver_locations", userId.toString());
                    await setDoc(
                        driverLocationRef,
                        {
                            userId: parseInt(userId),
                            latitude,
                            longitude,
                            timestamp: new Date().toISOString(),
                            orderId: currentOrder?.id || null,
                            orderNumber: currentOrder?.order_number || null,
                            status: 'delivering',
                            background: true, // Mark as background update
                            foreground: false
                        },
                        { merge: true },
                    );
                    console.log('📍 Background location updated');
                }
            } catch (error) {
                console.log("Error saving background location to Firebase:", error);
            }
        }
    }
});

const FoodDeliveryScreen = ({ navigation }) => {
    const user = useSelector((state) => state.auth.user);
    const [activeTab, setActiveTab] = useState('available');
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const slideAnim = useState(new Animated.Value(0))[0];
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Location state
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);

    // Restaurant state
    const [restaurants, setRestaurants] = useState([]);
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
    const [restaurantDistances, setRestaurantDistances] = useState({});
    const [filteredOrders, setFilteredOrders] = useState([]);

    // Delivery addresses state
    const [deliveryAddressDistances, setDeliveryAddressDistances] = useState({});

    // Firebase location tracking state
    const [isLocationTrackingActive, setIsLocationTrackingActive] = useState(false);
    const [locationWatchId, setLocationWatchId] = useState(null);
    const [isBackgroundTrackingActive, setIsBackgroundTrackingActive] = useState(false);

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);
    const userId = user?.user_id;

    // Add this state to FoodDeliveryScreen
    const [showMap, setShowMap] = useState(false)
    const [selectedOrderForMap, setSelectedOrderForMap] = useState(null)

    // Track if banner should be visible
    const [showOrderBanner, setShowOrderBanner] = useState(false);

    // Store user ID for background tasks
    useEffect(() => {
        if (userId) {
            AsyncStorage.setItem('currentUserId', userId.toString());
            connectSocket(userId, 'food-delivery');
        }

        return () => {
            disconnectSocket();
            AsyncStorage.removeItem('currentUserId');
            stopLocationTracking();
            stopBackgroundLocationTracking();
        };
    }, [userId]);

    // Initialize location and background tracking
    useEffect(() => {
        getCurrentLocation();
        checkBackgroundLocationPermission();

        return () => {
            stopLocationTracking();
            stopBackgroundLocationTracking();
        };
    }, []);

    useEffect(() => {
        if (currentLocation) {
            fetchRestaurants();
        }
    }, [currentLocation]);

    useEffect(() => {
        if (restaurants.length > 0 && currentLocation) {
            calculateRestaurantDistances(restaurants);
        }
    }, [restaurants, currentLocation]);

    useEffect(() => {
        if (Object.keys(restaurantDistances).length > 0) {
            fetchOrders();
        }
    }, [restaurantDistances]);

    // FIXED: Enhanced banner visibility management
    useEffect(() => {
        // Always show banner when there's an active current order
        const shouldShowBanner = currentOrder &&
            ['accepted', 'preparing', 'collected', 'arrived'].includes(currentOrder.status);

        setShowOrderBanner(shouldShowBanner);

        console.log('🎯 Banner visibility:', {
            hasCurrentOrder: !!currentOrder,
            orderStatus: currentOrder?.status,
            shouldShowBanner: shouldShowBanner
        });
    }, [currentOrder]);

    // Start/stop location tracking based on order status
    useEffect(() => {
        if (currentOrder?.status === 'collected' && !isLocationTrackingActive) {
            startLocationTracking();
            startBackgroundLocationTracking();
        } else if (currentOrder?.status === 'completed' && isLocationTrackingActive) {
            stopLocationTracking();
            stopBackgroundLocationTracking();
        }
    }, [currentOrder?.status, isLocationTrackingActive]);

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            if (isLocationTrackingActive) {
                stopLocationTracking();
            }
            if (isBackgroundTrackingActive) {
                stopBackgroundLocationTracking();
            }
        };
    }, [isLocationTrackingActive, isBackgroundTrackingActive]);

    // Check and request background location permission
    const checkBackgroundLocationPermission = async () => {
        try {
            const { status } = await Location.getBackgroundPermissionsAsync();
            console.log('Background location permission status:', status);
            return status === 'granted';
        } catch (error) {
            console.error('Error checking background permission:', error);
            return false;
        }
    };

    // Start background location tracking - FIXED VERSION
    const startBackgroundLocationTracking = async () => {
        try {
            console.log('📍 Starting background location tracking...');

            // First check if already registered
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            if (isTaskRegistered) {
                console.log('📍 Background task already registered');
                setIsBackgroundTrackingActive(true);
                return;
            }

            // First request foreground permission
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                console.error("Foreground location permission denied");
                Alert.alert(
                    "Location Permission Required",
                    "Please enable location services to track deliveries.",
                    [{ text: "OK" }]
                );
                return;
            }

            // Then request background permission
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                console.log("Background location permission not granted, requesting...");
                
                // For iOS, we need to show specific instructions
                if (Platform.OS === 'ios') {
                    Alert.alert(
                        "Background Location Required",
                        "To track deliveries while the app is in background, please:\n1. Go to Settings\n2. Tap on this app\n3. Tap Location\n4. Select 'Always'",
                        [{ text: "Open Settings", onPress: () => Linking.openURL('app-settings:') }, { text: "Cancel" }]
                    );
                } else {
                    Alert.alert(
                        "Background Location Required",
                        "Please enable background location in settings to continue tracking while the app is in background.",
                        [{ text: "OK" }]
                    );
                }
                return;
            }

            // Start the background task
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 30000, // Update every 30 seconds in background
                distanceInterval: 50, // Update every 50 meters
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: "Delivery Tracking",
                    notificationBody: "Your location is being tracked for delivery",
                    notificationColor: "#0DCAF0"
                }
            });

            setIsBackgroundTrackingActive(true);
            console.log('✅ Background location tracking started');

        } catch (error) {
            console.error('❌ Error starting background location tracking:', error);
            
            // More specific error handling
            if (error.message.includes('TASK_SERVICE_NOT_FOUND')) {
                Alert.alert(
                    "Background Location Unavailable",
                    "Background location tracking is not available on this device or version.",
                    [{ text: "OK" }]
                );
            } else if (error.message.includes('permissions')) {
                Alert.alert(
                    "Permission Error",
                    "Please grant location permissions to enable delivery tracking.",
                    [{ text: "OK" }]
                );
            }
        }
    };

    // Stop background location tracking - FIXED VERSION
    const stopBackgroundLocationTracking = async () => {
        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                console.log('📍 Background location tracking stopped');
            }
            setIsBackgroundTrackingActive(false);
        } catch (error) {
            console.error('❌ Error stopping background location tracking:', error);
        }
    };

    // Start real-time foreground location tracking to Firebase
    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error("Permission to access location was denied");
                return;
            }

            console.log('📍 Starting foreground location tracking...');

            const watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Update every 10 meters
                },
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // Update current location state
                    setCurrentLocation(prev => ({
                        ...prev,
                        latitude,
                        longitude
                    }));

                    // Save to Firebase - ONLY LOCATION DATA
                    try {
                        const driverLocationRef = doc(db, "driver_locations", userId.toString());
                        await setDoc(
                            driverLocationRef,
                            {
                                userId: userId,
                                latitude,
                                longitude,
                                timestamp: new Date().toISOString(),
                                orderId: currentOrder?.id || null,
                                orderNumber: currentOrder?.order_number || null,
                                status: 'delivering',
                                background: false,
                                foreground: true
                            },
                            { merge: true },
                        );
                        console.log('📍 Foreground location updated in Firebase');
                    } catch (error) {
                        console.log("Error saving foreground location to Firebase:", error);
                    }
                },
            );

            setLocationWatchId(watchId);
            setIsLocationTrackingActive(true);
            console.log('📍 Foreground location tracking started');

        } catch (error) {
            console.error('Error starting foreground location tracking:', error);
        }
    };

    // Stop foreground location tracking
    const stopLocationTracking = () => {
        if (locationWatchId) {
            locationWatchId.remove();
            setLocationWatchId(null);
        }
        setIsLocationTrackingActive(false);
        console.log('📍 Foreground location tracking stopped');
    };

    // Update driver location in Firebase (one-time update)
    const updateDriverLocation = async (latitude, longitude, status = 'active') => {
        try {
            const driverLocationRef = doc(db, "driver_locations", userId.toString());
            await setDoc(
                driverLocationRef,
                {
                    userId: userId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString(),
                    // No order details - just location
                    status: status,
                    background: false,
                    foreground: true
                },
                { merge: true },
            );
            console.log('📍 Driver location updated in Firebase');
        } catch (error) {
            console.log("Error saving driver location to Firebase:", error);
        }
    };

    // Load delivery address distances from storage
    const loadDeliveryAddressDistances = async () => {
        try {
            const storedDistances = await AsyncStorage.getItem('deliveryAddressDistances');
            if (storedDistances) {
                const distances = JSON.parse(storedDistances);
                setDeliveryAddressDistances(distances);
                console.log('📍 Loaded delivery address distances from storage:', Object.keys(distances).length);
            }
        } catch (error) {
            console.error('Error loading delivery address distances:', error);
        }
    };

    // Save delivery address distances to storage
    const saveDeliveryAddressDistances = async (distances) => {
        try {
            await AsyncStorage.setItem('deliveryAddressDistances', JSON.stringify(distances));
        } catch (error) {
            console.error('Error saving delivery address distances:', error);
        }
    };

    // Update the useEffect for deliveryAddressDistances to save when it changes
    useEffect(() => {
        if (Object.keys(deliveryAddressDistances).length > 0) {
            saveDeliveryAddressDistances(deliveryAddressDistances);
        }
    }, [deliveryAddressDistances]);

    // Load current order from storage on app start
    useEffect(() => {
        loadCurrentOrder();
        loadDeliveryAddressDistances();
    }, []);

    // FIXED: Enhanced current order loading with banner management
    const loadCurrentOrder = async () => {
        try {
            const storedOrder = await AsyncStorage.getItem('currentDeliveryOrder');
            if (storedOrder) {
                const order = JSON.parse(storedOrder);
                setCurrentOrder(order);
                setShowOrderBanner(['accepted', 'preparing', 'collected', 'arrived'].includes(order.status));

                // Also ensure we're on the active tab if there's a current order
                if (['accepted', 'preparing', 'collected', 'arrived'].includes(order.status)) {
                    setActiveTab('active');

                    // If we have a current order but no coordinates, try to recalculate
                    if (!deliveryAddressDistances[order.id]?.coordinates && currentLocation) {
                        console.log('🔄 Recalculating coordinates for current order...');
                        calculateDeliveryAddressDistances([order]);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading current order:', error);
        }
    };

    // Save current order to AsyncStorage whenever it changes
    useEffect(() => {
        if (currentOrder) {
            saveCurrentOrder(currentOrder);
        } else {
            // Clear storage when no current order
            clearCurrentOrder();
            setShowOrderBanner(false);
        }
    }, [currentOrder]);

    const saveCurrentOrder = async (order) => {
        try {
            await AsyncStorage.setItem('currentDeliveryOrder', JSON.stringify(order));
        } catch (error) {
            console.error('Error saving current order:', error);
        }
    };

    const clearCurrentOrder = async () => {
        try {
            await AsyncStorage.removeItem('currentDeliveryOrder');
            setShowOrderBanner(false);
        } catch (error) {
            console.error('Error clearing current order:', error);
        }
    };

    // FIXED: Enhanced handleShowMap with better banner persistence
    const handleShowMap = async (order) => {
        if (!currentLocation) {
            Alert.alert('Location Required', 'Please enable location services to view navigation.');
            return;
        }

        let destinationCoords = deliveryAddressDistances[order.id]?.coordinates;

        // If coordinates are missing, try to geocode the address
        if (!destinationCoords) {
            Alert.alert(
                'Getting Coordinates',
                'Finding coordinates for delivery address...',
                [{ text: 'OK' }]
            );

            try {
                const newCoords = await geocodeAddress(order.delivery_address);
                if (newCoords) {
                    // Update the delivery address distances
                    const updatedDistances = {
                        ...deliveryAddressDistances,
                        [order.id]: {
                            distance: calculateDistance(
                                currentLocation.latitude,
                                currentLocation.longitude,
                                newCoords.latitude,
                                newCoords.longitude
                            ),
                            coordinates: newCoords,
                            formattedDistance: 'Calculating...'
                        }
                    };
                    setDeliveryAddressDistances(updatedDistances);
                    destinationCoords = newCoords;
                } else {
                    throw new Error('Could not geocode address');
                }
            } catch (error) {
                console.error('Error geocoding address:', error);
                Alert.alert(
                    'Address Error',
                    'Could not find coordinates for delivery address. Please check your internet connection and try again.'
                );
                return;
            }
        }

        if (!destinationCoords) {
            Alert.alert('Address Error', 'Could not find coordinates for delivery address.');
            return;
        }

        setSelectedOrderForMap({
            ...order,
            destination: destinationCoords,
            restaurant_coordinates: restaurantDistances[order.restaurant_id]?.coordinates
        });
        setShowMap(true);
    }

    // Add this function to handle external navigation
    const handleExternalNavigation = (url) => {
        Alert.alert('Navigation', 'Opening in Google Maps...');
        console.log('Would open:', url);
    }

    // FIXED: filterOrders function - ensure collected orders show in active tab
    const filterOrders = useCallback(() => {
        let filtered = [];

        switch (activeTab) {
            case 'available':
                // For available tab, show only 'ready' orders within distance
                filtered = orders.filter(order => {
                    if (order.status !== 'ready') return false;
                    const deliveryDistance = deliveryAddressDistances[order.id];
                    return deliveryDistance && deliveryDistance.distance !== null && deliveryDistance.distance <= 5;
                });
                break;

            case 'active':
                // For active tab, show orders in progress (including collected)
                filtered = orders.filter(order =>
                    ['accepted', 'preparing', 'collected', 'arrived'].includes(order.status)
                );
                break;

            case 'completed':
                // For completed tab, show completed and cancelled orders
                filtered = orders.filter(order =>
                    ['completed', 'cancelled'].includes(order.status)
                );
                break;
        }

        console.log(`🔄 Filtered ${filtered.length} orders for ${activeTab} tab`);
        console.log(`📊 Current order status: ${currentOrder?.status}`);
        setFilteredOrders(filtered);
    }, [activeTab, orders, deliveryAddressDistances, currentOrder]);

    // FIXED: Separate useEffect for calculating delivery distances
    useEffect(() => {
        if (activeTab === 'available' && orders.length > 0) {
            const availableOrders = orders.filter(order => order.status === 'ready');
            if (availableOrders.length > 0) {
                calculateDeliveryAddressDistances(availableOrders);
            }
        }
    }, [activeTab, orders]);

    // FIXED: Separate useEffect for filtering and animation
    useEffect(() => {
        filterOrders();
    }, [filterOrders]);

    useEffect(() => {
        animateTabIndicator();
    }, [activeTab]);

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance;
    };

    // Geocode address to coordinates - FIXED VERSION
    const geocodeAddress = async (address) => {
        try {
            console.log(`📍 Geocoding address: ${address}`);

            // Basic validation
            if (!address || address.trim() === '') {
                console.log('❌ Empty address provided');
                return null;
            }

            // Check if Location is available
            if (!Location.geocodeAsync) {
                console.log('❌ Location.geocodeAsync is not available');
                return null;
            }

            const geocoded = await Location.geocodeAsync(address);

            if (geocoded && geocoded.length > 0) {
                const result = {
                    latitude: geocoded[0].latitude,
                    longitude: geocoded[0].longitude
                };
                console.log(`✅ Successfully geocoded: ${result.latitude}, ${result.longitude}`);
                return result;
            } else {
                console.log('❌ No geocoding results found');
                return null;
            }
        } catch (error) {
            console.error('❌ Error geocoding address:', error);

            // Fallback: Try with a simpler approach or return null
            if (error.message.includes('NOBRIDGE') || error.message.includes('geocodeAsync')) {
                console.log('⚠️ Geocoding service unavailable, using fallback');
            }

            return null;
        }
    };

    // Calculate distances to all restaurants
    const calculateRestaurantDistances = async (restaurantsData) => {
        if (!currentLocation) {
            console.log('No current location available for distance calculation');
            return;
        }

        const distances = {};

        for (const restaurant of restaurantsData) {
            try {
                // Create full address string
                const fullAddress = `${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip_code}`;

                // Geocode restaurant address with error handling
                const restaurantCoords = await geocodeAddress(fullAddress);

                if (restaurantCoords) {
                    // Calculate distance
                    const distance = calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        restaurantCoords.latitude,
                        restaurantCoords.longitude
                    );

                    distances[restaurant.id] = {
                        distance: distance,
                        coordinates: restaurantCoords,
                        formattedDistance: `${distance.toFixed(1)} km`
                    };

                    console.log(`📍 ${restaurant.name}: ${distance.toFixed(2)} km away`);

                } else {
                    console.log(`❌ Could not geocode address for ${restaurant.name}`);
                    distances[restaurant.id] = {
                        distance: null,
                        coordinates: null,
                        formattedDistance: 'Unknown distance'
                    };
                }
            } catch (error) {
                console.error(`Error calculating distance for ${restaurant.name}:`, error);
                distances[restaurant.id] = {
                    distance: null,
                    coordinates: null,
                    formattedDistance: 'Error calculating distance'
                };
            }
        }

        setRestaurantDistances(distances);

        // Log summary
        const within5km = Object.values(distances).filter(d => d.distance !== null && d.distance <= 5).length;

        console.log('=== RESTAURANT DISTANCE SUMMARY ===');
        console.log(`Total restaurants: ${restaurantsData.length}`);
        console.log(`Restaurants within 5km: ${within5km}`);
        console.log('===================================');
    };

    // Add this function to retry geocoding for specific orders
    const retryGeocodingForOrder = async (order) => {
        if (!currentLocation) {
            Alert.alert('Location Required', 'Please wait for location services to initialize.');
            return null;
        }

        try {
            Alert.alert('Getting Coordinates', 'Finding coordinates for delivery address...');

            const deliveryCoords = await geocodeAddress(order.delivery_address);

            if (deliveryCoords) {
                const distance = calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    deliveryCoords.latitude,
                    deliveryCoords.longitude
                );

                const updatedDistances = {
                    ...deliveryAddressDistances,
                    [order.id]: {
                        distance: distance,
                        coordinates: deliveryCoords,
                        formattedDistance: `${distance.toFixed(1)} km`
                    }
                };

                setDeliveryAddressDistances(updatedDistances);

                Alert.alert('Success', 'Coordinates found! You can now view the map.');
                return deliveryCoords;
            } else {
                throw new Error('Could not geocode address');
            }
        } catch (error) {
            console.error('Error retrying geocoding:', error);
            Alert.alert('Error', 'Could not find coordinates for this address. Please try again later.');
            return null;
        }
    };

    // Update the calculateDeliveryAddressDistances function
    const calculateDeliveryAddressDistances = async (ordersData) => {
        if (!currentLocation) {
            console.log('No current location available for delivery address calculation');
            return;
        }

        const distances = { ...deliveryAddressDistances }; // Start with existing distances
        let hasNewDistances = false;

        for (const order of ordersData) {
            try {
                // Skip if we already have valid coordinates for this order
                if (distances[order.id]?.coordinates) {
                    console.log(`📍 Using cached coordinates for order ${order.order_number}`);
                    continue;
                }

                // Geocode delivery address with error handling
                const deliveryCoords = await geocodeAddress(order.delivery_address);

                if (deliveryCoords) {
                    // Calculate distance
                    const distance = calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        deliveryCoords.latitude,
                        deliveryCoords.longitude
                    );

                    distances[order.id] = {
                        distance: distance,
                        coordinates: deliveryCoords,
                        formattedDistance: `${distance.toFixed(1)} km`
                    };
                    hasNewDistances = true;

                    console.log(`🏠 Delivery address for order ${order.order_number}: ${distance.toFixed(2)} km away`);

                } else {
                    console.log(`❌ Could not geocode delivery address for order ${order.order_number}`);
                    distances[order.id] = {
                        distance: null,
                        coordinates: null,
                        formattedDistance: 'Unknown distance'
                    };
                    hasNewDistances = true;
                }
            } catch (error) {
                console.error(`Error calculating delivery distance for order ${order.order_number}:`, error);
                distances[order.id] = {
                    distance: null,
                    coordinates: null,
                    formattedDistance: 'Error calculating distance'
                };
                hasNewDistances = true;
            }
        }

        if (hasNewDistances) {
            setDeliveryAddressDistances(distances);
        }
    };

    // FIXED: shouldShowAcceptButton function with debug logging
    const shouldShowAcceptButton = (order) => {
        if (activeTab !== 'available') {
            console.log('❌ Not in available tab');
            return false;
        }

        // Don't show accept button if user has an active order
        const hasActive = hasActiveOrder();
        console.log(`🔍 Checking accept button for order ${order.order_number}:`, {
            orderId: order.id,
            orderStatus: order.status,
            hasActiveOrder: hasActive,
            activeTab: activeTab
        });

        if (hasActive) {
            console.log('❌ Cannot accept - user has active order');
            return false;
        }

        const deliveryDistance = deliveryAddressDistances[order.id];
        const isWithinDistance = deliveryDistance && deliveryDistance.distance !== null && deliveryDistance.distance <= 5;

        console.log(`📍 Distance check for order ${order.order_number}:`, {
            hasDistance: !!deliveryDistance,
            distance: deliveryDistance?.distance,
            isWithinDistance: isWithinDistance
        });

        return isWithinDistance;
    };
    
    // Fetch restaurants from API
    const fetchRestaurants = async () => {
        try {
            setIsLoadingRestaurants(true);

            const response = await fetch(`${api}restaurants_info/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const restaurantsData = await response.json();
            setRestaurants(restaurantsData);

            console.log('=== RESTAURANTS LOADED ===');
            console.log(`Total restaurants: ${restaurantsData.length}`);

        } catch (error) {
            console.error('Error fetching restaurants:', error);
        } finally {
            setIsLoadingRestaurants(false);
        }
    };

    // Fetch all orders (not filtered by distance initially)
    const fetchOrders = async () => {
        try {
            console.log('🔄 Fetching all orders...');

            // Get nearby restaurant IDs
            const nearbyRestaurantIds = Object.keys(restaurantDistances)
                .filter(restaurantId => {
                    const distance = restaurantDistances[restaurantId]?.distance;
                    return distance !== null && distance <= 5;
                });

            console.log(`📍 Nearby restaurants: ${nearbyRestaurantIds.length}`);

            if (nearbyRestaurantIds.length === 0) {
                console.log('❌ No nearby restaurants found within 5km');
                setOrders([]);
                return;
            }

            const allOrders = [];

            for (const restaurantId of nearbyRestaurantIds) {
                try {
                    console.log(`🍕 Fetching orders for restaurant: ${restaurantId}`);
                    const response = await fetch(`${api}food-orders/restaurant/${restaurantId}`);

                    if (!response.ok) {
                        console.log(`❌ HTTP error for restaurant ${restaurantId}: ${response.status}`);
                        continue;
                    }

                    const restaurantOrders = await response.json();
                    console.log(`📦 Found ${restaurantOrders.length} orders for restaurant ${restaurantId}`);

                    // Add restaurant info to each order
                    const restaurant = restaurants.find(r => r.id === parseInt(restaurantId));
                    const ordersWithRestaurantInfo = restaurantOrders.map(order => ({
                        ...order,
                        restaurant_name: restaurant?.name || 'Unknown Restaurant',
                        restaurant_image: restaurant?.image_url || null,
                        restaurant_id: parseInt(restaurantId) // Ensure restaurant_id is set
                    }));

                    allOrders.push(...ordersWithRestaurantInfo);

                } catch (error) {
                    console.error(`❌ Error fetching orders for restaurant ${restaurantId}:`, error);
                }
            }

            // Filter for delivery orders only
            const deliveryOrders = allOrders.filter(order => order.order_type === 'delivery');

            console.log('=== ORDERS SUMMARY ===');
            console.log(`Total delivery orders: ${deliveryOrders.length}`);
            deliveryOrders.forEach(order => {
                console.log(`📋 Order: ${order.order_number}, Status: ${order.status}, Restaurant: ${order.restaurant_name}`);
            });

            setOrders(deliveryOrders);

        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            setOrders([]);
        }
    };

    // Get current location
    const getCurrentLocation = async () => {
        try {
            setIsLoadingLocation(true);
            setLocationError(null);

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission to access location was denied');
                setIsLoadingLocation(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 15000,
            });

            const newLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
            };

            setCurrentLocation(newLocation);
            console.log('📍 Current location obtained:', newLocation);

            // Update Firebase with current location
            await updateDriverLocation(newLocation.latitude, newLocation.longitude, 'active');

            // Get address from coordinates
            getAddressFromCoordinates(location.coords.latitude, location.coords.longitude);

        } catch (error) {
            console.error('❌ Error getting location:', error);
            setLocationError('Failed to get current location');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Get address from coordinates
    const getAddressFromCoordinates = async (latitude, longitude) => {
        try {
            let address = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            });

            if (address.length > 0) {
                const firstAddress = address[0];
                const formattedAddress = `${firstAddress.street || ''} ${firstAddress.name || ''}, ${firstAddress.city || ''}`.trim();

                setCurrentLocation(prev => ({
                    ...prev,
                    address: formattedAddress || 'Address not available'
                }));
            }
        } catch (error) {
            console.error('Error getting address:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await getCurrentLocation();
        await fetchRestaurants();
        setRefreshing(false);
    };

    const animateTabIndicator = () => {
        const tabIndex = ['available', 'active', 'completed'].indexOf(activeTab);
        Animated.spring(slideAnim, {
            toValue: tabIndex * (width / 3),
            useNativeDriver: true,
        }).start();
    };

    // FIXED: Enhanced hasActiveOrder function with debug logging
    const hasActiveOrder = useCallback(() => {
        console.log('🔍 Checking for active orders...');

        // Check if there's a current order that's not completed
        if (currentOrder) {
            const isCurrentOrderActive = !['completed', 'cancelled'].includes(currentOrder.status);
            console.log('📦 Current order check:', {
                hasCurrentOrder: !!currentOrder,
                currentOrderStatus: currentOrder?.status,
                isCurrentOrderActive: isCurrentOrderActive
            });

            if (isCurrentOrderActive) {
                return true;
            }
        }

        // Also check orders array for any active orders assigned to this user
        const userActiveOrders = orders.filter(order =>
            ['accepted', 'preparing', 'collected', 'arrived'].includes(order.status)
        );

        console.log('📊 Orders array check:', {
            totalOrders: orders.length,
            userActiveOrdersCount: userActiveOrders.length,
            userActiveOrders: userActiveOrders.map(o => ({ id: o.id, status: o.status, order_number: o.order_number }))
        });

        const result = userActiveOrders.length > 0;
        console.log('🎯 Final hasActiveOrder result:', result);

        return result;
    }, [currentOrder, orders]);

    // FIXED: Enhanced acceptOrder function with driverId
    const acceptOrder = async (order) => {
        try {
            // Check if user already has an active order
            if (hasActiveOrder()) {
                Alert.alert(
                    'Active Order in Progress',
                    'Please complete your current delivery before accepting a new order.',
                    [{ text: 'OK' }]
                );
                return;
            }

            console.log(`✅ Accepting order: ${order.order_number}`);

            const newStatus = 'accepted';

            // Enhanced API call with better error handling
            const response = await fetch(`${api}food-orders/${order.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    driverId: userId
                })
            });

            console.log(`📡 API Response status: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                console.log('📦 API Response:', result);

                // Update local state immediately
                const updatedOrders = orders.map(o =>
                    o.id === order.id ? { ...o, status: newStatus } : o
                );

                setOrders(updatedOrders);

                // CRITICAL: Set currentOrder and ensure banner shows
                const newCurrentOrder = { ...order, status: newStatus };
                setCurrentOrder(newCurrentOrder);
                setShowOrderBanner(true);
                setActiveTab('active');

                // Update driver location in Firebase
                if (currentLocation) {
                    await updateDriverLocation(currentLocation.latitude, currentLocation.longitude, 'accepted');
                }

                // FIXED: Emit socket event with driverId
                emitOrderStatus(order.id, newStatus, order.user_id, userId); // ADD driverId here

                console.log('📤 Socket event emitted:', {
                    orderId: order.id,
                    status: newStatus,
                    customerId: order.user_id,
                    driverId: userId, // Make sure this is included
                    orderNumber: order.order_number
                });

                Alert.alert('Success', 'Order accepted! Head to the restaurant to pick up.');

            } else {
                // Get more detailed error information
                const errorText = await response.text();
                console.error('❌ Server response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });

                throw new Error(`Server error: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error accepting order:', error);

            // More specific error messages
            let errorMessage = 'Failed to accept order. Please try again.';

            if (error.message.includes('Network request failed')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please try again.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Order not found. It may have been already accepted by another driver.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid request. Please contact support.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again in a few moments.';
            }

            Alert.alert('Error', errorMessage);
        }
    };

    // FIXED: Enhanced updateOrderStatus to update collected_time and arrived_time with Firebase tracking
    const updateOrderStatus = async (status) => {
        if (!currentOrder) return;

        try {
            // Prepare the request body with timestamp fields
            const requestBody = { status, driverId: userId };

            // Add timestamp fields based on the status
            if (status === 'collected') {
                requestBody.collected_time = new Date().toISOString();
            } else if (status === 'arrived') {
                requestBody.arrived_time = new Date().toISOString();
            } else if (status === 'completed') {
                requestBody.completed_time = new Date().toISOString();
            }

            const response = await fetch(`${api}food-orders/${currentOrder.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                let message = '';

                // Update local state
                const updatedOrders = orders.map(order =>
                    order.id === currentOrder.id ? {
                        ...order,
                        status,
                        // Update timestamps locally as well
                        ...(status === 'collected' && { collected_time: requestBody.collected_time }),
                        ...(status === 'arrived' && { arrived_time: requestBody.arrived_time }),
                        ...(status === 'completed' && { completed_time: requestBody.completed_time })
                    } : order
                );

                setOrders(updatedOrders);

                // Update currentOrder with new status and timestamps
                const updatedCurrentOrder = {
                    ...currentOrder,
                    status,
                    // Update timestamps locally as well
                    ...(status === 'collected' && { collected_time: requestBody.collected_time }),
                    ...(status === 'arrived' && { arrived_time: requestBody.arrived_time }),
                    ...(status === 'completed' && { completed_time: requestBody.completed_time })
                };
                setCurrentOrder(updatedCurrentOrder);

                // Handle Firebase location tracking based on status
                if (status === 'collected') {
                    // Start real-time location tracking when order is picked up
                    setShowOrderBanner(true);
                    setActiveTab('active');
                    if (currentLocation) {
                        await updateDriverLocation(currentLocation.latitude, currentLocation.longitude, 'delivering');
                    }
                    // Start continuous location tracking
                    startLocationTracking();
                    startBackgroundLocationTracking();

                } else if (status === 'arrived') {
                    // Update location status to arrived
                    if (currentLocation) {
                        await updateDriverLocation(currentLocation.latitude, currentLocation.longitude, 'arrived');
                    }

                } else if (status === 'completed') {
                    // Stop location tracking and update status
                    stopLocationTracking();
                    stopBackgroundLocationTracking();
                    if (currentLocation) {
                        await updateDriverLocation(currentLocation.latitude, currentLocation.longitude, 'completed');
                    }
                    setCurrentOrder(null);
                    setShowOrderBanner(false);
                }

                // Emit socket event for order status update WITH driverId
                emitOrderStatus(currentOrder.id, status, currentOrder.user_id, userId); // ADD driverId here

                console.log('📤 Socket event emitted:', {
                    orderId: currentOrder.id,
                    status: status,
                    customerId: currentOrder.user_id,
                    driverId: userId, // Make sure this is included
                    orderNumber: currentOrder.order_number,
                    ...(status === 'collected' && { collected_time: requestBody.collected_time }),
                    ...(status === 'arrived' && { arrived_time: requestBody.arrived_time })
                });

                switch (status) {
                    case 'collected':
                        message = 'Order collected! Now deliver to the customer. Location tracking started.';
                        break;
                    case 'arrived':
                        message = 'Arrived at delivery location!';
                        break;
                    case 'completed':
                        message = 'Order delivered successfully!';
                        break;
                }

                Alert.alert('Success', message);

            } else {
                throw new Error('Failed to update order status');
            }
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            Alert.alert('Error', 'Failed to update order status. Please try again.');
        }
    };

    const toggleOnlineStatus = () => {
        setIsOnline(!isOnline);
        Alert.alert(
            isOnline ? 'Go Offline' : 'Go Online',
            isOnline
                ? 'You will stop receiving new orders'
                : 'You are now available for deliveries'
        );
    };

    // Render location info component
    const renderLocationInfo = () => {
        if (isLoadingLocation) {
            return (
                <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={16} color="#6c757d" />
                    <Text style={styles.locationText}>Getting your location...</Text>
                </View>
            );
        }

        if (locationError) {
            return (
                <TouchableOpacity
                    style={styles.locationContainer}
                    onPress={getCurrentLocation}
                >
                    <Ionicons name="location-off-outline" size={16} color="#dc3545" />
                    <Text style={[styles.locationText, styles.locationError]}>{locationError}</Text>
                    <Ionicons name="refresh" size={16} color="#0DCAF0" style={styles.refreshIcon} />
                </TouchableOpacity>
            );
        }

        if (currentLocation) {
            return (
                <TouchableOpacity
                    style={styles.locationContainer}
                    onPress={onRefresh}
                >
                    <Ionicons name="location" size={16} color="#28a745" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {currentLocation.address || `Lat: ${currentLocation.latitude.toFixed(4)}, Lng: ${currentLocation.longitude.toFixed(4)}`}
                    </Text>
                    <Ionicons name="refresh" size={14} color="#6c757d" style={styles.refreshIcon} />
                </TouchableOpacity>
            );
        }

        return null;
    };

    // FIXED: Simplified and better aligned banner component
    const renderOrderBanner = () => {
        if (!showOrderBanner || !currentOrder) return null;

        return (
            <View style={styles.simplifiedBanner}>
                <View style={styles.bannerHeader}>
                    <Ionicons name="navigate" size={20} color="#fff" />
                    <Text style={styles.bannerTitle}>
                        {currentOrder.status === 'collected' || currentOrder.status === 'arrived'
                            ? 'Delivery in Progress'
                            : 'Pickup in Progress'}
                    </Text>
                    {(isLocationTrackingActive || isBackgroundTrackingActive) && (
                        <View style={styles.trackingIndicator}>
                            <Ionicons name="radio-button-on" size={12} color="#28a745" />
                            <Text style={styles.trackingText}>
                                {isBackgroundTrackingActive ? 'Background Tracking' : 'Live Tracking'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.bannerDetails}>
                    <Text style={styles.bannerOrderText}>
                        Order: {currentOrder.order_number}
                    </Text>
                    <Text style={styles.bannerStatus}>
                        Status: {currentOrder.status.charAt(0).toUpperCase() + currentOrder.status.slice(1)}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.bannerActionButton}
                    onPress={() => handleShowMap(currentOrder)}
                >
                    <Ionicons name="map" size={16} color="#0DCAF0" />
                    <Text style={styles.bannerActionText}>
                        {currentOrder.status === 'collected' || currentOrder.status === 'arrived'
                            ? 'Navigate to Customer'
                            : 'View Route to Restaurant'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderOrderCard = (order) => {
        const isAvailable = activeTab === 'available';
        const isActive = activeTab === 'active';
        const isCompleted = activeTab === 'completed';
        const showAcceptButton = isAvailable && shouldShowAcceptButton(order);
        const userHasActiveOrder = hasActiveOrder();

        // Find restaurant info
        const restaurant = restaurants.find(r => r.id === order.restaurant_id);
        const restaurantDistance = restaurantDistances[order.restaurant_id];
        const deliveryDistance = deliveryAddressDistances[order.id];

        return (
            <View style={styles.orderCard}>
                {/* Restaurant Header */}
                <View style={styles.restaurantHeader}>
                    <Image
                        source={{ uri: restaurant?.image_url || 'https://via.placeholder.com/50' }}
                        style={styles.restaurantImage}
                    />
                    <View style={styles.restaurantInfo}>
                        <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurant'}</Text>
                        <Text style={styles.deliveryAddress}>{order.delivery_address}</Text>
                        <Text style={styles.orderNumber}>Order: {order.order_number}</Text>
                        {restaurantDistance && deliveryDistance && (
                            <Text style={styles.distanceInfo}>
                                📍 {restaurantDistance.formattedDistance} to restaurant • 🏠 {deliveryDistance.formattedDistance} to delivery
                            </Text>
                        )}
                    </View>
                    <View style={styles.orderTotal}>
                        <Text style={styles.totalAmount}>R{order.final_amount}</Text>
                        <Text style={styles.orderType}>{order.order_type}</Text>
                    </View>
                </View>

                {/* Order Items */}
                <View style={styles.itemsContainer}>
                    {order.items && order.items.map((item, index) => (
                        <Text key={index} style={styles.itemText}>
                            {item.quantity}x {item.item_name} - R{item.total_price}
                        </Text>
                    ))}
                    {(!order.items || order.items.length === 0) && (
                        <Text style={styles.itemText}>Loading items...</Text>
                    )}
                </View>

                {/* Customer Info */}
                <View style={styles.customerInfo}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.customerName}>{order.customer_name}</Text>
                    <Ionicons name="call-outline" size={16} color="#666" style={styles.phoneIcon} />
                    <Text style={styles.customerPhone}>{order.customer_phone}</Text>
                </View>

                {order.special_instructions && (
                    <View style={styles.instructionsContainer}>
                        <Ionicons name="document-text-outline" size={16} color="#666" />
                        <Text style={styles.instructionsText}>{order.special_instructions}</Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    {isAvailable && (
                        <>
                            <View style={styles.timeBadge}>
                                <Ionicons name="time-outline" size={14} color="#0DCAF0" />
                                <Text style={styles.timeText}>Ready for pickup</Text>
                            </View>
                            {userHasActiveOrder ? (
                                <View style={styles.disabledButton}>
                                    <Text style={styles.disabledButtonText}>Complete Active Order First</Text>
                                </View>
                            ) : showAcceptButton ? (
                                <TouchableOpacity
                                    style={styles.acceptButton}
                                    onPress={() => acceptOrder(order)}
                                >
                                    <Text style={styles.acceptButtonText}>Accept</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.disabledButton}>
                                    <Text style={styles.disabledButtonText}>Too Far</Text>
                                </View>
                            )}
                        </>
                    )}

                    {isActive && (
                        <View style={styles.activeOrderActions}>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => updateOrderStatus('collected')}
                            >
                                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                                <Text style={styles.secondaryButtonText}>Picked Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => updateOrderStatus('arrived')}
                            >
                                <Ionicons name="location" size={16} color="#fff" />
                                <Text style={styles.primaryButtonText}>Arrived</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.completeButton}
                                onPress={() => updateOrderStatus('completed')}
                            >
                                <Ionicons name="checkmark-done" size={16} color="#fff" />
                                <Text style={styles.completeButtonText}>Complete</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isCompleted && (
                        <View style={styles.completedInfo}>
                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={16} color="#FFD700" />
                                <Text style={styles.ratingText}>Completed</Text>
                            </View>
                            <Text style={styles.earningsText}>Earned: R{order.final_amount}</Text>
                            <Text style={styles.completedTime}>
                                {new Date(order.completed_time || order.updated_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Order Status */}
                <View style={styles.statusContainer}>
                    <Text style={[styles.statusText,
                    order.status === 'pending' && styles.statusPending,
                    order.status === 'accepted' && styles.statusAccepted,
                    order.status === 'preparing' && styles.statusPreparing,
                    order.status === 'ready' && styles.statusReady,
                    order.status === 'completed' && styles.statusCompleted
                    ]}>
                        Status: {order.status}
                    </Text>
                </View>
            </View>
        );
    };

    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>
                    {orders.filter(order => order.status === 'ready').length}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>
                    {orders.filter(order => ['accepted', 'preparing', 'collected', 'arrived'].includes(order.status)).length}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>
                    {orders.filter(order => order.status === 'completed').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
                    <Icon type="material-community" name="menu" color="#0F172A" size={24} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Food Delivery</Text>
                    {renderLocationInfo()}
                </View>

                <TouchableOpacity
                    style={[styles.onlineButton, isOnline ? styles.online : styles.offline]}
                    onPress={toggleOnlineStatus}
                >
                    <Ionicons
                        name={isOnline ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isOnline ? "#28a745" : "#dc3545"}
                    />
                </TouchableOpacity>
            </View>

            {renderStats()}

            <View style={styles.tabContainer}>
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            transform: [{ translateX: slideAnim }]
                        }
                    ]}
                />
                {['Available', 'Active', 'Completed'].map((tab, index) => {
                    const tabKey = ['available', 'active', 'completed'][index];
                    const isActive = activeTab === tabKey;

                    // FIXED: Calculate counts based on the actual orders array, not filteredOrders
                    let orderCount = 0;

                    switch (tabKey) {
                        case 'available':
                            // For available tab, count only 'ready' orders that are within distance
                            orderCount = orders.filter(order => {
                                if (order.status !== 'ready') return false;
                                const deliveryDistance = deliveryAddressDistances[order.id];
                                return deliveryDistance && deliveryDistance.distance !== null && deliveryDistance.distance <= 5;
                            }).length;
                            break;

                        case 'active':
                            // For active tab, count orders in progress
                            orderCount = orders.filter(order =>
                                ['accepted', 'preparing', 'collected', 'arrived'].includes(order.status)
                            ).length;
                            break;

                        case 'completed':
                            // For completed tab, count completed orders
                            orderCount = orders.filter(order =>
                                ['completed', 'cancelled'].includes(order.status)
                            ).length;
                            break;
                    }

                    return (
                        <TouchableOpacity
                            key={tabKey}
                            style={styles.tab}
                            onPress={() => setActiveTab(tabKey)}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab}
                            </Text>
                            {orderCount > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{orderCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filteredOrders}
                renderItem={({ item }) => renderOrderCard(item)}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={showOrderBanner ? styles.listWithBanner : styles.listNormal}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#0DCAF0']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="fast-food-outline" size={64} color="#dee2e6" />
                        <Text style={styles.emptyStateTitle}>
                            {activeTab === 'available' ? 'No orders in your area' :
                                activeTab === 'active' ? 'No active orders' :
                                    'No completed orders'}
                        </Text>
                        <Text style={styles.emptyStateText}>
                            {activeTab === 'available' ?
                                'Move closer to restaurants to see available delivery orders' :
                                activeTab === 'active' ?
                                    'Accepted orders will appear here' :
                                    'Completed orders will appear here'}
                        </Text>
                    </View>
                }
            />

            {/* Use the simplified banner */}
            {renderOrderBanner()}

            <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />

            <MapComponent
                visible={showMap}
                onClose={() => setShowMap(false)}
                currentLocation={currentLocation}
                destination={selectedOrderForMap?.destination}
                orderDetails={selectedOrderForMap}
                onNavigatePress={handleExternalNavigation}
            />
        </SafeAreaView>
    );
};

// FIXED: Simplified and better aligned styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listNormal: {
        padding: 16,
        paddingBottom: 16
    },
    listWithBanner: {
        padding: 16,
        paddingBottom: 100 // Extra space for banner
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        textAlign: 'center',
    },
    // Location styles
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
    },
    locationText: {
        fontSize: 11,
        color: '#6c757d',
        marginLeft: 4,
        marginRight: 4,
        maxWidth: 200,
    },
    locationError: {
        color: '#dc3545',
    },
    refreshIcon: {
        marginLeft: 4,
    },
    onlineButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    online: {
        backgroundColor: '#f8f9fa',
    },
    offline: {
        backgroundColor: '#f8f9fa',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0DCAF0',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6c757d',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        position: 'relative',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6c757d',
    },
    tabTextActive: {
        color: '#0DCAF0',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: width / 3,
        height: 3,
        backgroundColor: '#0DCAF0',
    },
    tabBadge: {
        backgroundColor: '#0DCAF0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 4,
        minWidth: 20,
    },
    tabBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    // SIMPLIFIED BANNER STYLES
    simplifiedBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0DCAF0',
        padding: 12,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        marginHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    bannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    bannerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
        flex: 1,
    },
    trackingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trackingText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '500',
        marginLeft: 4,
    },
    bannerDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bannerOrderText: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
    bannerStatus: {
        color: '#fff',
        fontSize: 11,
        opacity: 0.8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    bannerActionButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6,
    },
    bannerActionText: {
        color: '#0DCAF0',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },

    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    restaurantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    restaurantImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    restaurantInfo: {
        flex: 1,
        marginLeft: 12,
    },
    restaurantName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 2,
    },
    deliveryAddress: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 2,
    },
    orderNumber: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 2,
    },
    distanceInfo: {
        fontSize: 10,
        color: '#0DCAF0',
        marginTop: 2,
    },
    orderTotal: {
        alignItems: 'flex-end',
    },
    totalAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    orderType: {
        fontSize: 12,
        color: '#28a745',
        marginTop: 2,
        fontWeight: '500',
    },
    itemsContainer: {
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
        paddingVertical: 12,
        marginBottom: 12,
    },
    itemText: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 4,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    customerName: {
        fontSize: 14,
        color: '#495057',
        marginLeft: 6,
    },
    phoneIcon: {
        marginLeft: 12,
    },
    customerPhone: {
        fontSize: 12,
        color: '#495057',
        marginLeft: 4,
    },
    instructionsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
    },
    instructionsText: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginLeft: 6,
        flex: 1,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fdff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e3f2fd',
    },
    timeText: {
        fontSize: 12,
        color: '#0DCAF0',
        fontWeight: '500',
        marginLeft: 4,
    },
    acceptButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    acceptButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    disabledButton: {
        backgroundColor: '#e9ecef',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    disabledButtonText: {
        color: '#6c757d',
        fontWeight: 'bold',
        fontSize: 14,
    },
    activeOrderActions: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
    },
    primaryButton: {
        backgroundColor: '#0DCAF0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    secondaryButton: {
        backgroundColor: '#f8f9fa',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
        flex: 1,
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#28a745',
        fontWeight: '500',
        fontSize: 12,
        marginLeft: 4,
    },
    completeButton: {
        backgroundColor: '#28a745',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    statusContainer: {
        marginTop: 8,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusPending: {
        backgroundColor: '#fff3cd',
        color: '#856404',
    },
    statusAccepted: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
    },
    statusPreparing: {
        backgroundColor: '#ffeaa7',
        color: '#856404',
    },
    statusReady: {
        backgroundColor: '#d4edda',
        color: '#155724',
    },
    statusCompleted: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
    },
    completedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: 14,
        color: '#FFD700',
        fontWeight: '500',
        marginLeft: 4,
    },
    earningsText: {
        fontSize: 14,
        color: '#28a745',
        fontWeight: '500',
    },
    completedTime: {
        fontSize: 12,
        color: '#6c757d',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6c757d',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#adb5bd',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default FoodDeliveryScreen;