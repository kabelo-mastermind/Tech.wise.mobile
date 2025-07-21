"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar, // Import StatusBar
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import { useSelector } from "react-redux"
import axios from "axios"
import { api } from "../../api"
import * as FileSystem from "expo-file-system"
import { WebView } from "react-native-webview" // Import WebView

// Removed THEME object for consistency with ViewCarDetails.tsx

const documentLabels = {
  id_copy: "ID Copy",
  police_clearance: "Police Clearance",
  pdp: "PDP",
  car_inspection: "Car Inspection",
  driver_license: "Driver's License",
  // Add other document types as needed
}

const getDocumentLabel = (key) => {
  return (
    documentLabels[key] ||
    key
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

const formatDate = (dateString) => {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return "Invalid Date"
    }
    // Format to "DD MMM YYYY" like "08 Dec 2021"
    return date
      .toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/\./g, "")
      .replace(/,/, "") // Remove periods and commas
  } catch (e) {
    return "N/A"
  }
}

const ViewDocuments = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [documents, setDocuments] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [pdfUrlToView, setPdfUrlToView] = useState<string | null>(null) // State to hold PDF URL for WebView

  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id || null

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get(`${api}driver_documents/${user_id}`)
        if (response.data && response.data.documents && response.data.documents.length > 0) {
          setDocuments(response.data.documents[0])
        }
      } catch (error) {
        console.error("Error fetching documents:", error)
        Alert.alert("Error", "Failed to fetch documents. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (user_id) {
      fetchDocuments()
    }
  }, [user_id])

  const handleOpenDocument = async (url) => {
    if (!url) {
      Alert.alert("Error", "Document URL is missing.")
      return
    }

    // Check if it's a PDF
    if (url.toLowerCase().endsWith(".pdf")) {
      setDownloading(true)
      try {
        // 1. Extract filename without query parameters
        const urlParts = url.split("/")
        const filenameWithQuery = urlParts[urlParts.length - 1]
        const filename = filenameWithQuery.split("?")[0] // Get filename before any '?'

        // 2. Define a specific subdirectory within cache for your app's documents
        const appDocumentsDir = FileSystem.cacheDirectory + "my_app_documents/"
        const localUri = appDocumentsDir + filename

        // 3. Ensure the app-specific directory exists
        const dirInfo = await FileSystem.getInfoAsync(appDocumentsDir)
        if (!dirInfo.exists) {
          console.log("Creating directory:", appDocumentsDir)
          await FileSystem.makeDirectoryAsync(appDocumentsDir, { intermediates: true })
        }

        // 4. Download the file
        const { uri } = await FileSystem.downloadAsync(url, localUri)
        console.log("Finished downloading to ", uri)

        // 5. Set the URI for WebView to display the PDF
        setPdfUrlToView(uri)
      } catch (error) {
        console.error("Error downloading or opening document:", error)
        Alert.alert(
          "Error",
          "Could not open document. Please ensure you have an app to handle this file type or try again.",
        )
        setPdfUrlToView(null) // Clear PDF viewer on error
      } finally {
        setDownloading(false)
      }
    } else {
      // For other file types, use Linking.openURL
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open URL:", err)
        Alert.alert("Error", "Could not open document. Please ensure you have an app to handle this file type.")
      })
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DCAF0" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </SafeAreaView>
    )
  }

  // If pdfUrlToView is set, render the WebView
  if (pdfUrlToView) {
    return (
      <SafeAreaView style={styles.container}>
        {" "}
        {/* Use consistent container style */}
        <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
        <View style={styles.pdfViewerHeader}>
          <TouchableOpacity onPress={() => setPdfUrlToView(null)} style={styles.pdfViewerCloseButton}>
            <Ionicons name="close" size={28} color="#212529" /> {/* Consistent text color */}
          </TouchableOpacity>
          <Text style={styles.pdfViewerTitle}>Document Viewer</Text>
          <View style={styles.headerRightPlaceholder} /> {/* For alignment */}
        </View>
        {downloading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0DCAF0" />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: pdfUrlToView }}
            style={styles.webView}
            originWhitelist={["file://*", "http://*", "https://*"]} // Allow local files and web content
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true} // Required for local file access on Android
            allowUniversalAccessFromFileURLs={true} // Required for local file access on iOS
            onLoadStart={() => setDownloading(true)}
            onLoadEnd={() => setDownloading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent
              console.warn("WebView error: ", nativeEvent)
              Alert.alert("Error", "Could not load PDF. Please try again.")
              setPdfUrlToView(null) // Go back to list on error
            }}
          />
        )}
      </SafeAreaView>
    )
  }

  // Define the specific keys to display
  const allowedDocumentKeys = ["id_copy", "police_clearance", "pdp", "car_inspection", "driver_license"]

  // Transform the flat documents object into an array for list display
  const documentsToDisplay = Object.entries(documents)
    .filter(([key, url]) => allowedDocumentKeys.includes(key) && url && typeof url === "string")
    .map(([key, url]) => ({
      id: key, // Use key as ID
      title: getDocumentLabel(key),
      url: url,
      uploadedAt: documents.document_upload_time, // Use document_upload_time for all
    }))

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          {" "}
          {/* Changed to menuButton style */}
          <Icon type="material-community" name="menu" color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Documents</Text>
        {/* Placeholder for right side if needed for balance */}
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Document List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {" "}
        {/* Changed to scrollContent style */}
        {/* Instructions for viewing and replacing documents */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to Manage Your Documents:</Text>
          <Text style={styles.instructionsText}>
            • To view a document, simply tap on its name in the list. PDFs will open directly within the app. Other file
            types will attempt to open with your device's default application.
          </Text>
          <Text style={styles.instructionsText}>
            • To replace any of your documents, you must re-upload ALL required documents using the "UPLOAD DOCUMENTS"
            button below. This will update your entire document set.
          </Text>
        </View>
        {documentsToDisplay.length > 0 ? (
          documentsToDisplay.map((doc) => (
            <TouchableOpacity key={doc.id} style={styles.docListItem} onPress={() => handleOpenDocument(doc.url)}>
              <View style={styles.docTextContent}>
                <Text style={styles.docItemTitle}>{doc.title}</Text>
                <Text style={styles.docItemDate}>{formatDate(doc.uploadedAt)}</Text>
              </View>
              <View style={styles.docRightContent}>
                <TouchableOpacity style={styles.optionsButton}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6c757d" /> {/* Consistent text color */}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noDocumentsContainer}>
            <Ionicons name="document-text-outline" size={60} color="#6c757d" /> {/* Consistent text color */}
            <Text style={styles.noDocumentsText}>No documents uploaded yet.</Text>
            <Text style={styles.noDocumentsSubText}>Please upload your required documents.</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Create Document Button */}
      <TouchableOpacity style={styles.createDocumentButton} onPress={() => navigation.navigate("UploadDocuments")}>
        <Text style={styles.createDocumentButtonText}>UPLOAD DOCUMENTS</Text>
      </TouchableOpacity>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa", // Consistent background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa", // Consistent background
  },
  loadingText: {
    marginTop: 10,
    color: "#6c757d", // Consistent text color
    fontSize: 16,
  },
  // Header (consistent with ViewCarDetails)
  header: {
    backgroundColor: "#0DCAF0", // Consistent header background
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    // Consistent menu button style
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff", // Consistent header title color
    flex: 1, // Allows title to take available space
    textAlign: "center", // Centers the title
    marginRight: 40, // Offset for menu button
  },
  headerRightPlaceholder: {
    width: 24, // To balance the menu icon on the left
    height: 24,
    // No position absolute needed if headerTitle takes flex:1 and pushes it
  },
  // PDF Viewer Header (consistent with ViewCarDetails header)
  pdfViewerHeader: {
    backgroundColor: "#0DCAF0", // Consistent header background
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16, // Consistent padding
    height: 60,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pdfViewerCloseButton: {
    padding: 5,
  },
  pdfViewerTitle: {
    fontSize: 20, // Consistent font size
    fontWeight: "bold",
    color: "#fff", // Consistent title color
    flex: 1,
    textAlign: "center",
    marginRight: 40, // Offset for close button
  },
  // Document List (consistent with ViewCarDetails scrollContent)
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16, // Consistent padding
    paddingTop: 20, // Consistent padding
    paddingBottom: 100, // Space for floating button
  },
  docListItem: {
    backgroundColor: "#fff", // Consistent card background
    borderRadius: 16, // Consistent border radius
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000", // Consistent shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  docTextContent: {
    flex: 1,
    marginRight: 10,
  },
  docItemTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#212529", // Consistent text color
    marginBottom: 3,
  },
  docItemDate: {
    fontSize: 13,
    color: "#6c757d", // Consistent text color
    marginTop: 2, // Small margin to separate from title
  },
  docRightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionsButton: {
    padding: 5,
  },
  // No Documents State (consistent with ViewCarDetails noCarContent)
  noDocumentsContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noDocumentsText: {
    fontSize: 20, // Consistent font size
    fontWeight: "bold",
    color: "#212529", // Consistent text color
    marginTop: 15,
    textAlign: "center",
  },
  noDocumentsSubText: {
    fontSize: 16, // Consistent font size
    color: "#6c757d", // Consistent text color
    marginTop: 5,
    textAlign: "center",
  },
  // Instructions (consistent with ViewCarDetails instructionsContainer)
  instructionsContainer: {
    backgroundColor: "#fff", // Consistent card background
    borderRadius: 16, // Consistent border radius
    padding: 15,
    marginTop: 0,
    marginBottom: 20, // Consistent margin
    shadowColor: "#000", // Consistent shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529", // Consistent text color
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: "#6c757d", // Consistent text color
    marginBottom: 5,
    lineHeight: 20,
  },
  // Floating Create Document Button (consistent with ViewCarDetails editButton)
  createDocumentButton: {
    position: "absolute",
    bottom: 20,
    left: 16, // Consistent horizontal padding
    right: 16, // Consistent horizontal padding
    backgroundColor: "#0DCAF0", // Consistent button color
    paddingVertical: 16, // Consistent padding
    borderRadius: 12, // Consistent border radius
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000", // Consistent shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createDocumentButtonText: {
    color: "#fff", // Consistent text color
    fontSize: 16, // Consistent font size
    fontWeight: "bold",
  },
  // WebView specific styles
  webView: {
    flex: 1,
    backgroundColor: "#f8f9fa", // Consistent background
  },
})

export default ViewDocuments
