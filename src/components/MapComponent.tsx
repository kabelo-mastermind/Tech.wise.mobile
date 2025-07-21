"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { StyleSheet, View, Image, Text, Animated, TouchableOpacity } from "react-native"
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { darkMapStyle } from "../global/mapStyle"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { Icon } from "react-native-elements"

// Utility functions
function calculateBearing(start, end) {
  if (!start || !end) return 0
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const lat1 = toRad(start.latitude)
  const lon1 = toRad(start.longitude)
  const lat2 = toRad(end.latitude)
  const lon2 = toRad(end.longitude)
  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  let brng = Math.atan2(y, x)
  brng = toDeg(brng)
  return (brng + 360) % 360
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function normalizeAngle(angle) {
  while (angle < 0) angle += 360
  while (angle >= 360) angle -= 360
  return angle
}

function getRouteDirection(currentLocation, polylineCoords, lookAheadDistance = 200) {
  if (!polylineCoords || polylineCoords.length < 2) return 0
  let currentIndex = 0
  let minDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < polylineCoords.length; i++) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      polylineCoords[i].latitude,
      polylineCoords[i].longitude,
    )
    if (distance < minDistance) {
      minDistance = distance
      currentIndex = i
    }
  }
  let accumulatedDistance = 0
  let targetIndex = currentIndex
  for (let i = currentIndex; i < polylineCoords.length - 1; i++) {
    const segmentDistance = calculateDistance(
      polylineCoords[i].latitude,
      polylineCoords[i].longitude,
      polylineCoords[i + 1].latitude,
      polylineCoords[i + 1].longitude,
    )
    accumulatedDistance += segmentDistance
    if (accumulatedDistance >= lookAheadDistance) {
      targetIndex = i + 1
      break
    }
    targetIndex = i + 1
  }
  return calculateBearing(polylineCoords[currentIndex], polylineCoords[targetIndex])
}

function getCoordinateAtDistanceAndBearing(startCoord, distanceMeters, bearingDegrees) {
  const R = 6371e3
  const latRad = (startCoord.latitude * Math.PI) / 180
  const lonRad = (startCoord.longitude * Math.PI) / 180
  const bearingRad = (bearingDegrees * Math.PI) / 180
  const latDestRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / R) +
      Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearingRad),
  )
  const lonDestRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(latRad),
      Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(latDestRad),
    )
  return {
    latitude: (latDestRad * 180) / Math.PI,
    longitude: (lonDestRad * 180) / Math.PI,
  }
}

const THEME = {
  background: "#121212",
  card: "#1E1E1E",
  primary: "#00D8F0",
  secondary: "#FF6B6B",
  text: {
    primary: "#FFFFFF",
    secondary: "#AAAAAA",
  },
}

