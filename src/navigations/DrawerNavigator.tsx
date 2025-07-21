// import * as React from "react";
// import { createDrawerNavigator } from "@react-navigation/drawer";
// import { Icon } from "react-native-elements";
// import { colors } from "../global/styles"; // Ensure this path is correct
// import HomeScreen from '../customerscreens/HomeScreen'; // Adjust the path based on your project structure
// import PendingRequests from '../DriverScreens/PendingRequests'; // Add other screens as necessary
// import LoginScreen from '../WelcomeScreens/LoginScreen';
// import HomeStack from './StackNavigation'; // Corrected to HomeStack

// const Drawer = createDrawerNavigator();

// export default function DrawerNavigator() {
//   return (
//     <Drawer.Navigator initialRouteName="HomeScreen">
//       {/* Define Drawer Screens */}
//       <Drawer.Screen
//         name="HomeScreen"
//         component={HomeScreen}
//         options={{
//           title: "Home",
//           drawerIcon: ({ focused, size }) => (
//             <Icon
//               type="material-community"
//               name="home"
//               color={focused ? '#7cc' : colors.grey2}
//               size={size}
//             />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="PendingRequests"
//         component={PendingRequests}
//         options={{
//           title: "Pending Requests",
//           drawerIcon: ({ focused, size }) => (
//             <Icon
//               type="material-community"
//               name="clipboard-list"
//               color={focused ? '#7cc' : colors.grey2}
//               size={size}
//             />
//           ),
//         }}
//       />
//     </Drawer.Navigator>
//   );
// }
