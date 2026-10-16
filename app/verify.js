import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { auth } from "../firebaseConfig";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AlertModal from "../components/alertModal";
import { signOut, sendEmailVerification, deleteUser } from "firebase/auth"; // 🚀 Added deleteUser

export default function VerifyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  const checkVerificationStatus = async () => {
    setError(null);
    setLoading(true);
    const user = auth.currentUser;

    if (user) {
      await user.reload(); // 🚀 Refreshes verification flags live
      if (user.emailVerified) {
        setLoading(false);
        setModalConfig({
          visible: true,
          title: "Email Verified",
          message: "Welcome  🌙📔",
          type: "success",
        });
        setTimeout(() => {
          setModalConfig((prev) => ({ ...prev, visible: false })); // Hide the modal barrier first!
          router.replace("/Taskpage"); // Instantly swap viewport focus to your workspace dashboard
        }, 1000);
      } else {
        setLoading(false);
        setError("Link not verified yet. Please check your junk/spam folder.");
      }
    } else {
      setLoading(false);
      router.replace("/");
    }
  };

  // 🚀 ACTION 1: Retrigger the email sender in case it got dropped
  const handleResendEmail = () => {
    setResending(true);
    setError(null);
    const user = auth.currentUser;

    if (user) {
      sendEmailVerification(user)
        .then(() => {
          setResending(false);
          alert("A fresh activation link has been pushed to your inbox!");
        })
        .catch(() => {
          setResending(false);
          setError(
            "Too many requests. Please wait a few minutes before resending.",
          );
        });
    }
  };

  // 🚀 ACTION 2: Completely erases the ghost account so they can fix a typo and try again!
  const handleCancelAndClear = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await deleteUser(user); // Removes them from Firebase completely so the email is no longer "already registered"
      } catch (e) {
        await signOut(auth);
      }
    }
    router.replace("/sign");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Verify Account",
          headerTitleAlign: "center",
          headerLeft: () => null,
        }}
      />

      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Ionicons name="mail-open" size={32} color="#006989" />
        </View>

        <Text style={styles.title}>Confirm Your Email</Text>
        <Text style={styles.subtitle}>
          An activation link has been pushed to your inbox. Click it, then
          return here to confirm.
        </Text>
        <Text style={styles.subtitle}>Kindly check your spam folder.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={checkVerificationStatus}
          disabled={loading}
          style={styles.confirmBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>I've Verified My Email</Text>
          )}
        </TouchableOpacity>

        {/* 🚀 Resend Option */}
        <TouchableOpacity
          onPress={handleResendEmail}
          disabled={resending}
          style={styles.resendLink}
        >
          {resending ? (
            <ActivityIndicator color="#006989" size="small" />
          ) : (
            <Text style={styles.resendText}>
              Didn't get an email? Resend link
            </Text>
          )}
        </TouchableOpacity>

        {/* 🚀 Emergency Account Clear out */}
        <TouchableOpacity
          onPress={handleCancelAndClear}
          style={styles.cancelLink}
        >
          <Text style={styles.cancelText}>Cancel & Fix Typo Email</Text>
        </TouchableOpacity>
      </View>

      <AlertModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showButton={false}
      />
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
    padding: 28,
    alignItems: "center",
    elevation: 4,
  },
  iconBadge: {
    width: 64,
    height: 64,
    backgroundColor: "#e0f2fe",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#006989" },
  subtitle: {
    fontSize: 14,
    color: "#a3a1a1",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  confirmBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#006989",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  resendLink: { marginTop: 18 },
  resendText: {
    color: "#006989",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  cancelLink: { marginTop: 14 },
  cancelText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
});
