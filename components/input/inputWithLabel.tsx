import React from "react";
import { TextInput, Text, View, StyleSheet } from "react-native";
import { Controller, Control } from "react-hook-form";
import { ThemeText } from "../theme/ThemeText";
import AntDesign from "@expo/vector-icons/AntDesign";

interface InputWithLabelProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  rules?: any;
  secureTextEntry?: boolean;
  isStar?: boolean;
  iconRight?: React.ReactNode;
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({
  control,
  name,
  label,
  placeholder = "",
  rules,
  secureTextEntry = false,
  isStar = true,
  iconRight,
}) => {
  return (
    <View className="mb-5">
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
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <>
            <View className="relative mt-2">
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: error ? "red" : "#363636",
                  },
                ]}
                className="bg-transparent rounded-lg px-4 py-4 text-md"
                onBlur={onBlur}
                defaultValue=""
                onChangeText={onChange}
                value={String(value)}
                placeholder={placeholder}
                placeholderTextColor="#7B8388"
                secureTextEntry={secureTextEntry}
              />

              {/* Right-side icon */}
              {iconRight && (
                <View style={styles.iconContainer}>{iconRight}</View>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <Text
                style={[
                  {
                    color: "red",
                    marginTop: 2,
                  },
                ]}
              >
                {error.message}
              </Text>
            )}
          </>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 10,
    color: "white",
  },
  iconContainer: {
    position: "absolute",
    right: 10,
    top: "55%",
    transform: [{ translateY: -12 }],
  },
});

export default InputWithLabel;
