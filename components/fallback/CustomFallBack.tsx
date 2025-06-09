import { ActivityIndicator, View } from "react-native";
import { ThemeView } from "../theme/ThemeView";
import { ThemeText } from "../theme/ThemeText";

export const CustomFallBack = () => {
  return (
    <ThemeView>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ThemeText className="mb-4">Loading...</ThemeText>
        <ActivityIndicator size="large" color="#004aad" />
      </View>
    </ThemeView>
  );
};
