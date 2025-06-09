import { View } from "react-native";
import { Image } from "expo-image";

const IconTwo = () => {
  return (
    <View>
      <Image
        source={require("../../assets/icons/2.svg")}
        style={{
          height: 24,
          width: 24,
        }}
      />
    </View>
  );
};

export default IconTwo;
