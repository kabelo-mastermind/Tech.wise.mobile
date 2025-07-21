"use client"
import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  ScrollView,
} from "react-native"
import { Icon } from "react-native-elements"
import { LinearGradient } from "expo-linear-gradient"
import CustomDrawer from "../components/CustomDrawer"

const { width } = Dimensions.get("window")

const DriverRewards = ({ navigation }) => {
  const [points, setPoints] = useState(1200)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const rewards = [
    {
      id: "1",
      name: "Fuel Voucher",
      description: "R50 fuel voucher for any participating gas station",
      cost: 500,
      icon: "gas-station",
    },
    {
      id: "2",
      name: "Bonus Cash",
      description: "R100 added directly to your next payout",
      cost: 1000,
      icon: "cash",
    },
    {
      id: "3",
      name: "Coffee Voucher",
      description: "Free coffee at any participating coffee shop",
      cost: 200,
      icon: "coffee",
    },
    {
      id: "4",
      name: "Car Wash",
      description: "Free car wash at any participating location",
      cost: 350,
      icon: "car-wash",
    },
    {
      id: "5",
      name: "Premium Status",
      description: "Get priority access to high-value rides for 1 week",
      cost: 1500,
      icon: "star",
    },
    {
      id: "6",
      name: "Phone Credit",
      description: "R30 airtime credit for your mobile phone",
      cost: 300,
      icon: "phone",
    },
    {
      id: "7",
      name: "Maintenance Discount",
      description: "20% discount on vehicle maintenance services",
      cost: 800,
      icon: "wrench",
    },
    {
      id: "8",
      name: "Insurance Discount",
      description: "10% discount on your next insurance premium",
      cost: 1200,
      icon: "shield-check",
    },
  ]

  const canRedeem = (cost) => points >= cost

  const handleRedeem = (item) => {
    if (canRedeem(item.cost)) {
      setPoints(points - item.cost)
      // Here you would typically call an API to process the redemption
      alert(`You have successfully redeemed ${item.name}!`)
    } else {
      alert("You don't have enough points to redeem this reward.")
    }
  }

  const renderRewardItem = (item) => {
    const isRedeemable = canRedeem(item.cost)
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.rewardCard, !isRedeemable && styles.rewardCardDisabled]}
        onPress={() => handleRedeem(item)}
        activeOpacity={0.8}
      >
        <View style={styles.rewardContent}>
          <View style={styles.rewardIconContainer}>
            <Icon type="material-community" name={item.icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.rewardDetails}>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={styles.rewardDescription}>{item.description}</Text>
          </View>
        </View>
        <View style={styles.rewardFooter}>
          <Text style={styles.rewardCost}>{item.cost} Points</Text>
          <TouchableOpacity
            style={[styles.redeemButton, !isRedeemable && styles.redeemButtonDisabled]}
            onPress={() => handleRedeem(item)}
            disabled={!isRedeemable}
          >
            <Text style={styles.redeemButtonText}>Redeem</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Icon type="material-community" name="menu" color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rewards</Text>
        <TouchableOpacity style={styles.historyButton}>
          <Icon type="material-community" name="history" color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section */}
        <ImageBackground source={require("./reward.jpg")} style={styles.heroImage} resizeMode="cover">
          <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]} style={styles.gradient}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Driver Rewards</Text>
              <Text style={styles.heroSubtitle}>Earn points with every ride</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Points Card */}
        <View style={styles.pointsContainer}>
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <Text style={styles.pointsLabel}>Available Points</Text>
              <Icon type="material-community" name="star-circle" size={24} color="#0DCAF0" />
            </View>
            <Text style={styles.pointsValue}>{points}</Text>
            <View style={styles.pointsProgress}>
              <View style={[styles.progressBar, { width: `${Math.min((points / 2000) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.pointsGoal}>
              {points >= 2000 ? "You've reached the top tier!" : `${2000 - points} points to next tier`}
            </Text>
          </View>
        </View>

        {/* How to Earn Points Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to Earn Points</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Icon type="material-community" name="car" size={20} color="#0DCAF0" />
              <Text style={styles.infoText}>Complete rides: 10 points per ride</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon type="material-community" name="star" size={20} color="#0DCAF0" />
              <Text style={styles.infoText}>5-star rating: 5 bonus points</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon type="material-community" name="calendar-check" size={20} color="#0DCAF0" />
              <Text style={styles.infoText}>Weekly goals: 50 bonus points</Text>
            </View>
          </View>
        </View>

        {/* Rewards Section */}
        <View style={styles.rewardsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Rewards</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Rewards List */}
          <View style={styles.rewardsList}>{rewards.map((item) => renderRewardItem(item))}</View>
        </View>

        {/* Bottom Padding for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Custom Drawer */}
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FBFD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#0DCAF0",
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroImage: {
    width: "100%",
    height: 200,
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  heroContent: {
    bottom: 20,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
  },
  pointsContainer: {
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 20,
  },
  pointsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  pointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  pointsProgress: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#0DCAF0",
    borderRadius: 4,
  },
  pointsGoal: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "right",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 12,
    flex: 1,
  },
  rewardsContainer: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 14,
    color: "#0DCAF0",
    fontWeight: "500",
  },
  rewardsList: {
    marginBottom: 20,
  },
  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  rewardCardDisabled: {
    opacity: 0.7,
  },
  rewardContent: {
    flexDirection: "row",
    marginBottom: 16,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0DCAF0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  rewardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 16,
  },
  rewardCost: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  redeemButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  redeemButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
})

export default DriverRewards
