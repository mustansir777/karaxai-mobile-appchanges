import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import Logo from "@/components/logo/Logo";

interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
}

const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({ title, subtitle }) => {
  return (
    <View className="items-center mb-10">
      <Logo />
      <View className="mt-6">
        <ThemeText className="text-2xl font-semibold text-center">{title}</ThemeText>
        {subtitle && (
          <ThemeText className="text-center text-[#C1C1C1] mt-2">{subtitle}</ThemeText>
        )}
      </View>
    </View>
  );
};

export default OnboardingHeader;
