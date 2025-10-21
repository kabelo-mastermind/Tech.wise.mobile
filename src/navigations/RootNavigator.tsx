import React, { useEffect, useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer'; // Import DrawerNavigator
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // Import BottomTabNavigator
import { Icon } from 'react-native-elements'; // Assuming you're using this for icons
import LoginScreen from '../WelcomeScreens/LoginScreen';
// import HomeScreen from '../customerscreens/HomeScreen';
import AsyncStorage from "@react-native-async-storage/async-storage";
// driver navigations
import SignUpScreen from '../WelcomeScreens/SignUpScreen';
import PendingRequests from '../DriverScreens/PendingRequests';
import PendingTripsBottomSheet from '../DriverComponents/PendingTripsBottomSheet';
import DriverProfile from '../DriverScreens/DriverProfile';
import TripHistory from '../DriverScreens/TripHistory';
import UploadDocuments from '../DriverScreens/UploadDocuments';
import AboutScreen from '../DriverScreens/AboutScreen';
import SupportScreen from '../DriverScreens/SupportScreen';
import LogoutPage from '../WelcomeScreens/LogoutPage';
import OnboardingScreen from '../WelcomeScreens/OnboardingScreen';
import DriverStats from "../DriverScreens/DriverStats";
import Subscriptions from "../DriverComponents/subscriptions/Subscriptions";
import WeeklySubscription from "../DriverComponents/subscriptions/WeeklySubscription";
import MonthlySubscription from "../DriverComponents/subscriptions/MonthlySubscription";
import ManageSubscription from "../DriverComponents/subscriptions/ManageSubscription";
import UpgradeSubscription from "../DriverComponents/subscriptions/UpgradeSubscription";
import DowngradeSubscription from "../DriverComponents/subscriptions/DowngradeSubscription";
import AccountDetails from "../DriverComponents/subscriptions/AccountDetails";
import CurrentSubscription from "../DriverComponents/subscriptions/CurrentSubscription";
import PaymentPage from "../DriverComponents/subscriptions/PaymentPage";
import PaymentSuccess from "../DriverComponents/subscriptions/PaymentSuccess";
import TripDetails from "../DriverScreens/TripDetails";
import CancelSubscription from "../DriverComponents/subscriptions/CancelSubscription";
import NthomeServicesScreen from "../DriverScreens/NthomeServicesScreen";

import { auth } from "../../FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedScreen from "../WelcomeScreens/ProtectedScreen";
import AddPaymentMethodScreen from "../DriverScreens/AddPaymentMethodScreen";
import CommunicationPreferences from "../DriverScreens/CommunicationPreferences";
import LanguageSettings from "../DriverScreens/LanguageSettings";
import PaymentMethodsScreen from "../DriverScreens/PaymentMethodsScreen";
import PaymentScreen from "../DriverScreens/PaymentScreen";
import PrivacySettings from "../DriverScreens/PrivacySettings";
import ForgotPasswordScreen from "../WelcomeScreens/ForgotPasswordScreen";
import CustomerCommunicationBottomSheet from "../DriverComponents/CustomerCommunicationBottomSheet";
// import Wallet from "../DriverScreens/WalletDriver";
import CarListing from "../DriverScreens/CarListing";
import DriverRewards from "../DriverScreens/DriverRewards";
import DriverChat from "../DriverScreens/DriverChat";
import SuccessPage from "../components/SuccessPage ";
import SubaccountDetailsScreen from "../DriverScreens/SubaccountDetailsScreen ";
import UpdateAccount from "../DriverScreens/UpdateAccount";
import RateAppScreen from "../DriverScreens/RateAppScreen";
import HelicopterQuoteForm from "../DriverScreens/HelicopterQuoteForm";
import ViewDocuments from "../DriverScreens/ViewDocuments";
import ViewCarDetails from "../DriverScreens/ViewCarDetails";
import BookingForm from "../NthomeAir/BookingForm";
import BookingList from "../NthomeAir/BookingList";
import BookingEdit from "../NthomeAir/BookingEdit";
import BookingDetails from "../NthomeAir/BookingDetails";
import FlightWelcomeScreen from "../NthomeAir/FlightWelcomeScreen";
import TermsScreen from "../DriverScreens/TermsScreen";
import { ActivityIndicator, View } from "react-native";


const Stack = createNativeStackNavigator(); // Renaming to `Stack` for better clarity
const Drawer = createDrawerNavigator(); // Create DrawerNavigator
const Tab = createBottomTabNavigator(); // Create BottomTabNavigator

// Bottom Tab Navigator for navigating between screens
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="DriverStats" // Set the initial route to Home instead of LoginScreen
      screenOptions={{
        headerShown: false, // Disable header for all tab screens
      }}
    >
      <Tab.Screen
        name="Services"
        component={NthomeServicesScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Icon
              name="tools"
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />
      <Tab.Screen
        name="DriverStats"
        component={DriverStats}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Icon
              name="car"
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DriverProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" type="material-community" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator function to wrap HomeScreen with the drawer
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen
        name="Home"
        component={BottomTabNavigator} // Use BottomTabNavigator instead of HomeScreen
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="home"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />
      {/* <Drawer.Screen
        name="My Profile"
        component={DriverProfile}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="account-circle"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="Subscriptions"
        component={Subscriptions} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="credit-card" // Correct icon for payments
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="DriverRewards"
        component={DriverRewards} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="tag" // Correct icon for promotions
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="My Rides"
        component={TripHistory} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="car" // Correct icon for rides
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Upload Documents"
        component={UploadDocuments} // Add the Upload Documents screen
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="file-upload"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="CarListing"
        component={CarListing} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="information" // Correct icon for about
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="DriverStats"
        component={DriverStats} // Add the Upload Documents screen
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="file-upload"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Cards"
        component={Wallet}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="account-circle"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="Pending Requests"
        component={PendingRequests} // Add the Upload Documents screen
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="file-upload"
              type="material-community"
              size={size}
              color={focused ? "#7cc" : "gray"}
            />
          ),
        }}
      />


      <Drawer.Screen
        name="Support"
        component={SupportScreen} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="lifebuoy" // Correct icon for support
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="About"
        component={AboutScreen} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="information" // Correct icon for about
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="LogoutPage"
        component={LogoutPage}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="logout" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      /> */}
    </Drawer.Navigator>
  );
}

