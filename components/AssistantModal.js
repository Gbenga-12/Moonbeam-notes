import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AssistantModal = ({
  visible,
  onClose,
  onAction,
  loading = null,
  isDarkMode = false,
}) => {
  const actions = [
    {
      id: "summary",
      label: "Summarize",
      icon: "document-text-outline",
    },
    {
      id: "title",
      label: "Generate Title",
      icon: "text-outline",
    },
    {
      id: "tags",
      label: "Auto-tags",
      icon: "pricetags-outline",
    },
    {
      id: "fix",
      label: "Fix Grammar",
      icon: "checkmark-circle-outline",
    },
    {
      id: "polish",
      label: "Polish Note",
      icon: "sparkles-outline",
    },
    {
      id: "bullets",
      label: "To Bullet Points",
      icon: "list-outline",
    },
    {
      id: "expand",
      label: "Expand Note",
      icon: "resize-outline",
    },
    {
      id: "shorten",
      label: "Make Shorter",
      icon: "contract-outline",
    },
    {
      id: "actions",
      label: "Extract Action Items",
      icon: "checkbox-outline",
    },
  ];

  const handleAction = (action) => {
    if (loading) return;

    onAction?.(action);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode ? "#1E1E2E" : "#FFFFFF",
            },
          ]}
        >
          {/* Header */}

          <View style={styles.header}>
            <View>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDarkMode ? "#CBA6F7" : "#7C3AED",
                  },
                ]}
              >
                ✨ AI Assistant
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                  },
                ]}
              >
                What would you like to do?
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={!!loading}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={22}
                color={isDarkMode ? "#cbd5e1" : "#64748b"}
              />
            </TouchableOpacity>
          </View>

          {/* AI Actions */}

          <View style={styles.actionsContainer}>
            {actions.map((action) => {
              const isLoading = loading === action.id;

              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(139, 92, 246, 0.12)"
                        : "rgba(139, 92, 246, 0.08)",
                      opacity: loading && !isLoading ? 0.45 : 1,
                    },
                  ]}
                  onPress={() => handleAction(action)}
                  disabled={!!loading}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={action.icon} size={20} color="#8B5CF6" />
                  </View>

                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: isDarkMode ? "#ffffff" : "#1e293b",
                      },
                    ]}
                  >
                    {action.label}
                  </Text>

                  {isLoading && (
                    <ActivityIndicator
                      size="small"
                      color="#8B5CF6"
                      style={styles.loader}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default AssistantModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
  },

  subtitle: {
    fontSize: 13,
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },

  actionsContainer: {
    gap: 10,
  },

  actionButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },

  actionText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },

  loader: {
    marginLeft: "auto",
  },
});
