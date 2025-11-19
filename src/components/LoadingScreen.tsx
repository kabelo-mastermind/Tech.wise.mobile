import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const LoadingScreen = ({ loading, error, onRetry }) => {
    const [retryVisible, setRetryVisible] = useState(false);
    const [networkAlerted, setNetworkAlerted] = useState(false);
    const [showRetryUI, setShowRetryUI] = useState(true); // 👈 New state to control UI visibility
    const navigation = useNavigation();

    useEffect(() => {
        let retryTimer;
        let networkTimer;

        if (loading) {
            // Show retry button after 6 seconds if still loading
            retryTimer = setTimeout(() => {
                setRetryVisible(true);
            }, 4000);

            // If still loading after 15 seconds — network too weak
            networkTimer = setTimeout(async () => {
                if (loading && !networkAlerted) {
                    setNetworkAlerted(true);
                    Alert.alert(
                        "Login Issue",
                        "Your account couldn't be verified. Log in again.",
                        [
                            {
                                text: "Clear Cache & Retry",
                                onPress: async () => {
                                    try {
                                        await AsyncStorage.clear(); // Clear all stored data
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: "LoginScreen" }], // Redirect to login
                                        });
                                    } catch (err) {
                                        console.error("Error clearing AsyncStorage:", err);
                                    }
                                },
                            },
                        ]
                    );
                }
            }, 15000); // after 15 seconds
        } else {
            // Reset timers when loading completes
            clearTimeout(retryTimer);
            clearTimeout(networkTimer);
            setRetryVisible(false);
            setNetworkAlerted(false);
        }

        return () => {
            clearTimeout(retryTimer);
            clearTimeout(networkTimer);
        };
    }, [loading, networkAlerted, navigation, onRetry]);

    // 👇 Reset showRetryUI when loading state changes
    useEffect(() => {
        if (loading) {
            setShowRetryUI(true); // Show retry UI when loading starts
        }
    }, [loading]);

    // 👇 Handle retry button press
    const handleRetryPress = () => {
        // Hide retry UI immediately
        setShowRetryUI(false);
        
        // Call the parent's retry function
        if (onRetry) {
            onRetry();
        }
    };

    // Show loading screen only when loading is true
    if (!loading) {
        return null;
    }

    return (
        <View style={styles.loadingContainer}>
            <View style={styles.logoWrapper}>
                <ActivityIndicator
                    size={100}
                    color="#0DCAF0"
                    style={styles.spinnerBehind}
                />
                <Image
                    source={require("../../assets/nthomeLogo.png")}
                    style={styles.logo}
                />
            </View>
            <Text style={styles.loadingText_slogan}>{"Nthome ka petjana!"}</Text>

            {/* Show error message if provided, otherwise show default loading text */}
            <Text style={styles.loadingText}>
                {error || "Loading please wait..."}
            </Text>

            {/* 👇 Retry button - only shows when showRetryUI is true */}
            {showRetryUI && (retryVisible || error) && (
                <View style={styles.retryContainer}>
                    <Text style={styles.retryText}>
                        {error ? "Failed to load data" : "Taking longer than expected"}
                    </Text>
                    <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={handleRetryPress} // 👈 Use the new handler
                    >
                        <Text style={styles.retryButtonText}>
                            {error ? "Try Again" : "Retry Now"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 👇 Show loading message when retry UI is hidden */}
            {!showRetryUI && (
                <View style={styles.retryContainer}>
                    <Text style={styles.loadingText}>
                        Retrying... Please wait
                    </Text>
                    <ActivityIndicator size="small" color="#0DCAF0" style={{ marginTop: 10 }} />
                </View>
            )}
        </View>
    );
};

export default LoadingScreen;

const styles = {
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
    },
    logoWrapper: {
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
    },
    spinnerBehind: {
        position: "absolute",
    },
    logo: {
        width: 80,
        height: 80,
        resizeMode: "contain",
    },
    loadingText_slogan: {
        marginTop: 15,
        fontSize: 18,
        color: "#0DCAF0",
        fontWeight: "700",
        textAlign: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#4B5563",
        textAlign: "center",
        fontWeight: "500",
    },
    progressInfo: {
        marginTop: 25,
        alignItems: "center",
    },
    progressText: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 5,
        textAlign: "center",
    },
    retryContainer: {
        marginTop: 30,
        alignItems: "center",
    },
    retryText: {
        fontSize: 14,
        color: "#EF4444",
        marginBottom: 15,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: "#0DCAF0",
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
    },
    retryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
};