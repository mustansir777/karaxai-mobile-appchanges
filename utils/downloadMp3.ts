import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Toast } from "./toast";
import { getFormattedDate } from "./getFormattedTime";

export const downloadAndShareAudio = async (uri: string) => {
  try {
    const date = getFormattedDate();
    const filename = `${date}-audio.mp3`;
    const filePath = FileSystem.documentDirectory + filename;

    // Download the audio file
    const { uri: localUri } = await FileSystem.downloadAsync(uri, filePath);

    // Check if sharing is available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    } else {
      Toast.show(
        "Sharing is not available on this device",
        Toast.SHORT,
        "bottom",
        "error"
      );
    }
  } catch (error) {
    console.error("Download & Share error:", error);
    Toast.show("Error downloading file", Toast.SHORT, "bottom", "error");
  }
};
