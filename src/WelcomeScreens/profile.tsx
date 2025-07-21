import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"; // Added ScrollView for better scrollable content

function TripHistory() {
  // State for trip stats
  const [stats, setStats] = useState({
    totalTrips: 150,
    completedTrips: 140,
    cancelledTrips: 10,
  });

  // Sample data for Completed and Cancelled trips
  const completedTripsDetails = [
    {
      customer: "John Doe",
      contact: "+27 123 456 789",
      pickupLocation: "123 Main St",
      dropoffLocation: "456 Elm St",
      cost: 75,
      minutes: 25,
    },
    {
      customer: "Jane Smith",
      contact: "+27 987 654 321",
      pickupLocation: "789 Oak Ave",
      dropoffLocation: "101 Pine Rd",
      cost: 50,
      minutes: 18,
    },
  ];

  const cancelledTripsDetails = [
    {
      customer: "Mark Johnson",
      contact: "+27 111 222 333",
      pickupLocation: "123 Maple Dr",
      dropoffLocation: "789 Birch Ln",
      cost: 0,
      minutes: 0,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Trip History</Text>

      <View style={styles.card}>
        {/* Trip Stats Section */}
        <Text style={styles.cardTitle}>Trip Stats</Text>
        <Text style={styles.statLabel}>
          Total Trips: <Text style={styles.statValue}>{stats.totalTrips}</Text>
        </Text>

        <View style={styles.tripRow}>
          {/* Completed Trips */}
          <Text style={styles.completedTrips}>
            ✔ Completed: {stats.completedTrips}
          </Text>
          {/* Cancelled Trips */}
          <Text style={styles.cancelledTrips}>
            ✘ Cancelled: {stats.cancelledTrips}
          </Text>
        </View>
      </View>

      {/* Completed Trips Section */}
      <View style={[styles.card, styles.completedSection]}>
        <Text style={[styles.cardTitle, styles.completedTitle]}>Completed Trips</Text>
        {completedTripsDetails.map((trip, index) => (
          <View key={index} style={styles.tripDetail}>
            <Text style={styles.tripDetailTitle}>
              {trip.customer} (Completed Trip)
            </Text>
            <Text style={styles.tripDetailText}>
              Contact: {trip.contact}
            </Text>
            <Text style={styles.tripDetailText}>
              Pickup: {trip.pickupLocation} | Dropoff: {trip.dropoffLocation}
            </Text>
            <Text style={styles.tripDetailText}>Cost: R{trip.cost}</Text>
            <Text style={styles.tripDetailText}>
              Duration: {trip.minutes} minutes
            </Text>
          </View>
        ))}
      </View>

      {/* Cancelled Trips Section */}
      <View style={[styles.card, styles.cancelledSection]}>
        <Text style={[styles.cardTitle, styles.cancelledTitle]}>Cancelled Trips</Text>
        {cancelledTripsDetails.map((trip, index) => (
          <View key={index} style={styles.tripDetail}>
            <Text style={styles.tripDetailTitle}>
              {trip.customer} (Cancelled Trip)
            </Text>
            <Text style={styles.tripDetailText}>
              Contact: {trip.contact}
            </Text>
            <Text style={styles.tripDetailText}>
              Pickup: {trip.pickupLocation} | Dropoff: {trip.dropoffLocation}
            </Text>
            <Text style={styles.tripDetailText}>Cost: R{trip.cost}</Text>
            <Text style={styles.tripDetailText}>
              Duration: {trip.minutes} minutes
            </Text>
          </View>
        ))}
      </View>

      {/* View More Button */}
      <TouchableOpacity
        style={styles.viewMoreButton}
        onPress={() => console.log("View More clicked")}
      >
        <Text style={styles.viewMoreText}>View More</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f4f4f4",
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  statValue: {
    fontWeight: "bold",
    color: "#333",
  },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completedTrips: {
    color: "green",
    fontWeight: "bold",
  },
  cancelledTrips: {
    color: "red",
    fontWeight: "bold",
  },
  completedSection: {
    backgroundColor: "#e8f5e9", // Light green background for completed trips
    borderColor: "#4caf50", // Green border
  },
  cancelledSection: {
    backgroundColor: "#ffebee", // Light red background for cancelled trips
    borderColor: "#f44336", // Red border
  },
  completedTitle: {
    color: "#4caf50", // Green title for completed trips
  },
  cancelledTitle: {
    color: "#f44336", // Red title for cancelled trips
  },
  tripDetail: {
    marginBottom: 15,
  },
  tripDetailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  tripDetailText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  viewMoreButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  viewMoreText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
});

export default TripHistory;






