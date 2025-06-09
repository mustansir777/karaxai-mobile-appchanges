import { ImageBackground, TouchableOpacity } from "react-native";
import { ThemeText } from "../theme/ThemeText";
import { FC } from "react";

interface AskButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const AskButton: FC<AskButtonProps> = ({ onPress, disabled }) => {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        position: "absolute",
        bottom: 18,
        right: 18,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <ImageBackground
        source={require("../../assets/images/ask/ask.png")}
        resizeMode="contain"
        style={{
          width: 80,
          height: 80,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ThemeText className="text-lg mb-4">Ask?</ThemeText>
      </ImageBackground>
    </TouchableOpacity>
  );
};
