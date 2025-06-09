import { Octicons } from "@expo/vector-icons";
import { CustomButton } from "../button/CustomButton";
import { FC, useState } from "react";
import CustomModal from "../modal/CustomModal";
import { ThemeText } from "../theme/ThemeText";
import { Share, View } from "react-native";
import { useMakeLinkPublic } from "@/hooks/useMakeLinkPublic";
import { Toast } from "@/utils/toast";
import { AppEnv } from "@/config/AppEnv";
import { useSQLiteContext } from "expo-sqlite";
import { tableName } from "@/database/database";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

interface ShareRecordingProps {
  eventID: string;
  is_public: boolean;
  onRefresh: () => void;
  isDisabled?: boolean;
}

export const ShareRecording: FC<ShareRecordingProps> = ({
  eventID,
  is_public,
  onRefresh,
  isDisabled,
}) => {
  const [dailogVisible, setDailogVisible] = useState(false);
  const { isPending, mutateAsync } = useMakeLinkPublic(eventID);
  const db = useSQLiteContext();
  const shareURL = `${AppEnv.shareHost}/public-view?id=${eventID}`;
  const handleModalClose = () => setDailogVisible(false);

  const updateIsPublic = async (value: boolean) => {
    try {
      await db.runAsync(
        `UPDATE ${tableName} SET is_public = ? WHERE event_id = ?`,
        [value, eventID]
      );
      onRefresh();
    } catch (error) {
      console.error("Error updating recording details:", error);
    }
  };

  const handleMakeLinkPublic = () => {
    mutateAsync()
      .then(async (e) => {
        Toast.show(e.message, Toast.SHORT, "top", "success");
        handleModalClose();
        await updateIsPublic(true);
        openShare();
      })
      .catch((e) =>
        Toast.show(
          e.message?.message || "Request failed",
          Toast.SHORT,
          "top",
          "error"
        )
      );
  };

  const openShare = async () => {
    try {
      await Share.share({
        message: shareURL,
        title: "Share Recording",
        url: shareURL,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View>
      <CustomButton
        disabled={isDisabled}
        onPress={is_public ? openShare : () => setDailogVisible(true)}
        icon={<FontAwesome6 name="share-from-square" size={16} color="white" />}
        className="px-2.5 py-3"
      />

      <CustomModal visible={dailogVisible} onClose={handleModalClose}>
        <ThemeText className="text-xl">Share this link</ThemeText>

        <View className="flex-grow h-[1px] bg-background-secondary mt-4"></View>

        <View className="mt-4">
          <ThemeText className="text-lg ">
            To enable sharing, you need to make the link public
          </ThemeText>
          <ThemeText className="text-sm mt-4">
            By making the link public, you grant access to anyone with the link,
            allowing them to collaborate with you
          </ThemeText>
        </View>

        <View className="flex-row w-full mt-4 gap-2">
          <CustomButton
            onPress={handleModalClose}
            type="primary"
            title="Cancel"
            className="rounded-lg px-4 py-3 flex-1"
          />
          <CustomButton
            onPress={handleMakeLinkPublic}
            isLoading={isPending}
            disabled={isPending}
            type="secondary"
            title="Make Public"
            className="rounded-lg px-4 py-3 flex-1"
          />
        </View>
      </CustomModal>
    </View>
  );
};
