import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 🚀 Added flexible control props: showButton, buttonText, showCancel, cancelText, onCancel
export default function AlertModal({
  visible,
  title,
  message,
  type,
  onClose,
  showButton = true, // Defaults to true unless you say false
  buttonText = "Continue", // Default text label
  showCancel = false, // Defaults to hiding secondary buttons
  cancelText = "Cancel",
  onCancel,
}) {
  const isSuccess = type === "success";
  const accentColor = isSuccess ? "#16a34a" : "#ef4444";
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdropOverlay}>
        <View style={styles.alertCard}>
          {/* Status Icon Indicator */}
          <View
            style={[
              styles.iconRing,
              { backgroundColor: isSuccess ? "#f0fdf4" : "#fef2f2" },
            ]}
          >
            <Ionicons name={iconName} size={36} color={accentColor} />
          </View>

          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          {/* 🚀 DYNAMIC BUTTON POSITION LAYOUT GENERATOR */}
          {showButton && (
            <View
              style={[styles.buttonGroupRow, showCancel && styles.splitLayout]}
            >
              {/* Optional Secondary Action Button */}
              {showCancel && (
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.8}
                  style={[styles.actionBtn, styles.cancelBtnOutline]}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#006989" },
                  showCancel && styles.halfWidth,
                ]}
              >
                <Text style={styles.btnText}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  alertCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 5,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: "#a3a1a1",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },

  // 🚀 Flexible Layout Style Grid Rules
  buttonGroupRow: { width: "100%", gap: 12 },
  splitLayout: { flexDirection: "row", justifyContent: "space-between" },
  actionBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  halfWidth: { flex: 1 },

  cancelBtnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  cancelBtnText: { color: "#4b5563", fontSize: 15, fontWeight: "600" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
