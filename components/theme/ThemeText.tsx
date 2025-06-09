import { FC } from "react";
import { Text } from "react-native";

interface ThemeTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ThemeText: FC<ThemeTextProps> = ({ children, className }) => {
  return <Text className={`text-white ${className}`}>{children}</Text>;
};
