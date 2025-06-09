import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { ThemeText } from "@/components/theme/ThemeText";

export default function SyncingIndicator() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    };

    startRotation();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className="flex-row items-center gap-2">
      <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
        <AntDesign name="sync" size={18} color="white" />
      </Animated.View>
      <ThemeText>Sync in progress</ThemeText>
    </View>
  );
}
