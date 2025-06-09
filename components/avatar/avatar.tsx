import useAuthStorage from "@/hooks/useAuthData";
import React from "react";
import { Image, View, StyleSheet, Text } from "react-native";

interface AvatarProps {
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ size = 30 }) => {
  const { username, image } = useAuthStorage();
  const firstName = username?.charAt(0) ?? "S";

  const styles = StyleSheet.create({
    avatarContainer: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: "hidden",
      backgroundColor: "#004aad",
      borderColor: "white",
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      borderRadius: size / 2,
    },
    avatarText: {
      fontSize: size / 2,
      fontWeight: "bold",
      color: "white",
      textTransform: "uppercase",
      textAlign: "center",
      lineHeight: size,
    },
  });

  return (
    <View style={styles.avatarContainer}>
      {image ? (
        <Image source={{ uri: image }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>{firstName}</Text>
      )}
    </View>
  );
};
