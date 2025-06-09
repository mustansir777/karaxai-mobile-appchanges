import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import OnboardingHeader from "./OnboardingHeader";
import { CustomButton } from "@/components/button/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import SelectionCard from "./SelectionCard";

interface ProfessionalPathStepProps {
  onNext: (data: { user_type: string }) => void;
  onBack: () => void;
  initialData?: { user_type: string };
}

const ProfessionalPathStep: React.FC<ProfessionalPathStepProps> = ({
  onNext,
  onBack,
  initialData,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(initialData?.user_type || "");

  const handleNext = () => {
    if (selectedPath) {
      onNext({ user_type: selectedPath });
    }
  };

  return (
    <ThemeView className="flex-1 p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          title="Choose Your Professional Path"
          subtitle="Select the option that best describes your role"
        />

        <View className="mt-6">
          <View className="mb-6 space-y-4">
            <SelectionCard
              title="Business Executive"
              description="For business professionals and corporate leaders"
              icon="business"
              selected={selectedPath === "business_executive"}
              onSelect={() => setSelectedPath("business_executive")}
              features={["AI-powered business insights", "Team collaboration tools"]}
            />

            <SelectionCard
              title="Student"
              description="For students and academic professionals"
              icon="school"
              selected={selectedPath === "student"}
              onSelect={() => setSelectedPath("student")}
              features={["Study material organization", "Research assistance"]}
            />

            <SelectionCard
              title="Legal Professional"
              description="For lawyers and legal practitioners"
              icon="balance-scale"
              selected={selectedPath === "legal_professional"}
              onSelect={() => setSelectedPath("legal_professional")}
              features={["Legal document analysis", "Case management"]}
            />

            <SelectionCard
              title="Other Profession"
              description="For all other professions"
              icon="other"
              selected={selectedPath === "other"}
              onSelect={() => setSelectedPath("other")}
              features={["Customizable workflow", "Versatile tools"]}
            />
          </View>

          <ThemeText className="text-center text-gray-400 text-sm mt-2 mb-4">
            Don't worry, you can always change this later in your settings
          </ThemeText>

          <View className="flex-row justify-between mt-6 mb-10">
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
              disabled={!selectedPath}
            />
          </View>
        </View>
      </ScrollView>
    </ThemeView>
  );
};

export default ProfessionalPathStep;
