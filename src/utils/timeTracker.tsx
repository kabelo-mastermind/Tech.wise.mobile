import AsyncStorage from "@react-native-async-storage/async-storage"

// 12 hours in milliseconds
export const MAX_TIME_PER_DAY = 12 * 60 * 60 * 1000
export const MAX_TIME_PER_DAY_SECONDS = 12 * 60 * 60

export async function getTimeSpentToday() {
  const today = new Date().toDateString()
  const storedDate = await AsyncStorage.getItem("timeDate")
  const storedTime = await AsyncStorage.getItem("timeSpent")

  if (storedDate !== today) {
    // reset if date changed
    await AsyncStorage.setItem("timeDate", today)
    await AsyncStorage.setItem("timeSpent", "0")
    return 0
  }
  return Number.parseInt(storedTime || "0", 10)
}

export async function addTimeSpent(ms) {
  const spent = await getTimeSpentToday()
  const newTime = spent + ms
  await AsyncStorage.setItem("timeSpent", newTime.toString())
}

export async function getRemainingTime() {
  const spent = await getTimeSpentToday()
  return Math.max(0, MAX_TIME_PER_DAY - spent)
}

// Convert seconds to formatted string "X hrs Y min"
export const formatWorkedHours = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours} hrs ${minutes} min`
}

// Convert seconds to "HH:MM:SS" string format
export const formatSecondsToTimeString = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// Parse "HH:MM:SS" string to total seconds
export const parseTimeStringToSeconds = (timeString) => {
  try {
    const [hours, minutes, seconds] = timeString.split(":").map(Number)
    return hours * 3600 + minutes * 60 + seconds
  } catch (error) {
    console.error("Error parsing time string:", error)
    return 0
  }
}

// Format seconds to a short readable format "Xh Ym Zs"
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${remainingSeconds}s`
}
