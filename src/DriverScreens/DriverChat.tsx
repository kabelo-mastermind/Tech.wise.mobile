"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, StyleSheet } from "react-native"
import { Icon } from "react-native-elements"
import { LinearGradient } from "expo-linear-gradient"
import {
  listenToChatMessages,
  emitChatMessage,
  stopListeningToChatMessages,
  emitEditMessage,
  listenToEditedMessages,
  emitDeleteMessage,
  listenToDeletedMessages,
  connectSocket,
} from "../configSocket/socketConfig"
import { useSelector } from "react-redux"

const DriverChat = ({ route }) => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editedMessageText, setEditedMessageText] = useState("")
  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const [optionsVisible, setOptionsVisible] = useState(null)
  const flatListRef = useRef(null)
  const prevMessageRef = useRef(null) // To track previous message state

  // Redux selectors
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const { trip_id, customer_id } = route.params || {}

  useEffect(() => {
    console.log("DriverChat trip_id:", trip_id)
    console.log("DriverChat customer_id:", customer_id)
  }, [trip_id, customer_id])

  const message = useSelector((state) => state.message.message || [])

  // State for messages and input text
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")

  // Effect to handle incoming messages from Redux - FIXED to prevent infinite loop
  useEffect(() => {
    // Skip if message is empty or undefined
    if (!message) return

    // Skip if the message reference is the same as before (prevents unnecessary updates)
    if (message === prevMessageRef.current) return

    // Update our ref to the current message
    prevMessageRef.current = message

    if (Array.isArray(message?.message) && message.message.length > 0) {
      // Check if we have new messages to add
      const newMessages = message.message.filter(
        (newMsg) => !messages.some((existingMsg) => existingMsg.id === newMsg.id),
      )

      if (newMessages.length > 0) {
        setMessages((prevMessages) => [...prevMessages, ...newMessages])
      }
    } else if (typeof message?.message === "string" && message.message.trim() !== "") {
      // For string messages, add as a new message object
      const newMessageObj = {
        message: message.message,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        senderId: user_id, // Assuming this is from the current user
      }

      setMessages((prevMessages) => [...prevMessages, newMessageObj])
    }
  }, [message, messages]) // Include messages in dependency array to check for duplicates

  // Function to send a new chat message
  const sendMessage = async () => {
    if (!messageText.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      senderId: user_id,
      receiverId: customer_id,
      tripId: trip_id,
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
    }

    try {
      // Add to local state first
      setMessages((prevMessages) => [...prevMessages, newMessage])

      // ✅ Console log to check the message being sent
      console.log("Sending message from DriverChat:", newMessage)

      // Then emit the message
      emitChatMessage(newMessage)
      setMessageText("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Effect to handle socket connections and listeners - FIXED to prevent multiple listeners
  useEffect(() => {
    // Connect socket only once
    connectSocket(user_id, "driver")

    // Set up listeners
    const handleNewMessage = (messageData) => {
      // Check if we already have this message to prevent duplicates
      if (messageData.senderId === user_id) return

      setMessages((prevMessages) => {
        const exists = prevMessages.some((msg) => msg.id === messageData.id)
        if (exists) return prevMessages
        return [...prevMessages, messageData]
      })
    }

    const handleEditedMessage = (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === updatedMessage.messageId ? { ...msg, message: updatedMessage.newMessage } : msg,
        ),
      )
    }

    const handleDeletedMessage = ({ messageId }) => {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId))
    }

    // Register listeners
    listenToChatMessages(handleNewMessage)
    listenToEditedMessages(handleEditedMessage)
    listenToDeletedMessages(handleDeletedMessage)

    // Cleanup function to prevent memory leaks
    return () => {
      stopListeningToChatMessages()
    }
  }, [user_id]) // Only re-run if user_id changes

  // Helper functions for editing and deleting messages
  const editMessage = () => {
    if (!editedMessageText.trim()) return

    // Update local messages state
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === selectedMessageId ? { ...msg, message: editedMessageText } : msg)),
    )

    // Emit the edit event
    emitEditMessage({
      messageId: selectedMessageId,
      newMessage: editedMessageText.trim(),
      senderId: user_id,
      receiverId: customer_id,
      timestamp: new Date().toISOString(),
    })

    // Close modal and options
    setEditModalVisible(false)
    setOptionsVisible(null)
  }

  const deleteMessage = (messageId) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: () => {
          // Update local messages state
          setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId))

          // Emit the delete event
          emitDeleteMessage({ messageId, senderId: user_id, receiverId: customer_id })
        },
        style: "destructive",
      },
    ])

    // Hide options menu after deletion
    setOptionsVisible(null)
  }

  // Scroll to bottom of FlatList - FIXED to prevent unnecessary calls
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true })
    }
  }

  // Only scroll when messages change, with proper dependency
  useEffect(() => {
    // Use a timeout to ensure the FlatList has updated
    const timer = setTimeout(() => {
      scrollToBottom()
    }, 100)

    return () => clearTimeout(timer)
  }, [messages.length]) // Only depend on messages.length, not the entire messages array

  // Format timestamp for better display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0DCAF0", "#0AA8CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileContainer}>
            <View style={styles.profileIcon}>
              <Icon name="person" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Chat with Passenger</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item?.id?.toString() || `msg-${index}`}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.senderId === user_id ? styles.sentMessage : styles.receivedMessage]}>
            <Text
              style={[
                styles.messageText,
                item.senderId === user_id ? styles.sentMessageText : styles.receivedMessageText,
              ]}
            >
              {item.message}
            </Text>
            <Text
              style={[styles.timestamp, item.senderId === user_id ? styles.sentTimestamp : styles.receivedTimestamp]}
            >
              {formatTime(item.timestamp)}
            </Text>

            {item.senderId === user_id && (
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setOptionsVisible(optionsVisible === item.id ? null : item.id)}
              >
                <Icon name="more-vert" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {optionsVisible === item.id && (
              <View style={styles.optionsMenu}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setSelectedMessageId(item.id)
                    setEditedMessageText(item.message)
                    setEditModalVisible(true)
                  }}
                >
                  <Icon name="edit" size={16} color="#0DCAF0" style={styles.optionIcon} />
                  <Text style={styles.optionText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity style={styles.optionItem} onPress={() => deleteMessage(item.id)}>
                  <Icon name="delete" size={16} color="#FF6B6B" style={styles.optionIcon} />
                  <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={60} color="#E2E8F0" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation with your passenger</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <LinearGradient
            colors={messageText.trim() ? ["#0DCAF0", "#0AA8CC"] : ["#CBD5E1", "#CBD5E1"]}
            style={styles.sendButtonGradient}
          >
            <Icon name="send" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={editedMessageText}
              onChangeText={setEditedMessageText}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={editMessage}>
                <LinearGradient colors={["#0DCAF0", "#0AA8CC"]} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    flexGrow: 1,
    padding: 16,
  },
  messageBubble: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 18,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    position: "relative",
  },
  sentMessage: {
    backgroundColor: "#0DCAF0",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    marginRight: 10,
  },
  receivedMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    marginLeft: 10,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 24,
  },
  sentMessageText: {
    color: "#FFFFFF",
  },
  receivedMessageText: {
    color: "#1E293B",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  sentTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  receivedTimestamp: {
    color: "#94A3B8",
  },
  optionsButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  optionsMenu: {
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: -5,
    right: -5,
    padding: 8,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
    width: 120,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: "#334155",
  },
  deleteText: {
    color: "#FF6B6B",
  },
  optionDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    color: "#1E293B",
  },
  sendButton: {
    marginLeft: 10,
    borderRadius: 24,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInput: {
    padding: 16,
    fontSize: 16,
    color: "#334155",
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginLeft: 8,
  },
  saveButtonGradient: {
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
})

export default DriverChat
