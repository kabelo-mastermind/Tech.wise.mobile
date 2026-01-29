"use client"
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react"
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

// Improved zoom level calculation based on context
function getZoomLevel(speed, routeType = 'normal') {
  // If speed is provided, use it to determine zoom level
  if (speed !== null && speed !== undefined) {
    if (speed > 60) return 0.01; // Zoom out for highway speeds
    if (speed > 30) return 0.005; // Normal driving speeds
    return 0.002; // Zoom in for city driving/turns
  }

  // Fallback based on route type
  switch (routeType) {
    case 'highway':
      return 0.01;
    case 'city':
      return 0.002;
    case 'normal':
    default:
      return 0.005;
  }
}

// Calculate speed based on previous and current location
function calculateSpeed(prevLocation, currentLocation, timeDiffMs) {
  if (!prevLocation || !currentLocation || timeDiffMs <= 0) return 0;

  const distance = calculateDistance(
    prevLocation.latitude,
    prevLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
  return distance / 1000 / timeDiffHours; // km/h
}

// Calculate current bearing between two locations
function calculateCurrentBearing(prevLocation, currentLocation) {
  if (!prevLocation || !currentLocation) return 0;

  return calculateBearing(prevLocation, currentLocation);
}

// Calculate route progress percentage
function calculateRouteProgress(currentLocation, polylineCoords) {
  if (!polylineCoords || polylineCoords.length < 2 || !currentLocation) return 0;

  let closestDistance = Number.POSITIVE_INFINITY;
  let closestIndex = 0;

  // Find closest point on polyline
  polylineCoords.forEach((coord, index) => {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      coord.latitude,
      coord.longitude
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  // Calculate progress percentage
  const progress = (closestIndex / (polylineCoords.length - 1)) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100
}

// Camera modes
const CAMERA_MODES = {
  FOLLOW: 'follow',      // Follows driver with rotation
  OVERVIEW: 'overview',  // Shows entire route
  NORTH_UP: 'north_up',  // Traditional map view (north always up)
};

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
  driverSpeed = null,
}) => {
  const internalMapRef = useRef(null)
  const mapRef = externalMapRef || internalMapRef

  const [mapBearing, setMapBearing] = useState(0)
  const [instructions, setInstructions] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [distance, setDistance] = useState(null)
  const [duration, setDuration] = useState(null)
  const [prevDriverLocation, setPrevDriverLocation] = useState(null)
  const [driverHeading, setDriverHeading] = useState(0)
  const [mapCameraHeading, setMapCameraHeading] = useState(0)
  const [isTripDetailsExpanded, setIsTripDetailsExpanded] = useState(false)
  const tripDetailsHeight = useRef(new Animated.Value(70)).current
  const [polylineCoords, setPolylineCoords] = useState([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [currentMarkerCoordinate, setCurrentMarkerCoordinate] = useState(null)
  const [currentSpeed, setCurrentSpeed] = useState(driverSpeed || 0)
  const [markerBearing, setMarkerBearing] = useState(0)
  const [routeProgress, setRouteProgress] = useState(0)
  const [cameraMode, setCameraMode] = useState(CAMERA_MODES.FOLLOW)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [routeError, setRouteError] = useState(null)

  // Smooth animation refs
  const smoothMarkerPosition = useRef(new Animated.ValueXY()).current
  const markerScaleAnim = useRef(new Animated.Value(1)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const lastUpdateTime = useRef(Date.now())
  const userInteractionTimeout = useRef(null)

  // Use tripStart directly instead of local state
  const tripStarted = tripStart;

  // Smooth marker animation
  const animateMarkerToPosition = useCallback((newCoordinate) => {
    Animated.parallel([
      Animated.timing(smoothMarkerPosition, {
        toValue: {
          x: newCoordinate.longitude,
          y: newCoordinate.latitude
        },
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(markerScaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(markerScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  // Pulse animation for driver marker
  useEffect(() => {
    if (!tripStarted) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [tripStarted]);

  const centerMap = useCallback(() => {
    if (!mapRef?.current || !driverLocation) return;

    const zoomLevel = getZoomLevel(currentSpeed);

    mapRef.current.animateToRegion({
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
      latitudeDelta: zoomLevel,
      longitudeDelta: zoomLevel,
    }, 1000);
  }, [driverLocation, mapRef, currentSpeed]);

  // Calculate bearing, speed, and progress when driver location updates
  useEffect(() => {
    if (driverLocation && prevDriverLocation) {
      const now = Date.now();
      const timeDiff = now - lastUpdateTime.current;

      // Calculate distance moved
      const distanceMoved = calculateDistance(
        prevDriverLocation.latitude,
        prevDriverLocation.longitude,
        driverLocation.latitude,
        driverLocation.longitude
      );

      // Get bearing from polyline (like Waze/Google Maps) or from movement
      let bearing;
      if (polylineCoords.length > 0) {
        // Use polyline direction for more accurate heading (Waze/Google Maps style)
        bearing = getRouteDirection(driverLocation, polylineCoords, 100);
      } else if (distanceMoved > 2) {
        // Fallback to movement-based bearing
        bearing = calculateCurrentBearing(prevDriverLocation, driverLocation);
      } else {
        // No movement, keep current bearing
        bearing = markerBearing;
      }

      setMarkerBearing(bearing);
      setDriverHeading(bearing);

      if (timeDiff > 1000) {
        const speed = calculateSpeed(prevDriverLocation, driverLocation, timeDiff);
        setCurrentSpeed(speed);
        lastUpdateTime.current = now;
      }

      // Update route progress
      if (polylineCoords.length > 0) {
        const progress = calculateRouteProgress(driverLocation, polylineCoords);
        setRouteProgress(progress);
      }
    }

    if (driverLocation) {
      setPrevDriverLocation(driverLocation);
    }
  }, [driverLocation, polylineCoords]);

  // Use external speed if provided
  useEffect(() => {
    if (driverSpeed !== null && driverSpeed !== undefined) {
      setCurrentSpeed(driverSpeed);
    }
  }, [driverSpeed]);

  // Smooth marker movement
  useEffect(() => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      if (!currentMarkerCoordinate) {
        setCurrentMarkerCoordinate(driverLocation);
        smoothMarkerPosition.setValue({
          x: driverLocation.longitude,
          y: driverLocation.latitude,
        });
      } else {
        animateMarkerToPosition(driverLocation);
        setCurrentMarkerCoordinate(driverLocation);
      }
    }
  }, [driverLocation, currentMarkerCoordinate, animateMarkerToPosition]);

  // Memoize the target center and heading calculation
  const cameraTarget = useMemo(() => {
    if (!driverLocation || !mapReady || isUserInteracting) return null;

    let targetCenter = driverLocation;
    let targetHeading = 0;

    if (cameraMode === CAMERA_MODES.FOLLOW) {
      const directionToPointUp = polylineCoords.length > 0
        ? getRouteDirection(driverLocation, polylineCoords, 100)
        : driverHeading;
      
      targetHeading = normalizeAngle(directionToPointUp);
      const offsetDistanceMeters = 80;
      targetCenter = getCoordinateAtDistanceAndBearing(
        driverLocation,
        offsetDistanceMeters,
        directionToPointUp
      );
    } else if (cameraMode === CAMERA_MODES.NORTH_UP) {
      targetCenter = driverLocation;
      targetHeading = 0;
    }

    return { targetCenter, targetHeading };
  }, [driverLocation, cameraMode, polylineCoords, driverHeading, mapReady, isUserInteracting]);

  // Improved camera animation with different modes
  useEffect(() => {
    if (!mapRef?.current || !cameraTarget || cameraMode === CAMERA_MODES.OVERVIEW) return;

    const { targetCenter, targetHeading } = cameraTarget;
    const zoomLevel = getZoomLevel(currentSpeed);

    mapRef.current.animateCamera(
      {
        center: targetCenter,
        heading: targetHeading,
        latitudeDelta: zoomLevel,
        longitudeDelta: zoomLevel,
        pitch: 0,
      },
      { duration: 500 }
    );
    setMapCameraHeading(targetHeading);
  }, [cameraTarget, cameraMode, currentSpeed, mapRef]);

  // Handle overview mode separately
  useEffect(() => {
    if (!mapRef?.current || cameraMode !== CAMERA_MODES.OVERVIEW || polylineCoords.length === 0 || !driverLocation) return;

    const coordinates = [driverLocation, ...polylineCoords];
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  }, [cameraMode, polylineCoords, driverLocation]);

  // Reset trip data when trip ends
  useEffect(() => {
    if (!tripStart) {
      setDistance(null);
      setDuration(null);
      setInstructions([]);
      setCurrentStep(0);
      setPolylineCoords([]);
      setCurrentSpeed(0);
      setMarkerBearing(0);
      setRouteProgress(0);
      setCameraMode(CAMERA_MODES.FOLLOW);
    }
  }, [tripStart]);

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleRegionChangeComplete = async (region, details) => {
    // Set user interacting flag if it's a gesture
    if (details?.isGesture) {
      setIsUserInteracting(true);
      
      // Clear any existing timeout
      if (userInteractionTimeout.current) {
        clearTimeout(userInteractionTimeout.current);
      }
      
      // Reset flag after user stops dragging (1 second of inactivity)
      userInteractionTimeout.current = setTimeout(() => {
        setIsUserInteracting(false);
        userInteractionTimeout.current = null;
      }, 1000);
    }

    try {
      if (mapRef?.current && mapRef.current.getCamera) {
        const camera = await mapRef.current.getCamera();
        setMapCameraHeading(camera.heading || 0);
      }
    } catch (error) {
      console.log("Camera heading not available");
    }
  };

  const handleDirectionsReady = (result) => {
    console.log("✅ DIRECTIONS READY:", {
      distance: result.distance,
      duration: result.duration,
      coordinatesCount: result.coordinates?.length,
      legs: result.legs?.length,
      hasSteps: !!result.legs?.[0]?.steps,
    });

    if (result.distance > 0 && result.duration > 0) {
      setDistance(result.distance.toFixed(2));
      setDuration(result.duration.toFixed(2));
    }
    if (result.legs?.[0]?.steps) {
      setInstructions(result.legs[0].steps);
    }
    if (result.coordinates?.length > 0) {
      console.log("✅ POLYLINE SET:", result.coordinates.length, "points");
      setPolylineCoords(result.coordinates);
    }
    centerMap();
  };

  const centerOnCurrentLocation = () => {
    centerMap();
    setCameraMode(CAMERA_MODES.FOLLOW);
    setIsUserInteracting(false);
  };

  const handleDirectionsError = (error) => {
    console.error("❌ DIRECTIONS ERROR:", {
      message: error?.message,
      code: error?.code,
      tripStarted,
      driverLocation: driverLocation ? `${driverLocation.latitude}, ${driverLocation.longitude}` : null,
      userOrigin: userOrigin ? `${userOrigin.latitude}, ${userOrigin.longitude}` : null,
      userDestination: userDestination ? `${userDestination.latitude}, ${userDestination.longitude}` : null,
      apiKeyExists: !!GOOGLE_MAPS_APIKEY,
    });
    setRouteError(error?.message || "Unknown error");
  };

  const toggleTripDetails = () => {
    setIsTripDetailsExpanded(!isTripDetailsExpanded);
    Animated.timing(tripDetailsHeight, {
      toValue: isTripDetailsExpanded ? 70 : 150,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const cycleCameraMode = () => {
    const modes = Object.values(CAMERA_MODES);
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
    setIsUserInteracting(false);
  };

  const getCameraModeIcon = () => {
    switch (cameraMode) {
      case CAMERA_MODES.FOLLOW:
        return 'navigation';
      case CAMERA_MODES.OVERVIEW:
        return 'map';
      case CAMERA_MODES.NORTH_UP:
        return 'compass';
      default:
        return 'navigation';
    }
  };

  const getCameraModeLabel = () => {
    switch (cameraMode) {
      case CAMERA_MODES.FOLLOW:
        return 'Follow';
      case CAMERA_MODES.OVERVIEW:
        return 'Overview';
      case CAMERA_MODES.NORTH_UP:
        return 'North Up';
      default:
        return 'Follow';
    }
  };

  const getInitialRegion = () => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };
    }
    if (userOrigin?.latitude && userOrigin?.longitude) {
      return {
        latitude: userOrigin.latitude,
        longitude: userOrigin.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };
    }
    return {
      latitude: -26.2041,
      longitude: 28.0473,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  const initialRegion = getInitialRegion();

  // Custom driver marker with smooth animations
  const AnimatedDriverMarker = () => {
    if (!currentMarkerCoordinate) return null;

    return (
      <Marker
        coordinate={currentMarkerCoordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={true}
        rotation={markerBearing}
      >
        <Animated.View style={[
          styles.driverMarkerContainer,
          {
            transform: [
              { scale: markerScaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}>
          <Image
            source={require("../../assets/carM.png")}
            style={styles.driverMarkerImage}
            resizeMode="contain"
          />
          <View style={styles.directionArrow} />
        </Animated.View>
      </Marker>
    );
  };

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
        {/* Animated Driver Marker */}
        <AnimatedDriverMarker />

        {/* Origin Marker */}
        {userOrigin?.latitude && userOrigin?.longitude && (
          <Marker coordinate={userOrigin}>
            <View style={styles.originMarker}>
              <Icon type="material-community" name="map-marker" color={THEME.primary} size={25} />
              <View style={styles.markerLabelContainer}>
                <Text style={styles.markerLabel}>Pickup</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Destination Marker - Only shown during trip */}
        {tripStarted && userDestination?.latitude && userDestination?.longitude && (
          <Marker coordinate={userDestination}>
            <View style={styles.destinationMarker}>
              <Icon type="material-community" name="map-marker" color={THEME.secondary} size={25} />
              <View style={styles.markerLabelContainer}>
                <Text style={styles.markerLabel}>Destination</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Pre-trip: Driver to Origin */}
        {!tripStarted && driverLocation?.latitude && userOrigin?.latitude && GOOGLE_MAPS_APIKEY && (
          <MapViewDirections
            origin={driverLocation}
            destination={userOrigin}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={THEME.primary}
            onReady={handleDirectionsReady}
            onError={handleDirectionsError}
          />
        )}

        {/* During trip: Driver to Destination */}
        {tripStarted && driverLocation?.latitude && userDestination?.latitude && GOOGLE_MAPS_APIKEY && (
          <MapViewDirections
            origin={driverLocation}
            destination={userDestination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={"#4CAF50"}
            onReady={handleDirectionsReady}
            onError={handleDirectionsError}
          />
        )}
      </MapView>

      {/* Route Progress Bar */}
      {tripStarted && routeProgress > 0 && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${routeProgress}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {routeProgress.toFixed(1)}% Complete
          </Text>
        </View>
      )}

      {/* Camera Mode Toggle Button */}
      <TouchableOpacity style={styles.cameraModeButton} onPress={cycleCameraMode}>
        <Icon
          type="material-community"
          name={getCameraModeIcon()}
          color="#FFFFFF"
          size={20}
        />
        <Text style={styles.cameraModeText}>{getCameraModeLabel()}</Text>
      </TouchableOpacity>

      {/* Trip Details Card */}
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
              <View style={styles.rowContainer}>
                {/* Distance */}
                <View style={styles.tripDetailSection}>
                  <Icon type="material-community" name="map-marker-distance" color={THEME.primary} size={24} />
                  <View style={styles.tripDetailValue}>
                    <Text style={styles.tripDetailValueText}>{distance} km</Text>
                    <Text style={styles.tripDetailLabel}>Distance</Text>
                  </View>
                </View>

                <View style={styles.tripDetailDivider} />

                {/* ETA */}
                <View style={styles.tripDetailSection}>
                  <Icon type="material-community" name="clock-outline" color={THEME.primary} size={24} />
                  <View style={styles.tripDetailValue}>
                    <Text style={styles.tripDetailValueText}>{duration} min</Text>
                    <Text style={styles.tripDetailLabel}>ETA</Text>
                  </View>
                </View>
              </View>

              {/* Keep speed and progress below */}
              {/* {currentSpeed > 0 && (
                <>
                  <View style={styles.tripDetailDividerHorizontal} />
                  <View style={styles.tripDetailSection}>
                    <Icon type="material-community" name="speedometer" color={THEME.primary} size={24} />
                    <View style={styles.tripDetailValue}>
                      <Text style={styles.tripDetailValueText}>{currentSpeed.toFixed(0)} km/h</Text>
                      <Text style={styles.tripDetailLabel}>Speed</Text>
                    </View>
                  </View>
                </>
              )}

              {routeProgress > 0 && (
                <>
                  <View style={styles.tripDetailDividerHorizontal} />
                  <View style={styles.tripDetailSection}>
                    <Icon type="material-community" name="progress-check" color={THEME.primary} size={24} />
                    <View style={styles.tripDetailValue}>
                      <Text style={styles.tripDetailValueText}>{routeProgress.toFixed(1)}%</Text>
                      <Text style={styles.tripDetailLabel}>Progress</Text>
                    </View>
                  </View>
                </>
              )} */}
            </View>
          )}

        </Animated.View>
      )}

      {/* Navigation Card */}
      {!hideNavigation && userOrigin?.latitude && userOrigin?.longitude && userDestination?.latitude && userDestination?.longitude && (
        <View style={styles.navigationCard}>
          <View style={styles.navigationHeader}>
            <Icon type="material-community" name="navigation" color={THEME.primary} size={20} />
            <Text style={styles.navigationTitle}>Navigation</Text>
            {/* <TouchableOpacity style={styles.cameraModeSmallButton} onPress={cycleCameraMode}>
              <Icon 
                type="material-community" 
                name={getCameraModeIcon()} 
                color={THEME.primary} 
                size={16} 
              />
            </TouchableOpacity> */}
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
  );
};

export default memo(MapComponent);

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
    backgroundColor: "rgba(0, 216, 240, 0.4)",
    borderWidth: 2,
    borderColor: "#00D8F0",
    shadowColor: "#00D8F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  driverMarkerImage: {
    width: 25,
    height: 25,
  },
  directionArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00D8F0',
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
  // Progress Bar Styles
  progressBarContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(26, 29, 38, 0.9)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
  progressText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  // Camera Mode Button
  cameraModeButton: {
    position: "absolute",
    bottom: 150,
    right: 16,
    backgroundColor: "rgba(26, 29, 38, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
  },
  cameraModeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cameraModeSmallButton: {
    padding: 4,
    marginLeft: 8,
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
    flexWrap: 'wrap',
  },
  rowContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
},

tripDetailDivider: {
  width: 1,
  height: "70%",
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  marginHorizontal: 10,
},

tripDetailDividerHorizontal: {
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  marginVertical: 8,
},

  tripDetailSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: '45%',
    marginBottom: 8,
  },
  tripDetailValue: {
    marginLeft: 12,
    alignItems: "flex-start",
  },
  tripDetailValueText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  tripDetailLabel: {
    color: "#AAAAAA",
    fontSize: 12,
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
    flex: 1,
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