import React, { FC } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";

interface AskInputProps {
  value: string;
  setValue: (text: string) => void;
  placeholder?: string;
  onPress: () => void;
  isDisabled: boolean;
}

const AskInput: FC<AskInputProps> = ({
  value,
  setValue,
  placeholder = "Search...",
  onPress,
  isDisabled,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 24,
        paddingHorizontal: 16,
        width: "100%",
        borderWidth: 1,
        borderColor: "#e0e0e0"
      }}
    >
      <TextInput
        style={{
          flex: 1,
          backgroundColor: "#f5f5f5",
          color: "#333",
          padding: 12,
          width: "100%",
          fontSize: 16
        }}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={{
          opacity: isDisabled ? 0.5 : 1,
          backgroundColor: "#0a7ea4",
          borderRadius: 20,
          padding: 8,
          marginLeft: 8
        }}
      >
        <Feather
          name="send"
          size={20}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
};

export default AskInput;
