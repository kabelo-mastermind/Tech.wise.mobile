"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icon } from "react-native-elements"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import { api } from "../../api"
import { useSelector } from "react-redux"
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase'; // Firebase Storage Import
import { auth, db } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDispatch } from 'react-redux';
import { setUser } from '../redux/actions/authActions';
import { showToast } from "../constants/showToast"

import LoadingScreen from "../components/LoadingScreen"; // 👈 import it

const DriverProfile = ({ navigation }) => {
  const [customerData, setCustomerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedField, setSelectedField] = useState(null)
  const [fieldValue, setFieldValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [firestoreData, setFirestoreData] = useState({ name: "", email: "", gender: "" });
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth?.user)
  const user_id = user?.user_id
  const username = user?.name

  // State for trips
  const [trips, setTrips] = useState([])
  const [totalCompletedTrips, setTotalCompletedTrips] = useState(0);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // 👇 Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3; // Limit retry attempts

  // 👇 Combined loading state for LoadingScreen
  const isLoading = loading || loadingTrips;
  
  // Form fields for editing
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    current_address: "",
    gender: "",
  })

  // 👇 Individual fetch functions with retry logic
  const fetchFirestoreUser = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirestoreData({
          name: data.name || "",
          email: data.email || "",
          gender: data.gender || "",
        });
      } else {
        showToast("info", "No Data", "No data found for this user.");
      }
    } catch (err) {
      console.error("Failed to fetch Firestore user:", err);
      throw new Error("Failed to fetch Firestore user data");
    }
  };

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      // Try to fetch from network
      const res = await fetch(api + `customer/${user_id}`);
      const data = await res.json();
      setCustomerData(data);

      // Initialize form data with fetched data
      const newFormData = {
        name: data.name || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
        current_address: data.current_address || "",
        gender: data.gender || "",
      };
      setFormData(newFormData);

      // Cache the customer data
      await AsyncStorage.setItem(`cachedCustomerData_${user_id}`, JSON.stringify(data));
      console.log("✅ Customer data cached");

      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error fetching user:", err);
      
      // Try to load from cache on network failure
      try {
        const cachedData = await AsyncStorage.getItem(`cachedCustomerData_${user_id}`);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setCustomerData(data);
          setFormData({
            name: data.name || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
            current_address: data.current_address || "",
            gender: data.gender || "",
          });
          console.log("📱 Loaded cached customer data (offline mode)");
          showToast("info", "Offline Mode", "Using cached profile data.");
          setError(null);
        } else {
          setError("Failed to fetch user details.");
          throw new Error("Failed to fetch customer data");
        }
      } catch (cacheError) {
        console.error("Error loading cached data:", cacheError);
        setError("Failed to fetch user details.");
        throw new Error("Failed to fetch customer data");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    setLoadingTrips(true);
    try {
      // Try to fetch from network
      const res = await fetch(api + `tripHistory/${user_id}?status=completed`);
      const data = await res.json();

      setTrips(data);
      const totalCompleted = data.length;
      setTotalCompletedTrips(totalCompleted);

      // Cache trips data
      await AsyncStorage.setItem(`cachedTrips_${user_id}`, JSON.stringify(data));
      console.log("✅ Trips data cached");

      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error fetching trips:", err);
      
      // Try to load from cache on network failure
      try {
        const cachedTrips = await AsyncStorage.getItem(`cachedTrips_${user_id}`);
        if (cachedTrips) {
          const data = JSON.parse(cachedTrips);
          setTrips(data);
          setTotalCompletedTrips(data.length);
          console.log("📱 Loaded cached trips data (offline mode)");
          setError(null);
        } else {
          setError("Failed to load trip history.");
          throw new Error("Failed to fetch trip data");
        }
      } catch (cacheError) {
        console.error("Error loading cached trips:", cacheError);
        setError("Failed to load trip history.");
        throw new Error("Failed to fetch trip data");
      }
    } finally {
      setLoadingTrips(false);
    }
  };

  // 👇 Main data fetching function with retry logic
  const fetchAllData = async () => {
    if (!user_id) return;

    try {
      setError(null);
      
      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchFirestoreUser(),
        fetchCustomer(),
        fetchTrips()
      ]);
      
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching all data:", error);
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        showToast(
          "error", 
          "Retrying...", 
          `Failed to load data. Retry ${nextRetryCount}/${MAX_RETRIES}`
        );
        
        // Auto-retry after 2 seconds
        setTimeout(() => {
          fetchAllData();
        }, 2000);
      } else {
        // Max retries reached
        setError("Unable to load profile data. Please check your connection and try again.");
        showToast(
          "error",
          "Loading Failed",
          "Failed to load profile after multiple attempts. Please try again."
        );
      }
    }
  };

  // 👇 Initial data fetch
  useEffect(() => {
    if (user_id) {
      fetchAllData();
    }
  }, [user_id]);

  // 👇 Manual retry function for LoadingScreen
  const retryFetchData = () => {
    if (retryCount >= MAX_RETRIES) {
      // Reset retry count if max was reached
      setRetryCount(0);
    }
    fetchAllData();
  };

  // Handle image picking
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showToast(
          "info",
          "Permission Denied",
          "We need camera roll permissions to change your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showToast(
        "error",
        "Image Pick Failed",
        "Failed to pick image. Please try again."
      );
    }
  };

  // Upload profile image
  const uploadProfileImage = async (imageUri) => {
    try {
      setUploadingImage(true);

      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : 'jpg';
      const type = match ? `image/${ext}` : 'image/jpeg';

      const folderPath = `profile_pictures/${username}_${user_id}`;
      const storageRef = ref(storage, `${folderPath}/${filename}`);

      const response = await fetch(imageUri);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          Alert.alert("Error", "Failed to upload profile picture.");
          setUploadingImage(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // ✅ Update in MySQL
          const res = await fetch(`${api}update-profile-picture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile_picture: downloadURL,
              user_id,
            })
          });

          if (res.status === 200) {
            setCustomerData((prev) => ({
              ...prev,
              profile_picture: downloadURL,
            }));
            Alert.alert("Success", "Profile picture updated successfully!");
            dispatch(setUser({
              name: formData.name,
              email: formData.email,
              profile_picture: downloadURL
            }));
            // ✅ Also update Firebase Auth profile photo
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
              try {
                await updateProfile(firebaseUser, { photoURL: downloadURL });
                console.log("Firebase Auth photoURL updated");
              } catch (err) {
                console.warn("Failed to update Firebase Auth photoURL:", err);
              }
            }
          } else {
            Alert.alert("Error", "Failed to update profile picture in database.");
          }

          setUploadingImage(false);
        }
      );
    } catch (error) {
      Alert.alert("Error", "Something went wrong.");
      setUploadingImage(false);
    }
  };

  // Open edit modal for a specific field
  const handleEdit = (field, value) => {
    setSelectedField(field)
    setFieldValue(value)
    setShowEditModal(true)
  }

  // Save edited field
  const saveField = async () => {
    if (!selectedField || !fieldValue.trim()) {
      showToast("error", "Invalid Input", "Please enter a valid value.");
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        [selectedField]: fieldValue,
        user_id,
      };

      const response = await fetch(api + "update-customer", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.status === 200) {
        // Update local state
        setCustomerData((prev) => ({
          ...prev,
          [selectedField]: fieldValue,
        }));

        // Update form data
        setFormData((prev) => ({
          ...prev,
          [selectedField]: fieldValue,
        }));

        setShowEditModal(false);
        showToast("success", "Profile Updated", "Profile updated successfully!");
      } else {
        showToast("error", "Update Failed", "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("error", "Update Failed", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  // Save all profile changes
  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      // 1. Always update MySQL
      const response = await fetch(api + "update-customer", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id,
        })
      });

      if (response.status === 200) {
        setCustomerData((prev) => ({
          ...prev,
          ...formData,
        }));
        setEditMode(false);
        showToast("success", "Profile Updated", "Profile updated successfully!");
      } else {
        showToast("error", "Update Failed", "Failed to update profile.");
      }

      // 2. Conditionally update Firestore
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const updates: any = {};

        if (formData.name !== firestoreData.name) updates.name = formData.name;
        if (formData.email !== firestoreData.email) updates.email = formData.email;
        if (formData.gender !== firestoreData.gender) updates.gender = formData.gender;

        if (Object.keys(updates).length > 0) {
          await updateDoc(userRef, updates);
          setFirestoreData((prev) => ({ ...prev, ...updates }));
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("error", "Update Failed", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Get profile image source
  const getProfileImageSource = () => {
    if (customerData?.profile_picture) {
      return { uri: customerData.profile_picture + '?t=' + new Date().getTime() };
    }
    return require("../../assets/placeholder.jpg");
  }

  // 👇 Use LoadingScreen instead of local loading state
  if (isLoading) {
    return (
      <LoadingScreen
        loading={isLoading}
        error={error}
        onRetry={retryFetchData}
      />
    );
  }

  if (error && !customerData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" type="material" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryInfo}>
          {retryCount > 0 && `Retry attempts: ${retryCount}/${MAX_RETRIES}`}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryFetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header */}
      <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" type="material" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
          <Icon name={editMode ? "check" : "edit"} type="material" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {uploadingImage ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <Image source={getProfileImageSource()} style={styles.profileImage} />
            )}

            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Icon name="camera-alt" type="material" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <Text style={styles.profileName}>
            {customerData?.name} {customerData?.lastName}
          </Text>

          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Icon name="email" type="material" size={18} color="#FFFFFF" style={styles.contactIcon} />
              <Text style={styles.contactText}>{customerData?.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="phone" type="material" size={18} color="#FFFFFF" style={styles.contactIcon} />
              <Text style={styles.contactText}>{customerData?.phoneNumber || "Not provided"}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="person-outline" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          <View style={styles.cardContent}>
            {editMode ? (
              // Edit mode form
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.name}
                    onChangeText={(text) => handleInputChange("name", text)}
                    placeholder="Enter your first name"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.lastName}
                    onChangeText={(text) => handleInputChange("lastName", text)}
                    placeholder="Enter your last name"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.email}
                    onChangeText={(text) => handleInputChange("email", text)}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.phoneNumber}
                    onChangeText={(text) => handleInputChange("phoneNumber", text)}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <View style={styles.genderOptions}>
                    <TouchableOpacity
                      style={[styles.genderOption, formData.gender === "Male" && styles.selectedGenderOption]}
                      onPress={() => handleInputChange("gender", "Male")}
                    >
                      <Text
                        style={[styles.genderOptionText, formData.gender === "Male" && styles.selectedGenderOptionText]}
                      >
                        Male
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.genderOption, formData.gender === "Female" && styles.selectedGenderOption]}
                      onPress={() => handleInputChange("gender", "Female")}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          formData.gender === "Female" && styles.selectedGenderOptionText,
                        ]}
                      >
                        Female
                      </Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                      style={[styles.genderOption, formData.gender === "Other" && styles.selectedGenderOption]}
                      onPress={() => handleInputChange("gender", "Other")}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          formData.gender === "Other" && styles.selectedGenderOptionText,
                        ]}
                      >
                        Other
                      </Text>
                    </TouchableOpacity> */}
                  </View>
                </View>
              </>
            ) : (
              // View mode
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>First Name:</Text>
                  <Text style={styles.infoValue}>{customerData?.name || "Not provided"}</Text>
                  {/* <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("name", customerData?.name || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity> */}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Name:</Text>
                  <Text style={styles.infoValue}>{customerData?.lastName || "Not provided"}</Text>
                  {/* <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("lastName", customerData?.lastName || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity> */}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{customerData?.email || "Not provided"}</Text>
                  {/* <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("email", customerData?.email || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity> */}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{customerData?.phoneNumber || "Not provided"}</Text>
                  {/* <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("phoneNumber", customerData?.phoneNumber || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity> */}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gender:</Text>
                  <Text style={styles.infoValue}>{customerData?.gender || "Not provided"}</Text>
                  {/* <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("gender", customerData?.gender || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity> */}
                </View>
              </>
            )}
          </View>

          {editMode && (
            <TouchableOpacity style={styles.saveButton} onPress={saveAllChanges} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="save" type="material" size={18} color="#FFFFFF" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Address Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="location-on" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Address Information</Text>
          </View>

          <View style={styles.cardContent}>
            {editMode ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Permanent Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.address}
                    onChangeText={(text) => handleInputChange("address", text)}
                    placeholder="Enter your permanent address"
                    multiline
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Current Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.current_address}
                    onChangeText={(text) => handleInputChange("current_address", text)}
                    placeholder="Enter your current address"
                    multiline
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Permanent:</Text>
                  <Text style={styles.infoValue}>{customerData?.address || "Not provided"}</Text>
                  <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("address", customerData?.address || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current:</Text>
                  <Text style={styles.infoValue}>{customerData?.current_address || "Not provided"}</Text>
                  <TouchableOpacity
                    style={styles.fieldEditButton}
                    onPress={() => handleEdit("current_address", customerData?.current_address || "")}
                  >
                    <Icon name="edit" type="material" size={16} color="#0DCAF0" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="credit-card" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Payment Methods</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardDescription}>Manage your payment methods for rides.</Text>
          </View>

          <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate("SubaccountDetailsScreen")}>
            <Text style={styles.cardButtonText}>View Payment Methods</Text>
            <Icon name="chevron-right" type="material" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Trip History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="history" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Trip History</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCompletedTrips || 0}</Text>
              <Text style={styles.statLabel}>Total Completed Trips</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate("TripHistory")}>
            <Text style={styles.cardButtonText}>View Trip History</Text>
            <Icon name="chevron-right" type="material" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Language Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="language" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Language Settings</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Language:</Text>
              <Text style={styles.infoValue}>English</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate("LanguageSettings")}>
            <Text style={styles.cardButtonText}>Change Language</Text>
            <Icon name="chevron-right" type="material" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate("LogoutPage")}>
          <Icon name="logout" type="material" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit{" "}
              {selectedField === "phoneNumber"
                ? "Phone Number"
                : selectedField === "lastName"
                  ? "Last Name"
                  : selectedField === "current_address"
                    ? "Current Address"
                    : selectedField}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={fieldValue}
              onChangeText={setFieldValue}
              placeholder={`Enter your ${selectedField}`}
              multiline={selectedField === "address" || selectedField === "current_address"}
              keyboardType={
                selectedField === "phoneNumber" ? "phone-pad" : selectedField === "email" ? "email-address" : "default"
              }
              autoCapitalize={selectedField === "email" ? "none" : "sentences"}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={saveField}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 10,
  },
    retryInfo: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0DCAF0",
  },
  backButtonText: {
    color: "#0DCAF0",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#0DCAF0",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0AA8CD",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "#4ADE80",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  contactInfo: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  cardDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "rgba(13, 202, 240, 0.08)",
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0DCAF0",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    width: "30%",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    flex: 1,
  },
  fieldEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
  },
  genderOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  selectedGenderOption: {
    borderColor: "#0DCAF0",
    backgroundColor: "rgba(13, 202, 240, 0.08)",
  },
  genderOptionText: {
    fontSize: 14,
    color: "#64748B",
  },
  selectedGenderOptionText: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  saveModalButton: {
    backgroundColor: "#0DCAF0",
    marginLeft: 8,
  },
  saveModalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
})

export default DriverProfile
