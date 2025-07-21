import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboarding } from '../constants/index'; // Adjust path as needed
import CustomButton from '../components/CustomButton'; // Import your CustomButton

const OnboardingScreen = ({ navigation }) => {
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if the user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
      if (hasOnboarded === 'true') {
        navigation.replace('SignUp'); // Navigate if already onboarded
      }
    };

    checkOnboardingStatus();
  }, [navigation]);

  const handleIndexChange = (index: Number) => {
    setCurrentIndex(index);
  };

  const handleCompleteOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true'); // Mark onboarding as complete
      navigation.replace('SignUp'); // Navigate to SignUp
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleNextPress = () => {
    if (currentIndex === onboarding.length - 1) {
      handleCompleteOnboarding(); // If it's the last slide
    } else {
      swiperRef.current?.scrollBy(1); // Otherwise, go to the next slide
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity
        onPress={handleCompleteOnboarding}
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Swiper */}
      <Swiper
        ref={swiperRef}
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.activeDot} />}
        onIndexChanged={handleIndexChange}
      >
        {/* Dynamic Slides */}
        {onboarding.map((item) => (
          <View key={item.id} style={styles.slide}>
            {item.image ? (
              typeof item.image === 'string' ? (
                <Image source={{ uri: item.image }} style={styles.slideImage} />
              ) : (
                <Image source={item.image} style={styles.slideImage} />
              )
            ) : (
              <Text style={styles.slidePlaceholder}>No Image Available</Text>
            )}
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>

            {/* Custom Button */}
            <CustomButton
              title={currentIndex === onboarding.length - 1 ? 'Get Started' : 'Next'}
              onPress={handleNextPress}
              bgVariant="none" // No background color
              textVariant="default" // Black text
              className={styles.cornerButton}
            />
          </View>
        ))}
      </Swiper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    alignSelf: 'flex-end',
    margin: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#007AFF',
  },
  dot: {
    width: 32,
    height: 4,
    marginHorizontal: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  activeDot: {
    width: 32,
    height: 4,
    marginHorizontal: 5,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  slideImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  slideDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  slidePlaceholder: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cornerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    color: '#000', // Black text
  },
});

export default OnboardingScreen;
