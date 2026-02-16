import React, { useState, useContext, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { DestinationContext, OriginContext } from "../contexts/contexts";

const { width } = Dimensions.get("window");

const RideRatingModal = ({ visible, onClose, tripId, userId }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { dispatchOrigin } = useContext(OriginContext);
  const { dispatchDestination } = useContext(DestinationContext);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleStarPress = (star) => {
    setRating(star);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (!rating) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch(api + "ride/rating", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          userId,
          rating,
          feedback,
          role: "driver",
        }),
      });

      setSubmitted(true);

      setTimeout(() => {
        onClose(); // ✅ close the modal after submission
      }, 3000);
    } catch (error) {
      console.error("Rating submission error:", error);
      Alert.alert("Submission Failed", "Unable to submit your rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return "We're sorry to hear that";
      case 2: return "We'll work to improve";
      case 3: return "Thank you for your feedback";
      case 4: return "Great! We're glad you enjoyed";
      case 5: return "Excellent! You made our day";
      default: return "";
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {submitted ? (
            <View style={styles.thankYouContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              <Text style={styles.thankYouTitle}>Thank You!</Text>
              <Text style={styles.thankYouMessage}>
                Your rating was submitted. We appreciate your feedback!
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Your Ride</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.questionText}>How was your ride?</Text>

                <Animated.View style={[styles.starsContainer, { transform: [{ scale: scaleAnim }] }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => handleStarPress(star)}>
                      <Icon name="star" size={40} color={star <= rating ? "#FFC107" : "#ccc"} />
                    </TouchableOpacity>
                  ))}
                </Animated.View>

                {rating > 0 && <Text style={styles.ratingText}>{getRatingText()}</Text>}

                <TextInput
                  style={styles.textInput}
                  placeholder="Write feedback (optional)"
                  multiline
                  value={feedback}
                  onChangeText={setFeedback}
                />

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!rating || isSubmitting}
                  style={[
                    styles.submitButton,
                    (!rating || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 16,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  ratingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#444",
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#0DCAF0",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  thankYouContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 10,
  },
  thankYouMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 6,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});

export default RideRatingModal;
