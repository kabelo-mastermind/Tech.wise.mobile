import { StatusBar } from 'expo-status-bar'
import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, Dimensions, ScrollView, Image, FlatList, TouchableOpacity } from 'react-native'
import { Icon } from 'react-native-elements'
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const SCREEN_WIDTH = Dimensions.get('window').width
import { colors, parameters } from '../global/styles'
import { filterData, carsAround } from '../global/data'
import { mapStyle } from "../global/mapStyle"

const HomeScreen = ({ navigation }) => {

    const [notifications, setNotifications] = useState([]);
    const [latlng, setLatLng] = useState({})
    // console.log(navigation);
    
    const checkPermission = async () => {
        const hasPermission = await Location.requestForegroundPermissionsAsync();
        if (hasPermission.status === 'granted') {
            const permission = await askPermission();
            return permission
        }
        return true
    };


    const askPermission = async () => {
        const permission = await Location.requestForegroundPermissionsAsync()
        return permission.status === 'granted';
    };


    const getLocation = async () => {
        try {
            const { granted } = await Location.requestForegroundPermissionsAsync();
            if (!granted) return;

            const { coords: { latitude, longitude } } = await Location.getCurrentPositionAsync();
            setLatLng({ latitude, longitude });
        } catch (err) {
            console.error("Error fetching location:", err);
        }
    };
    const fetchNotifications = () => {
        // Simulate fetching notifications from an API
        setNotifications([
            { id: 1, message: 'System update scheduled for tonight at 11 PM.' },
            { id: 2, message: 'New bonus program: Earn extra for completing 10 trips today!' }
        ]);
    };

    const _map = useRef(1);


    useEffect(() => {
        checkPermission();
        fetchNotifications();
        getLocation()
            // console.log(latlng)
            , []
    }, [])


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* Add the onPress to open the drawer */}
                <View style={styles.icon1}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Icon type="material-community" name="menu" color={colors.white} size={40} />
                    </TouchableOpacity>
                </View>

            </View>
            <ScrollView bounces={false}>
                <View style={styles.home}>
                    <Text style={styles.text1}>Simplify Your Journey</Text>
                    <View style={styles.view1}>
                        <View style={styles.view8}>

                            <Text style={styles.text2}>
                                Relax and leave the driving to us. Whether it’s work, errands, or leisure, we’ve got you covered.
                            </Text>
                            <TouchableOpacity onPress={() => { navigation.navigate("PendingRequests", { state: 0 }); }}>
                                <View style={styles.button1}>
                                    <Text style={styles.button1Text}>Drive with us</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View>
                            <Image
                                style={styles.image1}
                                source={require('../../assets/uberCar.png')}
                            />
                        </View>
                    </View>
                </View>



                <View>
                    <FlatList
                        numRows={4}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        data={filterData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.view2}>
                                    <Image style={styles.image2} source={item.image} />
                                </View>
                                <View>
                                    <Text style={styles.title}>{item.name}</Text>
                                </View>
                            </View>
                        )}
                    />

                </View>
                <Text style={styles.text4}>Drivers Around you</Text>

                <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MapView
                        ref={_map}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        customMapStyle={mapStyle}
                        showsUserLocation={true}
                        followsUserLocation={true}
                        initialRegion={{ ...carsAround[0], latitudeDelta: 0.008, longitudeDelta: 0.008 }}

                    >

                        {carsAround.map((item, index) =>
                            <Marker coordinate={item} key={index.toString()}>
                                <Image
                                    source={require('../../assets/carMarker.png')}
                                    style={styles.carsAround}
                                    resizeMode="cover"
                                />
                            </Marker>

                        )

                        }

                    </MapView>
                </View>
                {/* System Notifications Section */}
                <View style={styles.notifications}>
                    <Text style={styles.sectionTitle}>System Notifications</Text>
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <View key={notification.id} style={styles.notificationItem}>
                                <Icon
                                    type="material-community"
                                    name="bell"
                                    color="#007bff"
                                    size={24}
                                    style={styles.notificationIcon}
                                />
                                <Text style={styles.notificationText}>
                                    {notification.message}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noNotificationsText}>No notifications at this time.</Text>
                    )}
                </View>
            </ScrollView>
            <StatusBar style="light" backgroundColor="#2058c0" translucent={true} />
        </View>
    );
};

