"use client"

import { useState } from "react"
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@expo/vector-icons"
import { useSelector } from "react-redux"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { storage } from "../../firebase"
import { api } from "../../api"
import { Icon } from "react-native-elements"
import CustomDrawer from "../components/CustomDrawer"

const { width } = Dimensions.get("window")

const UploadDocuments = ({ navigation }) => {
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [documents, setDocuments] = useState({
    id_copy: null,
    police_clearance: null,
    pdpLicense: null,
    car_inspection: null,
    driver_license: null,
  })

  const handlePdfUpload = async (field) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" })
      if (result.canceled) return

      const { name, uri } = result.assets[0]
      setDocuments((prev) => ({
        ...prev,
        [field]: { name, uri },
      }))
    } catch (error) {
      console.error("File selection error:", error)
      Alert.alert("Error", "Something went wrong while selecting the file.")
    }
  }

  const handleSubmit = async () => {
    try {
      // Check if all required documents are selected
      const missingDocs = Object.entries(documents)
        .filter(([_, value]) => !value)
        .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))

      if (missingDocs.length > 0) {
        Alert.alert("Missing Documents", `Please attach the following documents:\n${missingDocs.join("\n")}`)
        return
      }

      setIsSubmitting(true)
      const documentURLs = {}

      // Upload documents to Firebase Storage
      for (const field in documents) {
        const document = documents[field]
        if (document) {
          const { name, uri } = document

          const response = await fetch(uri)
          const blob = await response.blob()

          const storageRef = ref(storage, `documents/${user_id}/${name}`)
          const uploadTask = uploadBytesResumable(storageRef, blob)

          // Wait for the upload to complete and get the URL
          await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                setUploadProgress((prev) => ({
                  ...prev,
                  [field]: progress,
                }))
              },
              (error) => {
                console.error("Upload error:", error)
                reject(error)
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
                documentURLs[field] = downloadURL
                resolve()
              },
            )
          })
        }
      }

      // After all documents are uploaded, save data to MySQL
      await saveToMySQL(documentURLs)
      setIsSubmitting(false)
    } catch (error) {
      setIsSubmitting(false)
      console.error("Submission error:", error)
      Alert.alert("Error", "Something went wrong while submitting the documents.")
    }
  }

  const saveToMySQL = async (documentURLs) => {
    try {
      const data = {
        user_id,
        id_copy: documentURLs.id_copy || null,
        police_clearance: documentURLs.police_clearance || null,
        pdpLicense: documentURLs.pdpLicense || null,
        car_inspection: documentURLs.car_inspection || null,
        driver_license: documentURLs.driver_license || null,
        status: "pending",
        state: "offline",
        URL_payment: "www.example.com",
        online_time: "00:00",
        last_online_timestamp: new Date().toISOString(),
      }

      const response = await fetch(api + "driver_details", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();

      console.log("Document data successfully saved:", responseData);
      Alert.alert("Success", "Documents uploaded and data saved successfully!", [
        {
          text: "Continue",
          onPress: () =>
            navigation.navigate("ViewDocuments", {
              documents: documentURLs, // Fixed: pass as 'documents' not 'documentURLs'
            }),
        },
      ])
    } catch (error) {
      console.error("MySQL save error:", error)
      Alert.alert("Database Error", "Failed to save data in the database.")
    }
  }

  const documentFields = [
    { label: "PDP License", field: "pdpLicense", icon: "document-text-outline" },
    { label: "ID Copy", field: "id_copy", icon: "card-outline" },
    { label: "Police Clearance", field: "police_clearance", icon: "shield-checkmark-outline" },
    { label: "Driver's License", field: "driver_license", icon: "car-outline" },
    { label: "Car Inspection Report", field: "car_inspection", icon: "clipboard-outline" },
  ]

  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Ionicons name="information-circle-outline" size={22} color="#0DCAF0" />
        <Text style={styles.instructionText}>
          Please upload all required documents in PDF format to complete your registration.
        </Text>
      </View>

      {/* Document Upload Form */}
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {documentFields.map(({ label, field, icon }) => (
          <View key={field} style={styles.uploadCard}>
            <View style={styles.cardHeader}>
              <Ionicons name={icon} size={24} color="#0DCAF0" />
              <Text style={styles.label}>{label}</Text>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, documents[field] ? styles.uploadButtonSuccess : null]}
              onPress={() => handlePdfUpload(field)}
              disabled={isSubmitting}
            >
              <Ionicons name={documents[field] ? "checkmark-circle" : "cloud-upload-outline"} size={22} color="#fff" />
              <Text style={styles.buttonText}>{documents[field] ? "Document Attached" : `Attach ${label}`}</Text>
            </TouchableOpacity>

            {documents[field] && (
              <View style={styles.fileInfoContainer}>
                <Ionicons name="document" size={16} color="#555" />
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {documents[field].name}
                </Text>
              </View>
            )}

            {uploadProgress[field] > 0 && uploadProgress[field] < 100 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress[field]}%` }]} />
                <Text style={styles.progressText}>{Math.round(uploadProgress[field])}%</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.submitText}>Submit Documents</Text>
          </>
        )}
      </TouchableOpacity>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  instructionContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginLeft: 10,
  },
  uploadButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  uploadButtonSuccess: {
    backgroundColor: "#20c997",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  fileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 8,
  },
  fileName: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 6,
    flex: 1,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0DCAF0",
    borderRadius: 3,
  },
  progressText: {
    position: "absolute",
    right: 0,
    top: 8,
    fontSize: 12,
    color: "#6c757d",
  },
  submitButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#6c757d",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    left: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
})

export default UploadDocuments
