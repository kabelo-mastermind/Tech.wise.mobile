"use client"

import React, { useEffect, useCallback, useState } from "react"

import { View, Text, TouchableOpacity, Animated, StyleSheet, Pressable, ScrollView } from "react-native"

import { useSelector } from "react-redux"

import Icon from "react-native-vector-icons/MaterialCommunityIcons"

import axios from "axios"

import { api } from "../../api"
import { Image } from "react-native"

const ACCENT = "#0DCAF0" // Define your accent color here

interface CustomDrawerProps {
  isOpen: boolean
  toggleDrawer: () => void
  navigation: any
}

const CustomDrawer: React.FC<CustomDrawerProps> = ({ isOpen, toggleDrawer, navigation }) => {
  const user = useSelector((state) => state.auth.user)

  const drawerWidth = 280

  const slideAnim = React.useRef(new Animated.Value(-drawerWidth)).current

  const user_id = user?.user_id // Ensure user_id is defined

  const animateDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -drawerWidth,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isOpen, slideAnim])

  useEffect(() => {
    animateDrawer()
  }, [isOpen, animateDrawer])

  const [customerRating, setRating] = useState(null) 

  // Fetch driver rating from the server
  useEffect(() => {
    if (!user_id) return // Ensure user_id is available before making the request

    const fetchCustomerRating = async () => {
     try {
  const res = await axios.get(`${api}/tripHistory/${user_id}`, {
    params: {
      driverId: user_id, // pass the driver's ID here
    },
  });

  const trips = res.data;

  // Filter out null, undefined, or 0 ratings
  const ratedTrips = trips.filter(
    (trip) => trip.driver_ratings !== null && Number(trip.driver_ratings) > 0
  );

  if (ratedTrips.length > 0) {
    const total = ratedTrips.reduce(
      (sum, trip) => sum + Number.parseFloat(trip.driver_ratings),
      0
    );
    const avg = total / ratedTrips.length;
    setRating(avg.toFixed(1)); // optional: round to 1 decimal
  } else {
    setRating(0); // match SQL’s "0" default
  }
} catch (err) {
  console.log("Error fetching customer rating:", err);
}
    }

    fetchCustomerRating()
  }, [user_id])

  // Function to render stars based on rating
  const renderStars = (rating) => {
    if (!rating || isNaN(rating)) {
      return (
        <View style={styles.starsContainer}>
          {[...Array(5)].map((_, i) => (
            <Icon key={i} name="star-outline" size={16} color="#E5E7EB" />
          ))}
          <Text style={styles.ratingValue}>0.0</Text>
        </View>
      )
    }

    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating - fullStars >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />)
      } else if (i === fullStars && halfStar) {
        stars.push(<Icon key={i} name="star-half-full" size={16} color="#FFD700" />)
      } else {
        stars.push(<Icon key={i} name="star-outline" size={16} color="#E5E7EB" />)
      }
    }

    return (
      <View style={styles.starsContainer}>
        {stars}
        <Text style={styles.ratingValue}>{Number(rating).toFixed(1)}</Text>
      </View>
    )
  }

  return (
    <>
      {isOpen && (
        <Pressable style={styles.overlay} onPress={toggleDrawer}>
          <View style={styles.overlayInner} />
        </Pressable>
      )}

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
          {/* Enhanced Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                <Image
                  source={ require('../../assets/nthomeLogo.png')}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>
                  {user ? `Hello, ${user.name.split(" ")[0]}!` : "Loading..."}
                </Text>
                <Text style={styles.subtitle}>Welcome back</Text>
                <Text style={styles.subtitle2}>Nthome ka petjana!</Text>
              </View>
            </View>


            {/* Enhanced Rating Section */}
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Icon name="star-circle" size={20} color={ACCENT} />
                <Text style={styles.ratingLabel}>Your Rating</Text>
              </View>
              <View style={styles.ratingContent}>
                {renderStars(customerRating)}
                <Text style={styles.ratingDescription}>
                  {customerRating && !isNaN(customerRating)
                    ? customerRating >= 4.5
                      ? "Excellent service!"
                      : customerRating >= 4.0
                        ? "Great performance!"
                        : customerRating >= 3.5
                          ? "Good work!"
                          : "Keep improving!"
                    : "No ratings yet"}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("DriverStats")}>
              <View style={styles.menuIconContainer}>
                <Icon name="view-dashboard" size={20} color={ACCENT} />
              </View>
              <Text style={styles.menuText}>Dashboard</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("My Profile")}>
              <View style={styles.menuIconContainer}>
                <Icon name="account-circle" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>My Profile</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Subscriptions")}>
              <View style={styles.menuIconContainer}>
                <Icon name="credit-card" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Subscriptions</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("DriverRewards")}>
              <View style={styles.menuIconContainer}>
                <Icon name="gift" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Driver Rewards</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("My Rides")}>
              <View style={styles.menuIconContainer}>
                <Icon name="car" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>My Rides</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("ViewDocuments")}>
              <View style={styles.menuIconContainer}>
                <Icon name="file-upload" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>View Documents</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("ViewCarDetails")}>
              <View style={styles.menuIconContainer}>
                <Icon name="car-info" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>View Car Documents</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("NthomeServicesScreen")}>
              <View style={styles.menuIconContainer}>
                <Icon name="wrench" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Services</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Support")}>
              <View style={styles.menuIconContainer}>
                <Icon name="lifebuoy" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Support</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("About")}>
              <View style={styles.menuIconContainer}>
                <Icon name="information" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>About</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => navigation.navigate("LogoutPage")}
            >
              <View style={styles.menuIconContainer}>
                <Icon name="logout" size={20} color="#F43F5E" />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
              <Icon name="chevron-right" size={16} color="#F43F5E" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 1,
  },
  overlayInner: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    backgroundColor: "#fff",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.0,
    elevation: 24,
  },
  drawerContent: {
    flex: 1,
  },
  // Enhanced Welcome Section Styles
  welcomeSection: {
    backgroundColor: "#F8FAFC",
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25, // Makes it circular
    resizeMode: 'cover',
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  subtitle2: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },
  // Enhanced Rating Section Styles
  ratingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  ratingContent: {
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: ACCENT,
    marginLeft: 8,
  },
  ratingDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Menu Section Styles
  menuSection: {
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
    marginHorizontal: 20,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: "#F43F5E",
  },
})

export default CustomDrawer
