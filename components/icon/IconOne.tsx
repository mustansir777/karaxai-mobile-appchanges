import { View } from "react-native";
import { Image } from "expo-image";

const IconOne = () => {
  return (
    <View>
      <Image
        source={require("../../assets/icons/1.svg")}
        style={{
          height: 24,
          width: 24,
        }}
      />
    </View>
  );
};

export default IconOne;
