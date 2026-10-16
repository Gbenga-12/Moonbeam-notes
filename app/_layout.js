import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import * as NavigationBar from "expo-navigation-bar";
import { ActivityIndicator, View, LogBox, Platform } from "react-native";

LogBox.ignoreLogs([
  "@firebase/firestore: Firestore (12.19.0): Error using user provided cache",
]);

export default function Layout() {
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 🚀 THE WIRE: Listens to the device session on boot
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!user.emailVerified) {
          // 🔒 Account exists but unverified? Lock them in the verify gate!
          router.replace("/verify");
        } else {
          // 🔓 Account exists and verified? Log them straight into the workspace dashboard!
          router.replace("/Taskpage");
        }
      } else {
        // 🚀 THE FIX FOR GUESTS: If there is no active account token on boot,
        // we forcefully ground them on your main landing welcome page ("/") so it stands perfectly still!
        router.replace("/");
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      // 1. Hide the bottom system navigation bar
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});

      // 2. Set sticky overlay behavior if supported in installed module version
      if (typeof NavigationBar.setBehaviorAsync === "function") {
        NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
      }
    }
  }, []); // 👈 Fixed: Closed this useEffect properly!

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#eaebed",
        }}
      >
        <ActivityIndicator size="large" color="#006989" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="Taskpage" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ headerShown: false }} />
      <Stack.Screen name="editor" options={{ headerShown: true }} />
    </Stack>
  );
}
