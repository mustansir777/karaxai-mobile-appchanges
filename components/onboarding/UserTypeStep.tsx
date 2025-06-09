import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import OnboardingHeader from "./OnboardingHeader";
import { CustomButton } from "@/components/button/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import SelectionCard from "./SelectionCard";

interface UserTypeStepProps {
  onNext: (data: { use_case: string }) => void;
  onBack: () => void;
  initialData?: { use_case: string };
}

const UserTypeStep: React.FC<UserTypeStepProps> = ({ 
  onNext, 
  onBack,
  initialData 
}) => {
  const [selectedType, setSelectedType] = useState<string>(initialData?.use_case || "");

  const handleNext = () => {
    if (selectedType) {
      onNext({ use_case: selectedType });
    }
  };

  return (
    <ThemeView className="flex-1 p-6">
      <OnboardingHeader
        title="Planning to use KaraX for work?"
        subtitle="Choose how you'll be using the app"
      />

      <View className="mt-6">
        <View className="mb-6 space-y-4">
          <SelectionCard
            title="Personal Use"
            description="For individual and personal projects"
            icon="personal"
            selected={selectedType === "personal"}
            onSelect={() => setSelectedType("personal")}
          />

          <SelectionCard
            title="Work Use"
            description="For professional and team collaboration"
            icon="work"
            selected={selectedType === "work"}
            onSelect={() => setSelectedType("work")}
          />
        </View>

        <View className="flex-row justify-between mt-10">
          <CustomButton
            title="Back"
            icon={<Ionicons name="arrow-back" size={20} color="#888" />}
            iconPosition="left"
            type="outline"
            className="rounded-lg py-3 px-6 border border-gray-700"
            onPress={onBack}
          />
          
          <CustomButton
            title="Next"
            icon={<Ionicons name="arrow-forward" size={20} color="#000" />}
            iconPosition="right"
            type="secondary"
            className="rounded-lg py-3 px-6 bg-white"
            onPress={handleNext}
            disabled={!selectedType}
          />
        </View>
      </View>
    </ThemeView>
  );
};

export default UserTypeStep;
