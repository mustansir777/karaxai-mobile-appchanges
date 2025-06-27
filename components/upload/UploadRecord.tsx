import { Toast } from "@/utils/toast";
import { CustomButton } from "../button/CustomButton";
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View, Text, ActivityIndicator } from "react-native";
import { ThemeText } from "../theme/ThemeText";
import { useState } from "react";

interface UploadRecordProps {
  onUpload: (uri: string) => void;
}

// Maximum file size in MB that we recommend
const MAX_RECOMMENDED_FILE_SIZE_MB = 100;

export const UploadRecord: React.FC<UploadRecordProps> = ({ onUpload }) => {
  const [isChecking, setIsChecking] = useState(false);

  const checkFileSize = async (uri: string): Promise<number> => {
    try {
      const fileInfo = await fetch(uri);
      const blob = await fileInfo.blob();
      return blob.size / (1024 * 1024); // Convert bytes to MB
    } catch (error) {
      console.error("Error checking file size:", error);
      return 0;
    }
  };

  const handleSelectAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp4", "audio/x-m4a"],
      });
      
      if (result.canceled) {
        Toast.show("Cancelled", Toast.SHORT, "bottom", "error");
        return;
      }
      
      const fileUri = result.assets?.[0].uri || "";
      if (!fileUri) {
        Toast.show("Invalid file selected", Toast.SHORT, "bottom", "error");
        return;
      }
      
      // Check file size before uploading
      setIsChecking(true);
      const fileSizeMB = await checkFileSize(fileUri);
      setIsChecking(false);
      
      console.log(`Selected file size: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > MAX_RECOMMENDED_FILE_SIZE_MB) {
        // For very large files, warn the user
        const confirmUpload = window.confirm(
          `Warning: This file is ${fileSizeMB.toFixed(2)} MB, which is quite large. ` +
          `Processing may take longer than usual. Continue with upload?`
        );
        
        if (!confirmUpload) {
          Toast.show("Upload cancelled", Toast.SHORT, "bottom", "info");
          return;
        }
        
        Toast.show(
          `Large file (${fileSizeMB.toFixed(2)} MB). Upload and processing may take longer.`,
          Toast.LONG,
          "bottom",
          "info"
        );
      }
      
      // Proceed with upload
      onUpload(fileUri);
      
    } catch (error) {
      setIsChecking(false);
      console.error("Error selecting audio file:", error);
      Toast.show("Error selecting audio file", Toast.SHORT, "bottom", "error");
    }
  };

  return (
    <View>
      <CustomButton
        onPress={handleSelectAudioFile}
        title={isChecking ? "Checking file..." : "Upload Meeting Recording"}
        type="primary"
        className="py-3 w-full rounded-lg text-white"
        style={{ backgroundColor: '#0a7ea4' }}
        icon={isChecking ? 
          <ActivityIndicator size="small" color="white" /> : 
          <Ionicons name="cloud-upload-outline" size={18} color="white" />}
        disabled={isChecking}
      />
      <ThemeText className="text-sm text-center mt-2">
        Supported formats: MP3, M4A only
      </ThemeText>
      <ThemeText className="text-xs text-center mt-1 text-gray-400">
        For best results, files under {MAX_RECOMMENDED_FILE_SIZE_MB}MB are recommended
      </ThemeText>
    </View>
  );
};
