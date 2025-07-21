import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, Image, Animated, View, Text, Alert, TouchableOpacity } from 'react-native';
import { DestinationContext } from '../contexts/contexts';
import BottomSheet from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker'; // Import Picker for dropdown
import { Icon } from 'react-native-elements';
import { useSelector } from 'react-redux';

const CustomerCommunicationBottomSheet = ({ navigation ,route}) => {
  const sheetRef = useRef(null);
  const [tripId, setTripId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
//   const customer_id = useSelector((state) => state.trip.tripData?.customerId || "");
//   const trip_id = useSelector((state) => state.trip.tripData?.tripId || "");
  

//   const tripData = useSelector((state) => state.trip.tripData);
// console.log("tripData from Redux:", tripData);

//   console.log("CustomerCommunicationBottomSheet customer_id:", customer_id);
// console.log("CustomerCommunicationBottomSheet trip_id:", trip_id);


useEffect(() => {
  const { tripId, customerId } = route?.params || {};
  setTripId(tripId);
  setCustomerId(customerId);
  console.log("CustomerCommunicationBottomSheet tripId:", tripId);
  console.log("CustomerCommunicationBottomSheet customerId:", customerId);
}, []);

  const snapPoints = [ '20%']; // Example snap points, adjust as needed
  const handleChatPress = () => {
    navigation.navigate('DriverChat', {
      trip_id: tripId,
      customer_id: customerId,
    });
    
      //  trip_id, customer_id });
  };
  
   

  return (
    <View style={styles.container}>
    {/* Overlay to close Bottom Sheet */}
    <Pressable onPress={() => navigation.goBack()} style={styles.overlay} />
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0} // Initial snap point
      enablePanDownToClose={false}
      onClose={() => navigation.goBack()}
      style={styles.bottomSheet}
    >
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Driver Communication</Text>
      </View>

      {/* Icons for Chat, Call, and Safety */}
      <View style={styles.iconContainer}>
        {/* Chat Icon */}
        <TouchableOpacity style={styles.iconCircle} onPress={handleChatPress}>
  <Icon name="chat" type="material" size={30} color="#fff" />
</TouchableOpacity>


        {/* Call Icon */}
        <TouchableOpacity style={styles.iconCircle}>
          <Icon name="call" type="material" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Safety Icon */}
        <TouchableOpacity style={styles.iconCircle}>
          <Icon name="shield" type="material" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

    </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
       },
       overlay: {
        flex: 1,
      },
  bottomSheet: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007aff', // Custom color for icons
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#007aff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirm: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerCommunicationBottomSheet;
