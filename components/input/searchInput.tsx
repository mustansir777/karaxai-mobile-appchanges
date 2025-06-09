import React, { FC } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchInputProps {
  value: string;
  setValue: (text: string) => void;
  placeholder?: string;
}

const SearchInput: FC<SearchInputProps> = ({
  value,
  setValue,
  placeholder = "Search...",
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1B1C1E",
        borderRadius: 12,
        paddingHorizontal: 8,
      }}
    >
      <Ionicons
        name="search"
        size={20}
        color="#888"
        style={[
          {
            paddingLeft: 10,
          },
        ]}
      />
      <TextInput
        style={{
          flex: 1,
          backgroundColor: "#1B1C1E",
          color: "#BBBBBB",
          padding: 12,
        }}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
      />
    </View>
  );
};

export default SearchInput;
