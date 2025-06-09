import { FC } from "react";
import { ImageBackground, View, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface ThemeViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ThemeView: FC<ThemeViewProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <ImageBackground
        source={require("../../assets/images/background/background-1.png")}
        resizeMode="cover"
        style={[styles.imageBackground, { zIndex: 10 }]}
      >
        <ImageBackground
          source={require("../../assets/images/background/background-2.png")}
          resizeMode="cover"
          style={[styles.imageBackground, { zIndex: 20 }]}
        >
          {children}
        </ImageBackground>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    position: "relative",
  },
  imageBackground: {
    flex: 1,
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
