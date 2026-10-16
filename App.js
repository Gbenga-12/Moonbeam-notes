import { StyleSheet, Text, View } from "react-native";
import Home from "./app/Home";

export default function () {
  return (
    <View style={styles.container}>
      <Home />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
