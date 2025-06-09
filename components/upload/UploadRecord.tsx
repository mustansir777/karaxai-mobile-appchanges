import { Toast } from "@/utils/toast";
import { CustomButton } from "../button/CustomButton";
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { ThemeText } from "../theme/ThemeText";

interface UploadRecordProps {
  onUpload: (uri: string) => void;
}

export const UploadRecord: React.FC<UploadRecordProps> = ({ onUpload }) => {
  const handleSelectAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp4", "audio/x-m4a"],
      });
      if (result.canceled) {
        Toast.show("Cancelled", Toast.SHORT, "bottom", "error");
      } else {
        console.log(result.assets?.map((asset) => asset.uri));
        onUpload(result.assets?.[0].uri || "");
      }
    } catch (error) {
      console.log(error);
      Toast.show("Error selecting audio file", Toast.SHORT, "bottom", "error");
    }
  };

  return (
    <View>
      <CustomButton
        onPress={handleSelectAudioFile}
        title="Upload Meeting Recording"
        type="primary"
        className="py-3 w-full rounded-lg"
        icon={<Ionicons name="cloud-upload-outline" size={18} color="white" />}
      />
      <ThemeText className="text-sm text-center mt-2">
        Supported formats: MP3, M4A only
      </ThemeText>
    </View>
  );
};
