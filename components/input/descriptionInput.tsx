import React from "react";
import { TextInput, Text, View, StyleSheet } from "react-native";
import { Controller, Control } from "react-hook-form";
import { ThemeText } from "../theme/ThemeText";
import AntDesign from "@expo/vector-icons/AntDesign";

interface DescriptionInputProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  rules?: any;
  isStar?: boolean;
  iconRight?: React.ReactNode;
}

const DescriptionInput: React.FC<DescriptionInputProps> = ({
  control,
  name,
  label,
  placeholder = "",
  rules,
  isStar = true,
  iconRight,
}) => {
  return (
    <View style={styles.container}>
      {/* Label with Star Icon on Right */}
      <ThemeText>
        {label}
        {isStar && <AntDesign name="star" size={8} color="red" />}
      </ThemeText>

      {/* Controller with TextInput */}
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({
          field: { onChange, onBlur, value = "" },
          fieldState: { error },
        }) => (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: error ? "red" : "#363636",
                  },
                ]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={String(value)} // Ensure that value is a string
                placeholder={placeholder}
                placeholderTextColor="#7B8388"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Right-side icon */}
              {iconRight && (
                <View style={styles.iconContainer}>{iconRight}</View>
              )}
            </View>

            {/* Error Message */}
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
  },
  inputContainer: {
    position: "relative",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    color: "white",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "transparent",
    minHeight: 100,
  },
  iconContainer: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  errorText: {
    color: "red",
    marginTop: 5,
  },
});

export default DescriptionInput;
