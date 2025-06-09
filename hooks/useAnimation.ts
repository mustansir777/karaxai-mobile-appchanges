import { Animated } from "react-native";

interface UseAnimationProps {
  scaleAnim: Animated.Value;
}

export const useAnimation = ({ scaleAnim }: UseAnimationProps) => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ])
  );

  return animation;
};
