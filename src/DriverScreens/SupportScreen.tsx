import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import CustomDrawer from "../components/CustomDrawer";
import { Icon } from "react-native-elements";

const { width } = Dimensions.get('window');

const SupportScreen = ({ navigation }) => {
  const handleEmailSupport = () => {
    const email = "support@example.com"; // Replace with your support email
    const subject = "Support Request";
    const body = "Hi, I need help with...";
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch((err) =>
      console.error("Failed to open email client:", err)
    );
  };

  const handleCallSupport = () => {
    const phone = "123456789"; // Replace with your support phone number
    Linking.openURL(`tel:${phone}`).catch((err) =>
      console.error("Failed to open phone dialer:", err)
    );
  };

  const handleLiveChat = () => {
    const chatUrl = "https://example.com/live-chat"; // Replace with your live chat URL
    Linking.openURL(chatUrl).catch((err) =>
      console.error("Failed to open live chat:", err)
    );
  };

  const supportOptions = [
    {
      id: 'email',
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      icon: 'mail-outline',
      iconColor: '#0DCAF0',
      onPress: handleEmailSupport
    },
    {
      id: 'call',
      title: 'Call Support',
      description: 'Speak directly with our support team',
      icon: 'call-outline',
      iconColor: '#0DCAF0',
      onPress: handleCallSupport
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat with our support agents in real-time',
      icon: 'chatbubble-ellipses-outline',
      iconColor: '#0DCAF0',
      onPress: handleLiveChat
    }
  ];

  const faqItems = [
    {
      question: 'How do I reset my password?',
      answer: 'Go to the login screen, click "Forgot Password," and follow the instructions sent to your email.'
    },
    {
      question: 'How do I update my payment method?',
      answer: 'Navigate to the "Payment Settings" in your profile and update your details. Changes will be applied immediately.'
    },
    {
      question: 'Can I change my username?',
      answer: 'Yes, you can change your username once every 30 days in your account settings.'
    },
    {
      question: 'How do I report a problem?',
      answer: 'Use any of our support channels above or go to Settings > Help > Report a Problem.'
    }
  ];
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="help-buoy" size={40} color="#0DCAF0" />
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Choose one of our support channels below or browse our FAQ
          </Text>
        </View>

        {/* Support Options */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Us</Text>

          <View style={styles.optionsContainer}>
            {supportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name={option.icon} size={28} color={option.iconColor} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#0DCAF0" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqContainer}>
            {faqItems.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.faqItem,
                  index < faqItems.length - 1 && styles.faqItemBorder
                ]}
              >
                <View style={styles.faqQuestionRow}>
                  <View style={styles.faqBullet}>
                    <Text style={styles.faqBulletText}>Q</Text>
                  </View>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                </View>
                <View style={styles.faqAnswerContainer}>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Additional Help */}
        <View style={styles.additionalHelpContainer}>
          <Text style={styles.additionalHelpText}>
            Still need help? Our support team is available 24/7
          </Text>
          <TouchableOpacity
            style={styles.additionalHelpButton}
            onPress={handleEmailSupport}
          >
            <Text style={styles.additionalHelpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#0DCAF0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    left: 10,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 202, 240, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(13, 202, 240, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  faqItem: {
    padding: 16,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  faqBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0DCAF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  faqBulletText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    lineHeight: 22,
  },
  faqAnswerContainer: {
    paddingLeft: 36,
  },
  faqAnswer: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 22,
  },
  additionalHelpContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  additionalHelpText: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  additionalHelpButton: {
    backgroundColor: '#0DCAF0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  additionalHelpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SupportScreen;