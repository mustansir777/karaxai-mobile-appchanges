import AntDesign from "@expo/vector-icons/AntDesign";
import { FC, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomModal from "../modal/CustomModal";
import { ThemeText } from "../theme/ThemeText";
import { useSQLiteContext } from "expo-sqlite";
import { Toast } from "@/utils/toast";
import { tableName } from "@/database/database";
import { Ionicons } from "@expo/vector-icons";

interface DeleteRecordingProps {
  id: any;
  refetchData: () => void;
}

export const DeleteRecording: FC<DeleteRecordingProps> = ({
  id,
  refetchData,
}) => {
  const db = useSQLiteContext();
  const [modalVisible, setModalVisible] = useState(false);

  const handleClose = () => {
    setModalVisible(false);
  };

  const handleDelete = async () => {
    try {
      await db.runAsync(`DELETE FROM ${tableName}  WHERE id = ?`, [id]);
      refetchData();
      handleClose();
      Toast.show(
        "Recording deleted successfully",
        Toast.SHORT,
        "top",
        "success"
      );
    } catch (error) {
      console.error("Error deleting recording:", error);
      Toast.show("Error deleting recording", Toast.SHORT, "top", "error");
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Ionicons name="trash-sharp" size={28} color="#EF3434" />
      </TouchableOpacity>

      <CustomModal visible={modalVisible} onClose={handleClose}>
        <ThemeText className="text-xl">Confirm Delete</ThemeText>

        <View className="flex-grow h-[1px] bg-background-secondary mt-4"></View>

        <View className="mt-4">
          <ThemeText className="text-xl">
            Are sure you want delete this recording ?{" "}
          </ThemeText>
        </View>

        <View className="flex-row w-full mt-4 gap-2">
          <TouchableOpacity
            onPress={handleClose}
            style={{
              borderRadius: 8,
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
            }}
          >
            <ThemeText className="text-md">Cancel</ThemeText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={{
              backgroundColor: "#EF3434",
              borderRadius: 8,
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
            }}
          >
            <ThemeText className="text-md">Delete</ThemeText>
          </TouchableOpacity>
        </View>
      </CustomModal>
    </View>
  );
};
