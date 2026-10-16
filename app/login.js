import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { auth, db, getLocalGuestId } from "../firebaseConfig";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AlertModal from "../components/alertModal";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const GOOGLE_WEB_CLIENT_ID =
  "1052600200237-l4hujpqh5d3itrmmre2rmoqginmne8fa.apps.googleusercontent.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal configurations tracker state
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  const router = useRouter();

  // 🚀 Configure Native Google Sign-In on component mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  // 🔄 GUEST NOTES MIGRATION ENGINE
  const migrateGuestNotesToUser = async (userUid) => {
    try {
      if (typeof getLocalGuestId !== "function") return;
      const guestId = await getLocalGuestId();
      if (!guestId) return;

      const q = query(
        collection(db, "user_notes"),
        where("userId", "==", guestId),
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
          const noteRef = doc(db, "user_notes", document.id);
          batch.update(noteRef, { userId: userUid });
        });
        await batch.commit();
        console.log(
          `Migrated ${querySnapshot.size} guest notes to user ${userUid}`,
        );
      }
    } catch (error) {
      console.log("Error migrating guest notes:", error);
    }
  };

  const handleChange = (setter) => (value) => {
    setter(value);
    if (error) {
      setError(null);
    }
  };

  // 📧 Email / Password Sign In
  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(async (userCredentials) => {
        const user = userCredentials.user;

        if (!user.emailVerified) {
          sendEmailVerification(user).catch((e) =>
            console.log("Verification email re-send hiccup:", e.message),
          );

          setLoading(false);

          setModalConfig({
            visible: true,
            title: "Account Unverified ✉️",
            message:
              "You haven't verified your email profile yet. We just pushed a fresh activation link to your inbox/spam folder. Please verify it to enter your workspace!",
            type: "error",
          });

          setTimeout(() => {
            setModalConfig((prev) => ({ ...prev, visible: false }));
            router.replace("/verify");
          }, 3500);

          return;
        }

        await migrateGuestNotesToUser(user.uid);

        setLoading(false);

        setModalConfig({
          visible: true,
          title: "Login Successful",
          message:
            "Welcome back to your personalized MoonBeam workspace dashboard! 🌙📔",
          type: "success",
        });

        setTimeout(() => {
          setModalConfig((prev) => ({ ...prev, visible: false }));
          router.replace("/Taskpage");
        }, 1000);
      })
      .catch((error) => {
        let friendlyMsg = error.message;
        if (error.code === "auth/invalid-email")
          friendlyMsg = "Invalid email address format.";
        if (
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password" ||
          error.code === "auth/invalid-credential"
        )
          friendlyMsg = "Incorrect email address or password string.";

        setError(friendlyMsg);
        setLoading(false);
      });
  };

  // 🌐 Native Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.data?.idToken || response.idToken;

      if (!idToken) {
        throw new Error("No ID Token returned from Google Sign-In");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      await migrateGuestNotesToUser(userCredential.user.uid);
      setLoading(false);

      setModalConfig({
        visible: true,
        title: "Login Successful",
        message: "Welcome back to your workspace dashboard! 🌙📔",
        type: "success",
      });

      setTimeout(() => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        router.replace("/Taskpage");
      }, 1000);
    } catch (err) {
      setLoading(false);
      console.log("Google Sign-In Error:", err);
      if (err.code !== "ASYNC_OP_IN_PROGRESS" && err.code !== "12501") {
        setError("Google Sign-In failed. Please try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: "Sign In", // Cleaned up text headers
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.navigate("/sign")}
              activeOpacity={0.7}
              style={styles.backButtonBackground}
            >
              <Ionicons name="arrow-back" size={22} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.card}>
        <View style={styles.headerBlock}>
          {/* Branded welcome headings matching login contexts */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your cloud-synced task logs and notes drawer
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            placeholder="example@mail.com"
            placeholderTextColor="#a3a1a1"
            value={email}
            onChangeText={handleChange(setEmail)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, error && !email && styles.inputError]}
          />

          <Text style={styles.inputLabel}>Password</Text>
          {/* 🚀 FIXED: Wrapped the password input field and the eye button together inside a unified row container */}
          <View
            style={[
              styles.passwordContainer,
              error && !password && styles.inputError,
            ]}
          >
            <TextInput
              placeholder="Enter secure password"
              placeholderTextColor="#a3a1a1"
              value={password}
              onChangeText={handleChange((pass) => setPassword(pass))}
              secureTextEntry={!showPassword} // 🚀 Swaps masking state dynamically
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.6}
              style={styles.eyeIconContainer}
            >
              <Ionicons
                name={showPassword ? "eye" : "eye-off"}
                size={22}
                color="#006989"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogin} // Pointed to correct execution handle
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.signupBtn, loading && styles.btnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.logcon}>
          <Text style={styles.logLabel}>Don't have an account? </Text>
          {/* 🚀 FIXED: Points route direction out to /signup to navigate registration flows cleanly */}
          <TouchableOpacity onPress={() => router.replace("/sign")}>
            <Text style={styles.logged}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        disabled={!request}
        activeOpacity={0.8}
        onPress={() => promptAsync()} // Opens the secure Google login web layout view!
        style={styles.googleIconButtonRow}
      >
        <Ionicons
          name="logo-google"
          size={20}
          color="#fff"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.googleButtonLabelText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* 🚀 DROPPED THE REUSABLE POP-UP MODAL ENGINE CAPTURE BAR */}
      <AlertModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showButton={false}
      />
    </KeyboardAvoidingView>
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
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerBlock: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#006989",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#a3a1a1",
    marginTop: 6,
    lineHeight: 20,
  },
  formGroup: {
    gap: 4,
  },
  backButtonBackground: {
    width: 38,
    height: 38,
    backgroundColor: "#fff",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#006989",
    marginTop: 14,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderColor: "#d1d5db",
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f2937",
  },
  // 🚀 STYLES FOR THE UNIFIED PASSWORD FIELD ROW CONTAINER:
  passwordContainer: {
    width: "100%",
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderColor: "#d1d5db",
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#1f2937",
  },
  eyeIconContainer: {
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
  },
  signupBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#006989",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: {
    backgroundColor: "#a3a1a1",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  logLabel: {
    color: "#a3a1a1",
    fontSize: 14,
  },
  logged: {
    color: "#006989",
    fontWeight: "bold",
    fontSize: 14,
  },
  // 🚀 SLICK GOOGLE BUTTON ROW CONTAINER
  googleIconButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    backgroundColor: "#de4032", // Sharp corporate vibrant Google red brand color
    borderRadius: 14,
    marginTop: 14,
    elevation: 2, // Smooth elevation drop shadow for Android devices
    shadowColor: "#000", // Drop shadow styling configurations for iOS viewports
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // 🚀 BOLD WHITE BUTTON TYPOGRAPHY TEXT NODE
  googleButtonLabelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
});
