import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { ArrowLeft, Check } from "lucide-react-native"; // Use lucide-react-native for icons
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../api";
import axios from "axios";

export default function SuccessPage ({ navigation, route }) {
    const { bank_code, country_code, account_number, subaccountCode, user_id } = route.params;
    console.log('received params:', route.params);
    
    const [bankValidation, setBankValidation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); 
    const [subaccountDetails, setSubaccountDetails] = useState(null);
    
    useEffect(() => {
        const fetchSubaccountDetails = async () => {
            try {
                const response = await axios.post(`${api}fetch-subaccount`, {
                    subaccountCode, // Send subaccountCode to the backend for fetching subaccount details
                });
    
                if (response.data.success) {
                    setSubaccountDetails(response.data.data);
                    console.log("Subaccount details fetched successfully:", response.data);

                    // Now send this data to store in the database
                    const { data } = response.data;
                    const subaccountData = {
                        user_id: user_id, // Assuming user_id is passed via route params
                        subaccount_code: data.subaccount_code,
                        business_name: data.business_name,
                        settlement_bank: data.settlement_bank,
                        currency: data.currency,
                        percentage_charge: data.percentage_charge,
                        active: data.active,
                        created_at: data.createdAt,
                        updated_at: data.updatedAt,
                    };

                    // Store subaccount details in the database
                    const storeResponse = await axios.post(`${api}store-subaccount`, subaccountData);
                    if (storeResponse.data.success) {
                        console.log("Subaccount data saved successfully:", storeResponse.data);
                    } else {
                        setError("Failed to store subaccount details.");
                    }

                } else {
                    setError("Failed to fetch subaccount details.");
                }
            } catch (err) {
                setError(err.response?.data?.error || "Error fetching subaccount details.");
            } finally {
                setLoading(false);
            }
        };
    
        if (subaccountCode) {
            fetchSubaccountDetails(); // Only fetch if subaccountCode is available
        }
    }, [subaccountCode]); // Re-run if subaccountCode changes
    
    useEffect(() => {
        const validateBankAccount = async () => {
            try {
                const response = await axios.post(`${api}verify-subaccount`, {
                    bank_code,
                    country_code,
                    account_number,
                    subaccountCode,
                });

                if (response.data.success) {
                    setBankValidation(response.data);
                    console.log("Bank Validation Success:", response.data);
                } else {
                    setError("Bank validation failed.");
                }
            } catch (err) {
                setError(err.response?.data?.error || "Error validating bank account.");
            } finally {
                setLoading(false);
            }
        };

        validateBankAccount();
    }, [bank_code, country_code, account_number]); // Re-run if any of these change


    if (loading) {
        return (
            <SafeAreaView>
                {/* Header */}
                <View>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ArrowLeft size={20} />
                    </TouchableOpacity>
                    <Text>Verifying</Text>
                </View>

                {/* Loading content */}
                <View>
                    <ActivityIndicator size="large" color="#0dcaf0" />
                    <Text>Please wait, verifying your account...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={20} />
                </TouchableOpacity>
                {/* <Text style={styles.title}>Successful</Text> */}
            </View>

            {/* Main content */}
            <View style={styles.content}>
                <View style={styles.successIcon}>
                    <Check size={40} color="white" />
                </View>
                <Text style={styles.successTitle}>Successful!</Text>
                <View style={styles.successMessage}>
                    {/* <Text>{message}</Text> */}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("DriverStats")}>
                    <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
                </TouchableOpacity>
                <View style={styles.secondaryActions}>
                    <TouchableOpacity onPress={() => navigation.navigate("SubaccountDetailsScreen", { subaccountCode: subaccountCode })}>
                        <Text style={styles.secondaryLink}>View Account Details</Text>
                    </TouchableOpacity>
                    <View style={styles.indicatorLine} />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    statusBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
    },
    time: {
        fontSize: 14,
        fontWeight: "500",
    },
    indicators: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    signal: {
        width: 12,
        height: 12,
        backgroundColor: "#000", // Placeholder for signal icon
    },
    wifi: {
        width: 16,
        height: 12,
        backgroundColor: "#000", // Placeholder for WiFi icon
    },
    battery: {
        width: 20,
        height: 12,
        backgroundColor: "#000", // Placeholder for battery icon
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: 8,
    },
    backButton: {
        position: "absolute",
        left: 16,
        padding: 8,
        borderRadius: 50,
        backgroundColor: "#f5f5f5",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "500",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        gap: 16,
    },
    successIcon: {
        width: 80,
        height: 80,
        backgroundColor: "#0dcaf0",
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: "700",
    },
    successMessage: {
        textAlign: "center",
        color: "#666",
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        flexDirection: "column",
        gap: 16,
    },
    primaryButton: {
        width: "100%",
        height: 48,
        borderRadius: 24,
        backgroundColor: "#0dcaf0",
        justifyContent: "center",
        alignItems: "center",
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "500",
        fontSize: 16,
    },
    secondaryActions: {
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
    },
    secondaryLink: {
        color: "#0dcaf0",
        fontSize: 14,
    },
    secondaryLinkHover: {
        textDecorationLine: "underline",
    },
    indicatorLine: {
        width: 40,
        height: 4,
        backgroundColor: "#333",
        borderRadius: 2,
        marginTop: 4,
    },
});
