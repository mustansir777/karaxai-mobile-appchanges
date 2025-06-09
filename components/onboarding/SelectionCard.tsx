import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface SelectionCardProps {
  title: string;
  description: string;
  icon: "business" | "school" | "balance-scale" | "other" | "personal" | "work";
  selected: boolean;
  onSelect: () => void;
  features?: string[];
}

const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  description,
  icon,
  selected,
  onSelect,
  features,
}) => {
  const getIcon = () => {
    switch (icon) {
      case "business":
        return <MaterialIcons name="business-center" size={24} color="#3B82F6" />;
      case "school":
        return <Ionicons name="school" size={24} color="#3B82F6" />;
      case "balance-scale":
        return <FontAwesome5 name="balance-scale" size={24} color="#3B82F6" />;
      case "other":
        return <MaterialIcons name="stars" size={24} color="#3B82F6" />;
      case "personal":
        return <MaterialIcons name="person" size={24} color="#3B82F6" />;
      case "work":
        return <MaterialIcons name="work" size={24} color="#3B82F6" />;
      default:
        return <Ionicons name="help-circle" size={24} color="#3B82F6" />;
    }
  };

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`p-4 rounded-lg mb-4 border ${
        selected
          ? "border-blue-500 bg-[#1C2A3A]"
          : "border-gray-700 bg-[#1A1A1A]"
      }`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center">
          <View className="mr-3">{getIcon()}</View>
          <View>
            <ThemeText className="font-semibold text-base">{title}</ThemeText>
            <ThemeText className="text-[#C1C1C1] text-sm">{description}</ThemeText>
          </View>
        </View>
        
        <View className={`h-6 w-6 rounded-full border ${selected ? 'border-blue-500' : 'border-gray-600'} items-center justify-center`}>
          {selected && <View className="h-4 w-4 rounded-full bg-blue-500" />}
        </View>
      </View>

      {features && features.length > 0 && (
        <View className="ml-2 mt-3">
          {features.map((feature, index) => (
            <View key={index} className="flex-row items-center mt-1">
              <MaterialCommunityIcons name="check" size={18} color="#3B82F6" />
              <ThemeText className="text-[#C1C1C1] text-sm ml-2">{feature}</ThemeText>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default SelectionCard;
