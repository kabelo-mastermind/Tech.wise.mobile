"use client"

import { useEffect, useState } from "react"

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native"

import { BarChart, LineChart } from "react-native-chart-kit"
import { useFonts } from "expo-font"
import { Icon } from "react-native-elements"
import { useDispatch, useSelector } from "react-redux"
import CustomDrawer from "../components/CustomDrawer"

// Import functions from timeTracker file
import { formatSecondsToTimeString, MAX_TIME_PER_DAY_SECONDS } from "../utils/timeTracker"
import axios from "axios"
import { api } from "../../api"
import { setSelectedRequest } from "../redux/actions/tripActions"
import AllCustomAlert from "../components/AllCustomAlert"

const screenWidth = Dimensions.get("window").width

// Updated chart config for light theme
const lightChartConfig = {
  backgroundColor: "#FFFFFF",
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(13, 202, 240, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: "#0DCAF0",
  },
}

const DriverStats = ({ navigation, route }) => {
  // Basic state management
  const [view, setView] = useState("daily")
  const [animationValue] = useState(new Animated.Value(1))
  const [isOnline, setIsOnline] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  const state = route.params?.state ?? { newState: "offline" } // fallback if missing
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [session_id, setSessionId] = useState(null) // State to store session_id

  // Modal state for detailed views
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)

  const dispatch = useDispatch()

  // User data from state
  const user = useSelector((state) => state.auth.user || "")
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const profilePicture = useSelector((state) => state.auth.user?.profile_picture || "N/A")
  const [customerData, setCustomerData] = useState(null)
  console.log("profilePicture from redux:", profilePicture);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  const showAlert = ({ title, message, type = "info" }) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };
  const hideAlert = () => setAlertVisible(false);
  useEffect(() => {
    if (!user_id) return
    const fetchCustomer = async () => {

      try {
        const res = await axios.get(api + `customer/${user_id}`)
        setCustomerData(res.data)

      } catch (err) {
        showAlert({
          title: "Error",
          message:
            "Failed to fetch your profile information. Please check your internet connection and try again.",
          type: "error",
        });
      } finally {
        console.log("Customer data fetched successfully")
      }
    }

    fetchCustomer()
  }, [user_id])
  // time tracking functions (start)
  // ----------------------------------------------------------------------------
  // getting total worked time today
  useEffect(() => {
    if (!user_id) {
      console.log("User is not logged in or user_id is missing, skipping total worked today fetch")
      return
    }

    axios
      .get(api + `driver/totalWorkedToday/${user_id}`)
      .then((res) => setTotalSeconds(res.data.totalSeconds))
      .catch((err) => console.error(err))
  }, [user_id, state])

  console.log("Total worked time today:", totalSeconds)

  // start session function to get session_id
  const startSession = async () => {
    if (!user_id) {
      showAlert({
        title: "Not Logged In",
        message: "You need to be logged in to start a session.",
        type: "error",
      });
      return null;
    }

    try {
      const response = await axios.post(api + "driver/startSession", {
        userId: user_id,
      });

      if (response.status === 200) {
        return response.data;
      } else {
        showAlert({
          title: "Unexpected Response",
          message: "We received an unexpected response from the server. Please try again.",
          type: "error",
        });
        return null;
      }
    } catch (error) {
      showAlert({
        title: "Error",
        message:
          "Failed to start your session. Please check your internet connection and try again.",
        type: "error",
      });
      return null;
    }
  };

  // Function to check and go online
  const checkAndGoOnline = async () => {
    if (!user_id) {
      console.log("User is not logged in or user_id is missing, skipping check and go online")
      return
    }

    try {
      // 3️⃣ If approved → proceed with session and set online
      const sessionResponse = await startSession()
      const session_id = sessionResponse?.session_id
      setSessionId(session_id)

      if (!session_id) {
        // console.error("No session_id returned from startSession")
        showAlert({
          title: "Error",
          message: "No session_id returned from startSession. Please try again.",
          type: "error",
        })
        return
      }

      const response = await axios.put(api + "driver/updateStatus", {
        userId: user_id,
        state: "online",
      })

      if (response.status === 200) {
        if (response.data.alreadyOnline) {
          console.log("Driver is already online, navigating...")
        } else {
          console.log("Driver status updated to online")
        }

        navigation.navigate("PendingRequests")
        dispatch(setSelectedRequest({ session_id: session_id }))
      }
    } catch (error) {
      // console.error("Error updating driver status:", error)
      showAlert({
        title: "Error",
        message: "Something went wrong while trying to go online. Please try again.",
        type: "error",
      })
    }
  }

  // 1️⃣ Function to check driver approval status
  // 1️⃣ Function to check driver approval status
  const checkDriverApproval = async () => {
    if (!user_id) return false; // No user, cannot go online

    try {
      const stateResponse = await axios.get(`${api}getDriverState`, {
        params: { userId: user_id },
      });

      const { status } = stateResponse.data;

      if (status !== "approved") {
        // User exists but not yet approved
        showAlert({
          title: "Account Under Review",
          message:
            "Your account is still under review. Please ensure all required documents are uploaded and wait for approval from the support team before going online to accept ride requests.",
          type: "error",
        });
        return false;
      }

      return true; // Approved
    } catch (error) {
      // console.error("Error checking driver status:", error);

      // Handle driver not found (404) separately
      if (error.response && error.response.status === 404) {
        showAlert({
          title: "Documents Required",
          message:
            "We couldn't find your driver profile. Please upload all required documents first. Once submitted, wait for the support team to approve your account before going online.",
          type: "error",
        });
        return false;
      }

      // Other errors
      showAlert({
        title: "Error",
        message:
          "Something went wrong while verifying your account status. Please try again later.",
        type: "error",
      });
      return false;
    }
  };

  // 2️⃣ Main function to handle going online
  const handleGoOnline = async () => {
    animateButton();

    const isApproved = await checkDriverApproval();
    if (!isApproved) {
      setIsOnline(false);
      return;
    }

    setIsOnline(true);
    await checkAndGoOnline();
  };

  // time tracking functions (end)
  // ----------------------------------------------------------------------------

  const [documentsFound, setDocumentsFound] = useState(true)

  const [fontsLoaded] = useFonts({
    AbrilFatface: require("../../assets/fonts/AbrilFatface-Regular.ttf"),
  })

  // Simple animation for the button
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(animationValue, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Calculate percentage of time used
  const timeUsedPercentage = Math.min(100, (totalSeconds / MAX_TIME_PER_DAY_SECONDS) * 100)

  // driver stats functions (start)
  // -------------------------------------------------------
  const [stats, setStats] = useState({
    daily: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
    weekly: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
    monthly: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
  })

  // Store previous stats for trend calculation
  const [previousStats, setPreviousStats] = useState({
    daily: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
    weekly: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
    monthly: { ridesAccepted: 0, ridesDeclined: 0, earnings: "R0", ratings: "0.0", total_trips: 0 },
  })

  const [loadingStats, setLoadingStats] = useState(true)
  const [errorStats, setErrorStats] = useState(null)

  // Fetch driver stats from the API and update them on dashboard
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | undefined

    const fetchDriverStats = async () => {
      if (!user_id || user_id === "") {
        showAlert({
          title: "Error",
          message: "Cannot fetch stats because your account is not recognized. Please log in again.",
          type: "error",
        });
        return;
      }


      setLoadingStats(true)
      setErrorStats(null)

      try {
        const res = await axios.get(`${api}driver/stats/${user_id}`)
        const data = res.data
        const today = new Date()

        setPreviousStats(stats)

        // Helper functions
        const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString()
        const isSameWeek = (d1, d2) => {
          const start = new Date(d2)
          start.setDate(start.getDate() - start.getDay())
          const end = new Date(start)
          end.setDate(end.getDate() + 6)
          return d1 >= start && d1 <= end
        }
        const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()

        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - 7)
        const lastMonthStart = new Date(today)
        lastMonthStart.setMonth(today.getMonth() - 1)

        const filterTrips = (fn) => data.filter((t) => t.requestDate && fn(new Date(t.requestDate)))

        const fetchEarnings = async (trips) => {
          let earnings = 0
          await Promise.all(
            trips
              .filter((t) => t.payment_status === "paid")
              .map(async (trip) => {
                try {
                  const res = await axios.get(`${api}payment/${trip.tripId}`)
                  earnings += Number.parseFloat(res.data.amount || 0)
                } catch (err) {
                  console.warn(`Failed to fetch payment for trip ${trip.tripId}`, err)
                }
              }),
          )
          return earnings
        }

        const aggregateStats = async (trips) => {
          const ridesAccepted = trips.filter((t) => t.statuses === "completed").length;
          const ridesDeclined = trips.filter((t) => t.statuses === "canceled").length;

          const ratings = trips
            .filter((t) => t.driver_ratings !== null)
            .map((t) => Number.parseFloat(t.driver_ratings));
          console.log("Driver ratings raw values:", trips.map(t => t.driver_ratings));

          const avgRating = ratings.length > 0
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
            : "0.0";

          const earnings = await fetchEarnings(trips);

          return {
            ridesAccepted,
            ridesDeclined,
            earnings: `R${earnings.toFixed(2)}`,
            ratings: `${avgRating}/5`,
            total_trips: ridesAccepted + ridesDeclined,
          };
        };

        const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
          aggregateStats(filterTrips((d) => isSameDay(d, today))),
          aggregateStats(filterTrips((d) => isSameWeek(d, today))),
          aggregateStats(filterTrips((d) => isSameMonth(d, today))),
        ])

        const [prevDailyStats, prevWeeklyStats, prevMonthlyStats] = await Promise.all([
          aggregateStats(filterTrips((d) => isSameDay(d, yesterday))),
          aggregateStats(
            data.filter((t) => {
              const date = new Date(t.requestDate)
              return date >= lastWeekStart && date < today
            }),
          ),
          aggregateStats(filterTrips((d) => isSameMonth(d, lastMonthStart))),
        ])

        setStats({
          daily: dailyStats,
          weekly: weeklyStats,
          monthly: monthlyStats,
        })

        setPreviousStats({
          daily: prevDailyStats,
          weekly: prevWeeklyStats,
          monthly: prevMonthlyStats,
        })

        setLoadingStats(false)
      } catch (err) {
        setErrorStats("Failed to load stats, retrying...");

        showAlert({
          title: "Error",
          message:
            "Failed to load your stats. We will retry automatically in a few seconds. Please check your internet connection.",
          type: "error",
        });

        setLoadingStats(false);

        // Retry after 3 seconds
        retryTimeout = setTimeout(fetchDriverStats, 3000);
      }

    }

    // Only run if user_id exists
    if (user_id && user_id !== "") {
      fetchDriverStats()
    }

    return () => clearTimeout(retryTimeout)
  }, [user_id])

  // Calculate trend percentage
  const calculateTrend = (current, previous, isRating = false) => {
    if (isRating) {
      // Handle ratings differently
      if (current === "N/A/5" || previous === "N/A/5") return "N/A"
      const currentRating = Number.parseFloat(current.split("/")[0])
      const previousRating = Number.parseFloat(previous.split("/")[0])
      if (isNaN(currentRating) || isNaN(previousRating) || previousRating === 0) return "+0.0"
      const difference = currentRating - previousRating
      return difference >= 0 ? `+${difference.toFixed(1)}` : `${difference.toFixed(1)}`
    } else {
      // Handle numeric values
      const currentValue =
        typeof current === "string" && current.startsWith("R")
          ? Number.parseFloat(current.substring(1))
          : Number.parseFloat(current)
      const previousValue =
        typeof previous === "string" && previous.startsWith("R")
          ? Number.parseFloat(previous.substring(1))
          : Number.parseFloat(previous)

      if (isNaN(currentValue) || isNaN(previousValue) || previousValue === 0) {
        return currentValue > 0 ? "+100%" : "0%"
      }

      const percentChange = ((currentValue - previousValue) / previousValue) * 100
      return percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`
    }
  }

  // Calculate completion rate
  const calculateCompletionRate = (timeframe) => {
    const { ridesAccepted = 0, total_trips = 0 } = stats[timeframe] || {}
    if (total_trips === 0) return "0%"
    return `${Math.round((ridesAccepted / total_trips) * 100)}%`
  }

  // Calculate completion rate trend
  const calculateCompletionTrend = (timeframe) => {
    const current = stats[timeframe] || {}
    const previous = previousStats[timeframe] || {}
    const currentRate = current.total_trips > 0 ? (current.ridesAccepted / current.total_trips) * 100 : 0
    const previousRate = previous.total_trips > 0 ? (previous.ridesAccepted / previous.total_trips) * 100 : 0

    if (previousRate === 0) return currentRate > 0 ? "+100%" : "0%"
    const percentChange = currentRate - previousRate
    return percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`
  }

  // Add this function after the calculateCompletionTrend function and before the if (!fontsLoaded) check
  // Generate chart data with days of the week
  const generateWeeklyChartData = () => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    // Generate random data between 0-100 for each day if no real data is available
    // In a real app, you would map this to actual earnings data
    const generateDataPoints = () => {
      const currentStats = stats[view] || {}
      const earnings = Number.parseFloat((currentStats.earnings || "R0").replace("R", "")) || 0
      // Scale earnings to be within 0-100 range for visualization
      const baseValue = Math.min(earnings * 2, 80) // Use earnings as a base, cap at 80

      return daysOfWeek.map((_, index) => {
        // Create a pattern that varies around the base value
        const variance = Math.random() * 20 - 10 // Random variance between -10 and +10
        return Math.max(0, Math.min(100, baseValue + variance)) // Ensure between 0-100
      })
    }


    return {
      labels: daysOfWeek,
      datasets: [
        {
          data: generateDataPoints(),
          color: (opacity = 1) => `rgba(13, 202, 240, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ["Earnings"],
    }
  }

  // Function to handle card press and show details
  const handleCardPress = (cardType) => {
    setSelectedDetail(cardType)
    setDetailModalVisible(true)
  }

  // Function to render detailed modal content
  const renderDetailModal = () => {
    const currentStats = stats[view] || {}
    const prevStats = previousStats[view] || {}

    let modalContent = null

    switch (selectedDetail) {
      case "rides":
        modalContent = (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rides Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" type="material" color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Current Period ({view})</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Trips</Text>
                <Text style={styles.detailValue}>{currentStats.total_trips || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rides Accepted</Text>
                <Text style={styles.detailValue}>{currentStats.ridesAccepted || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rides Declined</Text>
                <Text style={styles.detailValue}>{currentStats.ridesDeclined || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Acceptance Rate</Text>
                <Text style={styles.detailValue}>{calculateCompletionRate(view)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Trend Analysis</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Change from Previous Period</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: calculateTrend(currentStats.total_trips || 0, prevStats.total_trips || 0).startsWith("+")
                        ? "#10B981"
                        : "#F43F5E",
                    },
                  ]}
                >
                  {calculateTrend(currentStats.total_trips || 0, prevStats.total_trips || 0)}
                </Text>
              </View>
            </View>
          </View>
        )
        break

      case "earnings":
        modalContent = (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Earnings Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" type="material" color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Current Period ({view})</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Earnings</Text>
                <Text style={styles.detailValue}>{currentStats.earnings || "R0.00"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Average per Trip</Text>
                <Text style={styles.detailValue}>
                  {currentStats.total_trips > 0
                    ? `R${(Number.parseFloat((currentStats.earnings || "R0").replace("R", "")) / currentStats.total_trips).toFixed(2)}`
                    : "R0.00"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed Trips</Text>
                <Text style={styles.detailValue}>{currentStats.ridesAccepted || 0}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Trend Analysis</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Change from Previous Period</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: calculateTrend(currentStats.earnings || "R0.00", prevStats.earnings || "R0.00").startsWith(
                        "+",
                      )
                        ? "#10B981"
                        : "#F43F5E",
                    },
                  ]}
                >
                  {calculateTrend(currentStats.earnings || "R0.00", prevStats.earnings || "R0.00")}
                </Text>
              </View>
            </View>
          </View>
        )
        break

      case "rating":
        modalContent = (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rating Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" type="material" color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Current Period ({view})</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Average Rating</Text>
                <Text style={styles.detailValue}>{currentStats.ratings || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Rated Trips</Text>
                <Text style={styles.detailValue}>{currentStats.ridesAccepted || 0}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Rating Breakdown</Text>
              <View style={styles.ratingBreakdown}>
                {[5, 4, 3, 2, 1].map((star) => (
                  <View key={star} style={styles.ratingRow}>
                    <View style={styles.starContainer}>
                      {[...Array(star)].map((_, i) => (
                        <Icon key={i} name="star" type="material" color="#FFD700" size={16} />
                      ))}
                      {[...Array(5 - star)].map((_, i) => (
                        <Icon key={i} name="star-border" type="material" color="#E5E7EB" size={16} />
                      ))}
                    </View>
                    <View style={styles.ratingBar}>
                      <View style={[styles.ratingBarFill, { width: `${Math.random() * 100}%` }]} />
                    </View>
                    <Text style={styles.ratingPercentage}>{Math.floor(Math.random() * 30)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Trend Analysis</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Change from Previous Period</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: calculateTrend(
                        currentStats.ratings || "N/A/5",
                        prevStats.ratings || "N/A/5",
                        true,
                      ).startsWith("+")
                        ? "#10B981"
                        : "#F43F5E",
                    },
                  ]}
                >
                  {calculateTrend(currentStats.ratings || "N/A/5", prevStats.ratings || "N/A/5", true)}
                </Text>
              </View>
            </View>
          </View>
        )
        break

      case "completed":
        modalContent = (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Completion Rate Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" type="material" color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Current Period ({view})</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completion Rate</Text>
                <Text style={styles.detailValue}>{calculateCompletionRate(view)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed Trips</Text>
                <Text style={styles.detailValue}>{currentStats.ridesAccepted || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Requests</Text>
                <Text style={styles.detailValue}>{currentStats.total_trips || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Declined Requests</Text>
                <Text style={styles.detailValue}>{currentStats.ridesDeclined || 0}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Performance Insights</Text>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  {calculateCompletionRate(view) === "100%"
                    ? "Excellent! You're completing all your ride requests."
                    : Number.parseFloat(calculateCompletionRate(view)) >= 80
                      ? "Great job! You have a high completion rate."
                      : Number.parseFloat(calculateCompletionRate(view)) >= 60
                        ? "Good performance. Consider accepting more rides to improve your rate."
                        : "There's room for improvement. Try to accept more ride requests."}
                </Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Trend Analysis</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Change from Previous Period</Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: calculateCompletionTrend(view).startsWith("+") ? "#10B981" : "#F43F5E" },
                  ]}
                >
                  {calculateCompletionTrend(view)}
                </Text>
              </View>
            </View>
          </View>
        )
        break

      default:
        modalContent = null
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>{modalContent}</ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  if (!fontsLoaded || loadingStats) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoWrapper}>
          <ActivityIndicator
            size={100} // bigger spinner
            color="#0DCAF0"
            style={styles.spinnerBehind}
          />
          <Image
            source={require('../../assets/nthomeLogo.png')}
            style={styles.logo}
          />
        </View>
        <Text style={styles.loadingText_slogan}>{"Nthome ka petjana!"}</Text>
        <Text style={styles.loadingText}>{errorStats || "Loading stats..."}</Text>
      </View>


    )
  }

  const currentStats = stats[view] || {} // ensures we get current selected view's stats
  const prevStats = previousStats[view] || {} // get previous stats for the same view

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#4B5563" size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Driver Dashboard</Text>

        <TouchableOpacity onPress={() => navigation.navigate('DriverProfile')}>
          <Image
            source={
              profilePicture && profilePicture !== "N/A"
                ? { uri: profilePicture }
                : require('../../assets/placeholder.jpg')
            }
            style={styles.profileImage}
          />

        </TouchableOpacity>
      </View>


      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {documentsFound ? (
          <>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCard} onPress={() => handleCardPress("rides")} activeOpacity={0.7}>
                <Text style={styles.statLabel}>Rides</Text>
                <Text style={styles.statValue}>{currentStats.total_trips || 0}</Text>
                <Text style={styles.statTrend}>
                  {calculateTrend(currentStats.total_trips || 0, prevStats.total_trips || 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, styles.activeCard]}
                onPress={() => handleCardPress("earnings")}
                activeOpacity={0.7}
              >
                <Text style={[styles.statLabel, styles.activeCardText]}>Earnings</Text>
                <Text style={[styles.statValue, styles.activeCardText]}>{currentStats.earnings || "R0.00"}</Text>
                <Text style={[styles.statTrend, styles.activeCardText]}>
                  {calculateTrend(currentStats.earnings || "R0.00", prevStats.earnings || "R0.00")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCard} onPress={() => handleCardPress("rating")} activeOpacity={0.7}>
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>
                  {currentStats.ratings ? currentStats.ratings.split("/")[0] : "N/A"}
                </Text>
                <Text style={styles.statTrend}>
                  {calculateTrend(currentStats.ratings || "N/A/0", prevStats.ratings || "N/A/0", true)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => handleCardPress("completed")}
                activeOpacity={0.7}
              >
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{calculateCompletionRate(view)}</Text>
                <Text
                  style={[
                    styles.statTrend,
                    { color: calculateCompletionTrend(view).startsWith("+") ? "#10B981" : "#F43F5E" },
                  ]}
                >
                  {calculateCompletionTrend(view)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusHeaderLeft}>
                  <View style={[styles.statusIndicator, isOnline ? styles.onlineIndicator : styles.offlineIndicator]} />
                  <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
                </View>
                <Text style={styles.statusHeaderRight}>
                  {formatSecondsToTimeString(Math.max(0, MAX_TIME_PER_DAY_SECONDS - totalSeconds))} left
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${timeUsedPercentage}%` }]} />
              </View>
              <View style={styles.timeDetailsGrid}>
                <View style={styles.timeDetailItem}>
                  <Text style={styles.timeDetailLabel}>Daily Limit</Text>
                  <Text style={styles.timeDetailValue}>{formatSecondsToTimeString(MAX_TIME_PER_DAY_SECONDS)}</Text>
                </View>
                <View style={styles.timeDetailItem}>
                  <Text style={styles.timeDetailLabel}>Worked Today</Text>
                  <Text style={styles.timeDetailValue}>{formatSecondsToTimeString(totalSeconds)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.tabContainer}>
                {["daily", "weekly", "monthly"].map((timeframe) => (
                  <TouchableOpacity
                    key={timeframe}
                    style={[styles.tabButton, view === timeframe && styles.activeTabButton]}
                    onPress={() => setView(timeframe)}
                  >
                    <Text style={[styles.tabText, view === timeframe && styles.activeTabText]}>
                      {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.statsDetailCard}>
              <Text style={styles.statsDetailTitle}>Trip Statistics</Text>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Total Trips</Text>
                <Text style={styles.statsDetailValue}>{currentStats.total_trips || 0}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Rides Accepted</Text>
                <Text style={styles.statsDetailValue}>{currentStats.ridesAccepted || 0}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Rides Declined</Text>
                <Text style={styles.statsDetailValue}>{currentStats.ridesDeclined || 0}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Acceptance Rate</Text>
                <Text style={styles.statsDetailValue}>{calculateCompletionRate(view)}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Total Earnings</Text>
                <Text style={styles.statsDetailValue}>{currentStats.earnings || "R0.00"}</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Earnings Trend</Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                style={styles.chartScrollView}
                contentContainerStyle={styles.chartScrollContent}
              >
                <LineChart
                  data={generateWeeklyChartData()}
                  width={Math.max(screenWidth - 40, 350)} // Minimum width of 350 for small screens
                  height={220}
                  chartConfig={{
                    ...lightChartConfig,
                    // Ensure y-axis shows 0-100
                    min: 0,
                    max: 100,
                    // Add y-axis labels
                    yAxisSuffix: "",
                    yAxisInterval: 20,
                    // Format y-axis labels
                    formatYLabel: (value) => `${value}`,
                    // Ensure proper grid lines
                    count: 6, // 0, 20, 40, 60, 80, 100
                  }}
                  bezier
                  withInnerLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  style={styles.chart}
                />
              </ScrollView>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Device Traffic</Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                style={styles.chartScrollView}
                contentContainerStyle={styles.chartScrollContent}
              >
                <BarChart
                  data={{
                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    datasets: [
                      {
                        data: [20, 45, 28, 80, 99, 43, 50],
                      },
                    ],
                  }}
                  width={Math.max(screenWidth - 40, 350)} // Minimum width of 350 for small screens
                  height={220}
                  chartConfig={lightChartConfig}
                  fromZero
                  showBarTops={false}
                  showValuesOnTopOfBars={false}
                  withInnerLines={false}
                  style={styles.chart}
                />
              </ScrollView>
            </View>
          </>
        ) : (
          <View style={styles.uploadDocumentsContainer}>
            <Icon name="file-document-outline" type="material-community" size={60} color="#0DCAF0" />
            <Text style={styles.uploadDocumentsTitle}>Documents Required</Text>
            <Text style={styles.uploadDocumentsText}>Please upload your documents to start accepting rides.</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.goOnlineButtonContainer}>
        <Animated.View style={{ transform: [{ scale: animationValue }] }}>
          <TouchableOpacity
            style={[styles.goOnlineButton, isOnline && styles.goOfflineButton]}
            onPress={handleGoOnline}
          >
            <Text style={styles.goOnlineText}>{"Go Online"}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />

      {/* Detail Modal */}
      {renderDetailModal()}
      {/* CustomAlert */}
      <AllCustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        hideAlert={hideAlert}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    // marginTop: 16,
    top: -30,
    fontSize: 16,
    color: "#4B5563",
  },
  loadingText_slogan: {
    // marginTop: 12,
    top: -40,
    fontSize: 16,
    fontStyle: "italic",
    color: "#4B5563",
  },
  spinnerBehind: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: "contain",
  },
  logoWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    marginBottom: 25,
    justifyContent: "center",
    alignItems: "center",
  },


  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    padding: 20,
    marginBottom: 80,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccc",
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  activeCard: {
    backgroundColor: "#0DCAF0", // Using the specified cyan color
  },
  activeCardText: {
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 14,
    color: "#10B981", // Green for positive trends
    fontWeight: "500",
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    overflow: "hidden",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  statusHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusHeaderRight: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0DCAF0",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  onlineIndicator: {
    backgroundColor: "#10B981", // Green
  },
  offlineIndicator: {
    backgroundColor: "#F43F5E", // Red
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0DCAF0", // Using the specified cyan color
  },
  timeDetailsGrid: {
    flexDirection: "row",
    padding: 16,
  },
  timeDetailItem: {
    flex: 1,
  },
  timeDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  timeDetailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: "#0DCAF0", // Using the specified cyan color
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  statsDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  statsDetailTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  statsDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statsDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  statsDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
    marginHorizontal: -8,
  },
  goOnlineButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  goOnlineButton: {
    backgroundColor: "#0DCAF0", // Using the specified cyan color
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  goOfflineButton: {
    backgroundColor: "#F43F5E", // Red for offline
  },
  goOnlineText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadDocumentsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 100,
  },
  uploadDocumentsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  uploadDocumentsText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: "#0DCAF0", // Using the specified cyan color
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  ratingBreakdown: {
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: "row",
    width: 100,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: "#0DCAF0",
  },
  ratingPercentage: {
    fontSize: 12,
    color: "#6B7280",
    width: 35,
    textAlign: "right",
  },
  insightCard: {
    backgroundColor: "#F0F9FF",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0DCAF0",
  },
  insightText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  chartScrollView: {
    marginHorizontal: -8,
  },
  chartScrollContent: {
    paddingHorizontal: 8,
  },
})

export default DriverStats
