import 'react-native-get-random-values';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigations/RootNavigator';
import { store, persistor } from './src/redux/store';
import { DestinationContextProvider, OriginContextProvider } from './src/contexts/contexts';
import { DriverDestinationContextProvider, DriverOriginContextProvider } from './src/contexts/driverContexts';
import { LogBox } from 'react-native';
// import NetworkBanner from './src/components/NetworkBanner'; // Temporarily disabled due to netinfo native module issue
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/components/CustomToast"; // ✅ if you created custom config


// Ignore warnings
LogBox.ignoreLogs([
  "Text strings must be rendered within a <Text> component.",
])

const originalConsoleLog = console.log;
const suppressedLogPatterns = [
  /TripLoadingResponse/i,
  /DriverDetailsBottomSheet/i,
  /in radius/i,
  /km away/i,
  /Car Data/i,
  /Trip Request from Redux in PendingRequests/i,
  /Checking for pending trip requests/i,
  /POLYLINE DEBUG/i,
  /Trip statuses cached successfully/i,
  /Foreground location update/i,
  /Saving foreground driver location to Firebase/i,
  /Foreground location saved successfully to Firebase/i,
];

console.log = (...args) => {
  const message = args.map(String).join(" ");
  if (suppressedLogPatterns.some((pattern) => pattern.test(message))) {
    return;
  }
  originalConsoleLog(...args);
};


export default function App() {
  return (
    <Provider store={store}> {/* Wrap the app with Redux provider */}
      <PersistGate loading={null} persistor={persistor} timeout={10000}> {/* Wrap the app with PersistGate to wait for state rehydration */}
        <GestureHandlerRootView style={styles.container}>
          {/* Network Banner - Temporarily disabled due to netinfo native module issue */}
          {/* <NetworkBanner /> */}
          {/* Driver contexts */}
          <DriverOriginContextProvider>
            <DriverDestinationContextProvider>
              {/* Customer contexts */}
              <DestinationContextProvider>
                <OriginContextProvider>
                  <RootNavigator />
                  {/* ✅ Add Toast here */}
                  <Toast config={toastConfig} />
                </OriginContextProvider>
              </DestinationContextProvider>
            </DriverDestinationContextProvider>
          </DriverOriginContextProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});