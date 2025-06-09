import { FC } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import AskStar from "../icon/AskStar";

interface SuggestedQAProps {
  itemList: string[];
  onpress: (message: string) => void;
}

export const SuggestedQA: FC<SuggestedQAProps> = ({ itemList, onpress }) => {
  return (
    <View className="flex-col gap-2 w-full mb-6">
      {itemList.map((item, index) => (
        <TouchableOpacity key={index} onPress={() => onpress(item)}>
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderColor: "#e0e0e0",
              borderWidth: 1,
              borderRadius: 16,
              backgroundColor: "#f9f9f9",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 4
            }}
          >
            <AskStar />

            <Text
              style={{
                paddingRight: 12,
                color: "#555",
                fontSize: 15
              }}
            >
              {item}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};
