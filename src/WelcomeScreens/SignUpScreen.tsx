import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { images } from '../constants/index';
import { colors, parameters } from '../global/styles';
import { auth, db } from '../../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { api } from '../../api';
import { LinearGradient } from 'expo-linear-gradient'; // If available in your project
import { showToast } from '../constants/showToast';

const { width, height } = Dimensions.get('window');

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

const signUp = async () => {
  if (!gender) {
    showToast("info", "Missing Info", "Please select your gender.");
    return;
  }

  if (!email || !password || !name) {
    showToast("error", "Incomplete form", "Please fill in all fields.");
    return;
  }

  setLoading(true);
  try {
    // Create user with email and password
    const response = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with the name
    await updateProfile(response.user, { displayName: name });

    // Store user data in Firestore
    const userRef = doc(db, "users", response.user.uid);
    await setDoc(userRef, {
      name,
      email,
      gender,
      role: "driver",
      createdAt: new Date().toISOString(),
    });

    // Send user data to your backend
    await axios.post(api + "register", {
      name,
      email,
      password,
      role: "driver",
      gender,
      user_uid: response.user.uid,
    });

    // Send email verification
    await sendEmailVerification(response.user);

    showToast(
      "success",
      "Account created successfully",
      "Please verify your email before logging in."
    );

    // Force logout to prevent auto-login after signup
    await signOut(auth);

    // Redirect to LoginScreen
    navigation.replace("ProtectedScreen");
  } catch (error: any) {
    // Map Firebase error codes to friendly messages
    let friendlyMessage = "Something went wrong while creating your account. Please try again.";

    if (error.code === "auth/weak-password") {
      friendlyMessage = "Your password is too weak. Please use at least 6 characters.";
    } else if (error.code === "auth/invalid-email") {
      friendlyMessage = "The email you entered is not valid. Please check and try again.";
    } else if (error.code === "auth/email-already-in-use") {
      friendlyMessage = "This email is already linked to another account.";
    }

    showToast("error", "Sign up failed", friendlyMessage);
  } finally {
    setLoading(false);
  }
};



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <LinearGradient
              colors={['rgba(13, 202, 240, 0.8)', 'rgba(13, 202, 240, 0.6)']}
              style={styles.headerGradient}
            >
              <Image
                source={images.signUpCar}
                style={styles.headerImage}
                resizeMode="cover"
              />
            </LinearGradient>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>Join our driver community today</Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={(text) => setName(text)}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => setEmail(text)}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Create a strong password"
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => setPassword(text)}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.passwordHint}>
                Password must be at least 6 characters
              </Text>
            </View>

            {/* Gender Selection */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    gender === 'male' && styles.selectedGenderOption,
                  ]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'male' && styles.selectedGenderText,
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    gender === 'female' && styles.selectedGenderOption,
                  ]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'female' && styles.selectedGenderText,
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signUpButton,
                !isChecked && styles.signUpButtonDisabled
              ]}
              onPress={signUp}
              disabled={!isChecked || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.signUpButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Terms and Conditions */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIsChecked(!isChecked)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <TouchableOpacity onPress={() => navigation.navigate('TermsScreen')}>
                    <Text style={styles.termsLink}>Terms of Service</Text>
                  </TouchableOpacity>
                  {' '}and{' '}
                  <TouchableOpacity onPress={() => navigation.navigate('TermsScreen')}>
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Already Have an Account */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('LoginScreen')}
              >
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  headerContainer: {
    height: height * 0.3,
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  headerTextContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  inputField: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  passwordHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    marginLeft: 4,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 4,
  },
  selectedGenderOption: {
    backgroundColor: '#0DCAF0',
    borderColor: '#0DCAF0',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  selectedGenderText: {
    color: '#fff',
    fontWeight: '600',
  },
  // ...existing code...
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0DCAF0',
    backgroundColor: '#fff',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0DCAF0',
    borderColor: '#0DCAF0',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  signUpButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowColor: 'transparent',
  },
  signUpButton: {
    backgroundColor: '#0DCAF0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0DCAF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: '#0DCAF0',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0DCAF0',
    marginLeft: 4,
  },
});

export default SignUpScreen;