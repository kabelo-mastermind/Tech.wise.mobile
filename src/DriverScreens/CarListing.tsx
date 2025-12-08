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
import { storage, db } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const CarListing = ({ navigation }) => {
  const route = useRoute();
  const templateCar = route.params?.carDetails || null;

  const user = useSelector((state) => state.auth.user);
  const user_id = user?.user_id || null;
  const user_uid = user?.id || null; // Firebase UID

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState('driver'); // Default role
  const [carDetails, setCarDetails] = useState({
    car_id: null,
    carMaker: '',
    carModel: '',
    carYear: '',
    carSeats: '',
    carColor: '',
    carImage: null,
    licensePlate: '',
  });

  // Role selection options
  const roleOptions = [
    {
      id: 'driver',
      title: 'NthomeRidez Driver',
      description: 'Drive passengers to their destinations',
      icon: 'car-outline'
    },
    {
      id: 'food_driver',
      title: 'NthomeFood Driver',
      description: 'Deliver food orders to customers',
      icon: 'fast-food-outline'
    }
  ];

  // Determine if we're in template mode
  const isTemplateMode = templateCar && !templateCar.id;

  useEffect(() => {
    if (templateCar && templateCar.id) {
      console.log("CarListing: Editing existing car with ID:", templateCar.id);
      setCarDetails({
        car_id: templateCar.id,
        carMaker: templateCar.car_make || '',
        carModel: templateCar.car_model || '',
        carYear: templateCar.car_year ? String(templateCar.car_year) : '',
        carSeats: templateCar.number_of_seats ? String(templateCar.number_of_seats) : '',
        carColor: templateCar.car_colour || '',
        carImage: templateCar.car_image ? { uri: templateCar.car_image } : null,
        licensePlate: templateCar.license_plate || '',
      });
    } else if (templateCar) {
      console.log("CarListing: Using template car data for pre-population (new car)");
      setCarDetails({
        car_id: null,
        carMaker: templateCar.car_make || '',
        carModel: templateCar.car_model || '',
        carYear: templateCar.car_year ? String(templateCar.car_year) : '',
        carSeats: templateCar.number_of_seats ? String(templateCar.number_of_seats) : '',
        carColor: templateCar.car_colour || '',
        carImage: templateCar.car_image ? { uri: templateCar.car_image } : null,
        licensePlate: templateCar.license_plate || '',
      });
    } else {
      console.log("CarListing: Starting with empty form for new car");
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
  }, [templateCar]);

  // Function to update user role in Firestore and MySQL
  const updateUserRole = async (role) => {
    try {
      // ✅ UPDATE FIRESTORE BY UID (SAFE & ALWAYS WORKS)
      // if (user_uid) {
      //   const userRef = doc(db, "users", user_uid);

      //   await updateDoc(userRef, {
      //     role: role,
      //     updatedAt: new Date().toISOString(),
      //   });

      //   console.log("✅ Firestore role updated for UID:", user_uid);
      // }

      // -----------------------------
      // UPDATE MYSQL (unchanged)
      // -----------------------------
      const updateResponse = await fetch(`${api}update-customer`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          role: role
        }),
      });

      const updateResult = await updateResponse.json();
      if (updateResponse.ok) {
        console.log("MySQL role updated successfully:", updateResult);
      } else {
        console.warn("MySQL role update warning:", updateResult.message);
      }

    } catch (error) {
      console.log("❌ Error updating user role:", error);
      // throw new Error("Failed to update user role");
    }
  };

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

  const getFirebaseStoragePath = (url) => {
    if (!url || !url.includes('firebasestorage.googleapis.com')) {
      return null;
    }
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const filePathIndex = pathSegments.indexOf('o') + 1;
      if (filePathIndex > 0 && filePathIndex < pathSegments.length) {
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

    console.log("handleSubmit: carDetails.car_id before API call:", car_id);
    console.log("Selected role:", selectedRole);

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
    let imageUrlToSave = carImage?.uri;

    try {
      // First update the user role
      await updateUserRole(selectedRole);

      // Then proceed with car listing/update
      if (carImage && carImage.uri && !carImage.uri.startsWith('http') && car_id) {
        if (templateCar && templateCar.car_image) {
          const oldImagePath = getFirebaseStoragePath(templateCar.car_image);
          if (oldImagePath) {
            try {
              const oldImageRef = ref(storage, oldImagePath);
              await deleteObject(oldImageRef);
              console.log("Old image deleted from Firebase Storage:", oldImagePath);
            } catch (deleteError) {
              console.warn("Failed to delete old image from Firebase Storage:", deleteError);
            }
          }
        }

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
        car_year: parseInt(carYear, 10),
        number_of_seats: parseInt(carSeats, 10),
        car_colour: carColor,
        license_plate: licensePlate,
        car_image: imageUrlToSave || '',
        role: selectedRole, // Include role in car listing if needed
      };

      const endpoint = car_id ? `${api}car_listing/${car_id}` : `${api}car_listing`;
      const method = car_id ? 'PUT' : 'POST';

      console.log(`Making ${method} request to: ${endpoint}`);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

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
          car_id
            ? "Your car details have been updated successfully!"
            : `Your car has been listed successfully! You are now a ${selectedRole === 'food_driver' ? 'Food Delivery Driver' : 'Normal Driver'}.`,
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

  const isEditing = templateCar && templateCar.id;
  const headerTitle = isEditing ? "Edit Car Details" : "Upload Car Details";
  const submitButtonText = isEditing ? "Update Car Details" : "List My Car";

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
            {isTemplateMode && (
              <Text style={styles.templateMessage}>
                Form pre-filled with your existing car data. Please update the details for your new car.
              </Text>
            )}
          </View>

          {/* Role Selection */}
          <View style={styles.roleSelectionContainer}>
            <Text style={styles.roleSelectionTitle}>Select Your Driver Role</Text>
            <Text style={styles.roleSelectionSubtitle}>
              Choose the type of service you want to provide
            </Text>

            <View style={styles.roleOptionsContainer}>
              {roleOptions.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleOption,
                    selectedRole === role.id && styles.roleOptionSelected
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <View style={styles.roleOptionHeader}>
                    <Ionicons
                      name={role.icon}
                      size={24}
                      color={selectedRole === role.id ? '#0DCAF0' : '#6c757d'}
                    />
                    <Text style={[
                      styles.roleOptionTitle,
                      selectedRole === role.id && styles.roleOptionTitleSelected
                    ]}>
                      {role.title}
                    </Text>
                  </View>
                  <Text style={styles.roleOptionDescription}>
                    {role.description}
                  </Text>

                  {/* Selection indicator */}
                  <View style={[
                    styles.radioButton,
                    selectedRole === role.id && styles.radioButtonSelected
                  ]}>
                    {selectedRole === role.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  templateMessage: {
    fontSize: 13,
    color: '#28a745',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Role Selection Styles
  roleSelectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  roleSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  roleSelectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  roleOptionsContainer: {
    gap: 12,
  },
  roleOption: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    position: 'relative',
  },
  roleOptionSelected: {
    borderColor: '#0DCAF0',
    backgroundColor: '#f8fdff',
  },
  roleOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 12,
  },
  roleOptionTitleSelected: {
    color: '#0DCAF0',
  },
  roleOptionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
    paddingLeft: 36,
  },
  radioButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#0DCAF0',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0DCAF0',
  },
  // Existing styles remain the same...
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
});

export default CarListing;