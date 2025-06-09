import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { ThemeText } from "../theme/ThemeText";
import { router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { DeleteRecording } from "./DeleteRecording";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { RecordingItem, tableName } from "@/database/database";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Toast } from "@/utils/toast";
import { getFormattedDateAndTime } from "@/utils/formatTime";

export const RecordingItemCard = ({
  item,
  refetchData,
  activeEditId,
  setActiveEditId,
}: {
  item: RecordingItem;
  refetchData: () => void;
  activeEditId: number | null;
  setActiveEditId: (id: number | undefined | null) => void;
}) => {
  const isEditOption = activeEditId === item.id;
  const [value, setValue] = useState(item.subject);
  const db = useSQLiteContext();

  const updateSubject = async () => {
    try {
      if (!value)
        return Toast.show("Please enter a title", Toast.SHORT, "top", "error");
      await db.runAsync(`UPDATE ${tableName} SET subject = ? WHERE id = ?`, [
        value,
        item.id ? item.id : "",
      ]);
      setActiveEditId(null);
      refetchData();
      Toast.show("Title updated successfully", Toast.SHORT, "top", "success");
    } catch (error) {
      console.error("Error updating recording details:", error);
      Toast.show("Error updating recording Title", Toast.SHORT, "top", "error");
    }
  };

  const navgateToRecordingView = () => {
    router.push(`/recordingview?eventID=${item.event_id}`);
  };

  const swipeableRef = useRef<any>(null);

  const setEditMode = (id: any) => {
    setActiveEditId(id);
    swipeableRef.current?.close();
  };

  function RightAction(prog: SharedValue<number>, drag: SharedValue<number>) {
    const styleAnimation = useAnimatedStyle(() => {
      // console.log("showRightProgress:", prog.value);
      // console.log("appliedTranslation:", drag.value);

      return {
        transform: [{ translateX: drag.value + 50 }],
      };
    });

    return (
      <Reanimated.View
        className={"flex-row items-center justify-end gap-4 px-4"}
      >
        <DeleteRecording id={item.id} refetchData={refetchData} />
        <TouchableOpacity onPress={() => setEditMode(item.id)}>
          <Ionicons name="pencil-sharp" size={28} color="white" />
        </TouchableOpacity>
      </Reanimated.View>
    );
  }

  return (
    <GestureHandlerRootView>
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={40}
        renderRightActions={RightAction}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={navgateToRecordingView}
          style={{
            backgroundColor: "#0F0F0F",
            borderColor: "#1D1D1D",
            borderWidth: 1,
            borderRadius: 20,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <View className="flex-col justify-between items-start gap-1">
            <View className="flex-row justify-between w-full items-center gap-4">
              {isEditOption ? (
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "#1B1C1E",
                    color: "white",
                    padding: 12,
                    borderRadius: 12,
                  }}
                  value={value}
                  onChangeText={setValue}
                  placeholder="Edit Title"
                  placeholderTextColor="#aaa"
                />
              ) : (
                <ThemeText className="text-lg font-medium mb-2">
                  {item.subject}
                </ThemeText>
              )}

              {/* <Text
                style={{
                  fontSize: 14,
                  color: "#A0A0A0",
                  fontWeight: "500",
                  marginBottom: 2,
                }}
              >
                {item.url}
              </Text> */}

             
            </View>

            <View className="flex-row justify-between items-end gap-2 w-full">
              <Text
                style={{
                  fontSize: 14,
                  color: "#A0A0A0",
                  padding: isEditOption ? 4 : 0,
                }}
              >
                {getFormattedDateAndTime(item.date || "")}
              </Text>

              {isEditOption ? (
                <View className="flex-row gap-4 items-center">
                  <TouchableOpacity onPress={() => setActiveEditId(null)}>
                   
                    <Ionicons
                      name="close-circle-outline"
                      size={32}
                      color="red"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={value === item.subject}
                    onPress={updateSubject}
                    style={{
                      opacity: value === item.subject ? 0.5 : 1,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={32}
                      color="green"
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </GestureHandlerRootView>
  );
};
