import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  TextInput,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // If available in your project

const { width, height } = Dimensions.get('window');

const TripCancellationModal = ({ isVisible, onClose, onCancel }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [slideAnimation] = useState(new Animated.Value(height));

  const cancellationReasons = [
    "Rider not at pickup location",
    "Rider is unresponsive",
    "Trip fare is too low",
    "Vehicle issue or breakdown",
    "Other",
  ];

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [isVisible]);

  const handleCancel = () => {
    if (selectedReason) {
      // If "Other" is selected and there's a custom reason, use it
      const reasonToSend = selectedReason === "Other" ? customReason : selectedReason;
      
      if (reasonToSend) {
        onCancel(reasonToSend); // Pass the reason to the parent
        onClose(); // Close the modal after cancellation
      } else {
        alert("Please provide a reason for cancellation.");
      }
    } else {
      alert("Please select a reason for cancellation.");
    }
  };

  const renderReasonItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.reasonItem, 
        selectedReason === item && styles.selectedReasonItem
      ]}
      onPress={() => {
        setSelectedReason(item);
        if (item !== "Other") {
          setCustomReason(""); // Clear custom reason if a predefined option is selected
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.reasonContent}>
        <Text style={[
          styles.reasonText,
          selectedReason === item && styles.selectedReasonText
        ]}>
          {item}
        </Text>
        
        {selectedReason === item && (
          <View style={styles.checkmarkContainer}>
            {/* Use Ionicons if available, otherwise use a text symbol */}
            {Platform.OS === 'web' ? (
              <Text style={styles.checkmarkText}>✓</Text>
            ) : (
              <Ionicons name="checkmark-circle" size={22} color="#0DCAF0" />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnimation }] }
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.headerHandle} />
            <Text style={styles.title}>Trip Cancellation</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              {Platform.OS === 'web' ? (
                <Text style={styles.closeButtonText}>×</Text>
              ) : (
                <Ionicons name="close" size={24} color="#6c757d" />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Why are you cancelling the trip?</Text>
          
          <FlatList
            data={cancellationReasons}
            renderItem={renderReasonItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.reasonsList}
            showsVerticalScrollIndicator={false}
          />

          {/* Show custom input if "Other" is selected */}
          {selectedReason === "Other" && (
            <View style={styles.customReasonContainer}>
              <TextInput
                style={styles.input}
                placeholder="Please specify your reason"
                placeholderTextColor="#9ca3af"
                value={customReason}
                onChangeText={setCustomReason}
                multiline={true}
                numberOfLines={2}
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !selectedReason && styles.disabledButton
              ]} 
              onPress={handleCancel}
              disabled={!selectedReason}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Confirm Cancellation</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    position: 'relative',
  },
  headerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6c757d',
    lineHeight: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  reasonsList: {
    paddingHorizontal: 20,
  },
  reasonItem: {
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedReasonItem: {
    borderColor: '#0DCAF0',
    backgroundColor: 'rgba(13, 202, 240, 0.05)',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
  },
  selectedReasonText: {
    color: '#0f172a',
    fontWeight: '500',
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  checkmarkText: {
    fontSize: 18,
    color: '#0DCAF0',
  },
  customReasonContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  input: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    fontSize: 16,
    color: '#334155',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0DCAF0',
    alignItems: 'center',
    shadowColor: '#0DCAF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TripCancellationModal;