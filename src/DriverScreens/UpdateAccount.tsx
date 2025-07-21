import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { api } from '../../api';

const UpdateAccount = ({ route, navigation }) => {
    const { subaccountCode } = route.params; // Get subaccount code from route params
    console.log('subaccountCode:', subaccountCode); // Debugging line to check the subaccount code

    const [subaccountDetails, setSubaccountDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch subaccount details
    useEffect(() => {
        const fetchSubaccountDetails = async () => {
            try {
                const response = await axios.post(api + 'fetch-subaccount', {
                    subaccountCode: subaccountCode,  // Replace with dynamic subaccount code if needed
                });

                if (response.data.success) {
                    setSubaccountDetails(response.data.data);
                    setBusinessName(response.data.data.business_name || '');
                    setDescription(response.data.data.description || '');
                } else {
                    setError('Failed to fetch subaccount details.');
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Error fetching subaccount details.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubaccountDetails();
    }, [subaccountCode]);

    // Function to handle subaccount update
    const handleUpdateSubaccount = async () => {
        setIsUpdating(true);
        try {
            const response = await axios.put(
                api + 'update-subaccount/' + subaccountCode,
                {
                    business_name: businessName,
                    description: description,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer YOUR_SECRET_KEY`, // Replace with your actual secret key
                    },
                }
            );

            if (response.data.success) {
                alert('Subaccount updated successfully!');
            } else {
                setError('Failed to update subaccount.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error updating subaccount.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />;
    }

    if (error) {
        return <Text style={styles.error}>{error}</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Subaccount Details</Text>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Account Number:</Text>
                <Text style={styles.value}>{subaccountDetails.account_number}</Text>
            </View>
            <View style={styles.detailContainer}>
                <Text style={styles.label}>Account description:</Text>
                <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    multiline
                />
            </View>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Business Name:</Text>
                <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Enter business name"
                />
            </View>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Currency:</Text>
                <Text style={styles.value}>{subaccountDetails.currency}</Text>
            </View>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Settlement Bank:</Text>
                <Text style={styles.value}>{subaccountDetails.settlement_bank}</Text>
            </View>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Subaccount Code:</Text>
                <Text style={styles.value}>{subaccountDetails.subaccount_code}</Text>
            </View>

            <View style={styles.detailContainer}>
                <Text style={styles.label}>Verified:</Text>
                <Text style={styles.value}>{subaccountDetails.is_verified ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateSubaccount} disabled={isUpdating}>
                    <Text style={styles.primaryButtonText}>
                        {isUpdating ? 'Updating...' : 'Update Subaccount'}
                    </Text>
                </TouchableOpacity>
                <View style={styles.secondaryActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('DriverStats')}>
                        <Text style={styles.secondaryLink}>Continue to Dashboard</Text>
                    </TouchableOpacity>
                    <View style={styles.indicatorLine} />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f9f9f9',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
    },
    detailContainer: {
        marginVertical: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    value: {
        fontSize: 16,
        color: '#333',
        marginTop: 5,
    },
    input: {
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginTop: 5,
        height: 50,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    error: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        flexDirection: 'column',
        gap: 16,
    },
    primaryButton: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0dcaf0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 16,
    },
    secondaryActions: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
    },
    secondaryLink: {
        color: '#0dcaf0',
        fontSize: 14,
    },
    indicatorLine: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginTop: 4,
    },
});

export default UpdateAccount;
