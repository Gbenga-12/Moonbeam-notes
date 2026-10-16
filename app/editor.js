import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Text,
  Keyboard,
} from "react-native";

import AssistantModal from "../components/AssistantModal";

import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { Audio } from "expo-audio"; // or your audio library

import {
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { db, auth, getLocalGuestId } from "../firebaseConfig";
import AlertModal from "../components/alertModal";
import NoteImageModal from "../components/NoteImageGrid";
import { useVoiceDictation } from "../components/useVoiceDictation";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  summarizeNote,
  generateTags,
  refineNoteText,
  expandNote,
  shortenNote,
  extractActionItems,
  generateTitle,
} from "../services/ai";

// ==================================================
// IMAGE ICON
// ==================================================

const ImageIconSVG = ({ color = "#ffffff", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <Path
      d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 8.5 10Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <Path
      d="M21 15L16 10L5 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ==================================================
// EDITOR
// ==================================================

export default function NoteEditor() {
  const { id, existingTitle, existingBody } = useLocalSearchParams();

  const [title, setTitle] = useState(existingTitle || "");
  const [body, setBody] = useState(existingBody || "");

  const [images, setImages] = useState([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const [saving, setSaving] = useState(false);

  const [headerColor, setHeaderColor] = useState("#006989");
  const [isDarkModeActive, setIsDarkModeActive] = useState(false);

  // ==================================================
  // ANIMATION
  // ==================================================

  const waveScale1 = useRef(new Animated.Value(1)).current;
  const waveScale2 = useRef(new Animated.Value(1)).current;

  // ==================================================
  // REFS
  // ==================================================

  const scrollViewRef = useRef(null);
  const bodyInputRef = useRef(null);
  const titleInputRef = useRef(null);

  // ==================================================
  // AI STATE
  // ==================================================

  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState([]);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);

  // ==================================================
  // ALERT STATE
  // ==================================================

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
    isDeleteAction: false,
  });

  // ==================================================
  // THEME
  // ==================================================

  useEffect(() => {
    const checkThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("appDarkMode");

        if (savedTheme !== null) {
          setIsDarkModeActive(savedTheme === "true");
        }
      } catch (error) {
        console.log("Error fetching theme in editor:", error);
      }
    };

    checkThemePreference();
  }, []);

  const requestPermission = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access microphone is required!");
    }
  };

  // ==================================================
  // LOAD EXISTING NOTE IMAGES
  // ==================================================

  useEffect(() => {
    if (!id) return;

    const fetchExistingNote = async () => {
      try {
        const docRef = doc(db, "user_notes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.attachedImages && Array.isArray(data.attachedImages)) {
            setImages(data.attachedImages);
          }
        }
      } catch (error) {
        console.log("Error loading note images:", error);
      }
    };

    fetchExistingNote();
  }, [id]);

  // ==================================================
  // RANDOM HEADER COLOR
  // ==================================================

  useEffect(() => {
    if (!id) {
      const letters = "123456789ABCDEF";

      let color = "#";

      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 15)];
      }

      setHeaderColor(color);
    }
  }, [id]);

  // ==================================================
  // KEYBOARD
  // ==================================================

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      // IMPORTANT:
      // Do NOT manually scroll here.
      //
      // KeyboardAwareScrollView handles this.
    });

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      // Nothing needed here.
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  // ==================================================
  // VOICE DICTATION
  // ==================================================

  const { isListening, toggleListening } = useVoiceDictation(
    (transcript) => {
      setBody((prev) => (prev ? `${prev} ${transcript}` : transcript));

      // Don't manually scroll here either.
      //
      // KeyboardAwareScrollView will keep the
      // currently focused input visible.
    },

    (errorPayload) => {
      setModalConfig({
        visible: true,
        title: errorPayload.title || "Dictation Error",
        message: errorPayload.message || "Speech recognition failed.",
        type: "error",
        isDeleteAction: false,
      });
    },
  );

  // ==================================================
  // MIC ANIMATION
  // ==================================================

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const createPulseLoop = (animValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),

          Animated.timing(animValue, {
            toValue: 2,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),

          Animated.timing(animValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const wave1 = createPulseLoop(waveScale1, 0);
    const wave2 = createPulseLoop(waveScale2, 600);

    wave1.start();
    wave2.start();

    return () => {
      wave1.stop();
      wave2.stop();

      waveScale1.setValue(1);
      waveScale2.setValue(1);
    };
  }, [isListening]);

  // ==================================================
  // AI ASSISTANT
  // ==================================================

  // ==================================================
  // AI ASSISTANT
  // ==================================================

  const handleAIAssistantAction = async (action) => {
    if (!body.trim()) {
      setAiModalVisible(false);

      setModalConfig({
        visible: true,
        title: "Empty Note",
        message: "Add some note content before using the AI Assistant.",
        type: "error",
        isDeleteAction: false,
      });

      return;
    }

    setAiLoading(action.id);

    try {
      switch (action.id) {
        // ------------------------------------------
        // SUMMARY
        // ------------------------------------------

        case "summary": {
          const result = await summarizeNote(body);
          setSummary(result);
          break;
        }

        // ------------------------------------------
        // TITLE
        // ------------------------------------------

        case "title": {
          const result = await generateTitle(body);
          if (result) {
            setTitle(result);
          }
          break;
        }

        // ------------------------------------------
        // TAGS
        // ------------------------------------------

        case "tags": {
          const generatedTags = await generateTags(body);
          if (Array.isArray(generatedTags)) {
            setTags((prev) => [...new Set([...prev, ...generatedTags])]);
          }
          break;
        }

        // ------------------------------------------
        // FIX
        // ------------------------------------------

        case "fix": {
          const result = await refineNoteText(body, "fix");
          if (result) {
            setBody(result);
          }
          break;
        }

        // ------------------------------------------
        // POLISH
        // ------------------------------------------

        case "polish": {
          const result = await refineNoteText(body, "polish");
          if (result) {
            setBody(result);
          }
          break;
        }

        // ------------------------------------------
        // BULLETS
        // ------------------------------------------

        case "bullets": {
          const result = await refineNoteText(body, "bullets");
          if (result) {
            setBody(result);
          }
          break;
        }

        // ------------------------------------------
        // EXPAND
        // ------------------------------------------

        case "expand": {
          const result = await expandNote(body);
          if (result) {
            setBody(result);
          }
          break;
        }

        // ------------------------------------------
        // SHORTEN
        // ------------------------------------------

        case "shorten": {
          const result = await shortenNote(body);
          if (result) {
            setBody(result);
          }
          break;
        }

        // ------------------------------------------
        // ACTION ITEMS
        // ------------------------------------------

        case "actions": {
          const tasks = await extractActionItems(body);

          if (Array.isArray(tasks) && tasks.length > 0) {
            const actionText = tasks.map((task) => `☐ ${task}`).join("\n");

            setBody((prev) => {
              const currentText = prev.trim();
              if (!currentText) return actionText;
              return `${currentText}\n\n${actionText}`;
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.log(`AI ${action.id} error:`, error);

      setModalConfig({
        visible: true,
        title: "AI Assistant Error",
        message:
          error?.message || "Something went wrong while processing your note.",
        type: "error",
        isDeleteAction: false,
      });
    } finally {
      // 👈 ALWAYS RUNS: Stops the spinner & closes modal on success OR error
      setAiLoading(null);
      setAiModalVisible(false);
    }
  };

  // ==================================================
  // SAVE NOTE
  // ==================================================

  const handleSaveNote = async () => {
    if (!title.trim() && !body.trim() && images.length === 0) {
      setModalConfig({
        visible: true,
        title: "Empty Note",
        message: "Cannot save an empty Note",
        type: "error",
        isDeleteAction: false,
      });

      setTimeout(() => {
        setModalConfig((prev) => ({
          ...prev,
          visible: false,
        }));
      }, 1200);

      return;
    }

    setSaving(true);

    const currentUser = auth.currentUser;

    const targetUserId = currentUser
      ? currentUser.uid
      : await getLocalGuestId();

    try {
      const notePayload = {
        noteTitle: title.trim(),
        noteBody: body.trim(),
        attachedImages: images,
        lastModified: serverTimestamp(),
      };

      if (id) {
        const docRef = doc(db, "user_notes", id);

        await updateDoc(docRef, notePayload);
      } else {
        await addDoc(collection(db, "user_notes"), {
          ...notePayload,
          userId: targetUserId,
          createdAt: serverTimestamp(),
          themeColor: headerColor,
        });
      }

      setModalConfig({
        visible: true,
        title: id ? "Changes Saved! 💾" : "Note Secured! 🔒",
        message: "Your note has been saved.",
        type: "success",
        isDeleteAction: false,
      });

      setTimeout(() => {
        setModalConfig((prev) => ({
          ...prev,
          visible: false,
        }));

        router.back();
      }, 1000);
    } catch (error) {
      setModalConfig({
        visible: true,
        title: "Storage Error ❌",
        message: "Could not save note: " + error.message,
        type: "error",
        isDeleteAction: false,
      });

      setSaving(false);
    }
  };

  // ==================================================
  // DELETE NOTE
  // ==================================================

  const handleConfirmedDelete = async () => {
    if (!id) return;

    setSaving(true);

    setModalConfig((prev) => ({
      ...prev,
      visible: false,
    }));

    try {
      const docRef = doc(db, "user_notes", id);

      await deleteDoc(docRef);

      router.back();
    } catch (err) {
      alert("Could not remove document: " + err.message);

      setSaving(false);
    }
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkModeActive ? "#121212" : "#f8fafc",
        },
      ]}
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <Stack.Screen
        options={{
          headerTitle: id ? "Edit Note" : "New Note",

          headerStyle: {
            backgroundColor: headerColor,
          },

          headerTintColor: "#fff",

          headerTitleAlign: "center",

          headerRight: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              {id && (
                <TouchableOpacity
                  onPress={() =>
                    setModalConfig({
                      visible: true,
                      title: "Erase This Note?",
                      message: "This action cannot be undone.",
                      type: "error",
                      isDeleteAction: true,
                    })
                  }
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setImageModalVisible(true)}
                style={{
                  position: "relative",
                }}
              >
                <ImageIconSVG color="#fff" size={24} />

                {images.length > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{images.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSaveNote} disabled={saving}>
                <Ionicons name="checkmark-sharp" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* ==================================================
          MAIN EDITOR
      ================================================== */}

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.editorBody}
        contentContainerStyle={styles.editorContent}
        /*
         * Let KeyboardAwareScrollView handle
         * keyboard positioning.
         */
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        /*
         * Reduced from 120.
         *
         * Huge values here can make the editor
         * jump more than expected.
         */
        extraScrollHeight={30}
        extraHeight={30}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================
            TITLE
        ================================================== */}

        <TextInput
          ref={titleInputRef}
          style={[
            styles.titleInput,
            {
              color: isDarkModeActive ? "#ffffff" : "#0f172a",
            },
          ]}
          placeholder="Note Title"
          placeholderTextColor={isDarkModeActive ? "#64748b" : "#94a3b8"}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          multiline={true}
          blurOnSubmit={true}
          textAlignVertical="top"

          /*
           * IMPORTANT:
           * No manual scrolling here.
           */
        />

        {/* ==================================================
            BODY
        ================================================== */}

        <TextInput
          ref={bodyInputRef}
          style={[
            styles.bodyInput,
            {
              color: isDarkModeActive ? "#e2e8f0" : "#334155",
            },
          ]}
          placeholder="Start typing or tap the mic to dictate..."
          placeholderTextColor={isDarkModeActive ? "#64748b" : "#94a3b8"}
          multiline
          value={body}
          onChangeText={setBody}
          /*
           * IMPORTANT:
           * No scrollToEnd here.
           */
          textAlignVertical="top"
          /*
           * This helps KeyboardAwareScrollView
           * calculate the input's position.
           */
          scrollEnabled={false}
        />

        {/* ==================================================
            AI SUMMARY
        ================================================== */}

        {summary ? (
          <View style={styles.summaryBanner}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>💡 AI Summary</Text>

              <TouchableOpacity onPress={() => setSummary("")}>
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color="#e45a0a"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* ==================================================
            TAGS
        ================================================== */}

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, idx) => (
              <View key={`${tag}-${idx}`} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>

                <TouchableOpacity
                  onPress={() =>
                    setTags((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Ionicons name="close" size={12} color="#CBA6F7" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* ==================================================
          FLOATING BUTTONS
      ================================================== */}

      <View style={styles.fabStackContainer}>
        {/* AI */}

        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: isDarkModeActive ? "#8B5CF6" : "#7C3AED",
            },
          ]}
          onPress={() => setAiModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={22} color={headerColor} />
        </TouchableOpacity>

        {/* MIC */}

        <View style={styles.micWrapper}>
          {isListening && (
            <>
              <Animated.View
                style={[
                  styles.waveRing,
                  {
                    transform: [
                      {
                        scale: waveScale1,
                      },
                    ],
                    opacity: waveScale1.interpolate({
                      inputRange: [1, 2],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.waveRing,
                  {
                    transform: [
                      {
                        scale: waveScale2,
                      },
                    ],
                    opacity: waveScale2.interpolate({
                      inputRange: [1, 2],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
            </>
          )}

          <TouchableOpacity
            onPress={toggleListening}
            style={[
              styles.fabButton,
              {
                backgroundColor: isListening ? "#ef4444" : headerColor,
              },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={26}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================================================
          AI MODAL
      ================================================== */}

      <AssistantModal
        visible={aiModalVisible}
        onClose={() => {
          if (!aiLoading) {
            setAiModalVisible(false);
          }
        }}
        onAction={handleAIAssistantAction}
        loading={aiLoading}
        isDarkMode={isDarkModeActive}
      />

      {/* ==================================================
          IMAGE MODAL
      ================================================== */}

      <NoteImageModal
        visible={imageModalVisible}
        onClose={() => setImageModalVisible(false)}
        images={images}
        setImages={setImages}
        isDarkMode={isDarkModeActive}
      />

      {/* ==================================================
          ALERT
      ================================================== */}

      <AlertModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        isDeleteAction={modalConfig.isDeleteAction}
        onConfirm={handleConfirmedDelete}
        onClose={() =>
          setModalConfig((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  editorBody: {
    flex: 1,
  },

  editorContent: {
    padding: 20,

    /*
     * Keep enough room for the FABs and keyboard.
     */
    paddingBottom: 180,

    /*
     * Important:
     * Don't force the content to fill the whole
     * ScrollView unnecessarily.
     */
    flexGrow: 1,
  },

  titleInput: {
    fontSize: 26,
    fontWeight: "bold",

    width: "100%",

    borderBottomWidth: 1.5,
    borderBottomColor: "#eaebed",

    paddingBottom: 14,
    marginBottom: 28,

    textAlignVertical: "top",
  },

  bodyInput: {
    fontSize: 20,
    lineHeight: 28,

    marginTop: 10,

    /*
     * Enough initial writing area without
     * forcing weird scrolling.
     */
    minHeight: 180,

    paddingBottom: 20,

    textAlignVertical: "top",
  },

  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -6,

    backgroundColor: "#ef4444",

    borderRadius: 8,

    width: 16,
    height: 16,

    justifyContent: "center",
    alignItems: "center",
  },

  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },

  fabStackContainer: {
    position: "absolute",

    bottom: 28,
    right: 24,

    alignItems: "center",

    gap: 14,
  },

  fabButton: {
    width: 56,
    height: 56,

    borderRadius: 28,

    alignItems: "center",
    justifyContent: "center",

    elevation: 6,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.3,
    shadowRadius: 4.5,
  },

  micWrapper: {
    position: "relative",

    alignItems: "center",
    justifyContent: "center",
  },

  waveRing: {
    position: "absolute",

    width: 56,
    height: 56,

    borderRadius: 28,

    backgroundColor: "#ef4444",
  },

  summaryBanner: {
    backgroundColor: "rgba(240, 15, 15, 0.08)",

    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",

    padding: 12,

    borderRadius: 8,

    marginTop: 20,
  },

  summaryHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 4,
  },

  summaryTitle: {
    color: "#8B5CF6",

    fontWeight: "bold",

    fontSize: 13,
  },

  summaryText: {
    color: "#64748b",

    fontSize: 14,

    lineHeight: 20,
  },

  tagsContainer: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 8,

    marginTop: 14,
  },

  tagPill: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: "#313244",

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 16,
  },

  tagText: {
    color: "#CBA6F7",

    fontSize: 12,

    fontWeight: "600",
  },
});
