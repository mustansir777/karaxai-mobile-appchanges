import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import OnboardingHeader from "./OnboardingHeader";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CustomButton } from "@/components/button/CustomButton";
import InputWithLabel from "@/components/input/inputWithLabel";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SelectDropdown from "react-native-select-dropdown";

const schema = z.object({
  referred_from: z.string().min(1, "Please select how you heard about us"),
});

type FormData = z.infer<typeof schema>;

interface WelcomeStepProps {
  onNext: (data: { referred_from: string }) => void;
  initialData?: { referred_from: string };
  firstName: string;
}

const referralSources = [
  "Social Media",
  "Friend or Colleague",
  "Search Engine",
  "Blog or Article",
  "Podcast",
  "Conference or Event",
  "Advertisement",
  "Email",
  "Other",
];

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, initialData, firstName }) => {
  const [selectedSource, setSelectedSource] = useState(initialData?.referred_from || "");
  
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      referred_from: initialData?.referred_from || "",
    },
    resolver: zodResolver(schema),
  });

  const handleNext = (data: FormData) => {
    onNext({ referred_from: data.referred_from });
  };

  return (
    <ThemeView className="flex-1 p-6">
      <OnboardingHeader 
        title={`Welcome, ${firstName}`}
        subtitle="Let's personalize your experience"
      />

      <View className="mt-6">
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="globe-outline" size={20} color="#3B82F6" />
            <ThemeText className="ml-2 font-semibold">How did you hear about KaraX?</ThemeText>
          </View>
          
          <View className="mt-2">
            <SelectDropdown
              data={referralSources}
              defaultValue={selectedSource}
              onSelect={(selectedItem) => {
                setSelectedSource(selectedItem);
                // Update the form value manually
                control._formValues.referred_from = selectedItem;
              }}
              buttonTextAfterSelection={(selectedItem) => selectedItem}
              rowTextForSelection={(item) => item}
              buttonStyle={{
                width: '100%',
                backgroundColor: '#222',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#444',
              }}
              buttonTextStyle={{ color: '#fff' }}
              dropdownStyle={{ backgroundColor: '#222', borderRadius: 8 }}
              rowStyle={{ backgroundColor: '#222', borderBottomColor: '#444' }}
              rowTextStyle={{ color: '#fff' }}
              renderDropdownIcon={() => (
                <Ionicons name="chevron-down" size={20} color="#888" />
              )}
            />
            {errors.referred_from && (
              <ThemeText className="text-red-500 text-sm mt-1">
                {errors.referred_from.message}
              </ThemeText>
            )}
          </View>
        </View>

        <View className="flex-row justify-between mt-10">
          <View />
          <CustomButton
            title="Next"
            icon={<Ionicons name="arrow-forward" size={20} color="#000" />}
            iconPosition="right"
            type="secondary"
            className="rounded-lg py-3 px-6 bg-white"
            onPress={handleSubmit(handleNext)}
          />
        </View>
      </View>
    </ThemeView>
  );
};

export default WelcomeStep;
