import React, { FC } from "react";
import {
  View,
  ImageBackground,
  Image,
  StyleSheet,
  Animated,
} from "react-native";

interface RecorderProps {
  scaleAnim: Animated.AnimatedValue;
}

const Recorder: FC<RecorderProps> = ({ scaleAnim }) => {
  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        {/* Outer Circle */}
        <Animated.View
          style={[
            styles.circle,
            styles.outerCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        />
        {/* Middle Circle */}
        <Animated.View
          style={[
            styles.circle,
            styles.middleCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        />

        {/* Inner Circle */}
        <Animated.View
          style={[
            styles.circle,
            styles.innerCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        />

        {/* Background Image Circle */}
        <ImageBackground
          source={require("../../assets/images/recording/Circle.png")}
          style={styles.circleBackground}
          resizeMode="contain"
        >
          {/* Microphone Image */}
          <Image
            source={require("../../assets/images/recording/Mike.png")}
            style={styles.microphone}
            resizeMode="contain"
          />
        </ImageBackground>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circleContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  circleBackground: {
    width: 160, // Reduced width
    height: 160, // Reduced height
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 90, // Adjusted border radius
    overflow: "hidden",
  },

  microphone: {
    position: "absolute",
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  // Common Circle Style
  circle: {
    position: "absolute",
    borderRadius: 150,
    borderColor: "#5de0e6",
  },
  // Outer Circle
  outerCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    opacity: 0.4,
  },
  // Middle Circle
  middleCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    opacity: 0.6,
  },
  // Inner Circle
  innerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    opacity: 0.8,
  },
});

export default Recorder;
