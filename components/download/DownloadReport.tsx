import { Feather } from "@expo/vector-icons";
import { CustomButton } from "../button/CustomButton";
import { FC } from "react";
import * as FileSystem from "expo-file-system";
import { getFormattedDate } from "@/utils/getFormattedTime";
import * as Sharing from "expo-sharing";
import { useDownload } from "@/hooks/useDownload";
import { Toast } from "@/utils/toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface DownloadReportProps {
  eventID: string;
  isDisabled: boolean;
}

export const DownloadReport: FC<DownloadReportProps> = ({
  eventID,
  isDisabled,
}) => {
  const { isPending, mutateAsync } = useDownload(eventID);
  const { subscriptionStatus } = useSubscriptionStatus();

  const handleDownload = async () => {
    try {
      const date = getFormattedDate();
      const response = await mutateAsync();

      if (response) {
        const filePath = `${FileSystem.documentDirectory}recording-${date}.pdf`;

        await FileSystem.writeAsStringAsync(filePath, response, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        console.log("File downloaded successfully:", filePath);
        Toast.show("Downloaded successfully", Toast.SHORT, "bottom", "success");

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Toast.show(
            "Sharing is not available on this device",
            Toast.SHORT,
            "bottom",
            "error"
          );
        }
      } else {
        console.error("Error downloading file:", response?.status);
        Toast.show("Error downloading file", Toast.SHORT, "bottom", "error");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      Toast.show("Error downloading file", Toast.SHORT, "bottom", "error");
    }
  };

  if (!subscriptionStatus?.data?.data.features.download_report)
    return (
      <CustomButton
        onPress={() => {
          Toast.show(
            "This feature is not available in your plan",
            Toast.SHORT,
            "bottom",
            "error"
          );
        }}
        loadingSize={13}
        icon={<Feather name="download" size={18} color="white" />}
        className="px-2.5 py-3 rounded-r-lg"
      />
    );

  return (
    <CustomButton
      disabled={isPending || isDisabled}
      isLoading={isPending}
      onPress={handleDownload}
      loadingSize={13}
      icon={<Feather name="download" size={18} color="white" />}
      className="px-2.5 py-3 rounded-r-lg"
    />
  );
};
