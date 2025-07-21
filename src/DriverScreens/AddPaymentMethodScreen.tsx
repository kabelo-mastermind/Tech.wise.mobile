"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft } from "lucide-react-native"
import { useSelector } from "react-redux"
import axios from "axios"
import { Platform } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { api } from "../../api"

// Define theme colors
const THEME = {
  background: "#121212",
  card: "#1A1D26",
  primary: "#00D8F0", // Bright cyan
  text: {
    primary: "#FFFFFF",
    secondary: "#AAAAAA",
  },
  input: {
    background: "#2A2D36",
    border: "#3D4251",
    text: "#FFFFFF",
  },
  button: {
    primary: "#00D8F0",
    disabled: "rgba(0, 216, 240, 0.5)",
  },
}

export default function PaymentMethod({ navigation, route }) {
  const [saveCard, setSaveCard] = useState(true)
  const user = useSelector((state) => state.auth.user)
  const mastercardIcon = require("../../assets/mastercard.png")
  const visaIcon = require("../../assets/visa-credit-card.png")
  const [cardType, setCardType] = useState("Mastercard") // Default to Mastercard
  const user_id = user.user_id
  // State variables to store input values
  const [nameOnCard, setNameOnCard] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [ID_Number, setID_Number] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [countryCode, setCountryCode] = useState("ZA") // Default value is ZA
  const [paystackBanks, setPaystackBanks] = useState([])
  const [bankName, setBankName] = useState("") // State for bank name
  const [status, setStatus] = useState("") // State for status
  const [accountNumber, setAccountNumber] = useState("") // State for account number
  const [isVerified, setIsVerified] = useState(false) // State for verification status
  const { subaccount_code } = route.params // Destructure the exists prop from route.params
  // Determine which icon to show
  const cardIcon = cardType === "Visa" ? visaIcon : mastercardIcon

  // Fetch Paystack banks on component mount
  useEffect(() => {
    const fetchPaystackBanks = async () => {
      try {
        const response = await axios.get(
          api + "paystack-banks", // Call your server endpoint
        )
        setPaystackBanks(response.data)
      } catch (error) {
        console.error("Error fetching Paystack banks:", error)
        Alert.alert("Error", "Failed to load bank list. Check your server.")
      }
    }

    fetchPaystackBanks()
  }, [])
  const checkIfSubaccountExists = async () => {
    try {
      const response = await axios.get(api + `check-subaccount?user_id=${user_id}`);
      return response.data.exists; // backend returns { exists: true/false }
    } catch (err) {
      console.error("Error checking subaccount:", err);
      return false;
    }
  };


  // Function to create subaccount
  const handleSubmit = async () => {
    const exists = await checkIfSubaccountExists(); // 👈 fetch existence before submitting
    if (!nameOnCard || !cardNumber || !bankName || !bankCode || !countryCode) {
      Alert.alert("Error", "Please fill in all fields.")
      return
    }

    const payload = {
      business_name: nameOnCard,
      settlement_bank: bankName,
      account_number: cardNumber,
      bank_code: bankCode,
      percentage_charge: "3",
      user_id: user_id,
      subaccount_code: subaccount_code,
    }

    try {
      if (exists) {
        // 🔁 UPDATE SUBACCOUNT
        const updateResponse = await axios.put(api + "update-subaccount", payload, {
          headers: { "Content-Type": "application/json" },
        })

        if (updateResponse.status === 200) {
          console.log("Subaccount updated:", updateResponse.data)
          Alert.alert("Success", "Subaccount updated successfully")
          navigation.navigate("successPage", {
            user_id: user_id,
            status: updateResponse.data.status,
            account_number: cardNumber,
            is_verified: updateResponse.data.data?.is_verified,
            bank_code: bankCode,
            country_code: "ZA",
            account_name: nameOnCard,
            subaccountCode: updateResponse.data.data?.subaccount_code,
          })
        } else {
          console.log("Error updating subaccount:", updateResponse.data)
          Alert.alert("Error", "Failed to update subaccount.")
        }
      } else {
        // 🆕 CREATE SUBACCOUNT
        const createResponse = await axios.post(api + "create-subaccount", payload, {
          headers: { "Content-Type": "application/json" },
        })

        if (createResponse.status === 201) {
          const data = createResponse.data.data
          console.log("Subaccount created successfully:", data)

          navigation.navigate("successPage", {
            user_id: user_id,
            status: createResponse.data.status,
            account_number: data.account_number,
            is_verified: data.is_verified,
            bank_code: bankCode,
            country_code: "ZA",
            account_name: data.business_name,
            subaccountCode: data.subaccount_code,
          })
        } else {
          console.log("Create error response:", createResponse.data)
          Alert.alert("Error", "Failed to create subaccount.")
        }
      }
    } catch (error) {
      console.error("Error with subaccount operation:", error.response?.data || error)
      Alert.alert("Error", "An error occurred while processing the subaccount.")
    }
  }


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={THEME.primary} size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Add New Card</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardLabel}>{cardType}</Text>
                <Text style={styles.cardNumber}>{nameOnCard || user.name}</Text>
              </View>
              <Text style={styles.cardAmount}>Main</Text>
            </View>
            <Text style={styles.cardExpiry}>•••• •••• •••• {cardNumber.slice(-4) || "0000"}</Text>
            <View style={styles.cardChip}>
              <Image source={cardIcon} style={styles.cardIconLarge} resizeMode="contain" />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Card Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Card Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={cardType}
                style={styles.picker}
                dropdownIconColor={THEME.primary}
                onValueChange={(value) => setCardType(value)}
              >
                <Picker.Item label="Mastercard" value="Mastercard" color='#000' />
                <Picker.Item label="Visa" value="Visa" color='#000' />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First & Last Name</Text>
            <TextInput
              style={styles.input}
              value={nameOnCard}
              onChangeText={setNameOnCard}
              placeholderTextColor={THEME.text.secondary}
              selectionColor={THEME.primary}
            />
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>ID Number</Text>
            <TextInput
              style={styles.input}
              value={ID_Number}
              onChangeText={setID_Number}
              placeholderTextColor={THEME.text.secondary}
              selectionColor={THEME.primary}
              keyboardType="number-pad"
            />
          </View> */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                placeholder="e.g., 45805644..."
                placeholderTextColor={THEME.text.secondary}
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={setCardNumber}
                selectionColor={THEME.primary}
              />
              <Image source={cardIcon} style={styles.cardIcon} />
            </View>
          </View>

          <View style={styles.row}>
            {Platform.OS === "android" ? (
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Select Bank</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={bankName}
                    style={styles.picker}
                    dropdownIconColor={THEME.primary}
                    onValueChange={(itemValue, itemIndex) => {
                      if (itemIndex > 0) {
                        const selectedBank = paystackBanks.find((bank) => bank.name === itemValue)
                        setBankName(selectedBank.name)
                        setBankCode(selectedBank.code)
                      } else {
                        setBankName("")
                        setBankCode("")
                      }
                    }}
                  >
                    <Picker.Item label="Select a bank" value="" color='#000' />
                    {paystackBanks.map((bank) => (
                      <Picker.Item key={bank.code} label={bank.name} value={bank.name} color='#000' />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Bank Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1234"
                  placeholderTextColor={THEME.text.secondary}
                  keyboardType="number-pad"
                  value={bankCode}
                  onChangeText={setBankCode}
                  selectionColor={THEME.primary}
                />
              </View>
            )}
            <View style={styles.inputGroupHalf}>
              <Text style={styles.label}>Country Code</Text>
              <TextInput
                style={styles.input}
                value={countryCode}
                onChangeText={setCountryCode}
                placeholderTextColor={THEME.text.secondary}
                selectionColor={THEME.primary}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Switch
              value={saveCard}
              onValueChange={setSaveCard}
              trackColor={{ false: "#3e3e3e", true: "rgba(0, 216, 240, 0.3)" }}
              thumbColor={saveCard ? THEME.primary : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
            <Text style={styles.switchLabel}>Save this card details</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, !saveCard && { backgroundColor: THEME.button.disabled }]}
            onPress={handleSubmit}
            disabled={!saveCard}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  safeArea: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 216, 240, 0.1)",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: THEME.text.primary,
  },
  card: {
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 216, 240, 0.3)",
    height: 180,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardLabel: {
    color: THEME.text.secondary,
    fontSize: 16,
    marginBottom: 8,
  },
  cardNumber: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: "600",
  },
  cardAmount: {
    color: THEME.primary,
    fontSize: 22,
    fontWeight: "bold",
  },
  cardExpiry: {
    color: THEME.text.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  cardChip: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  cardIconLarge: {
    width: 50,
    height: 30,
    tintColor: THEME.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.text.primary,
    marginBottom: 20,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: THEME.text.secondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.input.border,
    backgroundColor: THEME.input.background,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: THEME.input.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: THEME.input.border,
    backgroundColor: THEME.input.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    color: THEME.text.primary,
    backgroundColor: "transparent",
    height: 50,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.input.border,
    backgroundColor: THEME.input.background,
    borderRadius: 12,
    paddingRight: 15,
  },
  flexInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  cardIcon: {
    width: 30,
    height: 20,
    tintColor: THEME.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  switchLabel: {
    marginLeft: 15,
    fontSize: 16,
    color: THEME.text.primary,
    fontWeight: "500",
  },
  button: {
    backgroundColor: THEME.button.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
})
