import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal, // 🚀 Added for the dynamic form sheet popup
  Switch, // 🚀 Added TextInput for the search bar field elements
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc, // Added for document reference path maps
  deleteDoc, // 🚀 Added deleteDoc function tool from Firestore
} from "firebase/firestore";
import { db, auth, getLocalGuestId } from "../firebaseConfig"; // 🚀 Added isolated guest device token tracker
import AlertModal from "../components/alertModal";

import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Taskpage() {
  const [dbNotes, setDbNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(false);

  const [userInitial, setUserInitial] = useState("G");
  const [accountName, setAccountName] = useState("Guest Mode");

  // 🚀 FEATURE 1: SEARCH FILTER INPUT STATE
  const [searchQuery, setSearchQuery] = useState("");

  // Target variable tracking note documents selected for deletion
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
    isDeleteAction: false, // 🚀 Added flag to split behaviors between logout alerts and delete alerts
  });
  // 🚀 SLIDE SHIELD LAYER SYSTEM HOOKS:
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [isDarkModeActive, setIsDarkModeActive] = useState(false);
  const router = useRouter();

  // Load the saved theme whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadThemeSetting = async () => {
        try {
          const savedTheme = await AsyncStorage.getItem("appDarkMode");
          if (savedTheme !== null) {
            setIsDarkModeActive(savedTheme === "true");
          }
        } catch (error) {
          console.log("Error loading theme:", error);
        }
      };
      loadThemeSetting();
    }, []),
  );

  // Toggle switch handler that writes straight to storage disk
  const toggleDarkModeSwitch = async (value) => {
    setIsDarkModeActive(value);
    try {
      await AsyncStorage.setItem("appDarkMode", value ? "true" : "false");
    } catch (error) {
      console.log("Error saving theme:", error);
    }
  };

  useEffect(() => {
    let dynamicUnsubscribe;

    const setupNotesWire = async () => {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const rawName = currentUser.displayName || currentUser.email || "User";
        setAccountName(rawName);
        setUserInitial(rawName.charAt(0).toUpperCase());
      } else {
        setAccountName("Guest Mode");
        setUserInitial("G");
      }

      // 🔒 Isolated device guest storage tracker token loop
      const targetUserId = currentUser
        ? currentUser.uid
        : await getLocalGuestId();

      const notesQuery = query(
        collection(db, "user_notes"),
        where("userId", "==", targetUserId),
        orderBy("createdAt", "desc"),
      );

      dynamicUnsubscribe = onSnapshot(
        notesQuery,
        (querySnapshot) => {
          const notesList = [];
          querySnapshot.forEach((doc) => {
            notesList.push({ id: doc.id, ...doc.data() });
          });
          setDbNotes(notesList);
          setLoading(false);
        },
        (error) => {
          console.log("Firestore read error: ", error.message);
          setLoading(false);
        },
      );
    };

    setupNotesWire();

    return () => {
      if (dynamicUnsubscribe) dynamicUnsubscribe();
    };
  }, []);

  const filteredNotes = dbNotes.filter((note) => {
    const titleMatch = note.noteTitle ? note.noteTitle.toLowerCase() : "";
    const bodyMatch = note.noteBody ? note.noteBody.toLowerCase() : "";
    const normalizedQuery = searchQuery.toLowerCase();
    return (
      titleMatch.includes(normalizedQuery) ||
      bodyMatch.includes(normalizedQuery)
    );
  });

  const handleCardLongPress = (noteId, noteTitle) => {
    setSelectedNoteId(noteId); // Stash target id safely
    setModalConfig({
      visible: true,
      title: "Erase Note Card? 🗑️",
      message: `Are you sure you want to completely destroy "${noteTitle || "Untitled Note"}" straight from your workspace dashboard?`,
      type: "error", // Red warning ring display style asset layout
      isDeleteAction: true, // Mark this explicitly as a data destruction flow
    });
  };

  // Execution triggered when clicking confirm on custom alert modal choice blocks
  const handleModalConfirmation = async () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));

    if (modalConfig.isDeleteAction) {
      // 🗑️ SCENARIO A: Run deletion script on confirmed note ID target
      if (!selectedNoteId) return;
      try {
        const docRef = doc(db, "user_notes", selectedNoteId);
        deleteDoc(docRef); // Non-blocking offline-ready destruction execution line!
        setSelectedNoteId(null);
      } catch (err) {
        console.log("Dashboard drop failure:", err.message);
      }
    } else {
      // 🔓 SCENARIO B: Perform profile Sign Out session wipe
      await auth.signOut();
      router.replace("/");
    }
  };

  return (
    <View
      style={[
        styles.container,
        isDarkModeActive && { backgroundColor: "#121212" },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDarkModeActive ? "light" : "dark"} />

      {/* FIXED TOP ROW PACK */}
      <View style={styles.headerWrapperContainer}>
        <View style={styles.headerProfileRow}>
          <View>
            <Text style={styles.welcomeSub}>Hello,</Text>
            <Text
              style={[
                styles.profileNameTitle,
                isDarkModeActive && { color: "#fff" },
              ]}
              numberOfLines={1}
            >
              {accountName}
            </Text>
            <Text
              style={[styles.opening, isDarkModeActive && { color: "#24b6e2" }]}
            >
              MoonBeam Notes
            </Text>
          </View>

          {/* Upgraded Avatar Touch Trigger Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowProfileSheet(true)} // 🚀 Opens your bottom formsheet menu instantly!
            style={[
              styles.avatarCircleBubble,
              isDarkModeActive && { backgroundColor: "#24b6e2" },
            ]}
          >
            <Text style={styles.avatarLetterToken}>{userInitial}</Text>
          </TouchableOpacity>
        </View>

        {showDropdown && (
          <View
            style={[
              styles.dropdownFloatingCard,
              isDarkModeActive && { backgroundColor: "#1e1e1e" },
            ]}
          >
            {auth.currentUser ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowDropdown(false);
                  setModalConfig({
                    visible: true,
                    title: "Log Out Profile?",
                    message:
                      "Are you sure you want to end your active workspace session on this phone device?",
                    type: "error",
                    isDeleteAction: false,
                  });
                }}
                style={styles.dropdownRowItem}
              >
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.logoutRowLabelText}>Log Out Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowDropdown(false);
                  router.replace("/login");
                }}
                style={styles.dropdownRowItem}
              >
                <Ionicons name="log-in-outline" size={18} color="#006989" />
                <Text style={[styles.logoutRowLabelText, { color: "#006989" }]}>
                  Sign In / Join
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 🚀 SEARCH BAR ROW CONTAINER */}
      <View style={styles.searchBarRowContainer}>
        <View
          style={[
            styles.innerSearchFieldWrapper,
            isDarkModeActive && { backgroundColor: "#1e1e1e" },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color="#a3a1a1"
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search through titles or body notes..."
            placeholderTextColor="#a3a1a1"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.searchTextInputElement,
              isDarkModeActive && { color: "#fff" },
            ]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ padding: 4 }}
            >
              <Ionicons name="close-circle" size={16} color="#a3a1a1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.textwrapper}>
          {/* THE CONTROL LAYOUT ROW BUTTONS BAR */}
          <View style={styles.viewToggleActionRow}>
            <Text
              style={[
                styles.sectionLabelTitle,
                isDarkModeActive && { color: "#a3a1a1" },
              ]}
            >
              My Notes Drawer ({filteredNotes.length})
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsGridView(!isGridView)}
              style={[
                styles.toggleIconBtn,
                isDarkModeActive && { backgroundColor: "#1e1e1e" },
              ]}
            >
              <Ionicons
                name={isGridView ? "list-outline" : "grid-outline"}
                size={24}
                color={isDarkModeActive ? "#24b6e2" : "#006989"}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.hereText,
              isGridView ? styles.gridWrapStyle : styles.listWrapStyle,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={isDarkModeActive ? "#24b6e2" : "#006989"}
                style={{ marginTop: 20, alignSelf: "center" }}
              />
            ) : filteredNotes.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No matching keywords found"
                  : "Your Note is Empty"}
              </Text>
            ) : (
              filteredNotes.map((item, index) => {
                return (
                  <TouchableOpacity
                    key={item.id || index}
                    activeOpacity={0.75}
                    onPress={() => {
                      setShowDropdown(false);
                      router.navigate({
                        pathname: "/editor",
                        params: {
                          id: item.id,
                          existingTitle: item.noteTitle,
                          existingBody: item.noteBody,
                        },
                      });
                    }}
                    onLongPress={() =>
                      handleCardLongPress(item.id, item.noteTitle)
                    }
                    delayLongPress={550}
                    style={[
                      isGridView ? styles.gridCardBox : styles.listCardBox,
                      isDarkModeActive && { backgroundColor: "#1e1e1e" },
                      { borderLeftColor: item.themeColor || "#006989" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.noteTitleText,
                        isDarkModeActive && { color: "#fff" },
                      ]}
                      numberOfLines={1}
                    >
                      {item.noteTitle || "Untitled Note"}
                    </Text>
                    <Text
                      style={[
                        styles.noteBodyPreviewText,
                        isDarkModeActive && { color: "#a3a1a1" },
                      ]}
                      numberOfLines={isGridView ? 3 : 2}
                    >
                      {item.noteBody || "No additional text details..."}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.texthold}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <TouchableOpacity
          onPress={() => {
            setShowDropdown(false);
            router.navigate("/editor");
          }}
        >
          <View
            style={[
              styles.plusCircle,
              isDarkModeActive && {
                backgroundColor: "#24b6e2",
                borderColor: "#1e1e1e",
              },
            ]}
          >
            <Text style={styles.plus}>+</Text>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* 🚀 Native-Style Bottom Formsheet Overlay Panel */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfileSheet}
        onRequestClose={() => setShowProfileSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileSheet(false)}
        >
          <View
            style={[
              styles.formSheetContainer,
              isDarkModeActive && { backgroundColor: "#1e1e1e" },
            ]}
          >
            <View style={styles.formSheetDragHandle} />

            <View style={styles.sheetHeaderRow}>
              <Text
                style={[
                  styles.sheetMainTitle,
                  isDarkModeActive && { color: "#fff" },
                ]}
              >
                MoonBeam Notes Workspace
              </Text>
              <TouchableOpacity
                onPress={() => setShowProfileSheet(false)}
                style={[
                  styles.sheetCloseBadgeCircle,
                  isDarkModeActive && { backgroundColor: "#2d2d2d" },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDarkModeActive ? "#fff" : "#4b5563"}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.sheetAccountCardBox,
                isDarkModeActive && { backgroundColor: "#2d2d2d" },
              ]}
            >
              <View
                style={[
                  styles.sheetAvatarBubbleCircle,
                  isDarkModeActive && { backgroundColor: "#24b6e2" },
                ]}
              >
                <Text style={styles.sheetAvatarInitialText}>{userInitial}</Text>
              </View>
              <View style={styles.sheetAccountDetailsTextInfo}>
                <Text
                  style={[
                    styles.sheetProfileNameText,
                    isDarkModeActive && { color: "#fff" },
                  ]}
                  numberOfLines={1}
                >
                  {accountName}
                </Text>
                <Text style={styles.sheetAccountSubStatusLabel}>
                  {auth.currentUser
                    ? "Cloud Synchronized Profile"
                    : "Local Restricted Sandbox ID"}
                </Text>
              </View>
            </View>

            <View style={styles.sheetOptionsContainerList}>
              <View
                style={[
                  styles.sheetSettingToggleOptionRow,
                  isDarkModeActive && { borderBottomColor: "#2d2d2d" },
                ]}
              >
                <View style={styles.settingOptionLabelIconRowPack}>
                  <Ionicons
                    name="moon"
                    size={22}
                    color={isDarkModeActive ? "#24b6e2" : "#006989"}
                  />
                  <Text
                    style={[
                      styles.settingMainOptionTextLabel,
                      isDarkModeActive && { color: "#fff" },
                    ]}
                  >
                    Dark Layout
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#d1d5db", true: "#006989" }}
                  thumbColor={isDarkModeActive ? "#24b6e2" : "#f4f3f4"}
                  onValueChange={toggleDarkModeSwitch} // 🚀 Calls our custom storage function
                  value={isDarkModeActive}
                />
              </View>

              {auth.currentUser ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowProfileSheet(false);
                    setModalConfig({
                      visible: true,
                      title: "Log Out Profile?",
                      message:
                        "Are you sure you want to end your active workspace session on this phone device?",
                      type: "error",
                      isDeleteAction: false,
                    });
                  }}
                  style={[
                    styles.sheetSettingToggleOptionRow,
                    isDarkModeActive && { borderBottomColor: "#2d2d2d" },
                  ]}
                >
                  <View style={styles.settingOptionLabelIconRowPack}>
                    <Ionicons
                      name="log-out-outline"
                      size={22}
                      color="#ef4444"
                    />
                    <Text
                      style={[
                        styles.settingMainOptionTextLabel,
                        { color: "#ef4444" },
                      ]}
                    >
                      Sign Out Secure Session
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#a3a1a1" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowProfileSheet(false);
                    router.replace("/login");
                  }}
                  style={[
                    styles.sheetSettingToggleOptionRow,
                    isDarkModeActive && { borderBottomColor: "#2d2d2d" },
                  ]}
                >
                  <View style={styles.settingOptionLabelIconRowPack}>
                    <Ionicons name="log-in-outline" size={22} color="#006989" />
                    <Text
                      style={[
                        styles.settingMainOptionTextLabel,
                        { color: "#006989" },
                      ]}
                    >
                      Claim Profile / Sign In
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#006989" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DUAL PURPOSE POP-UP CONFIRMATION LAYOUT */}
      <AlertModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showButton={true}
        buttonText={
          modalConfig.isDeleteAction ? "Delete Anyway" : "Yes, Log Out"
        }
        showCancel={true}
        cancelText={modalConfig.isDeleteAction ? "Keep Note" : "Stay Here"}
        onCancel={() => {
          setModalConfig((prev) => ({ ...prev, visible: false }));
          setSelectedNoteId(null);
        }}
        onClose={handleModalConfirmation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eaebed",
  },
  headerWrapperContainer: {
    width: "100%",
    backgroundColor: "transparent",
    zIndex: 999, // 🚀 CRUCIAL: Forces the dropdown overlay rows to float cleanly on top of scroll lists!
  },
  // 🚀 FORMSHEET PART 1: OVERLAY MASK & INNER CONTAINER
  modalBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Translucent dimmed mask layout
    justifyContent: "flex-end", // Pulls the sheet completely to the screen bottom edge
  },
  formSheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    width: "100%",
    maxHeight: "65%", // Prevents overlapping top status bars
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  formSheetDragHandle: {
    width: 44,
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetMainTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  sheetCloseBadgeCircle: {
    width: 32,
    height: 32,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  // 🚀 FORMSHEET PART 2: ACCOUNT WIDGET & ROW LIST SECTIONS
  sheetAccountCardBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 20,
    gap: 14,
    marginBottom: 28,
  },
  sheetAvatarBubbleCircle: {
    width: 54,
    height: 54,
    backgroundColor: "#006989",
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetAvatarInitialText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  sheetAccountDetailsTextInfo: {
    flex: 1,
  },
  sheetProfileNameText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  sheetAccountSubStatusLabel: {
    fontSize: 12,
    color: "#a3a1a1",
    fontWeight: "500",
  },
  sheetOptionsContainerList: {
    width: "100%",
  },
  sheetSettingToggleOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingOptionLabelIconRowPack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  settingMainOptionTextLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  headerProfileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 10,
  },
  welcomeSub: {
    fontSize: 14,
    color: "#a3a1a1",
    fontWeight: "500",
  },
  profileNameTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    maxWidth: 180,
  },
  avatarCircleBubble: {
    width: 46,
    height: 46,
    backgroundColor: "#006989",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarLetterToken: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },

  dropdownFloatingCard: {
    position: "absolute",
    top: 112, // Anchors the card block box in perfect line spacing right below your profile circle
    right: 24,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    width: 160,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  dropdownRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: "100%",
  },
  logoutRowLabelText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
  searchBarRowContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 1,
  },
  innerSearchFieldWrapper: {
    width: "100%",
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  searchTextInputElement: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#1f2937",
  },
  scrollContainer: {
    paddingTop: 1,
    alignItems: "center",
    paddingBottom: 110, // Generous padding cushion prevents floating button overlapping text notes rows
  },
  textwrapper: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#a3a1a1",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 40,
  },

  opening: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#006989",
  },

  viewToggleActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleIconBtn: {
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
  },
  hereText: { width: "100%", marginTop: 5 },
  listWrapStyle: { flexDirection: "column" },
  gridWrapStyle: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  listCardBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  gridCardBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    height: 140,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  noteTitleText: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  noteBodyPreviewText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 20,
  },
  texthold: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 34,
    backgroundColor: "transparent",
  },
  plusCircle: {
    width: 60,
    height: 60,
    backgroundColor: "#006989",
    borderRadius: 30,
    borderColor: "#a3a1a1",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  plus: { fontSize: 45, color: "#fff", lineHeight: 38 },
});
