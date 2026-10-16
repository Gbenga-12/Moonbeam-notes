import { useEffect, useState } from "react"; // 🚀 Added state/effect management hooks
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { onAuthStateChanged } from "firebase/auth"; // Loaded the account state tracker
import { auth } from "../firebaseConfig"; // Loaded configuration tokens

export default function Sign() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true); // Tracks active disk memory scans

  useEffect(() => {
    // 🚀 THE SESSION TRACKER: Scans the phone's internal storage disk for an active login session token
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        // 🔒 AUTO-LOGIN BYPASS: If they have an active account, skip this welcome screen entirely!
        router.replace("/Taskpage");
      } else {
        // If they are a guest or logged out, stop loading and display your exact design UI card
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  // Show a clean matching indicator tracker while checking active user tokens on launch
  if (checkingAuth) {
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
    <View style={styles.container}>
      {/* Visual Workspace Card Wrapper */}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.card}>
        {/* Decorative Brand Icon Emblem */}
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>M</Text>
        </View>

        {/* Title Header Block */}
        <View style={styles.headerBlock}>
          <Text style={styles.logoTitle}>MoonBeam Notes</Text>
          <Text style={styles.subtitle}>
            Welcome to MBN. Organize your daily workspace effortlessly.
          </Text>
        </View>

        {/* Primary Action: Go to Sign Up / Next Screen */}
        <TouchableOpacity
          // 🚀 FIXED: Pointed path explicitly to your Taskpage file to unlock instant Guest Mode access!
          onPress={() => router.replace("/Taskpage")}
          activeOpacity={0.85}
          style={styles.actionButton}
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>

        {/* Subtle Footer Subtext */}
        <Text style={styles.footerText}>Secure Cloud Persistence Ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eaebed",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoBadge: {
    width: 64,
    height: 64,
    backgroundColor: "#006989",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
  },
  headerBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#006989",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#a3a1a1",
    marginTop: 8,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  actionButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#006989",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#006989",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 12,
    color: "#a3a1a1",
    marginTop: 24,
    fontStyle: "italic",
  },
});
