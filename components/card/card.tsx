import { CardColors } from "@/constants/CardColors";
import { View } from "react-native";
import { ThemeText } from "../theme/ThemeText";

interface CardProps {
  title: string;
  color: string;
  points: string[];
}

export const Card: React.FC<CardProps> = ({ title, color, points }) => {
  return (
    <View
      className="bg-background-primary"
      style={{
        borderColor: "#1D1D1D",
        borderWidth: 1,
        borderRadius: 20,
        padding: 15,
      }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <View
          style={{
            height: 15,
            width: 15,
            borderRadius: 5,
            backgroundColor: color,
          }}
        />
        <ThemeText className="text-lg">{title}</ThemeText>
      </View>
      {points.length === 0 ? (
        <ThemeText className="text-lg py-4 text-center">
          No results found
        </ThemeText>
      ) : (
        points.map((point, index) => (
          <View key={index} className="flex-row items-start gap-2 mb-2 px-2">
            <View
              style={{
                height: 4,
                width: 4,
                borderRadius: 4,
                backgroundColor: "white",
                marginTop: 6,
              }}
            />
            <ThemeText className="text-base">{point}</ThemeText>
          </View>
        ))
      )}
    </View>
  );
};
