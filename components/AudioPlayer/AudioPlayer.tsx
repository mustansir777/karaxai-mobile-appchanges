import { usePlayback } from "@/hooks/usePlayBack";
import Slider from "@react-native-community/slider";
import { FC, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { CustomButton } from "../button/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "../theme/ThemeText";
import Feather from "@expo/vector-icons/Feather";
import { getFormattedDate } from "@/utils/getFormattedTime";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Toast } from "@/utils/toast";

interface AudioPlayerProps {
  uri: string;
}

export const AudioPlayer: FC<AudioPlayerProps> = ({ uri }) => {
  const {
    isPlaying,
    playbackDuration,
    playbackPosition,
    isLoading,
    loadAndPlay,
    play,
    pause,
    seek,
    formatTime,
  } = usePlayback();

  const [sliderValue, setSliderValue] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (uri) {
      loadAndPlay(uri);
    }
  }, [uri]);

  useEffect(() => {
    if (playbackDuration > 0) {
      setSliderValue(playbackPosition);
    }
  }, [playbackPosition, playbackDuration]);

  const downloadAndShareAudio = async (uri: string) => {
    try {
      setIsDownloading(true);
      const date = getFormattedDate();
      const filename = `${date}-audio.mp3`;
      const filePath = FileSystem.documentDirectory + filename;

      // Download the audio file
      const { uri: localUri } = await FileSystem.downloadAsync(uri, filePath);
      Toast.show("Downloaded successfully", Toast.SHORT, "bottom", "success");
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
    } finally {
      // Set isDownloading back to false when done
      setIsDownloading(false);
    }
  };

  return (
    <View className="bg-button-primary py-10 rounded-xl w-full">
      {isLoading ? (
        <View className="flex-row items-center justify-center">
          <ActivityIndicator size="large" color="#004aad" />
        </View>
      ) : (
        <View className="min-w-full">
          {/* Seek Slider */}
          <Slider
            className="min-w-full"
            value={sliderValue}
            minimumValue={0}
            maximumValue={playbackDuration > 0 ? playbackDuration : 1}
            onValueChange={(value) => setSliderValue(value)}
            onSlidingComplete={(value) => seek(value)}
            thumbTintColor="#004aad"
            minimumTrackTintColor="#004aad"
            maximumTrackTintColor="white"
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              position: "relative",
            }}
          >
            {/* Left: Playback Time */}
            <ThemeText className="ml-4">
              {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
            </ThemeText>

            {/* Centered Play Button */}
            <View
              style={{
                position: "absolute",
                left: "50%",
                transform: [{ translateX: -1 / 2 }],
              }}
            >
              <CustomButton
                icon={
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="white"
                  />
                }
                onPress={isPlaying ? pause : play}
                className="bg-transparent"
              />
            </View>

            {/* Right: Download Button */}
            <CustomButton
              isLoading={isDownloading}
              onPress={() => downloadAndShareAudio(uri)}
              icon={<Feather name="download" size={24} color="white" />}
              className="bg-transparent ml-auto mr-4"
            />
          </View>
        </View>
      )}
    </View>
  );
};