const MapComponent = ({
  userOrigin,
  userDestination,
  driverLocation,
  tripStart,
  mapRef: externalMapRef,
  hideNavigation = false,
}) => {
  // Create internal mapRef if external one is not provided
  const internalMapRef = useRef(null)
  const mapRef = externalMapRef || internalMapRef

  const [mapBearing, setMapBearing] = useState(0)
  const [instructions, setInstructions] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [distance, setDistance] = useState(null)
  const [duration, setDuration] = useState(null)
  const [tripStarted, setTripStarted] = useState(tripStart)
  const [showDestination, setShowDestination] = useState(false)
  const [prevDriverLocation, setPrevDriverLocation] = useState(null)
  const [driverHeading, setDriverHeading] = useState(0)
  const [mapCameraHeading, setMapCameraHeading] = useState(0)

  // State for collapsible trip details
  const [isTripDetailsExpanded, setIsTripDetailsExpanded] = useState(false)
  const tripDetailsHeight = useRef(new Animated.Value(70)).current

  // Enhanced animation states
  const [polylineCoords, setPolylineCoords] = useState([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Animated values for smooth marker movement
  const markerPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const [currentMarkerCoordinate, setCurrentMarkerCoordinate] = useState(null)

  // Optimize map centering with useCallback
  const centerMap = useCallback(() => {
    if (!mapRef?.current) return
    if (driverLocation?.latitude && driverLocation?.longitude) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      })
    }
  }, [driverLocation, mapRef])

  // Initialize marker position when driver location is first available
  useEffect(() => {
    if (driverLocation?.latitude && driverLocation?.longitude && !currentMarkerCoordinate) {
      setCurrentMarkerCoordinate(driverLocation)
      markerPosition.setValue({
        x: driverLocation.longitude,
        y: driverLocation.latitude,
      })
      centerMap()
    }
  }, [driverLocation, currentMarkerCoordinate, centerMap])

  // Map Rotation and Navigation Zoom Control
  useEffect(() => {
    if (!mapRef?.current || !driverLocation || !mapReady) {
      console.log(
        "DEBUG: Map camera update skipped. mapRef.current:",
        !!mapRef?.current,
        "driverLocation:",
        !!driverLocation,
        "mapReady:",
        mapReady,
      )
      return
    }

    const directionToPointUp =
      polylineCoords.length > 0 ? getRouteDirection(driverLocation, polylineCoords) : driverHeading
    const targetMapHeading = normalizeAngle(360 - directionToPointUp)
    const offsetDistanceMeters = 0
    const targetCenter = getCoordinateAtDistanceAndBearing(driverLocation, offsetDistanceMeters, directionToPointUp)

    // console.log(
    //   "DEBUG: Animating camera. Driver:",
    //   driverLocation,
    //   "Target Center:",
    //   targetCenter,
    //   "Target Heading:",
    //   targetMapHeading.toFixed(2),
    // )

    mapRef.current.animateCamera(
      {
        center: targetCenter,
        heading: targetMapHeading,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
        pitch: 0,
      },
      { duration: 500 },
    )
    setMapCameraHeading(targetMapHeading)
  }, [driverLocation, polylineCoords, mapReady, driverHeading, mapRef])

  // Set showDestination to true when tripStarted changes to true
  useEffect(() => {
    setTripStarted(tripStart)
    if (tripStart) {
      setShowDestination(true)
    } else {
      setShowDestination(false)
      setDistance(null)
      setDuration(null)
      setInstructions([])
      setCurrentStep(0)
      setPolylineCoords([])
    }
  }, [tripStart])

  // Also set showDestination to true when userDestination changes
  useEffect(() => {
    if (userDestination?.latitude && userDestination?.longitude) {
      setShowDestination(true)
    }
  }, [userDestination])

  // If userOrigin or userDestination are cleared (latitude is null), reset distance and duration
  useEffect(() => {
    if (!userOrigin?.latitude || !userDestination?.latitude) {
      setDistance(null)
      setDuration(null)
    }
  }, [userOrigin, userDestination])

  // Handle map ready state
  const handleMapReady = () => {
    // console.log("🗺️ Map is ready!")
    setMapReady(true)
  }

  // Handle region change to get camera heading
  const handleRegionChangeComplete = async (region) => {
    try {
      if (mapRef?.current && mapRef.current.getCamera) {
        const camera = await mapRef.current.getCamera()
        setMapCameraHeading(camera.heading || 0)
      }
    } catch (error) {
      console.log("Camera heading not available")
    }
  }

  // Enhanced directions handler to capture polyline coordinates and auto-fit
  const handleDirectionsReady = (result) => {
    console.log("🛣️ Directions ready with", result.coordinates?.length || 0, "coordinates")
    if (result.distance > 0 && result.duration > 0) {
      setDistance(result.distance.toFixed(2))
      setDuration(result.duration.toFixed(2))
    }
    if (result.legs && result.legs[0] && result.legs[0].steps) {
      setInstructions(result.legs[0].steps)
    }
    if (result.coordinates && result.coordinates.length > 0) {
      console.log("📍 Setting polyline coordinates:", result.coordinates.length)
      setPolylineCoords(result.coordinates)
    } else {
      console.warn("⚠️ No coordinates found in directions result")
    }
    centerMap()
  }

  const centerOnCurrentLocation = () => {
    console.log("📍 Manual center on driver using centerMap")
    centerMap()
  }

  // Function to toggle trip details card expansion
  const toggleTripDetails = () => {
    setIsTripDetailsExpanded(!isTripDetailsExpanded)
    Animated.timing(tripDetailsHeight, {
      toValue: isTripDetailsExpanded ? 70 : 150,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }

  // Determine initial region based on available coordinates
  const getInitialRegion = () => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    }
    if (userOrigin?.latitude && userOrigin?.longitude) {
      return {
        latitude: userOrigin.latitude,
        longitude: userOrigin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    }
    // Default to Johannesburg if no coordinates available
    return {
      latitude: -26.2041,
      longitude: 28.0473,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  }

  const initialRegion = getInitialRegion()

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        ref={mapRef}
        initialRegion={initialRegion}
        showsUserLocation={false}
        followsUserLocation={false}
        customMapStyle={darkMapStyle}
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        rotateEnabled={true}
        pitchEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
        minZoomLevel={10}
        maxZoomLevel={23}
      >
        {currentMarkerCoordinate && (
          <Marker coordinate={currentMarkerCoordinate} anchor={{ x: 0.5, y: 0.5 }} flat={false} rotation={0}>
            <View style={styles.driverMarkerContainer}>
              <Image source={require("../../assets/carM.png")} style={styles.driverMarkerImage} resizeMode="contain" />
            </View>
          </Marker>
        )}

        {userOrigin?.latitude && userOrigin?.longitude && (
          <Marker coordinate={userOrigin}>
            <View style={styles.originMarker}>
              <Icon type="material-community" name="map-marker" color={THEME.primary} size={30} />
              <View style={styles.markerLabelContainer}>
                <Text style={styles.markerLabel}>Pickup</Text>
              </View>
            </View>
          </Marker>
        )}

        {userDestination?.latitude && userDestination?.longitude && showDestination && (
          <Marker coordinate={userDestination}>
            <View style={styles.destinationMarker}>
              <Icon type="material-community" name="map-marker" color={THEME.secondary} size={30} />
              <View style={styles.markerLabelContainer}>
                <Text style={styles.markerLabel}>Destination</Text>
              </View>
            </View>
          </Marker>
        )}

        {!tripStarted && driverLocation?.latitude && userOrigin?.latitude && GOOGLE_MAPS_APIKEY && (
          <MapViewDirections
            origin={driverLocation}
            destination={userOrigin}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={THEME.primary}
            onReady={handleDirectionsReady}
            onError={(error) => console.error("Directions Error:", error)}
          />
        )}

        {tripStarted && userOrigin?.latitude && userDestination?.latitude && GOOGLE_MAPS_APIKEY && (
          <MapViewDirections
            origin={userOrigin}
            destination={userDestination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={"#4CAF50"}
            onReady={(result) => {
              handleDirectionsReady(result)
              setShowDestination(true)
            }}
            onError={(error) => console.error("Trip Directions Error:", error)}
          />
        )}
      </MapView>

      {distance && duration && (
        <Animated.View style={[styles.tripDetailsCard, { height: tripDetailsHeight }]}>
          <TouchableOpacity onPress={toggleTripDetails} style={styles.tripDetailsTouchable}>
            <View style={styles.tripDetailsHeader}>
              <Icon type="material-community" name="map-marker-path" color={THEME.primary} size={20} />
              <Text style={styles.tripDetailsTitle}>Trip Details</Text>
              <Icon
                type="material-community"
                name={isTripDetailsExpanded ? "chevron-up" : "chevron-down"}
                color={THEME.text.primary}
                size={24}
                style={styles.collapseIcon}
              />
            </View>
          </TouchableOpacity>
          {isTripDetailsExpanded && (
            <View style={styles.tripDetailsContent}>
              <View style={styles.tripDetailSection}>
                <Icon type="material-community" name="map-marker-distance" color={THEME.primary} size={24} />
                <View style={styles.tripDetailValue}>
                  <Text style={styles.tripDetailValueText}>{distance} km</Text>
                  <Text style={styles.tripDetailLabel}>Distance</Text>
                </View>
              </View>
              <View style={styles.tripDetailDivider} />
              <View style={styles.tripDetailSection}>
                <Icon type="material-community" name="clock-outline" color={THEME.primary} size={24} />
                <View style={styles.tripDetailValue}>
                  <Text style={styles.tripDetailValueText}>{duration} min</Text>
                  <Text style={styles.tripDetailLabel}>ETA</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {!hideNavigation &&
        userOrigin?.latitude &&
        userOrigin?.longitude &&
        userDestination?.latitude &&
        userDestination?.longitude && (
          <View style={styles.navigationCard}>
            <View style={styles.navigationHeader}>
              <Icon type="material-community" name="navigation" color={THEME.primary} size={20} />
              <Text style={styles.navigationTitle}>Navigation</Text>
            </View>
            <View style={styles.navigationContent}>
              {instructions.length > 0 && currentStep < instructions.length ? (
                <Text style={styles.navigationText}>
                  {instructions[currentStep].html_instructions.replace(/<[^>]+>/g, "")}
                </Text>
              ) : (
                <Text style={styles.navigationText}>Head to destination</Text>
              )}
            </View>
            <TouchableOpacity style={styles.locationButton} onPress={centerOnCurrentLocation}>
              <Icon type="material-community" name="crosshairs-gps" color="#FFFFFF" size={24} />
            </TouchableOpacity>
          </View>
        )}
    </View>
  )
}

export default MapComponent

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: "100%",
    width: "100%",
  },
  driverMarkerContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0, 216, 240, 0.3)",
    borderWidth: 2,
    borderColor: "#00D8F0",
  },
  driverMarkerImage: {
    width: 25,
    height: 25,
  },
  originMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  destinationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerLabelContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  markerLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  tripDetailsCard: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: "#1A1D26",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
    overflow: "hidden",
    width: "80%",
  },
  tripDetailsTouchable: {
    width: "100%",
  },
  tripDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tripDetailsTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  collapseIcon: {
    marginLeft: "auto",
  },
  tripDetailsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  tripDetailSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tripDetailValue: {
    marginLeft: 12,
    alignItems: "flex-start",
  },
  tripDetailValueText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  tripDetailLabel: {
    color: "#AAAAAA",
    fontSize: 14,
  },
  tripDetailDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
  navigationCard: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: "#1A1D26",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
    overflow: "hidden",
  },
  navigationHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  navigationTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  navigationContent: {
    padding: 16,
  },
  navigationText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  locationButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    marginTop: -28,
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
  },
})
