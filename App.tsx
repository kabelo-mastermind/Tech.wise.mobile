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
import NetworkBanner from './src/components/NetworkBanner';
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/components/CustomToast"; // ✅ if you created custom config


// Ignore warnings
LogBox.ignoreLogs([
  "Text strings must be rendered within a <Text> component.",
])


export default function App() {
  return (
    <Provider store={store}> {/* Wrap the app with Redux provider */}
      <PersistGate loading={null} persistor={persistor} timeout={10000}> {/* Wrap the app with PersistGate to wait for state rehydration */}
        <GestureHandlerRootView style={styles.container}>
          {/* Network Banner */}
          <NetworkBanner />
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