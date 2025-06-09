import { Image, View } from "react-native";

const GoogleIcon = () => {
  return (
    <View>
      <Image
        source={require("../../assets/images/icon/google.png")}
        resizeMode="contain"
      />
    </View>
  );
};

export default GoogleIcon;
