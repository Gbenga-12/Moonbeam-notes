import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Modal,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function NoteImageModal({
  visible,
  onClose,
  images,
  setImages,
  isDarkMode,
}) {
  const [activePreview, setActivePreview] = useState(null);

  const handleAddImage = async () => {
    if (images.length >= 2) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Tap backdrop to dismiss */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Sheet takes up 45% of screen height at the bottom */}
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: isDarkMode ? "#1e293b" : "#ffffff" },
            ]}
          >
            {/* Drag Handle Bar */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
              >
                Attached Images ({images.length}/2)
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Image Pickers Row */}
            <View style={styles.sheetContent}>
              <View style={styles.gridRow}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.cardWrapper}>
                    <TouchableOpacity
                      style={styles.imageTouch}
                      activeOpacity={0.85}
                      onPress={() => setActivePreview(uri)}
                    >
                      <Image source={{ uri }} style={styles.thumbnail} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 2 && (
                  <TouchableOpacity
                    style={[
                      styles.addSlotBtn,
                      {
                        borderColor: isDarkMode ? "#334155" : "#cbd5e1",
                        backgroundColor: isDarkMode ? "#0f172a" : "#f1f5f9",
                      },
                    ]}
                    onPress={handleAddImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="add"
                      size={32}
                      color={isDarkMode ? "#94a3b8" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.addSlotText,
                        { color: isDarkMode ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      {images.length === 0
                        ? "Add First Image"
                        : "Add Second Image"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>

      {/* Full-Screen Lightbox Preview */}
      <Modal
        visible={!!activePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePreview(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.closeLightboxBtn}
            onPress={() => setActivePreview(null)}
          >
            <Ionicons name="close-outline" size={32} color="#fff" />
          </TouchableOpacity>

          {activePreview && (
            <Image
              source={{ uri: activePreview }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    height: "45%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: "rgba(150, 150, 150, 0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  doneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0284c7",
  },
  sheetContent: {
    flex: 1,
    paddingTop: 16,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cardWrapper: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  imageTouch: {
    width: "100%",
    height: "100%",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  addSlotBtn: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addSlotText: {
    fontSize: 12,
    fontWeight: "500",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeLightboxBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    zIndex: 10,
  },
  fullScreenImage: {
    width: "90%",
    height: "80%",
  },
});
