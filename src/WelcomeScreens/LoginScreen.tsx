import React, { useEffect, useState } from 'react';
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
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/actions/authActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { api } from '../../api';
import { LinearGradient } from 'expo-linear-gradient'; // If available in your project

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const dispatch = useDispatch();
  const [user_Id, setUser_Id] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userAuth, setUserAuth] = useState(null);

  // Check if user is already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({
          name: user.displayName,
          email: user.email,
          id: user.uid,
        }));
        navigation.replace('DrawerNavigator');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigation, dispatch]);

  const signIn = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    setAuthenticating(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Ensure email verification status is up-to-date
      await user.reload();
  
      if (!user.emailVerified) {
        alert('Please verify your email before logging in.');
        navigation.navigate('ProtectedScreen');
        return;
      }
  
      // Retrieve user data from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
  
      if (!userDoc.exists()) {
        alert('User not found.');
        return;
      }
  
      const userData = userDoc.data();
  
      // Check if the user is a driver
      if (userData.role !== 'driver') {
        alert('Only drivers are allowed to log in.');
        navigation.replace('LogoutPage');
        return;
      }
  
      // Store user details in AsyncStorage
      await AsyncStorage.setItem('userId', user.uid);
      await AsyncStorage.setItem('emailVerified', 'true');
  
      setUserId(user.uid);
      setUserAuth(user);
      
      // Dispatch user details to Redux
      dispatch(setUser({
        name: user.displayName,
        email: user.email,
        id: user.uid,
        role: userData.role,
      }));
  
      // Call fetchDriverUserID and pass user and userData
      fetchDriverUserID(user, userData);
    } catch (error) {
      console.log(error);
      alert('Sign in failed, please check your email and password');
    } finally {
      setAuthenticating(false);
    }
  };
  
  const fetchDriverUserID = async (user, userData) => {
    try {
      const response = await axios.post(api+'login', {
        email,
      });
  
      const user_id = response.data.id;
      console.log("driver profile picture:", response.data || "N/A");
      
      setUser_Id(user_id);
  
      // Dispatch updated user data to Redux with user_id and userData (role)
      dispatch(setUser({
        name: user.displayName,
        email: user.email,
        id: user.uid,
        role: userData.role,
        user_id: user_id,
        profile_picture: response.data.profile_picture || "N/A" 
      }));
    } catch (error) {
      console.error("Error fetching driver id:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DCAF0" />
      </View>
    );
  }

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
              <Text style={styles.headerTitle}>Welcome Back</Text>
              <Text style={styles.headerSubtitle}>Log in to continue</Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
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
                  placeholder="Enter your password"
                  secureTextEntry={secureTextEntry}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <Text style={styles.eyeIconText}>
                    {secureTextEntry ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPasswordScreen')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={signIn}
              disabled={authenticating}
              activeOpacity={0.8}
            >
              {authenticating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.signUpLink}>Sign up</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  headerContainer: {
    height: height * 0.35,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  eyeIconText: {
    fontSize: 16,
    color: '#64748b',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0DCAF0',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#0DCAF0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0DCAF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#64748b',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0DCAF0',
    marginLeft: 4,
  },
});

export default LoginScreen;