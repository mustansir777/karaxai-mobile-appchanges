import { FC } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  type?: "primary" | "secondary" | "no_bg";
  className?: string;
  style?: ViewStyle;
  icon?: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  loadingSize?: number;
  loadingTitle?: string;
  textClassName?: string;
}

export const CustomButton: FC<ButtonProps> = ({
  title,
  type = "primary",
  onPress,
  className,
  style,
  icon,
  disabled,
  isLoading,
  loadingSize,
  textClassName,
  loadingTitle,
}) => {
  // Default text styles based on button type
  const getDefaultTextStyle = () => {
    return type === "primary" ? "text-white" : "text-black";
  };

  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        {
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      className={`${
        type === "primary"
          ? "bg-button-primary"
          : type === "no_bg"
          ? "bg-transparent"
          : "bg-white"
      } ${className}`}
      onPress={onPress}
    >
      {isLoading ? (
        <View className="flex flex-row gap-2">
          <ActivityIndicator
            style={{
              padding: 3,
            }}
            size={loadingSize ? loadingSize : "small"}
            color={type === "primary" ? "white" : "black"}
          />

          {loadingTitle && (
            <Text
              className={`text-lg ${
                textClassName || getDefaultTextStyle()
              }`}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {loadingTitle}
            </Text>
          )}
        </View>
      ) : (
        <View className="flex flex-row gap-2 items-center justify-center">
          {icon && <View>{icon}</View>}
          {title && (
            <Text
              className={`text-lg ${
                textClassName || getDefaultTextStyle()
              }`}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};