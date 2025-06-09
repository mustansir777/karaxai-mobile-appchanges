import { FC } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeText } from "../theme/ThemeText";
import { Image } from "expo-image";

interface ParticipantAvatarProps {
  source: string;
  name: string;
}

export const ParticipantAvatar: FC<ParticipantAvatarProps> = ({
  source,
  name,
}) => {
  console.log("source", source);
  return (
    <View className="flex-row items-center gap-2">
      <View style={styles.avatarContainer}>
        <Image
          style={styles.avatarImage}
          source={source}
          contentFit="cover"
          transition={1000}
        />
      </View>
      <ThemeText>{name}</ThemeText>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    overflow: "hidden",
    padding: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "center",
    borderRadius: 20,
  },
});
