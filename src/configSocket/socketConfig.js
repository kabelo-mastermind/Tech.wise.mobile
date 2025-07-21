import io from "socket.io-client";
import config from "./config"; // Import backend URL from config.js

let socket;

export const connectSocket = (userId, userType) => {
  if (socket && socket.connected) return; // Prevent duplicate connections

  socket = io(config.SOCKET_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  socket.on("connect", () => {
    if (userId && userType) {
      socket.emit("joinRoom", userId, userType);
    }
  });

  socket.on("connect_error", (err) => {
    console.warn("⚠️ Connection error. Retrying...");
    setTimeout(() => socket.connect(), 5000);
  });

  socket.on("disconnect", () => console.log("❌ Disconnected"));
};



export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const listenToTripStatus = (callback) => {
  if (socket) {
    socket.on("tripStatus", callback);
  }
};

export const stopListeningToTripStatus = () => {
  if (socket) {
    socket.off("tripStatus");
  }
};

export const emitTripRequest = (data) => {
  if (socket) {
    socket.emit("tripRequest", data);
  }
};

// Listen for multiple trip statuses
export const listenToMultipleTripStatuses = (callback) => {
  if (socket) {
    ["accepted", "declined", "ongoing", "completed", "start", "end"].forEach((status) => {
      socket.on(status, (data) => callback(status, data));
    });
  }
};

export const stopListeningToMultipleTripStatuses = () => {
  if (socket) {
    ["accepted", "declined", "ongoing", "completed", "start", "end"].forEach((status) => {
      socket.off(status);
    });
  }
};

// NEW FUNCTION: Listen for new trip requests
export const listenToNewTripRequests = (callback) => {
  if (!socket) return console.error("❌ Socket is not initialized");

  // console.log("✅ Listening for 'newTripNotification' event");

  socket.on("newTripNotification", (tripData) => {
    // console.log("📢 New trip request received on frontend:", tripData);

    if (!tripData) {
      console.error("❌ Received tripData is null or undefined");
      return;
    }

    callback(tripData);
  });
};

// NEW FUNCTION: Listen for new trip requests
export const listenCancelTrip = (callback) => {
  if (!socket) return console.error("❌ Socket is not initialized");
  socket.on("tripCancelled", (tripData) => {
    // console.log("📢 New trip request received on frontend:", tripData);

    if (!tripData) {
      console.error("❌ Received tripData is null or undefined");
      return;
    }

    callback(tripData);
  });
};

// NEW FUNCTION: Emit acceptTrip event
export const emitAcceptTrip = (tripId,customerId) => {
  if (socket) {
    socket.emit("acceptTrip", {tripId,customerId});
  }
}
// NEW FUNCTION: Emit arival event
export const emitArrival = (tripId,customerId) => {
  if (socket) {
    socket.emit("driverArrived", {tripId,customerId});
  }
}
// NEW FUNCTION: Emit startTrip event
export const emitStartTrip = (tripId,customerId) => {
  if (socket) {
    socket.emit("startTrip", {tripId,customerId});
  }
}
// NEW FUNCTION: Emit endTrip event
export const emitEndTrip = (tripId,customerId) => {
  if (socket) {
    socket.emit("endTrip", {tripId,customerId});
  }
}
export const listenToTripEnded = (callback) => {
  if (socket) {
    socket.on("tripEnded", callback);
    callback(data);
  }
}


// NEW FUNCTION: Emit cancelTrip event
export const emitCancelTrip = (tripId,customerId) => {
  if (socket) {
    socket.emit("declineTrip", {tripId,customerId});
  }
}

// NEW FUNCTION: Stop listening to new trip requests
export const stopListeningToNewTripRequests = () => {
  if (socket) {
    socket.off("newTripNotification");
  }
};

// Chatting socket functions
// Listen for incoming chat messages
export const listenToChatMessages = (callback) => {
  if (!socket) {
    console.error("❌ Socket is not initialized");
    return;
  }

  socket.on("chatMessage", (messageData) => {
    console.log("📩 New chat message received:", messageData);
    callback(messageData);  // Callback to update the UI with new messages
  });
};


// Emit a new chat message
export const emitChatMessage = (messageData) => {
  if (!socket) {
    console.error("❌ Socket is not initialized");
    return;
  }

  if (!socket.connected) {
    console.error("❌ Socket is not connected");
    return;
  }

  socket.emit("sendMessage", messageData);  // Emit the message to the backend
};

// NEW FUNCTION: Stop listening to chat messages
export const stopListeningToChatMessages = () => {
  if (socket) {
    socket.off("chatMessage");
  }
};

//////////////edit and delete message
// Emit Edit Message
export const emitEditMessage = (messageData) => {
  if (!socket) return console.error("❌ Socket not initialized");

  socket.emit("editMessage", messageData);
};

// Listen for Edited Message
export const listenToEditedMessages = (callback) => {
  if (!socket) return;

  socket.on("messageEdited", (messageData) => {
    console.log("✏️ Message Edited:", messageData);
    callback(messageData);
  });
};

// Emit Delete Message
export const emitDeleteMessage = (messageData) => {
  if (!socket) return console.error("❌ Socket not initialized");

  socket.emit("deleteMessage", messageData);
};

// Listen for Deleted Message
export const listenToDeletedMessages = (callback) => {
  if (!socket) return;

  socket.on("messageDeleted", (messageData) => {
    console.log("🗑️ Message Deleted:", messageData);
    callback(messageData);
  });
};

export default socket;
