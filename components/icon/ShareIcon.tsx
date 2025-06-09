import { Image, View } from "react-native";

const ShareIcon = () => {
  return (
    <View>
      <Image
        source={require("../../assets/images/icon/Share.png")}
        resizeMode="contain"
      />
    </View>
  );
};

export default ShareIcon;
