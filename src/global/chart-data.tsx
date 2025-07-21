// Chart data for the driver stats component
export const chartData = {
    daily: {
      labels: ["9 AM", "12 PM", "3 PM", "6 PM", "9 PM"],
      datasets: [
        { data: [5, 8, 6, 4, 7], color: () => "#0DCAF0" },
        { data: [1, 2, 3, 2, 1], color: () => "#FF6B6B" },
      ],
      legend: ["Accepted", "Declined"],
    },
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        { data: [12, 10, 15, 14, 18, 20, 22], color: () => "#0DCAF0" },
        { data: [3, 5, 2, 4, 3, 2, 1], color: () => "#FF6B6B" },
      ],
      legend: ["Accepted", "Declined"],
    },
    monthly: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        { data: [60, 70, 65, 80], color: () => "#0DCAF0" },
        { data: [15, 10, 12, 8], color: () => "#FF6B6B" },
      ],
      legend: ["Accepted", "Declined"],
    },
  }
  
  export const getEarningsData = (view) => {
    return {
      labels: chartData[view].labels,
      datasets: [
        {
          data:
            view === "daily"
              ? [10, 20, 15, 25, 18]
              : view === "weekly"
                ? [100, 120, 110, 130, 125, 150, 160]
                : [400, 450, 500, 550],
          color: () => "#0DCAF0",
        },
      ],
      legend: ["Earnings"],
    }
  }
  
  export const chartConfig = {
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    color: (opacity = 1) => `rgba(13, 202, 240, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#0DCAF0",
    },
  }
  
  // Dummy stats data
  export const dummyStats = {
    daily: {
      ridesAccepted: 25,
      ridesDeclined: 5,
      earnings: "$70",
      ratings: "4.8/5",
    },
    weekly: {
      ridesAccepted: 112,
      ridesDeclined: 18,
      earnings: "$450",
      ratings: "4.7/5",
    },
    monthly: {
      ridesAccepted: 475,
      ridesDeclined: 45,
      earnings: "$1800",
      ratings: "4.8/5",
    },
  }
  