import { Image, View } from "react-native";

const Logo = () => {
  return (
    <View>
      <Image
        source={require("../../assets/images/logo/logo.png")}
        className="w-10 h-10"
        resizeMode="contain"
      />
    </View>
  );
};

export default Logo;
