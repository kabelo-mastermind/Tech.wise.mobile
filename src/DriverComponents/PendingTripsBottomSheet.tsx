import { BlurView } from 'expo-blur';
import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from 'react-native-animatable';
import TripRequestModal from '../DriverComponents/Modals/TripRequestModal';
import { useSelector } from 'react-redux';
import { api } from '../../api';
import { Ionicons } from '@expo/vector-icons'; // If available in your project
import { useDispatch } from 'react-redux';
import { setSelectedRequest } from '../redux/actions/tripActions'; // Adjust the import path as necessary


const { width, height } = Dimensions.get('window');

const PendingTripsBottomSheet = ({ navigation }) => {
  const [pendingTrips, setPendingTrips] = useState([]);
  // const [selectedRequest, setSelectedRequest] = useState(null);
  const selectedRequest = useSelector((state) => state.trip.selectedRequest);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({});
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  console.log('-------pending details', pendingTrips);
  const [modalVisible, setModalVisible] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const user_id = user.user_id;
  const current = useSelector(state => state.trip.selectedRequest);
  console.log('Current selected request:', current);
  // Inside PendingTripsBottomSheet component
  const dispatch = useDispatch();

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

  // In child component
  const handleSelectRequest = (item) => {
    // Get the current selectedRequest from Redux

    // Combine previous and new data
    const combined = {
      ...current,
      ...item, // item will overwrite any matching fields from current
    };

    dispatch(setSelectedRequest(combined));
    setModalVisible(true);
  };


  useEffect(() => {
    // Animate the bottom sheet sliding up
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (user_id) {
      const fetchPendingTrips = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${api}/driverTrips?driverId=${user_id}`);
          const data = await response.json();

          const tripsList = data.trips || [];

          if (!Array.isArray(tripsList) || tripsList.length === 0) {
            console.log("No trips found.");
            setPendingTrips([]);
            setLoading(false);
            return;
          }

          // Filter for pending trips only AND not older than 40 seconds
          const now = new Date().getTime();
          const validTrips = tripsList.filter(trip => {
            // Check if trip is pending
            if (!isTripPending(trip)) return false;
            
            // Check if trip is not older than 40 seconds
            if (trip.currentDate) {
              const tripTime = new Date(trip.currentDate).getTime();
              const ageInSeconds = (now - tripTime) / 1000;
              if (ageInSeconds > 40) {
                console.log(`⏰ Trip ${trip.id} expired (${Math.round(ageInSeconds)}s old) - not showing in list`);
                return false;
              }
            }
            
            return true;
          });

          if (validTrips.length === 0) {
            console.log("No valid pending trips found (all expired or not pending).");
            setPendingTrips([]);
            setLoading(false);
            return;
          }

          validTrips.sort((a, b) => new Date(b.currentDate) - new Date(a.currentDate));
          const latestTrip = validTrips[0];

          // Fetch customer details for the latest trip
          if (latestTrip.customerId) {
            try {
              const customerRes = await fetch(`${api}/customer/${latestTrip.customerId}`);
              const customerData = await customerRes.json();
              latestTrip.customer = customerData; // add full customer info to the trip object
            } catch (customerError) {
              console.warn('Failed to fetch customer details:', customerError.message);
              latestTrip.customer = null;
            }
          }

          // Fetch payment details
          try {
            const paymentRes = await fetch(`${api}/payment/${latestTrip.id}`);
            const paymentData = await paymentRes.json();
            latestTrip.payment = paymentData;
          } catch (paymentError) {
            console.warn('Failed to fetch payment details:', paymentError.message);
            latestTrip.payment = null;
          }

          setPendingTrips([latestTrip]);
        } catch (error) {
          // console.error('Error fetching trips:', error.message);
          setPendingTrips([]);
        } finally {
          setLoading(false);
        }
      };

      fetchPendingTrips();

      // Auto-refresh every 5 seconds to remove expired trips
      const refreshInterval = setInterval(() => {
        fetchPendingTrips();
      }, 5000);

      return () => clearInterval(refreshInterval);
    }
  }, [user_id]);

  // Countdown timer for pending trips
  useEffect(() => {
    if (pendingTrips.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newCountdown = {};
      const expiredTripIds = [];

      pendingTrips.forEach(trip => {
        if (trip.currentDate) {
          const tripTime = new Date(trip.currentDate).getTime();
          const elapsedSeconds = Math.floor((now - tripTime) / 1000);
          const remainingSeconds = Math.max(0, 40 - elapsedSeconds);
          newCountdown[trip.id] = remainingSeconds;
          if (remainingSeconds === 0) {
            expiredTripIds.push(trip.id);
          }
        }
      });

      setCountdown(newCountdown);

      if (expiredTripIds.length > 0 && user_id) {
        AsyncStorage.multiRemove([
          `cachedRemainingTime_${user_id}`,
          `cachedTripStatuses_${user_id}`,
        ]).then(() => {
          console.log('🗑️ Cleared pending-trip cache after countdown expiry');
        }).catch((error) => {
          console.error('❌ Failed to clear pending-trip cache:', error);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingTrips]);

  const handleClose = () => {
    // Animate the bottom sheet sliding down before navigation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
    setModalVisible(false);
  };

  const removeTripFromList = (tripId) => {
    setPendingTrips((prevTrips) => prevTrips.filter(trip => trip.id !== tripId));
  };


  const renderRequest = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        {/* <View style={styles.customerBadge}>
          {/* <Text style={styles.customerInitial}>
            {item.customerId ? String(item.customerId).charAt(0).toUpperCase() : 'C'}
          </Text> 


        </View> */}
        <View style={styles.headerInfo}>
          {/* <Text style={styles.passengerName}>
            Customer #{item.customerId || 'Unknown'}
          </Text> */}
          <Text style={styles.passengerName}>
            {item.customer?.name || `Customer name${item.customerId || 'Unknown'}`}
          </Text>

          <View style={styles.tripStatusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
        <View style={styles.countdownContainer}>
          <Ionicons name="timer-outline" size={20} color={countdown[item.id] <= 10 ? "#FF4444" : "#FFD700"} />
          <Text style={[
            styles.countdownText,
            countdown[item.id] <= 10 && styles.countdownUrgent
          ]}>
            {countdown[item.id] !== undefined ? countdown[item.id] : 40}s
          </Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.locationRow}>
          <View style={styles.locationIconContainer}>
            <View style={[styles.locationIcon, styles.pickupIcon]} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickUpLocation || 'Not specified'}
            </Text>
          </View>
        </View>

        <View style={styles.locationConnector} />

        <View style={styles.locationRow}>
          <View style={styles.locationIconContainer}>
            <View style={[styles.locationIcon, styles.dropoffIcon]} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Destination</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.dropOffLocation || 'Not specified'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.tripMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{item.distance_traveled || '0'} km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>R{item.payment?.amount || '0'}</Text>
            <Text style={styles.metricLabel}>Fare</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSelectRequest(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIndicator} />
          <Text style={styles.emptyText}>Loading requests...</Text>
        </View>
      ) : (
        <>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="car-outline" size={48} color="#0DCAF0" />
          </View>
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptyText}>
            You don't have any pending trip requests at the moment.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <BlurView intensity={100} tint="light" style={styles.blurView}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Pending Requests</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={pendingTrips}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRequest}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList}
          />
        </BlurView>
      </Animated.View>

      {selectedRequest && (
        <TripRequestModal
          isVisible={modalVisible}
          request={selectedRequest}
          onClose={handleClose}
          onTripUpdate={removeTripFromList}
        />

      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurView: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    // paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  customerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 202, 240, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0DCAF0',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  tripStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(13, 202, 240, 0.1)',
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0DCAF0',
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0DCAF0',
  },
  tripDetails: {
    padding: 16,
    backgroundColor: 'rgba(13, 202, 240, 0.03)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  pickupIcon: {
    backgroundColor: '#fff',
    borderColor: '#0DCAF0',
  },
  dropoffIcon: {
    backgroundColor: '#0DCAF0',
    borderColor: '#0DCAF0',
  },
  locationConnector: {
    width: 2,
    height: 24,
    backgroundColor: '#0DCAF0',
    marginLeft: 18,
    marginVertical: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  itemFooter: {
    padding: 16,
  },
  tripMetrics: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButton: {
    backgroundColor: '#0DCAF0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0DCAF0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 202, 240, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0DCAF0',
    borderTopColor: 'transparent',
    marginBottom: 16,
    transform: [{ rotate: '45deg' }],
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    marginLeft: 4,
  },
  countdownUrgent: {
    color: '#FF4444',
  },
});

export default PendingTripsBottomSheet;