"use client"

import React, { useState, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
const { width } = Dimensions.get("window")

// Simple calendar component
const Calendar = ({ onSelectDate, onClose, selectedDate }) => {

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(selectedDate ? new Date(selectedDate) : null)

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleSelectDay = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDay(date)

    // Format as YYYY-MM-DD
    const formattedDate = date.toISOString().split("T")[0]
    onSelectDate(formattedDate)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
    const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected =
        selectedDay &&
        selectedDay.getDate() === day &&
        selectedDay.getMonth() === currentMonth.getMonth() &&
        selectedDay.getFullYear() === currentMonth.getFullYear()

      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === currentMonth.getMonth() &&
        new Date().getFullYear() === currentMonth.getFullYear()

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.selectedDay, isToday && styles.todayDay]}
          onPress={() => handleSelectDay(day)}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.selectedDayText, isToday && styles.todayDayText]}>
            {day}
          </Text>
        </TouchableOpacity>,
      )
    }

    return days
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavButton}>
          <Ionicons name="chevron-back" size={24} color="#0DCAF0" />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavButton}>
          <Ionicons name="chevron-forward" size={24} color="#0DCAF0" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayHeader}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
          <Text key={index} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

      <View style={styles.calendarFooter}>
        <TouchableOpacity style={styles.calendarButton} onPress={onClose}>
          <Text style={styles.calendarButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const HelicopterQuoteForm = ({ navigation }) => {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  const [form, setForm] = useState({
    flightDate: "",
    numberOfPassengers: "",
    passengerWeights: "",
    luggageWeight: "",
    departurePoint: "",
    destination: "",
    isReturnFlight: "",
    waitingTime: "",
  })

  const [focused, setFocused] = useState(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const [showCalendar, setShowCalendar] = useState(false)

  // Animation on component mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value })
  }

  const handleFocus = (inputName) => {
    setFocused(inputName)
  }

  const handleBlur = () => {
    setFocused(null)
  }

  const handleSubmit = () => {
    // Validate form
    const requiredFields = ["flightDate", "numberOfPassengers", "departurePoint", "destination"]
    const missingFields = requiredFields.filter((field) => !form[field])

    if (missingFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields.")
      return
    }

    // Add submission animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    // Add submission logic here (e.g., API call)
    setTimeout(() => {
      Alert.alert("Quote Request Submitted", "We will contact you shortly with your helicopter charter quote!")
      console.log(form)

      // Reset form after successful submission
      setForm({
        flightDate: "",
        numberOfPassengers: "",
        passengerWeights: "",
        luggageWeight: "",
        departurePoint: "",
        destination: "",
        isReturnFlight: "",
        waitingTime: "",
      })
    }, 600)
  }

  const getInputStyle = (inputName) => {
    return [styles.input, focused === inputName && styles.inputFocused, form[inputName] ? styles.inputFilled : null]
  }

  // Custom dropdown component that doesn't rely on external libraries
  const CustomDropdown = ({ options, placeholder, value, onSelect, name }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={[styles.dropdownButton, value ? styles.inputFilled : null]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={value ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>{value || placeholder}</Text>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(name, option.value)
                  setIsOpen(false)
                }}
              >
                <Text style={[styles.dropdownOptionText, value === option.value && styles.dropdownOptionSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
           <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
              <Icon type="material-community" name="menu" color="#000" size={22} />
            </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={["#0DCAF0", "#0AA8CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerIconContainer}>
              <FontAwesome5 name="helicopter" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.heading}>Helicopter Charter Quote</Text>
          </LinearGradient>

          {/* Form Fields */}
          <View style={styles.formFields}>
            {/* Flight Date with Calendar Icon */}
            <View style={styles.inputGroup}>
              <TouchableOpacity style={styles.inputIcon} onPress={() => setShowCalendar(true)}>
                <FontAwesome name="calendar" size={20} color="#0DCAF0" />
              </TouchableOpacity>
              <TextInput
                placeholder="Flight Date *"
                placeholderTextColor="#94A3B8"
                style={getInputStyle("flightDate")}
                value={form.flightDate}
                onChangeText={(text) => handleChange("flightDate", text)}
                onFocus={() => handleFocus("flightDate")}
                onBlur={handleBlur}
                editable={false} // Make it non-editable
                onTouchStart={() => setShowCalendar(true)} // Open calendar on touch
              />
            </View>

            {/* Number of Passengers as regular input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="people" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Number of Passengers *"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={getInputStyle("numberOfPassengers")}
                value={form.numberOfPassengers}
                onChangeText={(text) => handleChange("numberOfPassengers", text)}
                onFocus={() => handleFocus("numberOfPassengers")}
                onBlur={handleBlur}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="weight" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Passenger Weights (comma separated)"
                placeholderTextColor="#94A3B8"
                style={getInputStyle("passengerWeights")}
                value={form.passengerWeights}
                onChangeText={(text) => handleChange("passengerWeights", text)}
                onFocus={() => handleFocus("passengerWeights")}
                onBlur={handleBlur}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="bag-checked" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Total Luggage Weight (kg)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={getInputStyle("luggageWeight")}
                value={form.luggageWeight}
                onChangeText={(text) => handleChange("luggageWeight", text)}
                onFocus={() => handleFocus("luggageWeight")}
                onBlur={handleBlur}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="location" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Departure Point *"
                placeholderTextColor="#94A3B8"
                style={getInputStyle("departurePoint")}
                value={form.departurePoint}
                onChangeText={(text) => handleChange("departurePoint", text)}
                onFocus={() => handleFocus("departurePoint")}
                onBlur={handleBlur}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="flag" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Destination *"
                placeholderTextColor="#94A3B8"
                style={getInputStyle("destination")}
                value={form.destination}
                onChangeText={(text) => handleChange("destination", text)}
                onFocus={() => handleFocus("destination")}
                onBlur={handleBlur}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="swap-horizontal" size={20} color="#0DCAF0" />
              </View>
              <CustomDropdown
                options={[
                  { label: "One Way", value: "One Way" },
                  { label: "Return", value: "Return" },
                ]}
                placeholder="One Way or Return?"
                value={form.isReturnFlight}
                onSelect={handleChange}
                name="isReturnFlight"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="time" size={20} color="#0DCAF0" />
              </View>
              <TextInput
                placeholder="Waiting Time at Destination (minutes)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={getInputStyle("waitingTime")}
                value={form.waitingTime}
                onChangeText={(text) => handleChange("waitingTime", text)}
                onFocus={() => handleFocus("waitingTime")}
                onBlur={handleBlur}
              />
            </View>
          </View>

          <Text style={styles.requiredText}>* Required fields</Text>

          {/* Submit Button */}
          <TouchableOpacity activeOpacity={0.8} style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={["#0DCAF0", "#0AA8CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>Request Quote</Text>
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Helivate - Premium Helicopter Charter Services</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Calendar
              onSelectDate={(date) => {
                handleChange("flightDate", date)
                setShowCalendar(false)
              }}
              onClose={() => setShowCalendar(false)}
              selectedDate={form.flightDate}
            />
          </View>
        </View>
      </Modal>
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </KeyboardAvoidingView>
    
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  header: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  formFields: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    width: 40,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 15,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  inputFocused: {
    backgroundColor: "#E0F7FA",
    borderWidth: 1,
    borderColor: "#0DCAF0",
  },
  inputFilled: {
    backgroundColor: "#F0FDFA",
  },
  requiredText: {
    fontSize: 12,
    color: "#94A3B8",
    marginLeft: 20,
    marginBottom: 20,
    fontStyle: "italic",
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#64748B",
  },
  // Dropdown styles
  dropdownContainer: {
    flex: 1,
    position: "relative",
  },
  dropdownButton: {
    flex: 1,
    height: 46,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 15,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownPlaceholder: {
    color: "#94A3B8",
    fontSize: 15,
  },
  dropdownSelectedText: {
    color: "#0F172A",
    fontSize: 15,
  },
  dropdownOptions: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: "#0F172A",
  },
  dropdownOptionSelected: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  // Calendar Styles
  calendarContainer: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  calendarNavButton: {
    padding: 8,
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    width: 40,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calendarDay: {
    width: "14.28%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 14,
    color: "#0F172A",
  },
  selectedDay: {
    backgroundColor: "#0DCAF0",
    borderRadius: 20,
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  todayDay: {
    borderWidth: 1,
    borderColor: "#0DCAF0",
    borderRadius: 20,
  },
  todayDayText: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
  calendarFooter: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  calendarButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      },
  
  calendarButtonText: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
})

export default HelicopterQuoteForm
