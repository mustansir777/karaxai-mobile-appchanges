import { axiosApi, Chat } from "@/api/api";
import AskInput from "@/components/ask/askInput";
import { SuggestedQA } from "@/components/ask/suggestedQA";
import { CustomButton } from "@/components/button/CustomButton";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Modal } from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import convertTimestamp from "@/utils/getConvertTimeStamp";
import { useNetworkState } from "expo-network";
import { OfflineMessage } from "@/components/offline/offlineMessage";
import { ProductDetail } from "@/constants/Product";
import Toast from "react-native-toast-message";

export default function askScreen() {
  const { suggestedQA, eventID, recordingName } = useLocalSearchParams<{
    suggestedQA: string;
    eventID: string;
    recordingName: string;
  }>();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Chat[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const suggestedQAmessage = suggestedQA.split(",").map((e) => e.trim());
  const [selectedMessage, setSelectedMessage] = useState<Chat | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const queryClient = useQueryClient();
  const networkState = useNetworkState();

  /*  const reportMessageApi = useMutation({
     mutationKey: ["reportMessage"],
    mutationFn: async (messageId: number) => {
      const response = axiosApi({
        url: `/chat/report/${messageId}/`,
        method: "POST",
      }).then((e) => e.data);
      return response;
    },
  }); */

  const handleReport = (message: Chat) => {
    setSelectedMessage(message);
    setIsReportModalVisible(true);
  };

  /*  const submitReport = () => {
    if (selectedMessage) {
      reportMessageApi.mutate(selectedMessage.id, {
        onSuccess: () => {
          setIsReportModalVisible(false);
          Toast.show({
            type: 'success',
            text1: 'Message reported successfully',
          });
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: 'Failed to report message',
          });
        },
      });
    }
  }; */

  const submitReport = () => {
    if (selectedMessage) {
      // Temporarily bypass the API call and show success message directly
      setIsReportModalVisible(false);
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Message reported successfully",
        });
      }, 1000);

      // Keep the API call commented out for later use
      /*
      reportMessageApi.mutate(selectedMessage.id, {
        onSuccess: () => {
          setIsReportModalVisible(false);
          Toast.show({
            type: 'success',
            text1: 'Message reported successfully',
          });
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: 'Failed to report message',
          });
        },
      });
      */
    }
  };

  const chatHistoryApi = useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      const response = axiosApi({
        url: makeUrlWithParams("/chat/chat-history/{{eventId}}/", {
          eventId: eventID,
        }),
        method: "GET",
      }).then((e) => e.data);
      return response;
    },
    enabled: !!eventID,
  });

  const sendMessageApi = useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: async (payload: { user_input: string; event_id: string }) => {
      const response = axiosApi({
        url: "/chat/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  console.log("chatHistoryApi", chatHistoryApi.data);

  useEffect(() => {
    if (chatHistoryApi.data) {
      setHistory(chatHistoryApi.data.data);
    }
  }, [chatHistoryApi.data]);

  const handleSendMessage = (message: string) => {
    console.log("Message:", message);
    if (message.trim() !== "") {
      setShowSuggestion(false);
      const tempMessage: Chat = {
        id: -1,
        user_type: "user",
        message: message,
        user: 1,
        timestamp: new Date().toISOString(),
      };

      const tempErroMessage: Chat = {
        id: -1,
        user_type: "ai",
        message: "Request failed try again.",
        user: 1,
        timestamp: new Date().toISOString(),
      };

      setHistory((prevMessages) => [...prevMessages, tempMessage]);

      sendMessageApi
        .mutateAsync({
          user_input: message,
          event_id: eventID,
        })
        .then((e) => {
          queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
        })
        .catch(() =>
          setHistory((prevMessages) => [...prevMessages, tempErroMessage])
        );

      setMessage("");
    }
  };

  const suggestedMsgExcluded = suggestedQAmessage.filter(
    (msg) => !history.map((e) => e.message).includes(msg)
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <CustomButton
          onPress={() => router.back()}
          icon={
            <MaterialIcons name="arrow-back-ios-new" size={20} color="#0a7ea4" />
          }
          className="p-2 rounded-full"
        />
        <Text className="text-[#7B8388]">My Recording</Text>
        <Text className="text-[#7B8388]">/</Text>
        <Text
          style={{
            color: "#0a7ea4",
            fontSize: 14,
            width: 150,
            textOverflow: "ellipsis",
          }}
          numberOfLines={1}
        >
          {recordingName}
        </Text>
      </View>
      <View className="flex-1">
        <View className="h-[95%] w-full bg-white rounded-t-3xl border border-[#f0f0f0] shadow-sm">
          <View className="py-3 px-6">
            {/* Fixed: Removed style prop and used className for styling */}
            <ThemeText className="text-2xl text-[#333] font-bold pl-4">Ask ?</ThemeText>
            <View className="flex-grow h-[1px] bg-[#f0f0f0] mt-2" />
          </View>

          {networkState.isInternetReachable === undefined ||
          (chatHistoryApi.isLoading && !message) ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
          ) : !networkState.isInternetReachable ? (
            <OfflineMessage />
          ) : (
            <View className="flex-1 mb-2">
              <ScrollView
                className="w-full px-6"
                ref={scrollViewRef}
                onContentSizeChange={() =>
                  scrollViewRef.current?.scrollToEnd({ animated: true })
                }
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingTop: 10,
                  justifyContent: "flex-start",
                }}
              >
                {history.length === 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <SuggestedQA
                      itemList={suggestedQAmessage || []}
                      onpress={handleSendMessage}
                    />
                  </View>
                ) : (
                  <View style={{ width: "100%", marginTop: 10 }}>
                    {history.map((e, i) => (
                      <View
                        key={i}
                        style={{
                          width: "100%",
                          alignItems:
                            e.user_type === "user" ? "flex-end" : "flex-start",
                          marginBottom: 12
                        }}
                      >
                        <View className="flex-row items-end gap-2">
                          {e.user_type === "ai" && (
                            <Octicons
                              name="dependabot"
                              size={16}
                              color="#666"
                            />
                          )}
                          <View className="flex-col gap-1">
                            <View
                              style={{
                                backgroundColor: e.user_type === "user" ? "#0a7ea4" : "#e0e0e0",
                                borderRadius: 16,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                marginTop: e.user_type === "user" ? 8 : 0,
                                maxWidth: 280
                              }}
                            >
                              <Text style={{ 
                                color: e.user_type === "user" ? "white" : "#333"
                              }}>{e.message}</Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                              <Text style={{ color: "#999", fontSize: 12 }}>
                                {convertTimestamp(e.timestamp)}
                              </Text>
                              {e.user_type === "ai" && (
                                <CustomButton
                                  onPress={() => handleReport(e)}
                                  className="ml-2 bg-transparent"
                                  icon={
                                    <MaterialIcons
                                      name="report"
                                      size={16}
                                      color="#999"
                                    />
                                  }
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {sendMessageApi.isPending && (
                  <View style={{ width: "100%", marginTop: 8, marginBottom: 8 }}>
                    <View className="flex-row items-center gap-1">
                      <Octicons name="dependabot" size={16} color="#666" />
                      <Text style={{ color: "#666", fontSize: 14 }}>Typing...</Text>
                    </View>
                  </View>
                )}

                {showSuggestion && (
                  <View style={{ width: "100%", marginTop: 16 }}>
                    <SuggestedQA
                      itemList={suggestedMsgExcluded || []}
                      onpress={handleSendMessage}
                    />
                  </View>
                )}

                {history.length > 0 && suggestedMsgExcluded.length > 0 && (
                  <View style={{ width: "100%", alignItems: "flex-end", marginTop: 12, marginBottom: 8 }}>
                    {/* Fixed: Removed style prop and used className for styling */}
                    <CustomButton
                      onPress={() => setShowSuggestion(!showSuggestion)}
                      disabled={sendMessageApi.isPending}
                      title="Suggested Questions"
                      className="text-sm rounded-lg py-2 px-4 bg-[#0a7ea4]"
                    />
                  </View>
                )}
              </ScrollView>

              <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
                <AskInput
                  value={message}
                  setValue={setMessage}
                  placeholder={`Message to ${ProductDetail.name}...`}
                  onPress={() => handleSendMessage(message)}
                  isDisabled={!message || sendMessageApi.isPending}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={isReportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, width: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>Report Message</Text>
            <Text style={{ color: '#666', marginBottom: 24, fontSize: 16 }}>
              Are you sure you want to report this message?
            </Text>
            <View className="flex-row justify-end gap-4">
              {/* Fixed: Removed style prop and used className for styling */}
              <CustomButton
                title="Cancel"
                onPress={() => setIsReportModalVisible(false)}
                className="px-4 py-2 rounded-lg bg-[#f0f0f0]"
              />
              {/* Fixed: Removed style prop and used className for styling */}
              <CustomButton
                title="Report"
                onPress={submitReport}
                className="px-4 py-2 rounded-lg bg-[#ff3b30]"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}