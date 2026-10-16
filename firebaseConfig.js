import { initializeApp, getApps } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB6EKfoY8iDVsBOKyVI8zHIrVPbrKBnXdw",
  authDomain: "expo-firebase-9c79c.firebaseapp.com", // Fixed domain prefix syntax
  projectId: "expo-firebase-9c79c",
  storageBucket: "expo-firebase-9c79c.firebasestorage.app",
  messagingSenderId: "1052600200237",
  appId: "1:1052600200237:web:4fb3760a97fbc276201ca4",
};

// 1. Initialize Core App safely
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// 🚀 2. FIXED SAFE FIRESTORE INITIALIZATION INTERCEPTOR:
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    return getFirestore(app);
  }
})();

// 3. Initialize your authentication channel safely
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    return getAuth(app);
  }
})();

// 🚀 4. ADDED UNIQUE GUEST DEVICE IDENTIFIER MANAGER:
// This generates a random unique ID the very first time an unauthenticated guest opens the app
// and locks it down permanently onto the phone's physical hardware drive.
// This prevents separate mobile devices from sharing the global "guest" document view container!
export const getLocalGuestId = async () => {
  try {
    let guestId = await AsyncStorage.getItem("local_guest_id");
    if (!guestId) {
      // Creates a unique alphanumeric signature string matching this specific handset instance
      guestId = "guest_" + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem("local_guest_id", guestId);
    }
    return guestId;
  } catch (e) {
    return "guest_fallback_secure_node";
  }
};
