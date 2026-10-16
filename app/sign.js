import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile, // 🚀 FIXED: Added profile update utility method
} from "firebase/auth";
import { useState } from "react";
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
import { auth } from "../firebaseConfig";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AlertModal from "../components/alertModal";

export default function Sign() {
  const [displayName, setDisplayName] = useState(""); // 🚀 FIXED: Added Name tracker state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  const handleChange = (setter) => (value) => {
    setter(value);
    if (error) {
      setError(null);
    }
  };

  const handleSignup = () => {
    // 🚀 FIXED: Checks that name input box contains text strings too
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(password);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!hasUppercase) {
      setError("Password needs at least one uppercase capital letter (A-Z).");
      return;
    }
    if (!hasLowercase) {
      setError("Password needs at least one lowercase small letter (a-z).");
      return;
    }
    if (!hasNumber) {
      setError("Password needs at least one numeric digit (0-9).");
      return;
    }
    if (!hasSpecialChar) {
      setError(
        "Password needs at least one special character character (e.g. @, #, $, !).",
      );
      return;
    }

    setError(null);
    setLoading(true);

    createUserWithEmailAndPassword(auth, email.trim(), password)
      .then(async (userCredentials) => {
        const firebaseUser = userCredentials.user;

        try {
          // 🚀 FIXED: Binds the user's name directly to their global auth account metadata profile!
          await updateProfile(firebaseUser, {
            displayName: displayName.trim(),
          });

          // Send verification link once profile upgrades successfully
          sendEmailVerification(firebaseUser)
            .then(() => {
              setModalConfig({
                visible: true,
                title: "Signup Successful",
                message:
                  "Verification email sent! Click the link inside your inbox to unlock your workspace. 🌙📔",
                type: "success",
              });
              setTimeout(() => {
                setModalConfig((prev) => ({ ...prev, visible: false }));
                router.replace("/verify");
              }, 1000);
              setLoading(false);
            })
            .catch(() => {
              setError(
                "Failed to send verification link. Check your email spelling.",
              );
              setLoading(false);
            });
        } catch (profileError) {
          setError("Failed to initialize user profile name.");
          setLoading(false);
        }
      })
      .catch((error) => {
        let friendlyMsg = error.message;
        if (error.code === "auth/invalid-email")
          friendlyMsg = "Invalid email address format.";
        if (error.code === "auth/weak-password")
          friendlyMsg = "Password is too weak according to server rules.";
        if (error.code === "auth/email-already-in-use")
          friendlyMsg = "This email is already registered.";

        setError(friendlyMsg);
        setLoading(false);
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: "Create Account",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace("/Home")}
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
          <Text style={styles.title}>Join MoonBeam</Text>
          <Text style={styles.subtitle}>
            Create your profile to start tracking workspace tasks
          </Text>
        </View>

        <View style={styles.formGroup}>
          {/* 🚀 FIXED: INJECTED THE FULL NAME INPUT ELEMENT BOX UP TOP */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            placeholder="John Doe"
            placeholderTextColor="#a3a1a1"
            value={displayName}
            onChangeText={handleChange(setDisplayName)}
            autoCapitalize="words"
            autoCorrect={false}
            style={[styles.input, error && !displayName && styles.inputError]}
          />

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
              onChangeText={handleChange((password) => setPassword(password))}
              secureTextEntry={!showPassword}
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
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.signupBtn, loading && styles.btnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.logcon}>
          <Text style={styles.footerLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.logged}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    marginBottom: 2, // Minor layout grid separation cushion
  },
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
  footerLabel: {
    color: "#a3a1a1",
    fontSize: 14,
  },
  logged: {
    color: "#006989",
    fontWeight: "bold",
    fontSize: 14,
  },
});
