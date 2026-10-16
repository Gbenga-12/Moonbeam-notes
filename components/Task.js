import { useState, useRef, useEffect } from "react";
import Checkbox from "expo-checkbox";
import { StyleSheet, Text, Animated, View, Easing } from "react-native";

export default function Task(props) {
  // 1. Create an animated value starting at -400 (hidden way out to the left side)
  const slideInAnim = useRef(new Animated.Value(-400)).current;
  // 2. Create an opacity value starting at 0 (invisible)
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 3. Run both slide-in and fade-in animations at the exact same time
    Animated.parallel([
      Animated.timing(slideInAnim, {
        toValue: 0, // Move to its natural position
        duration: 350, // Animation length in milliseconds
        easing: Easing.out(Easing.back(1.2)), // Adds a beautiful slight elastic bounce at the end
        useNativeDriver: true, // Speeds up performance running directly on native UI thread
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, // Become fully visible
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const [isChecked, isCheck] = useState(false);
  const firstLetter =
    props.text && props.text.trim().length > 0
      ? props.text.trim().charAt(0).toUpperCase()
      : "M";
  return (
    <Animated.View
      style={[
        styles.blok,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideInAnim }], // Smoothly pushes the layout horizontally
        },
      ]}
    >
      <View style={styles.notehold}>
        <View style={styles.square}>
          <Text style={styles.mbn}>{firstLetter}</Text>
        </View>
        <View style={styles.noteing}>
          <Text style={styles.tas}>{props.text}</Text>
        </View>

        <Checkbox
          value={isChecked}
          onValueChange={isCheck}
          color={isChecked ? "green" : undefined}
          style={{ width: 30, height: 30, fontSize: 10 }} // Indigo color when checked
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notehold: {
    width: 360,
    height: 80,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "#24b6e2",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
    borderColor: "#24b6e2",
    borderWidth: 1.9,
  },
  blok: {
    width: 360,
    height: 80,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "white",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 2,
    gap: 10,
    border: "#000",
    borderWidth: 1,
    borderBottomColor: "#000",
    borderBottomWidth: 1,
  },
  mbn: {
    fontSize: 15,
    color: "#fff",
  },
  noteing: {
    flex: 1,
  },
  tas: {
    fontSize: 23,
    flexShrink: 1,
    color: "#000",
  },
  square: {
    width: 40,
    height: 40,
    backgroundColor: "#006989",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 15,
    height: 15,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  circled: {
    width: 15,
    height: 15,
    backgroundColor: "#24b6e2",
    borderRadius: 2,
  },
});
