import React, { useEffect, useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { auth } from '../../FirebaseConfig';
import { sendEmailVerification } from 'firebase/auth';

const ProtectedScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const resendVerificationEmail = async () => {
    const user = auth.currentUser;

    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        Alert.alert(
          'Verification Email Sent',
          'We’ve sent a new verification link to your email. Please check your inbox or spam folder.'
        );
      } catch (error) {
        console.log('Error resending verification email:', error);
        Alert.alert(
          'Oops!',
          'Something went wrong while sending the email. Please try again shortly.'
        );
      }
    } else {
      Alert.alert(
        'Email Verified',
        'Your email is already verified. You’re good to go!'
      );
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
        Welcome to <Text style={{ fontWeight: 'bold' }}>Nthome</Text> 
      </Text>

      {isAuthenticated && isEmailVerified ? (
        <Text style={{ fontSize: 15, color: 'green', textAlign: 'center' }}>
          Your email is verified! You now have full access.
        </Text>
      ) : (
        <Text style={{ fontSize: 15, color: 'red', textAlign: 'center' }}>
          Please verify your email before continuing.
        </Text>
      )}

      {/* Resend Verification Email Button */}
      <TouchableOpacity
        onPress={resendVerificationEmail}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: '#e0e0e0',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: '#000', textAlign: 'center' }}>
          Didn’t receive the email? Check your inbox/spam folder or tap{' '}
          <Text style={{ fontWeight: 'bold', color: '#007bff' }}>Resend</Text>
        </Text>
      </TouchableOpacity>

      {/* Navigation Button to LoginScreen */}
      <TouchableOpacity
        onPress={() => navigation.navigate('LoginScreen')}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: '#007bff',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
          Go to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProtectedScreen;
