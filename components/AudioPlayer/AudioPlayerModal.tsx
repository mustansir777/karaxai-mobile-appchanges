import { TouchableOpacity, View } from "react-native";
import CustomModal from "../modal/CustomModal";
import { CustomButton } from "../button/CustomButton";
import { FC, useState } from "react";
import { AudioPlayer } from "./AudioPlayer";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AntDesign from "@expo/vector-icons/AntDesign";
import IconTwo from "../icon/IconTwo";

interface AudioPlayerModalProps {
  audioSrc: string;
  isDisabled?: boolean;
}

export const AudioPlayerModal: FC<AudioPlayerModalProps> = ({
  isDisabled,
  audioSrc,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleFeedBackModal = () => {
    setModalVisible(false);
  };

  return (
    <View>
      <CustomButton
        disabled={isDisabled}
        onPress={() => setModalVisible(true)}
        type="primary"
        className="px-0 py-2 rounded-lg"
        icon={<IconTwo />}
      />

      <CustomModal visible={modalVisible} onClose={handleFeedBackModal}>
        <View className="flex items-end justify-end">
          <TouchableOpacity onPress={handleFeedBackModal}>
            <AntDesign name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <AudioPlayer uri={audioSrc} />
      </CustomModal>
    </View>
  );
};
