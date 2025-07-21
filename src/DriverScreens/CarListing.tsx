"use client"
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CustomDrawer from '../components/CustomDrawer';
import { Icon } from 'react-native-elements';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { api } from '../../api';

// Firebase imports
import { storage } from '../../firebase'; // Firebase Storage Import - Keeping your original path
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'; // Added deleteObject

const { width } = Dimensions.get('window');

const CarListing = ({ navigation }) => {
  const route = useRoute();
  const editingCar = route.params?.carDetails || null; // Get car details if passed for editing

  const user = useSelector((state) => state.auth.user);
  const user_id = user?.user_id || null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carDetails, setCarDetails] = useState({
    car_id: null, // This will store the car's ID for editing/updating
    carMaker: '',
    carModel: '',
    carYear: '',
    carSeats: '',
    carColor: '',
    carImage: null, // This will store the local URI or a { uri: 'http://...' } object
    licensePlate: '',
  });

  useEffect(() => {
    if (editingCar) {
      console.log("CarListing: Entering edit mode. Initializing form with car ID from 'id' field:", editingCar.id);
      setCarDetails({
        car_id: editingCar.id, // <--- CHANGED THIS LINE: Use editingCar.id
        carMaker: editingCar.car_make,
        carModel: editingCar.car_model,
        carYear: String(editingCar.car_year), // Ensure year is string for TextInput
        carSeats: String(editingCar.number_of_seats), // Ensure seats is string
        carColor: editingCar.car_colour,
        carImage: editingCar.car_image ? { uri: editingCar.car_image } : null, // Set existing image URI
        licensePlate: editingCar.license_plate,
      });
    } else {
      console.log("CarListing: Entering create mode. Resetting form fields.");
      // Explicitly reset carDetails to initial empty state for new creation
      setCarDetails({
        car_id: null,
        carMaker: '',
        carModel: '',
        carYear: '',
        carSeats: '',
        carColor: '',
        carImage: null,
        licensePlate: '',
      });
    }
  }, [editingCar]); // This dependency ensures it runs when navigation params change

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need access to your gallery to upload an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [16, 9],
      });
      if (!result.canceled && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setCarDetails((prev) => ({
          ...prev,
          carImage: selectedImage,
        }));
      }
    } catch (error) {
      console.error("Image Picker Error:", error);
      Alert.alert("Error", "Something went wrong while selecting the image.");
    }
  };

  // Helper function to extract Firebase Storage path from URL
  const getFirebaseStoragePath = (url) => {
    if (!url || !url.includes('firebasestorage.googleapis.com')) {
      return null;
    }
    try {
      const urlObj = new URL(url);
      // Pathname typically looks like /v0/b/{bucket}/o/{path_to_file}
      const pathSegments = urlObj.pathname.split('/');
      // The actual file path starts after 'o/'
      const filePathIndex = pathSegments.indexOf('o') + 1;
      if (filePathIndex > 0 && filePathIndex < pathSegments.length) {
        // Decode URI components to handle special characters in file names
        return decodeURIComponent(pathSegments.slice(filePathIndex).join('/'));
      }
    } catch (e) {
      console.error("Error parsing Firebase Storage URL:", e);
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!user_id) {
      Alert.alert("Authentication Error", "User not logged in. Please log in to list or update a car.");
      return;
    }

    const { car_id, carMaker, carModel, carYear, carSeats, carColor, carImage, licensePlate } = carDetails;

    console.log("handleSubmit: carDetails.car_id before API call:", car_id); // Debug log
    console.log("handleSubmit: editingCar object:", editingCar); // Debug log

    // Validate all fields
    const missingFields = [];
    if (!carMaker) missingFields.push('Car Maker');
    if (!carModel) missingFields.push('Car Model');
    if (!carYear) missingFields.push('Year');
    if (!carSeats) missingFields.push('Number of Seats');
    if (!carColor) missingFields.push('Color');
    if (!licensePlate) missingFields.push('License Plate');
    if (!carImage) missingFields.push('Car Image');

    if (missingFields.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please provide the following details:\n${missingFields.join('\n')}`,
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);
    let imageUrlToSave = carImage?.uri; // Default to existing URI or local URI

    try {
      // Check if a new image was selected (local URI) AND if we are editing an existing car
      if (carImage && carImage.uri && !carImage.uri.startsWith('http')) {
        // If editing and there was an old image, delete it first
        if (editingCar && editingCar.car_image) {
          const oldImagePath = getFirebaseStoragePath(editingCar.car_image);
          if (oldImagePath) {
            try {
              const oldImageRef = ref(storage, oldImagePath);
              await deleteObject(oldImageRef);
              console.log("Old image deleted from Firebase Storage:", oldImagePath);
            } catch (deleteError) {
              console.warn("Failed to delete old image from Firebase Storage:", deleteError);
              // Continue with upload even if old image deletion fails
            }
          }
        }

        // Upload the new image
        const response = await fetch(carImage.uri);
        const blob = await response.blob();
        const imageFileName = carImage.fileName || `car_image_${Date.now()}.jpg`;
        const storageRef = ref(storage, `car_images/${user_id}/${imageFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload is ${progress}% done`);
            },
            (error) => {
              console.error("Image upload error:", error);
              reject(error);
            },
            async () => {
              imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const payload = {
        userId: user_id,
        car_make: carMaker,
        car_model: carModel,
        car_year: parseInt(carYear, 10), // ✅ convert to number
        number_of_seats: parseInt(carSeats, 10), // ✅ convert to number
        car_colour: carColor,
        license_plate: licensePlate,
        car_image: imageUrlToSave || '',
      };


      const endpoint = car_id ? `${api}car_listing/${car_id}` : `${api}car_listing`;
      const method = car_id ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log("API Response Status:", response.status); // Debug log for response status
      // Read the response body once
      const responseText = await response.text();
      let responseJson;
      let errorMessage = "An unknown error occurred.";

      try {
        responseJson = JSON.parse(responseText);
        if (responseJson.error) {
          errorMessage = responseJson.error;
        } else if (!response.ok) {
          errorMessage = `Server responded with status ${response.status}`;
        }
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        console.error("Raw server response:", responseText);
        errorMessage = `Failed to parse server response. Raw response: ${responseText.substring(0, 100)}...`;
      }

      if (response.ok) {
        Alert.alert(
          "Success",
          car_id ? "Your car details have been updated successfully!" : "Your car has been listed successfully!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to submit car details. Please check your connection or try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCar = () => {
    if (!user_id || !editingCar?.id) { // <--- CHANGED THIS LINE: Use editingCar.id
      Alert.alert("Error", "Cannot delete car. Missing user or car ID.");
      return;
    }

    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this car listing? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // 1. Delete image from Firebase Storage
              if (editingCar.car_image) {
                const imagePath = getFirebaseStoragePath(editingCar.car_image);
                if (imagePath) {
                  try {
                    const imageRef = ref(storage, imagePath);
                    await deleteObject(imageRef);
                    console.log("Image deleted from Firebase Storage:", imagePath);
                  } catch (deleteError) {
                    console.warn("Failed to delete image from Firebase Storage:", deleteError);
                    // Continue with database deletion even if image deletion fails
                  }
                }
              }

              // 2. Delete car details from the database
              const response = await fetch(`${api}car_listing/${editingCar.id}`, { // <--- CHANGED THIS LINE: Use editingCar.id
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                },
              });

              // Read the response body once
              const responseText = await response.text();
              let responseJson;
              let errorMessage = "An unknown error occurred during deletion.";

              try {
                responseJson = JSON.parse(responseText);
                if (responseJson.error) {
                  errorMessage = responseJson.error;
                } else if (!response.ok) {
                  errorMessage = `Server responded with status ${response.status}`;
                }
              } catch (jsonError) {
                console.error("JSON parsing error during deletion:", jsonError);
                console.error("Raw server response during deletion:", responseText);
                errorMessage = `Failed to parse server response during deletion. Raw response: ${responseText.substring(0, 100)}...`;
              }

              if (response.ok) {
                Alert.alert(
                  "Success",
                  "Car listing deleted successfully!",
                  [{ text: "OK", onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert("Error", errorMessage);
              }
            } catch (error) {
              console.error("Deletion error:", error);
              Alert.alert("Error", "Failed to delete car. Please check your connection or try again.");
            } finally {
              setIsSubmitting(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const inputFields = [
    {
      label: 'Car Maker',
      value: carDetails.carMaker,
      field: 'carMaker',
      placeholder: 'e.g., Toyota, Honda, BMW',
      icon: 'car-sport-outline'
    },
    {
      label: 'Car Model',
      value: carDetails.carModel,
      field: 'carModel',
      placeholder: 'e.g., Corolla, Civic, X5',
      icon: 'options-outline'
    },
    {
      label: 'Year',
      value: carDetails.carYear,
      field: 'carYear',
      placeholder: 'e.g., 2022',
      icon: 'calendar-outline',
      keyboardType: 'numeric'
    },
    {
      label: 'Number of Seats',
      value: carDetails.carSeats,
      field: 'carSeats',
      placeholder: 'e.g., 5',
      icon: 'people-outline',
      keyboardType: 'numeric'
    },
    {
      label: 'Color',
      value: carDetails.carColor,
      field: 'carColor',
      placeholder: 'e.g., Black, White, Silver',
      icon: 'color-palette-outline'
    },
    {
      label: 'License Plate',
      value: carDetails.licensePlate,
      field: 'licensePlate',
      placeholder: 'e.g., ABC-1234',
      icon: 'card-outline'
    },
  ];

  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const headerTitle = editingCar ? "Edit Car Details" : "Upload Car Details";
  const submitButtonText = editingCar ? "Update Car Details" : "List My Car";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction */}
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>Car Details</Text>
            <Text style={styles.introText}>
              Please provide accurate information about your car to help passengers identify it.
            </Text>
            {editingCar && (
              <Text style={styles.reviewMessage}>
                Your changes will be reviewed by an nthome admin within 24 hours.
              </Text>
            )}
          </View>
          {/* Form Fields */}
          <View style={styles.formContainer}>
            {inputFields.map((field) => (
              <View key={field.field} style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name={field.icon} size={20} color="#0DCAF0" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={(value) =>
                      setCarDetails((prev) => ({ ...prev, [field.field]: value }))
                    }
                    placeholder={field.placeholder}
                    placeholderTextColor="#adb5bd"
                    keyboardType={field.keyboardType || 'default'}
                    editable={field.editable !== false} // Apply editable prop
                  />
                </View>
              </View>
            ))}
            {/* Image Upload */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Car Image</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={handleImageUpload}
              >
                {carDetails.carImage ? (
                  <Image
                    source={{ uri: carDetails.carImage.uri }}
                    style={styles.imagePreview}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera" size={32} color="#0DCAF0" />
                    <Text style={styles.uploadText}>Tap to upload car photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {carDetails.carImage && (
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={handleImageUpload}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>{submitButtonText}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete Button (only visible when editing) */}
          {editingCar && (
            <TouchableOpacity
              style={[styles.deleteButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleDeleteCar}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#fff" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Delete Car</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0DCAF0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: "center",
    marginRight: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introContainer: {
    padding: 20,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  reviewMessage: {
    fontSize: 13,
    color: '#0DCAF0',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    fontSize: 16,
    color: '#212529',
  },
  imageUploadButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  uploadPlaceholder: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  changeImageButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  changeImageText: {
    color: '#0DCAF0',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#0DCAF0',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc3545', // Red color for delete
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16, // Spacing from submit button
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default CarListing;