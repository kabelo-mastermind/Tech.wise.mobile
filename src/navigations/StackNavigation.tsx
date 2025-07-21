// import * as React, { useEffect, useState } from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import AsyncStorage from '@react-native-async-storage/async-storage';  // Import AsyncStorage
// import HomeScreen from '../customerscreens/HomeScreen';
// import LoginScreen from '../WelcomeScreens/LoginScreen';
// import OnboardingScreen from '../WelcomeScreens/OnboardingScreen';
// import SignUpScreen from '../WelcomeScreens/SignUpScreen';

// // driver stackNavigator
// import PendingTripsBottomSheet from '../DriverComponents/PendingTripsBottomSheet';
// import TripHistory from '../DriverScreens/TripHistory';
// import DriverProfile from '../DriverScreens/DriverProfile';
// // import PaymentScreen from '../customerscreens/PaymentScreen';



// const Home = createNativeStackNavigator();

// export function HomeStack() {
// //   const [isOnboardingComplete, setIsOnboardingComplete] = useState(null);

// //   useEffect(() => {
// //     const checkOnboardingStatus = async () => {
// //       try {
// //         const hasCompletedOnboarding = await AsyncStorage.getItem('onboardingCompleted');
// //         if (hasCompletedOnboarding === 'true') {
// //           setIsOnboardingComplete(true);
// //         } else {
// //           setIsOnboardingComplete(false);
// //         }
// //       } catch (error) {
// //         console.log('Error checking onboarding status:', error);
// //       }
// //     };
    
// //     checkOnboardingStatus();
// //   }, []);

// //   if (isOnboardingComplete === null) {
// //     return null; // or a loading spinner, to avoid showing the navigation before the status is loaded
// //   }

//   return (
//     <Home.Navigator>
//       {/* {!isOnboardingComplete ? ( */}
//         <Home.Screen
//           name="OnboardingScreen"
//           component={OnboardingScreen}
//           options={{ headerShown: false }}
//         />
//       {/* ) : ( */}
//         <Home.Screen
//           name="LoginScreen"
//           component={LoginScreen}
//           options={{ headerShown: false }}
//         />
//       {/* )} */}

//       <Home.Screen
//         name="SignUpScreen"
//         component={SignUpScreen}
//         options={{ headerShown: false }}
//       />
//       <Home.Screen
//         name="Home"
//         component={HomeScreen}
//         options={{ headerShown: false }}
//       />
     
//       {/* driver stacks */}
//       <Home.Screen
//         name="PendingTripsBottomSheet"
//         component={PendingTripsBottomSheet}
//         options={{
//           headerShown: false
//         }}
//       />
//        <Home.Screen
//         name="PendingTripsBottomSheet"
//         component={PendingTripsBottomSheet}
//         options={{
//           headerShown: false
//         }}
//       />
//        <Home.Screen
//         name="TripHistory"
//         component={TripHistory}
//         options={{
//           headerShown: false
//         }}
//       />
//         <Home.Screen
//         name="DriverProfile"
//         component={DriverProfile}
//         options={{
//           headerShown: false
//         }}
//       />
    
//     </Home.Navigator>
//   );
// }
