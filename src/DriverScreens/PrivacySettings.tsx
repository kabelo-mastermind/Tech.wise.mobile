import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';

const PrivacySettings = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Privacy Settings</Text>

        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          - Manage your data preferences
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          - Review your data sharing agreements
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          - Configure app permissions
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          - Delete your account
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacySettings;
