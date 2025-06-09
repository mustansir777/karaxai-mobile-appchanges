import React from "react";
import { View, StyleSheet } from "react-native";

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalSteps,
  currentStep,
}) => {
  return (
    <View className="flex-row justify-center items-center gap-2 mt-10">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          className={`h-2 rounded-full ${
            index === currentStep - 1
              ? "w-4 bg-blue-500"
              : index < currentStep - 1
              ? "w-2 bg-blue-500"
              : "w-2 bg-gray-600"
          }`}
        />
      ))}
    </View>
  );
};

export default ProgressIndicator;
