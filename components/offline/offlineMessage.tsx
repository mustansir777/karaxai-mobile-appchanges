import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { ThemeText } from "../theme/ThemeText";

export const OfflineMessage = () => {
  return (
    <View className="flex-1 items-center justify-center mb-4 px-10">
      <Ionicons name="cloud-offline-outline" size={60} color="white" />
      <ThemeText className="text-lg text-center">
        Your are in offline mode. Please connect to the internet to use this
        feature.
      </ThemeText>
    </View>
  );
};
