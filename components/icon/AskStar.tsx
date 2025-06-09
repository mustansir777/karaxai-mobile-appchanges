import { Image, View } from "react-native";

const AskStar = () => {
  return (
    <View>
      <Image
        source={require("../../assets/images/ask/star.png")}
        resizeMode="contain"
      />
    </View>
  );
};

export default AskStar;
