import React, { useEffect, useRef, useState, useCallback } from "react"
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert,
    Modal,
    ActivityIndicator,
    BackHandler,
    Platform,
    ScrollView,
    Linking
} from "react-native"
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Circle } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { Ionicons } from '@expo/vector-icons'

const { width, height } = Dimensions.get('window')

// Responsive scaling functions
const wp = (percentage) => {
    const value = (percentage * width) / 100;
    return Math.round(value);
};

const hp = (percentage) => {
    const value = (percentage * height) / 100;
    return Math.round(value);
};

const fontScale = (size) => {
    const scale = width / 375; // iPhone 6/7/8 width
    const newSize = size * scale;
    return Math.round(newSize);
};

// Constants
const GEO_RADIUS_METERS = 50
const REROUTE_THRESHOLD_METERS = 100
const UPDATE_THRESHOLD_METERS = 50
const SNAP_TO_ROADS_ENABLED = true

// Helper function to calculate distance between two coordinates (in meters)
const calculateDistance = (coord1, coord2) => {
    const R = 6371000;
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

// Calculate bearing between two points
const calculateBearing = (from, to) => {
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    const lon1 = from.longitude * Math.PI / 180;
    const lon2 = to.longitude * Math.PI / 180;

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
};

// Snaps coordinates to nearest road using Google Roads API
const snapToRoads = async (coordinates) => {
    if (!SNAP_TO_ROADS_ENABLED || !GOOGLE_MAPS_APIKEY || !coordinates || coordinates.length === 0) {
        return coordinates;
    }

    try {
        const path = coordinates.map(coord => `${coord.latitude},${coord.longitude}`).join('|');
        const response = await fetch(
            `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${GOOGLE_MAPS_APIKEY}`
        );
        
        const data = await response.json();
        
        if (data.snappedPoints && data.snappedPoints.length > 0) {
            return data.snappedPoints.map(point => ({
                latitude: point.location.latitude,
                longitude: point.location.longitude
            }));
        }
    } catch (error) {
        console.warn('Roads API snapping failed:', error);
    }
    
    return coordinates;
};

// Memoized markers for better performance
const DestinationMarker = React.memo(({ coordinate, title, description, hasArrived }) => (
    <Marker coordinate={coordinate} title={title} description={description}>
        <View style={[styles.destinationMarker, hasArrived && styles.arrivedMarker]}>
            <Ionicons 
                name={hasArrived ? "checkmark-circle" : "location"} 
                size={wp(6)} 
                color={hasArrived ? "#28a745" : "#dc3545"} 
            />
            {hasArrived && (
                <View style={styles.arrivedBadge}>
                    <Text style={styles.arrivedText}>Arrived</Text>
                </View>
            )}
        </View>
    </Marker>
));

const DriverMarker = React.memo(({ coordinate, bearing, isOffRoute, speed }) => (
    <Marker 
        coordinate={coordinate} 
        title="Driver" 
        description={`Speed: ${speed || 0} km/h`}
        rotation={bearing}
        anchor={{ x: 0.5, y: 0.5 }}
        flat
    >
        <View style={[styles.driverMarker, isOffRoute && styles.offRouteMarker]}>
            <Ionicons 
                name="car" 
                size={wp(5.5)} 
                color={isOffRoute ? "#ffc107" : "#0DCAF0"} 
            />
            {speed && (
                <View style={styles.speedBadge}>
                    <Text style={styles.speedText}>{speed} km/h</Text>
                </View>
            )}
        </View>
    </Marker>
));

const RestaurantMarker = React.memo(({ coordinate, title, isPickupComplete }) => (
    <Marker coordinate={coordinate} title={title || "Restaurant"} description="Pickup location">
        <View style={[styles.restaurantMarker, isPickupComplete && styles.pickupCompleteMarker]}>
            <Ionicons 
                name={isPickupComplete ? "checkmark" : "restaurant"} 
                size={wp(5)} 
                color={isPickupComplete ? "#28a745" : "#28a745"} 
            />
        </View>
    </Marker>
));

const TurnByTurnInstruction = React.memo(({ instruction, distance, isCurrent }) => (
    <View style={[styles.instructionItem, isCurrent && styles.currentInstruction]}>
        <View style={styles.instructionIcon}>
            <Ionicons 
                name={getInstructionIcon(instruction)} 
                size={wp(4)} 
                color={isCurrent ? "#0DCAF0" : "#6c757d"} 
            />
        </View>
        <View style={styles.instructionContent}>
            <Text style={[styles.instructionText, isCurrent && styles.currentInstructionText]}>
                {instruction}
            </Text>
            <Text style={styles.instructionDistance}>
                {distance}
            </Text>
        </View>
        {isCurrent && (
            <View style={styles.currentIndicator}>
                <Ionicons name="navigate" size={wp(3.5)} color="#0DCAF0" />
            </View>
        )}
    </View>
));

// Helper to get icon for instruction
const getInstructionIcon = (instruction) => {
    if (!instruction) return 'navigate';
    
    const lower = instruction.toLowerCase();
    if (lower.includes('turn left')) return 'arrow-back';
    if (lower.includes('turn right')) return 'arrow-forward';
    if (lower.includes('merge')) return 'git-merge';
    if (lower.includes('exit')) return 'exit-outline';
    if (lower.includes('roundabout')) return 'sync-circle';
    if (lower.includes('keep')) return 'arrow-up';
    if (lower.includes('arrive')) return 'flag';
    if (lower.includes('head') || lower.includes('start')) return 'navigate';
    return 'navigate';
};

const MapComponent = ({
    visible = false,
    onClose,
    currentLocation, // Driver's current location
    destination, // Customer delivery address
    orderDetails,
    onNavigatePress,
}) => {
    const mapRef = useRef(null)
    const [initialRegion, setInitialRegion] = useState(null)
    const [distance, setDistance] = useState(null)
    const [duration, setDuration] = useState(null)
    const [directionsError, setDirectionsError] = useState(null)
    const [hasFittedToRoute, setHasFittedToRoute] = useState(false)
    const [isMapLoading, setIsMapLoading] = useState(true)
    const [turnByTurnInstructions, setTurnByTurnInstructions] = useState([])
    const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0)
    const [isOffRoute, setIsOffRoute] = useState(false)
    const [arrivedAtDestination, setArrivedAtDestination] = useState(false)
    const [snappedDriverLocation, setSnappedDriverLocation] = useState(null)
    const [driverSpeed, setDriverSpeed] = useState(0)
    const [driverBearing, setDriverBearing] = useState(0)
    const [isNavigating, setIsNavigating] = useState(false)
    const [routePolyline, setRoutePolyline] = useState([])
    const [showNavigationOptions, setShowNavigationOptions] = useState(false)
    const [mapZoom, setMapZoom] = useState(15)
    const [mapTilt, setMapTilt] = useState(0)
    const [mapRotation, setMapRotation] = useState(0)
    
    // Refs
    const isMapReadyRef = useRef(false)
    const lastDriverLocationRef = useRef(null)
    const lastRouteCalculationRef = useRef(null)
    const hasUserPannedRef = useRef(false)
    const lastDistanceToRouteRef = useRef(Infinity)
    const lastUpdateTimeRef = useRef(Date.now())
    const driverStatusRef = useRef('en_route')
    const doubleTapRef = useRef(null)
    const pinchRef = useRef(null)

    // Default region if no locations provided
    const defaultRegion = {
        latitude: -25.5405717,
        longitude: 28.094535,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    }

    // Extract driver status from orderDetails
    useEffect(() => {
        if (orderDetails?.status) {
            driverStatusRef.current = orderDetails.status;
            
            if (orderDetails.status === 'delivered' || orderDetails.status === 'completed') {
                setArrivedAtDestination(true);
            }
        }
    }, [orderDetails]);

    // Handle Android back button
    useEffect(() => {
        if (Platform.OS === 'android' && visible) {
            const backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                () => {
                    onClose()
                    return true
                }
            )
            
            return () => backHandler.remove()
        }
    }, [visible, onClose])

    // Calculate initial region ONLY ONCE when modal opens
    useEffect(() => {
        if (!visible) {
            setHasFittedToRoute(false)
            isMapReadyRef.current = false
            lastDriverLocationRef.current = null
            hasUserPannedRef.current = false
            setIsMapLoading(true)
            setIsNavigating(false)
            setShowNavigationOptions(false)
            setMapZoom(15)
            setMapTilt(0)
            setMapRotation(0)
            return
        }

        let newInitialRegion = defaultRegion

        if (currentLocation && destination) {
            const midLat = (currentLocation.latitude + destination.latitude) / 2
            const midLng = (currentLocation.longitude + destination.longitude) / 2
            const latDelta = Math.abs(currentLocation.latitude - destination.latitude) * 1.5 + 0.005
            const lngDelta = Math.abs(currentLocation.longitude - destination.longitude) * 1.5 + 0.005
            
            newInitialRegion = {
                latitude: midLat,
                longitude: midLng,
                latitudeDelta: Math.max(latDelta, 0.01),
                longitudeDelta: Math.max(lngDelta, 0.01),
            }
        } else if (currentLocation) {
            newInitialRegion = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }
        } else if (destination) {
            newInitialRegion = {
                latitude: destination.latitude,
                longitude: destination.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }
        }

        setInitialRegion(newInitialRegion)
        
        if (currentLocation) {
            lastDriverLocationRef.current = currentLocation
            setSnappedDriverLocation(currentLocation)
        }
        
        if (driverStatusRef.current === 'delivered' || driverStatusRef.current === 'completed') {
            setArrivedAtDestination(true)
        }
    }, [visible])

    // Check arrival at destination (Geofencing)
    useEffect(() => {
        if (!visible || !currentLocation || !destination || arrivedAtDestination) return
        
        const distanceToDestination = calculateDistance(currentLocation, destination)
        
        if (distanceToDestination <= GEO_RADIUS_METERS) {
            setArrivedAtDestination(true)
            Alert.alert(
                "Arrived at Destination",
                "Driver has arrived at the delivery location.",
                [{ text: "OK" }]
            )
        }
    }, [currentLocation, destination, visible, arrivedAtDestination])

    // Calculate driver speed and bearing
    useEffect(() => {
        if (!visible || !currentLocation || !lastDriverLocationRef.current) return
        
        const now = Date.now()
        const timeDelta = (now - lastUpdateTimeRef.current) / 1000
        const distanceMoved = calculateDistance(lastDriverLocationRef.current, currentLocation)
        
        if (timeDelta > 0) {
            const speed = (distanceMoved / timeDelta) * 3.6
            setDriverSpeed(Math.round(speed))
            
            if (distanceMoved > 5) {
                const bearing = calculateBearing(lastDriverLocationRef.current, currentLocation)
                setDriverBearing(bearing)
            }
        }
        
        lastUpdateTimeRef.current = now
    }, [currentLocation, visible])

    // Main navigation logic with smart rerouting
    useEffect(() => {
        if (!visible || !currentLocation || !destination || arrivedAtDestination) return
        
        if (!lastDriverLocationRef.current) {
            lastDriverLocationRef.current = currentLocation
            return
        }
        
        const distanceMoved = calculateDistance(lastDriverLocationRef.current, currentLocation)
        
        if (distanceMoved < UPDATE_THRESHOLD_METERS) return
        
        lastDriverLocationRef.current = currentLocation
        
        if (SNAP_TO_ROADS_ENABLED && routePolyline.length > 0) {
            snapToRoads([currentLocation]).then(snapped => {
                if (snapped && snapped.length > 0) {
                    setSnappedDriverLocation(snapped[0])
                    checkIfOffRoute(snapped[0])
                }
            })
        } else {
            setSnappedDriverLocation(currentLocation)
            checkIfOffRoute(currentLocation)
        }
        
        updateCurrentInstruction()
        
    }, [currentLocation, destination, visible, routePolyline, arrivedAtDestination])

    // Check if driver is off route and needs rerouting
    const checkIfOffRoute = useCallback((location) => {
        if (routePolyline.length < 2) return
        
        let minDistance = Infinity
        
        for (let i = 0; i < routePolyline.length - 1; i++) {
            const distance = calculateDistanceToSegment(
                location,
                routePolyline[i],
                routePolyline[i + 1]
            )
            
            if (distance < minDistance) {
                minDistance = distance
            }
        }
        
        const wasOffRoute = isOffRoute
        const nowOffRoute = minDistance > REROUTE_THRESHOLD_METERS
        
        setIsOffRoute(nowOffRoute)
        
        if (wasOffRoute !== nowOffRoute) {
            setHasFittedToRoute(false)
            lastRouteCalculationRef.current = null
        }
        
        lastDistanceToRouteRef.current = minDistance
    }, [routePolyline, isOffRoute])

    // Calculate distance from point to line segment
    const calculateDistanceToSegment = (point, lineStart, lineEnd) => {
        const A = point.latitude - lineStart.latitude
        const B = point.longitude - lineStart.longitude
        const C = lineEnd.latitude - lineStart.latitude
        const D = lineEnd.longitude - lineStart.longitude
        
        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1
        
        if (lenSq !== 0) param = dot / lenSq
        
        let xx, yy
        
        if (param < 0) {
            xx = lineStart.latitude
            yy = lineStart.longitude
        } else if (param > 1) {
            xx = lineEnd.latitude
            yy = lineEnd.longitude
        } else {
            xx = lineStart.latitude + param * C
            yy = lineStart.longitude + param * D
        }
        
        const dx = point.latitude - xx
        const dy = point.longitude - yy
        
        return Math.sqrt(dx * dx + dy * dy) * 111000
    }

    // Update current turn-by-turn instruction
    const updateCurrentInstruction = useCallback(() => {
        if (!snappedDriverLocation || turnByTurnInstructions.length === 0) return
        
        let nearestIndex = 0
        let minDistance = Infinity
        
        turnByTurnInstructions.forEach((instruction, index) => {
            if (instruction.coordinate) {
                const distance = calculateDistance(snappedDriverLocation, instruction.coordinate)
                if (distance < minDistance && index > currentInstructionIndex) {
                    minDistance = distance
                    nearestIndex = index
                }
            }
        })
        
        if (nearestIndex > currentInstructionIndex && minDistance < 100) {
            setCurrentInstructionIndex(nearestIndex)
        }
    }, [snappedDriverLocation, turnByTurnInstructions, currentInstructionIndex])

    // Handle directions ready
    const handleDirectionsReady = useCallback((result) => {
        if (!visible || !result || !mapRef.current) return
        
        setDistance(result.distance)
        setDuration(result.duration)
        setDirectionsError(null)
        
        if (result.legs && result.legs[0] && result.legs[0].steps) {
            const instructions = result.legs[0].steps.map(step => ({
                instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
                distance: step.distance.text,
                coordinate: step.start_location
            }))
            setTurnByTurnInstructions(instructions)
        }
        
        if (result.coordinates && result.coordinates.length > 0) {
            setRoutePolyline(result.coordinates)
            
            if (!hasFittedToRoute && !hasUserPannedRef.current) {
                setHasFittedToRoute(true)
                
                requestAnimationFrame(() => {
                    mapRef.current?.fitToCoordinates(result.coordinates, {
                        edgePadding: { 
                            top: hp(10), 
                            right: wp(5), 
                            bottom: hp(25), 
                            left: wp(5) 
                        },
                        animated: true,
                    })
                })
            }
        }
        
        lastRouteCalculationRef.current = Date.now()
    }, [hasFittedToRoute, visible])

    const handleDirectionsError = useCallback((errorMessage) => {
        if (!visible) return
        
        setDirectionsError(errorMessage)
        
        if (currentLocation && destination && mapRef.current && !hasFittedToRoute) {
            requestAnimationFrame(() => {
                mapRef.current?.fitToCoordinates(
                    [currentLocation, destination],
                    {
                        edgePadding: { 
                            top: hp(10), 
                            right: wp(5), 
                            bottom: hp(25), 
                            left: wp(5) 
                        },
                        animated: true,
                    }
                )
                setHasFittedToRoute(true)
            })
        }
    }, [currentLocation, destination, hasFittedToRoute, visible])

    // Handle double tap to zoom
    const handleDoubleTap = useCallback(() => {
        if (doubleTapRef.current) {
            clearTimeout(doubleTapRef.current);
        }
        
        doubleTapRef.current = setTimeout(() => {
            doubleTapRef.current = null;
        }, 300);
        
        if (mapRef.current) {
            const newZoom = Math.min(mapZoom + 1, 20);
            setMapZoom(newZoom);
            mapRef.current.animateCamera({
                zoom: newZoom
            }, { duration: 300 });
        }
    }, [mapZoom]);

    // Handle pinch to zoom
    const handlePinch = useCallback((event) => {
        if (event.nativeEvent.scale > 1) {
            // Pinch out - zoom in
            const newZoom = Math.min(mapZoom + 0.5, 20);
            setMapZoom(newZoom);
        } else {
            // Pinch in - zoom out
            const newZoom = Math.max(mapZoom - 0.5, 3);
            setMapZoom(newZoom);
        }
    }, [mapZoom]);

    const handleCenterOnDriver = useCallback(() => {
        const locationToUse = snappedDriverLocation || currentLocation;
        if (locationToUse && mapRef.current && visible) {
            mapRef.current.getCamera().then(camera => {
                mapRef.current?.animateCamera({
                    center: locationToUse,
                    zoom: Math.max(camera.zoom || 15, 14),
                    heading: driverBearing || camera.heading || 0,
                    pitch: camera.pitch || 0,
                }, { duration: 600 })
            })
            
            hasUserPannedRef.current = false
        }
    }, [snappedDriverLocation, currentLocation, visible, driverBearing])

    // **UPDATED: External navigation with options for Google Maps and Waze**
    const handleExternalNavigation = useCallback(async () => {
        if (!visible || !currentLocation || !destination) {
            Alert.alert('Navigation Error', 'Unable to calculate route. Please check your location and destination.')
            return
        }
        
        // Check which apps are installed
        const googleMapsInstalled = await Linking.canOpenURL('comgooglemaps://');
        const wazeInstalled = await Linking.canOpenURL('waze://');
        
        // Show options if multiple apps are available
        if ((googleMapsInstalled && wazeInstalled) || (!googleMapsInstalled && !wazeInstalled)) {
            setShowNavigationOptions(true);
        } else if (googleMapsInstalled) {
            // Open Google Maps directly
            const url = `comgooglemaps://?saddr=${currentLocation.latitude},${currentLocation.longitude}&daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`;
            openNavigationApp('google', url);
        } else if (wazeInstalled) {
            // Open Waze directly
            const url = `waze://?ll=${destination.latitude},${destination.longitude}&navigate=yes`;
            openNavigationApp('waze', url);
        } else {
            // Fallback to web Google Maps
            const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
            openNavigationApp('web', url);
        }
    }, [currentLocation, destination, visible])

    // **NEW: Function to open navigation app**
    const openNavigationApp = async (app, url) => {
        try {
            const supported = await Linking.canOpenURL(url);
            
            if (supported) {
                await Linking.openURL(url);
                Alert.alert('Navigation', `Opening in ${app === 'google' ? 'Google Maps' : app === 'waze' ? 'Waze' : 'Google Maps'}...`);
            } else {
                // Fallback to web Google Maps
                const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
                await Linking.openURL(webUrl);
                Alert.alert('Navigation', 'Opening in Google Maps...');
            }
        } catch (error) {
            console.error('Error opening navigation app:', error);
            Alert.alert('Error', 'Could not open navigation app. Please try again.');
        }
    }

    // **NEW: Function to handle navigation option selection**
    const handleNavigationOption = (app) => {
        setShowNavigationOptions(false);
        
        if (!currentLocation || !destination) {
            Alert.alert('Navigation Error', 'Unable to calculate route.');
            return;
        }
        
        let url = '';
        
        switch (app) {
            case 'google':
                url = `comgooglemaps://?saddr=${currentLocation.latitude},${currentLocation.longitude}&daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`;
                break;
            case 'waze':
                url = `waze://?ll=${destination.latitude},${destination.longitude}&navigate=yes`;
                break;
            case 'web':
                url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
                break;
            default:
                Alert.alert('Unsupported navigation app');
                return;
        }
        
        openNavigationApp(app, url);
    }

    const handleMapReady = useCallback(() => {
        isMapReadyRef.current = true
        setIsMapLoading(false)
    }, [])

    const handleMapDrag = useCallback(() => {
        hasUserPannedRef.current = true
    }, [])

    const toggleNavigationMode = useCallback(() => {
        setIsNavigating(!isNavigating)
        
        if (!isNavigating) {
            const locationToUse = snappedDriverLocation || currentLocation;
            if (locationToUse && mapRef.current) {
                mapRef.current.animateCamera({
                    center: locationToUse,
                    zoom: 16,
                    heading: driverBearing,
                    pitch: 45,
                }, { duration: 800 })
            }
        }
    }, [isNavigating, snappedDriverLocation, currentLocation, driverBearing])

    const formatDistance = useCallback((km) => {
        if (!km) return 'Calculating...'
        if (typeof km === 'string') return km;
        if (km < 1) {
            return `${(km * 1000).toFixed(0)} m`
        }
        return `${km.toFixed(1)} km`
    }, [])

    const formatDuration = useCallback((minutes) => {
        if (!minutes) return 'Calculating...'
        if (typeof minutes === 'string') return minutes;
        if (minutes < 60) {
            return `${Math.round(minutes)} min`
        }
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h ${mins}m`
    }, [])

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        if (mapRef.current) {
            const newZoom = Math.min(mapZoom + 1, 20);
            setMapZoom(newZoom);
            mapRef.current.animateCamera({
                zoom: newZoom
            }, { duration: 300 });
        }
    }, [mapZoom]);

    const handleZoomOut = useCallback(() => {
        if (mapRef.current) {
            const newZoom = Math.max(mapZoom - 1, 3);
            setMapZoom(newZoom);
            mapRef.current.animateCamera({
                zoom: newZoom
            }, { duration: 300 });
        }
    }, [mapZoom]);

    // Reset map view
    const handleResetView = useCallback(() => {
        if (mapRef.current) {
            setMapZoom(15);
            setMapTilt(0);
            setMapRotation(0);
            mapRef.current.animateCamera({
                zoom: 15,
                pitch: 0,
                heading: 0
            }, { duration: 500 });
        }
    }, []);

    const shouldShowDirections = React.useMemo(() => {
        return (
            visible &&
            isMapReadyRef.current &&
            currentLocation &&
            destination &&
            GOOGLE_MAPS_APIKEY &&
            !arrivedAtDestination
        )
    }, [visible, currentLocation, destination, arrivedAtDestination])

    const isPickupComplete = React.useMemo(() => {
        if (!orderDetails?.status) return false;
        return ['picked_up', 'en_route', 'delivered', 'completed'].includes(orderDetails.status);
    }, [orderDetails?.status])

    const restaurantCoordinates = React.useMemo(() => {
        return orderDetails?.restaurant_coordinates || null;
    }, [orderDetails?.restaurant_coordinates])

    if (!visible) return null

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
            statusBarTranslucent={true}
            hardwareAccelerated={true}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={onClose}>
                        <Ionicons name="arrow-back" size={wp(6)} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.headerTitle}>
                        <Text style={styles.headerTitleText}>
                            {arrivedAtDestination ? 'Arrived at Destination' : 'Delivery Navigation'}
                        </Text>
                        {orderDetails && (
                            <Text style={styles.orderNumber}>
                                {orderDetails.order_number ? `Order: ${orderDetails.order_number}` : ''}
                                {orderDetails.status ? ` | Status: ${orderDetails.status}` : ''}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity 
                        style={styles.centerButton} 
                        onPress={handleCenterOnDriver}
                        disabled={!currentLocation}
                    >
                        <Ionicons 
                            name="locate" 
                            size={wp(5)} 
                            color={currentLocation ? "#333" : "#ccc"} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Map Container */}
                <View style={styles.mapContainer}>
                    {isMapLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#0DCAF0" />
                            <Text style={styles.loadingText}>Loading navigation...</Text>
                        </View>
                    )}
                    
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={initialRegion || defaultRegion}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        loadingEnabled={true}
                        cacheEnabled={true}
                        moveOnMarkerPress={false}
                        onMapReady={handleMapReady}
                        onPanDrag={handleMapDrag}
                        onRegionChangeComplete={() => {
                            if (hasUserPannedRef.current === false) {
                                hasUserPannedRef.current = true
                            }
                        }}
                        rotateEnabled={true}
                        pitchEnabled={true}
                        zoomEnabled={true}
                        scrollEnabled={true}
                        zoomTapEnabled={true}
                        zoomControlEnabled={false}
                        onPress={handleDoubleTap}
                        onPanPinch={handlePinch}
                        showsScale={true}
                        showsCompass={true}
                        compassOffset={{x: -wp(8), y: hp(25)}}
                    >
                        {/* Directions */}
                        {shouldShowDirections && (
                            <MapViewDirections
                                key={`${currentLocation.latitude},${currentLocation.longitude}-${destination.latitude},${destination.longitude}`}
                                origin={currentLocation}
                                destination={destination}
                                apikey={GOOGLE_MAPS_APIKEY}
                                strokeWidth={4}
                                strokeColor={isOffRoute ? "#ffc107" : "#0DCAF0"}
                                optimizeWaypoints={true}
                                onReady={handleDirectionsReady}
                                onError={handleDirectionsError}
                                timePrecision="now"
                                mode="DRIVING"
                                resetOnChange={false}
                                precision="high"
                            />
                        )}

                        {/* Destination Marker with Geofence */}
                        {destination && (
                            <>
                                <DestinationMarker
                                    coordinate={destination}
                                    title="Delivery Location"
                                    description={orderDetails?.delivery_address || "Customer location"}
                                    hasArrived={arrivedAtDestination}
                                />
                                {!arrivedAtDestination && (
                                    <Circle
                                        center={destination}
                                        radius={GEO_RADIUS_METERS}
                                        fillColor="rgba(40, 167, 69, 0.1)"
                                        strokeColor="rgba(40, 167, 69, 0.5)"
                                        strokeWidth={2}
                                    />
                                )}
                            </>
                        )}

                        {/* Driver Marker with snapping */}
                        {(snappedDriverLocation || currentLocation) && (
                            <DriverMarker
                                coordinate={snappedDriverLocation || currentLocation}
                                bearing={driverBearing}
                                isOffRoute={isOffRoute}
                                speed={driverSpeed}
                            />
                        )}

                        {/* Restaurant Marker */}
                        {restaurantCoordinates && (
                            <RestaurantMarker
                                coordinate={restaurantCoordinates}
                                title={orderDetails?.restaurant_name}
                                isPickupComplete={isPickupComplete}
                            />
                        )}

                        {/* Off-route indicator line */}
                        {isOffRoute && (snappedDriverLocation || currentLocation) && routePolyline.length > 0 && (
                            <Polyline
                                coordinates={[(snappedDriverLocation || currentLocation), routePolyline[Math.floor(routePolyline.length / 2)]]}
                                strokeColor="#ffc107"
                                strokeWidth={2}
                                lineDashPattern={[10, 10]}
                            />
                        )}
                    </MapView>
                    
                    {/* Zoom Controls */}
                    <View style={styles.zoomControls}>
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                            <Ionicons name="add" size={wp(5)} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.zoomDivider} />
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                            <Ionicons name="remove" size={wp(5)} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.zoomDivider} />
                        <TouchableOpacity style={styles.zoomButton} onPress={handleResetView}>
                            <Ionicons name="refresh" size={wp(4)} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Error Message */}
                    {directionsError && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="warning" size={wp(5)} color="#dc3545" />
                            <Text style={styles.errorText}>Directions unavailable - Using map only</Text>
                        </View>
                    )}
                    
                    {/* Navigation Mode Toggle */}
                    <TouchableOpacity 
                        style={[styles.navModeButton, isNavigating && styles.navModeActive]}
                        onPress={toggleNavigationMode}
                    >
                        <Ionicons 
                            name={isNavigating ? "navigate" : "navigate-outline"} 
                            size={wp(5.5)} 
                            color={isNavigating ? "#0DCAF0" : "#333"} 
                        />
                    </TouchableOpacity>
                    
                    {/* User Pan Indicator */}
                    {hasUserPannedRef.current && !isNavigating && (
                        <TouchableOpacity 
                            style={styles.recenterButton}
                            onPress={handleCenterOnDriver}
                        >
                            <Ionicons name="locate" size={wp(5)} color="#0DCAF0" />
                            <Text style={styles.recenterText}>Center on Driver</Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Off Route Warning */}
                    {isOffRoute && (
                        <View style={styles.offRouteWarning}>
                            <Ionicons name="alert-circle" size={wp(5)} color="#ffc107" />
                            <Text style={styles.offRouteText}>Off route - Recalculating...</Text>
                        </View>
                    )}
                    
                    {/* **NEW: Navigation Options Modal */}
                    {showNavigationOptions && (
                        <View style={styles.navigationOptionsModal}>
                            <View style={styles.navigationOptionsContent}>
                                <Text style={styles.navigationOptionsTitle}>Open Navigation In</Text>
                                
                                <TouchableOpacity 
                                    style={styles.navigationOption}
                                    onPress={() => handleNavigationOption('google')}
                                >
                                    <Ionicons name="logo-google" size={wp(7)} color="#4285F4" />
                                    <Text style={styles.navigationOptionText}>Google Maps</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.navigationOption}
                                    onPress={() => handleNavigationOption('waze')}
                                >
                                    <Ionicons name="car-sport" size={wp(7)} color="#36C" />
                                    <Text style={styles.navigationOptionText}>Waze</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.navigationOption}
                                    onPress={() => handleNavigationOption('web')}
                                >
                                    <Ionicons name="globe" size={wp(7)} color="#0DCAF0" />
                                    <Text style={styles.navigationOptionText}>Web Browser</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.cancelNavigationButton}
                                    onPress={() => setShowNavigationOptions(false)}
                                >
                                    <Text style={styles.cancelNavigationText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Navigation Panel */}
                <View style={styles.navigationPanel}>
                    {/* Route Information */}
                    <View style={styles.routeInfo}>
                        <View style={styles.routeItem}>
                            <Ionicons name="time-outline" size={wp(4)} color="#6c757d" />
                            <Text style={styles.routeText}>{formatDuration(duration)}</Text>
                            <Text style={styles.routeSubtext}>ETA</Text>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routeItem}>
                            <Ionicons name="car-outline" size={wp(4)} color="#6c757d" />
                            <Text style={styles.routeText}>{formatDistance(distance)}</Text>
                            <Text style={styles.routeSubtext}>Distance</Text>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routeItem}>
                            <Ionicons name="speedometer" size={wp(4)} color="#6c757d" />
                            <Text style={styles.routeText}>{driverSpeed} km/h</Text>
                            <Text style={styles.routeSubtext}>Speed</Text>
                        </View>
                    </View>

                    {/* Turn-by-Turn Navigation */}
                    {turnByTurnInstructions.length > 0 && isNavigating && (
                        <View style={styles.turnByTurnContainer}>
                            <Text style={styles.turnByTurnTitle}>Next Instructions</Text>
                            <ScrollView 
                                style={styles.instructionsScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                {turnByTurnInstructions.slice(
                                    Math.max(0, currentInstructionIndex - 1),
                                    Math.min(turnByTurnInstructions.length, currentInstructionIndex + 3)
                                ).map((instruction, index) => (
                                    <TurnByTurnInstruction
                                        key={index}
                                        instruction={instruction.instruction}
                                        distance={instruction.distance}
                                        isCurrent={index === 1}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Order Information */}
                    {orderDetails && !isNavigating && (
                        <View style={styles.orderInfo}>
                            <View style={styles.customerInfo}>
                                <Ionicons name="person" size={wp(4)} color="#333" />
                                <Text style={styles.customerName}>{orderDetails.customer_name || 'Customer'}</Text>
                            </View>
                            <Text style={styles.deliveryAddress} numberOfLines={2}>
                                {orderDetails.delivery_address || destination ? 'Delivery Location' : 'No address provided'}
                            </Text>
                            {orderDetails.customer_phone && (
                                <View style={styles.phoneInfo}>
                                    <Ionicons name="call" size={wp(3.5)} color="#6c757d" />
                                    <Text style={styles.phoneText}>{orderDetails.customer_phone}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.navigateButton,
                                (!currentLocation || !destination || arrivedAtDestination) && styles.disabledButton
                            ]}
                            onPress={handleExternalNavigation}
                            disabled={!currentLocation || !destination || arrivedAtDestination}
                        >
                            <Ionicons name="navigate" size={wp(5)} color="#fff" />
                            <Text style={styles.navigateButtonText}>
                                {arrivedAtDestination ? 'Arrived' : 'Open Navigation'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onClose}
                        >
                            <Text style={styles.secondaryButtonText}>Close Map</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        paddingTop: Platform.OS === 'ios' ? hp(6) : hp(3),
        height: hp(10),
        minHeight: hp(10),
        maxHeight: hp(12),
    },
    backButton: {
        padding: wp(2),
        width: wp(12),
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp(2),
    },
    headerTitleText: {
        fontSize: fontScale(18),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        maxWidth: wp(60),
    },
    orderNumber: {
        fontSize: fontScale(12),
        color: '#6c757d',
        marginTop: hp(0.3),
        textAlign: 'center',
    },
    centerButton: {
        padding: wp(2),
        backgroundColor: '#f8f9fa',
        borderRadius: wp(5),
        width: wp(12),
        alignItems: 'center',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingText: {
        marginTop: hp(2),
        fontSize: fontScale(16),
        color: '#666',
        fontWeight: '500',
    },
    errorContainer: {
        position: 'absolute',
        top: hp(2),
        left: wp(4),
        right: wp(4),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe6e6',
        padding: wp(3),
        borderRadius: wp(2),
        borderLeftWidth: 4,
        borderLeftColor: '#dc3545',
        zIndex: 999,
    },
    errorText: {
        marginLeft: wp(2),
        color: '#dc3545',
        fontSize: fontScale(14),
        flex: 1,
    },
    navModeButton: {
        position: 'absolute',
        top: hp(2),
        right: wp(5),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: wp(3),
        borderRadius: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 999,
        width: wp(11),
        height: wp(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    navModeActive: {
        backgroundColor: '#0DCAF0',
    },
    recenterButton: {
        position: 'absolute',
        top: hp(9),
        right: wp(5),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingVertical: hp(1),
        paddingHorizontal: wp(3),
        borderRadius: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 999,
        minWidth: wp(35),
        justifyContent: 'center',
    },
    recenterText: {
        marginLeft: wp(1.5),
        fontSize: fontScale(12),
        color: '#0DCAF0',
        fontWeight: '500',
    },
    offRouteWarning: {
        position: 'absolute',
        top: hp(2),
        left: wp(4),
        right: wp(4),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: '#ffc107',
        borderWidth: 1,
        padding: wp(3),
        borderRadius: wp(2),
        zIndex: 999,
    },
    offRouteText: {
        marginLeft: wp(2),
        color: '#ffc107',
        fontSize: fontScale(14),
        fontWeight: '500',
        flex: 1,
    },
    zoomControls: {
        position: 'absolute',
        right: wp(4),
        top: hp(25),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: wp(2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 999,
        width: wp(12),
        alignItems: 'center',
    },
    zoomButton: {
        padding: wp(3),
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        height: wp(12),
    },
    zoomDivider: {
        width: '80%',
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    // **NEW: Navigation Options Styles**
    navigationOptionsModal: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        paddingHorizontal: wp(5),
    },
    navigationOptionsContent: {
        backgroundColor: '#fff',
        borderRadius: wp(4),
        padding: wp(6),
        width: '100%',
        maxWidth: wp(85),
        alignItems: 'center',
    },
    navigationOptionsTitle: {
        fontSize: fontScale(18),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: hp(2.5),
        textAlign: 'center',
    },
    navigationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingVertical: hp(2),
        paddingHorizontal: wp(5),
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    navigationOptionText: {
        fontSize: fontScale(16),
        color: '#333',
        marginLeft: wp(4),
        flex: 1,
    },
    cancelNavigationButton: {
        width: '100%',
        paddingVertical: hp(2),
        alignItems: 'center',
        marginTop: hp(1),
    },
    cancelNavigationText: {
        fontSize: fontScale(16),
        color: '#6c757d',
        fontWeight: '500',
    },
    navigationPanel: {
        backgroundColor: '#fff',
        paddingHorizontal: wp(4),
        paddingVertical: hp(2),
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        maxHeight: hp(40),
        minHeight: hp(25),
    },
    routeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(2),
        padding: wp(3),
        backgroundColor: '#f8f9fa',
        borderRadius: wp(3),
    },
    routeItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp(1),
    },
    routeText: {
        fontSize: fontScale(16),
        color: '#333',
        fontWeight: '600',
        marginTop: hp(0.5),
        textAlign: 'center',
    },
    routeSubtext: {
        fontSize: fontScale(11),
        color: '#6c757d',
        marginTop: hp(0.3),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    routeDivider: {
        width: 1,
        height: hp(4),
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    turnByTurnContainer: {
        marginBottom: hp(2),
        backgroundColor: '#f8f9fa',
        borderRadius: wp(3),
        padding: wp(3),
        maxHeight: hp(20),
    },
    turnByTurnTitle: {
        fontSize: fontScale(14),
        fontWeight: '600',
        color: '#333',
        marginBottom: hp(1),
        paddingLeft: wp(1),
    },
    instructionsScroll: {
        maxHeight: hp(15),
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
        minHeight: hp(6),
    },
    currentInstruction: {
        backgroundColor: 'rgba(13, 202, 240, 0.1)',
        borderRadius: wp(2),
        paddingHorizontal: wp(2),
        marginHorizontal: -wp(2),
    },
    instructionIcon: {
        width: wp(6),
        alignItems: 'center',
    },
    instructionContent: {
        flex: 1,
        marginLeft: wp(3),
        justifyContent: 'center',
    },
    instructionText: {
        fontSize: fontScale(14),
        color: '#333',
    },
    currentInstructionText: {
        fontWeight: '600',
        color: '#0DCAF0',
    },
    instructionDistance: {
        fontSize: fontScale(12),
        color: '#6c757d',
        marginTop: hp(0.3),
    },
    currentIndicator: {
        marginLeft: wp(2),
    },
    orderInfo: {
        marginBottom: hp(2),
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(0.5),
    },
    customerName: {
        marginLeft: wp(1.5),
        fontSize: fontScale(16),
        fontWeight: 'bold',
        color: '#333',
    },
    deliveryAddress: {
        fontSize: fontScale(14),
        color: '#6c757d',
        marginBottom: hp(1),
        lineHeight: fontScale(18),
    },
    phoneInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phoneText: {
        marginLeft: wp(1),
        fontSize: fontScale(14),
        color: '#6c757d',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: wp(3),
    },
    navigateButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0DCAF0',
        paddingVertical: hp(1.8),
        paddingHorizontal: wp(4),
        borderRadius: wp(3),
        gap: wp(2),
        minHeight: hp(6.5),
    },
    disabledButton: {
        backgroundColor: '#6c757d',
        opacity: 0.6,
    },
    navigateButtonText: {
        color: '#fff',
        fontSize: fontScale(16),
        fontWeight: 'bold',
    },
    secondaryButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6c757d',
        paddingVertical: hp(1.8),
        paddingHorizontal: wp(4),
        borderRadius: wp(3),
        minHeight: hp(6.5),
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: fontScale(14),
        fontWeight: '500',
        textAlign: 'center',
    },
    // Marker Styles
    destinationMarker: {
        backgroundColor: '#fff',
        padding: wp(2),
        borderRadius: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        width: wp(10),
        height: wp(10),
    },
    arrivedMarker: {
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderColor: '#28a745',
        borderWidth: 2,
    },
    arrivedBadge: {
        position: 'absolute',
        bottom: -hp(2.5),
        backgroundColor: '#28a745',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.3),
        borderRadius: wp(1),
    },
    arrivedText: {
        color: '#fff',
        fontSize: fontScale(10),
        fontWeight: 'bold',
    },
    driverMarker: {
        backgroundColor: '#fff',
        padding: wp(2),
        borderRadius: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        width: wp(10),
        height: wp(10),
    },
    offRouteMarker: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: '#ffc107',
        borderWidth: 2,
    },
    speedBadge: {
        position: 'absolute',
        bottom: -hp(2.2),
        backgroundColor: '#333',
        paddingHorizontal: wp(1.5),
        paddingVertical: hp(0.2),
        borderRadius: wp(1),
    },
    speedText: {
        color: '#fff',
        fontSize: fontScale(10),
        fontWeight: 'bold',
    },
    restaurantMarker: {
        backgroundColor: '#fff',
        padding: wp(1.5),
        borderRadius: wp(3),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        width: wp(8),
        height: wp(8),
    },
    pickupCompleteMarker: {
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderColor: '#28a745',
        borderWidth: 2,
    },
})

export default MapComponent