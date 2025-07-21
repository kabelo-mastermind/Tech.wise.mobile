import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, doc, setDoc, getDoc,query,where } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA78_auowszE7MsTqcHeMcQQurWdp8HIuo",
  authDomain: "nthomeapp-7da33.firebaseapp.com",
  projectId: "nthomeapp-7da33",
  storageBucket: "nthomeapp-7da33.appspot.com",
  messagingSenderId: "68267545029",
  appId: "1:68267545029:web:ee1092099328e9f1b8bbac",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = getAuth(app);
auth.setPersistence(getReactNativePersistence(AsyncStorage));

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db, collection, doc, setDoc, getDoc ,query,where};