export default HomeScreen;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        paddingBottom: 30,
        paddingTop: parameters.statusBarHeight
    },

    header: {
        backgroundColor: colors.blue,
        height: parameters.headerHeight,
        alignItems: "flex-start"

    },

    image1: {

        height: 100,
        width: 100,

    },

    image2: {
        height: 60, width: 60,
        borderRadius: 30,
    },

    home: {
        backgroundColor: colors.blue,
        paddingLeft: 20,

    },

    text1: {
        color: colors.white,
        fontSize: 21,
        paddingBottom: 20,
        paddingTop: 20
    },

    text2: {
        color: colors.white,
        fontSize: 16
    },

    view1: {
        flexDirection: "row",
        flex: 1,
        paddingTop: 30
    },

    button1: {
        height: 40,
        width: 150,
        backgroundColor: colors.black,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20
    },

    button1Text: {
        color: colors.white,
        fontSize: 17,
        marginTop: -2

    },
    card: {
        alignItems: "center",
        margin: SCREEN_WIDTH / 22

    },

    view2: {
        marginBottom: 5,
        borderRadius: 15,
        backgroundColor: colors.grey6
    },

    title: {
        color: colors.black,
        fontSize: 16
    },
    view3: {
        flexDirection: "row",
        marginTop: 5,
        height: 50,
        backgroundColor: colors.grey6,
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 15

    },
    text3: {
        marginLeft: 15,
        fontSize: 20,
        color: colors.black
    },

    view4: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 15,
        backgroundColor: "white",
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 20
    },

    view5: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        paddingVertical: 25,
        justifyContent: "space-between",
        marginHorizontal: 15,
        borderBottomColor: colors.grey4,
        borderBottomWidth: 1,
        flex: 1
    },

    view6: {


        alignItems: "center",
        flex: 5,
        flexDirection: "row"
    },
    view7: {
        backgroundColor: colors.grey6,
        height: 40,
        width: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 20

    },

    map: {

        height: 150,
        marginVertical: 0,
        width: SCREEN_WIDTH * 0.92
    },

    text4: {
        fontSize: 20,
        color: colors.black,
        marginLeft: 20,
        marginBottom: 20
    },

    icon1: {
        marginLeft: 10,
        marginTop: 5
    },

    view8: {
        flex: 4,
        marginTop: -25
    },
    carsAround: {
        width: 28,
        height: 14,

    },

    location: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.blue,
        alignItems: "center",
        justifyContent: "center"

    },

    view9: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "white"
    }
    ,
    notifications: {
        // backgroundColor: '#f0f4ff', // Light blue background for a soft look
        borderRadius: 10,
        padding: 20,
        margin: 15,
        // shadowColor: '#000',
        // shadowOffset: {
        //     width: 0,
        //     height: 2,
        // },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3, // For Android shadow
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333', // Darker text for better readability
        marginBottom: 10,
    },
    notificationItem: {
        backgroundColor: '#ffffff', // White background for individual notifications
        padding: 15,
        borderRadius: 8,
        marginVertical: 5,
        flexDirection: 'row', // Align icon and text horizontally
        alignItems: 'center', // Center align items vertically
    },
    notificationIcon: {
        marginRight: 10, // Space between icon and text
    },
    notificationText: {
        fontSize: 16,
        color: '#555', // Slightly lighter text color
    },
    noNotificationsText: {
        fontSize: 16,
        color: '#999', // Grey color for no notifications message
        textAlign: 'center',
    },
})