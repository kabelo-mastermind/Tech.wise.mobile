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
  StatusBar,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import { useSelector } from "react-redux"
import { api } from "../../api"
import * as FileSystem from "expo-file-system"
import { WebView } from "react-native-webview"
import AllCustomAlert from "../components/AllCustomAlert"
import LoadingScreen from "../components/LoadingScreen"; // 👈 import it

const documentLabels = {
  id_copy: "ID Copy",
  police_clearance: "Police Clearance",
  pdp: "PDP",
  car_inspection: "Car Inspection",
  driver_license: "Driver's License",
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
    return date
      .toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/\./g, "")
      .replace(/,/, "")
  } catch (e) {
    return "N/A"
  }
}

const ViewDocuments = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [documents, setDocuments] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // 👈 Add error state
  const [downloading, setDownloading] = useState(false)
  const [pdfUrlToView, setPdfUrlToView] = useState<string | null>(null)

  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id || null
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "info",
    showCancelButton: false,
    onCancel: null,
    onConfirm: null,
  })

  // 👇 Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  const showAlert = (config) => {
    setAlertConfig({
      ...config,
      onCancel: config.onCancel || (() => setAlertVisible(false)),
      onConfirm: config.onConfirm || (() => setAlertVisible(false)),
    })
    setAlertVisible(true)
  }

  // 👇 Main fetch function with retry logic
  const fetchDocuments = async () => {
    if (!user_id) return;

    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`${api}driver_documents/${user_id}`);
      const data = await response.json();
      if (data && data.documents.length > 0) {
        setDocuments(data.documents[0])
      } else {
        // No documents found - this is not an error, just empty state
        setDocuments({})
        showAlert({
          title: "No Documents Found",
          message: "You haven't uploaded any documents yet. Please upload them to get approved and start receiving ride requests.",
        })
      }
      
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching documents:", error);
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        showAlert({
          title: "Retrying...",
          message: `Failed to load documents. Retry ${nextRetryCount}/${MAX_RETRIES}`,
          type: "info",
        });
        
        // Auto-retry after 2 seconds
        setTimeout(() => {
          fetchDocuments();
        }, 2000);
      } else {
        // Max retries reached
        setError("Unable to load documents. Please check your connection and try again.");
        showAlert({
          title: "Loading Failed",
          message: "Failed to load documents after multiple attempts. Please try again.",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // 👇 Manual retry function for LoadingScreen
  const retryFetchData = () => {
    if (retryCount >= MAX_RETRIES) {
      setRetryCount(0);
    }
    fetchDocuments();
  };

  // 👇 Initial data fetch
  useEffect(() => {
    if (user_id) {
      fetchDocuments();
    }
  }, [user_id])

  const handleOpenDocument = async (url) => {
    if (!url) {
      showAlert({
        title: "Error",
        message: "Document URL is missing.",
        type: "error",
      })
      return
    }

    if (url.toLowerCase().endsWith(".pdf")) {
      setDownloading(true)
      try {
        const urlParts = url.split("/")
        const filenameWithQuery = urlParts[urlParts.length - 1]
        const filename = filenameWithQuery.split("?")[0]

        const appDocumentsDir = FileSystem.cacheDirectory + "my_app_documents/"
        const localUri = appDocumentsDir + filename

        const dirInfo = await FileSystem.getInfoAsync(appDocumentsDir)
        if (!dirInfo.exists) {
          console.log("Creating directory:", appDocumentsDir)
          await FileSystem.makeDirectoryAsync(appDocumentsDir, { intermediates: true })
        }

        const { uri } = await FileSystem.downloadAsync(url, localUri)
        console.log("Finished downloading to ", uri)
        setPdfUrlToView(uri)
      } catch (error) {
        console.error("Error downloading or opening document:", error)
        Alert.alert(
          "Error",
          "Could not open document. Please ensure you have an app to handle this file type or try again.",
        )
        setPdfUrlToView(null)
      } finally {
        setDownloading(false)
      }
    } else {
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open URL:", err)
        Alert.alert("Error", "Could not open document. Please ensure you have an app to handle this file type.")
      })
    }
  }

  // 👇 Use LoadingScreen instead of local loading state
  if (loading) {
    return (
      <LoadingScreen
        loading={loading}
        error={error}
        onRetry={retryFetchData}
      />
    );
  }

  // 👇 Error state after max retries (similar to DriverProfile)
  if (error && Object.keys(documents).length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" type="material" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryInfo}>
          {retryCount > 0 && `Retry attempts: ${retryCount}/${MAX_RETRIES}`}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryFetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (pdfUrlToView) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
        <View style={styles.pdfViewerHeader}>
          <TouchableOpacity
            onPress={() => setPdfUrlToView(null)}
            style={styles.pdfViewerCloseButton}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.pdfViewerTitle}>Document Viewer</Text>
          <View style={styles.headerRightPlaceholder} />
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
            originWhitelist={["file://*", "http://*", "https://*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            onLoadStart={() => setDownloading(true)}
            onLoadEnd={() => setDownloading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent
              console.warn("WebView error: ", nativeEvent)
              Alert.alert("Error", "Could not load PDF. Please try again.")
              setPdfUrlToView(null)
            }}
          />
        )}
      </SafeAreaView>
    )
  }

  const allowedDocumentKeys = ["id_copy", "police_clearance", "pdp", "car_inspection", "driver_license"]

  const documentsToDisplay = Object.entries(documents)
    .filter(([key, url]) => allowedDocumentKeys.includes(key) && url && typeof url === "string")
    .map(([key, url]) => ({
      id: key,
      title: getDocumentLabel(key),
      url: url,
      uploadedAt: documents.document_upload_time,
    }))

    
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header with modern styling */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Document List with improved card design */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Document Management</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="eye-outline" size={18} color="#0DCAF0" style={styles.instructionIcon} />
            <Text style={styles.instructionsText}>
              Tap on a document to view it. PDFs open in-app, others use your device's default app.
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="refresh-outline" size={18} color="#0DCAF0" style={styles.instructionIcon} />
            <Text style={styles.instructionsText}>
              To update documents, use the UPLOAD button below to replace all documents at once.
            </Text>
          </View>
        </View>

        {documentsToDisplay.length > 0 ? (
          documentsToDisplay.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docListItem}
              onPress={() => handleOpenDocument(doc.url)}
              activeOpacity={0.8}
            >
              <View style={styles.docIconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#0DCAF0" />
              </View>
              <View style={styles.docTextContent}>
                <Text style={styles.docItemTitle}>{doc.title}</Text>
                <Text style={styles.docItemDate}>Uploaded: {formatDate(doc.uploadedAt)}</Text>
              </View>
              <View style={styles.docRightContent}>
                <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noDocumentsContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="document-text-outline" size={60} color="#E0E0E0" />
            </View>
            <Text style={styles.noDocumentsText}>No documents uploaded</Text>
            <Text style={styles.noDocumentsSubText}>Please upload your required documents to continue</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating action button with modern styling */}
      <TouchableOpacity
        style={styles.createDocumentButton}
        onPress={() => navigation.navigate("UploadDocuments")}
        activeOpacity={0.9}
      >
        <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" style={styles.uploadIcon} />
        <Text style={styles.createDocumentButtonText}>UPLOAD DOCUMENTS</Text>
      </TouchableOpacity>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
      {/* Reusable alert */}
      <AllCustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancelButton={alertConfig.showCancelButton}
        onCancel={alertConfig.onCancel}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  // Header styling
  header: {
    backgroundColor: "#0DCAF0",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  menuButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 32,
  },
  // PDF Viewer Header
  pdfViewerHeader: {
    backgroundColor: "#0DCAF0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  pdfViewerCloseButton: {
    padding: 6,
  },
  pdfViewerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    textAlign: "center",
  },
  // Document List
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  instructionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  instructionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666",
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 20,
  },
  docListItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  docIconContainer: {
    backgroundColor: "#F0F5FF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  docTextContent: {
    flex: 1,
  },
  docItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  docItemDate: {
    fontSize: 13,
    color: "#888",
    fontFamily: 'Inter-Regular',
  },
  docRightContent: {
    marginLeft: 8,
  },
  // Empty state
  noDocumentsContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    backgroundColor: "#F8F9FB",
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noDocumentsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: "center",
  },
  noDocumentsSubText: {
    fontSize: 14,
    color: "#999",
    fontFamily: 'Inter-Regular',
    textAlign: "center",
    lineHeight: 20,
  },
  // Floating action button
  createDocumentButton: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#0DCAF0",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  uploadIcon: {
    marginRight: 8,
  },
  createDocumentButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'Inter-SemiBold',
  },
  // WebView
  webView: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
})

export default ViewDocuments