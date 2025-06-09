import { Image, View } from "react-native";

const ResumeIcon = () => {
  return (
    <View>
      <Image
        source={require("../../assets/images/icon/resume.png")}
        resizeMode="center"
        style={{ width: 28, height: 28 }}
      />
    </View>
  );
};

export default ResumeIcon;