// Helper to get active route name (even in nested navigators)
const getActiveRouteName = (state) => {
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
};

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null); // Initially null to avoid flickering

  useEffect(() => {
    const loadInitialRoute = async () => {
      try {
        // 1️⃣ Check if a last screen is saved
        const savedScreen = await AsyncStorage.getItem("lastScreen");
        if (savedScreen) {
          if (savedScreen === "PendingRequests") {
            setInitialRoute("PendingRequests");
          } else {
            setInitialRoute("DriverStats");
          }
          await AsyncStorage.removeItem("lastScreen");
          setIsLoading(false);
          return;
        }

        // Your existing auth/onboarding checks
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        const storedUserId = await AsyncStorage.getItem('userId');
        const emailVerified = await AsyncStorage.getItem('emailVerified');

        // If we have stored user but need to verify email status
        if (storedUserId) {
          const user = auth.currentUser;
          if (user) {
            await user.reload(); // Get latest email verification status
            if (user.emailVerified) {
              await AsyncStorage.setItem("emailVerified", "true");
              setInitialRoute("DrawerNavigator");
            } else {
              await AsyncStorage.removeItem("emailVerified");
              await AsyncStorage.removeItem("userId");
              setInitialRoute("ProtectedScreen");
            }
          } else {
            // User not logged in but has stored data - clear it
            await AsyncStorage.removeItem("userId");
            await AsyncStorage.removeItem("emailVerified");
            setInitialRoute(hasOnboarded === "true" ? "LoginScreen" : "Onboarding");
          }
        } else {
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              await AsyncStorage.setItem("userId", user.uid);
              await AsyncStorage.setItem("emailVerified", "true");
              setInitialRoute("DrawerNavigator");
            } else {
              setInitialRoute("ProtectedScreen");
            }
          } else {
            setInitialRoute(hasOnboarded === "true" ? "LoginScreen" : "Onboarding");
          }
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setInitialRoute("LoginScreen");
      } finally {
        setIsLoading(false);
      }
    };


    loadInitialRoute();

     // 3️⃣ Subscribe to real-time auth changes WITH email verification check
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("User is not logged in");
        // Clear stored data when user signs out
        await AsyncStorage.removeItem("userId");
        await AsyncStorage.removeItem("emailVerified");
        setInitialRoute("LoginScreen");
        return;
      }

      try {
        // Reload user to get latest email verification status
        await user.reload();
        const currentUser = auth.currentUser;
        
        if (currentUser && currentUser.emailVerified) {
          await AsyncStorage.setItem("userId", currentUser.uid);
          await AsyncStorage.setItem("emailVerified", "true");
          setInitialRoute("DrawerNavigator");
        } else {
          await AsyncStorage.removeItem("emailVerified");
          setInitialRoute("ProtectedScreen");
        }
      } catch (err) {
        console.error("Error reading email verification status:", err);
        setInitialRoute("LoginScreen");
      }
    });

    return () => unsubscribe();
  }, []);


  if (isLoading || initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0DCAF0" />
      </View>
    );
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        const currentRouteName = getActiveRouteName(state);
        if (currentRouteName) {
          AsyncStorage.setItem('lastScreen', currentRouteName);
        }
      }}
    >
      <Stack.Navigator initialRouteName={initialRoute}>
        {/* Onboarding Screen */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen} // Add your Onboarding screen component
          options={{ headerShown: false }} // Hide the header if not needed
        />

        {/* Authentication Screens */}
        <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RateAppScreen"
          component={RateAppScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPasswordScreen"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProtectedScreen"
          component={ProtectedScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HelicopterQuoteForm"
          component={HelicopterQuoteForm}

          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FlightWelcomeScreen"
          component={FlightWelcomeScreen}

          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UploadDocuments"
          component={UploadDocuments}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LogoutPage"
          component={LogoutPage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CarListing"
          component={CarListing}
          options={{ headerShown: false }}
        />
        {/* Main App - Drawer Navigator */}
        <Stack.Screen
          name="DrawerNavigator"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DriverRewards"
          component={DriverRewards}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="My Profile"
          component={DriverProfile}

          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewDocuments"
          component={ViewDocuments}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="ViewCarDetails"
          component={ViewCarDetails}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CustomerCommunicationBottomSheet"
          component={CustomerCommunicationBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />
        {/* Driver-specific Screens */}
        <Stack.Screen
          name="PendingTripsBottomSheet"
          component={PendingTripsBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="PendingRequests"
          component={PendingRequests}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DriverProfile"
          component={DriverProfile}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DriverChat"
          component={DriverChat}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="BookingForm" component={BookingForm} options={{ headerShown: false }} />
        <Stack.Screen name="BookingList" component={BookingList} options={{ headerShown: false }} />
        <Stack.Screen name="BookingDetails" component={BookingDetails} options={{ headerShown: false }} />
        <Stack.Screen name="BookingEdit" component={BookingEdit} options={{ headerShown: false }} />
        <Stack.Screen name="TermsScreen" component={TermsScreen} options={{ headerShown: false }} />

        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="My Rides"
          component={TripHistory}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="successPage"
          component={SuccessPage}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="WeeklySubscription"
          component={WeeklySubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="NthomeServicesScreen"
          component={NthomeServicesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DriverStats"
          component={DriverStats}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MonthlySubscription"
          component={MonthlySubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="ManageSubscription"
          component={ManageSubscription}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UpgradeSubscription"
          component={UpgradeSubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="DowngradeSubscription"
          component={DowngradeSubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="AccountDetails"
          component={AccountDetails}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="CurrentSubscription"
          component={CurrentSubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="CancelSubscription"
          component={CancelSubscription}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="PaymentPage"
          component={PaymentPage}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="PaymentSuccess"
          component={PaymentSuccess}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Subscriptions"
          component={Subscriptions}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripDetails"
          component={TripDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Support"
          component={SupportScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AddPaymentMethodScreen"
          component={AddPaymentMethodScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CommunicationPreferences"
          component={CommunicationPreferences}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="LanguageSettings"
          component={LanguageSettings}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="PaymentMethodsScreen"
          component={PaymentMethodsScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="SubaccountDetailsScreen"
          component={SubaccountDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UpdateAccount"
          component={UpdateAccount}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="PaymentScreen"
          component={PaymentScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacySettings"
          component={PrivacySettings}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripHistory"
          component={TripHistory}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Main"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

