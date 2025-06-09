import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CustomButton } from "@/components/button/CustomButton";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/card/card";
import { CardColors } from "@/constants/CardColors";
import { AskButton } from "@/components/ask/askButton";
import { Feedback } from "@/components/feedback/Feedback";
import { useEffect, useState } from "react";
import { RecordingItem, tableName } from "@/database/database";
import { useSQLiteContext } from "expo-sqlite";
import {
  ActionPoints,
  KeyTakeAways,
  Participants,
  SuggestedMessage,
  Topics,
} from "@/api/api";
import { ShareRecording } from "@/components/share/ShareRecording";
import { DownloadReport } from "@/components/download/DownloadReport";
import { Dummyicipants } from "@/constants/dummyParticipants";
import { ParticipantAvatar } from "@/components/avatar/participantAvatar";
import { AudioPlayer } from "@/components/AudioPlayer/AudioPlayer";
import { AudioPlayerModal } from "@/components/AudioPlayer/AudioPlayerModal";
import { useTranscript } from "@/hooks/useTranscript";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useMeetingView } from "@/hooks/useMeetingView";
import { Toast } from "@/utils/toast";

export default function RecordingViewScreen() {
  const { eventID } = useLocalSearchParams<{ eventID: string }>();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { data: transcriptData, isPending: isTranscriptPending } = useTranscript(eventID);
  const { data: meetingData, isPending: isMeetingPending } = useMeetingView(eventID);

  const isPublic = meetingData?.is_public ?? false;

  if (meetingData?.error_message) {
    return (
      <ThemeView>
        <View className="flex-1 justify-center items-center">
          <ThemeText className="text-lg">
            {meetingData.error_message}
          </ThemeText>
        </View>
      </ThemeView>
    );
  }

  if (isMeetingPending || isTranscriptPending) {
    return (
      <ThemeView>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#004aad" />
        </View>
      </ThemeView>
    );
  }

  const actionPointsTexts = meetingData?.action_points?.map((point: { item_text: string }) => point.item_text) ?? [];
  const topicsPointsTexts = meetingData?.topics?.map((topic: { item_text: string; description: string }) => 
    `${topic.item_text} - ${topic.description}`
  ) ?? [];
  const keyTakeawaysTexts = meetingData?.key_takeaways?.map(
    (takeaway: { item_text: string }) => takeaway.item_text
  ) ?? [];
  const suggestedMessageTexts = meetingData?.questions?.map(
    (message: { item_text: string }) => message.item_text
  ) ?? [];

  const participantsList = meetingData?.participants ?? [];
  const participantCount = participantsList.length;

  return (
    <ThemeView>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center w-full px-4 gap-2">
          <View className="flex-row items-center gap-2">
            <CustomButton
              onPress={() => router.back()}
              icon={<MaterialIcons name="arrow-back-ios-new" size={20} color="white" />}
              className="p-2 rounded-full"
            />
            <Text
              style={{
                color: "#7B8388",
                fontSize: 14,
                width: 100,
                textOverflow: "ellipsis",
              }}
              numberOfLines={1}
            >
              {meetingData?.subject}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="flex-row items-center bg-button-primary px-2 rounded-lg gap-2">
              <ShareRecording
                eventID={eventID}
                is_public={isPublic}
                onRefresh={() => {}}
                isDisabled={!meetingData?.summary}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">|</Text>
              <DownloadReport
                eventID={eventID}
                isDisabled={!meetingData?.summary}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">|</Text>
              <AudioPlayerModal
                audioSrc={transcriptData?.data.meeting_mp3 ?? ""}
                isDisabled={!meetingData?.summary}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">|</Text>
              <Feedback
                eventID={eventID}
                isDisabled={!meetingData?.summary}
              />
            </View>
          </View>
        </View>

        <ScrollView className="px-6">
          {/* Meeting Summary */}
          <View className="mt-5 px-1">
            <ThemeText className="font-bold text-xl">Meeting Summary</ThemeText>
            {meetingData?.summary ? (
              meetingData.summary
                .split(/(?<=\.\s+)/)
                .reduce((acc: string[], sentence: string) => {
                  const lastParagraph = acc[acc.length - 1] || '';
                  const words = lastParagraph.split(/\s+/).length;
                  
                  if (words < 70) {
                    acc[acc.length - 1] = (lastParagraph + ' ' + sentence).trim();
                  } else {
                    acc.push(sentence.trim());
                  }
                  return acc;
                }, [''])
                .map((paragraph: string, index: number) => (
                  <Text key={index} className="text-[#BBBBBB] mt-4">
                    {paragraph}
                  </Text>
                ))
            ) : (
              <Text className="text-[#BBBBBB] mt-1">No summary available</Text>
            )}
          </View>

          {/* Meeting Purpose */}
          {meetingData?.meeting_purpose && (
            <View className="mt-5 px-1">
              <ThemeText className="font-bold text-xl">Meeting Purpose</ThemeText>
              <Text className="text-[#BBBBBB] mt-1">
                {meetingData.meeting_purpose}
              </Text>
            </View>
          )}

          {/* Meeting Summary items */}
          <View className="flex-col gap-2 mt-4 pb-5">
            <Card
              color={CardColors.actionPoints}
              title="Action Points"
              points={actionPointsTexts}
            />
            <Card
              color={CardColors.topic}
              title="Topics"
              points={topicsPointsTexts}
            />
            <Card
              color={CardColors.keyTakeWays}
              title="Key Takeaways"
              points={keyTakeawaysTexts}
            />
          </View>

          {/* Participants header */}
          <View className="flex-row justify-between items-center w-full px-4">
            <ThemeText className="text-xl font-bold">
              Participants ({participantCount})
            </ThemeText>
          </View>

          {/* Participants List */}
          <View className="flex-col gap-2 mt-2 px-4">
            {participantsList.map((participant: { name: string; image?: string }) => (
              <ParticipantAvatar
                key={participant.name}
                source={participant.image || ""}
                name={participant.name}
              />
            ))}
          </View>

          {/* Transcription Button */}
          <View className="mt-6 px-4">
            <CustomButton
              onPress={() => router.push(`/transcription?eventID=${eventID}`)}
              style={{ backgroundColor: '#0a7ea4' }}
              className="py-3 rounded-lg flex-row justify-center items-center"
              textClassName="text-white font-semibold text-base"
              title="View Transcription"
              icon={<MaterialIcons name="description" size={20} color="white" />}
            />
          </View>

          <View className="h-10" />
        </ScrollView>

        {/* Ask */}
        <AskButton
          disabled={suggestedMessageTexts.length === 0}
          onPress={() => {
            if (subscriptionStatus?.data?.data.features.chat) {
              router.push(
                `/ask?suggestedQA=${encodeURIComponent(suggestedMessageTexts.join(','))}&eventID=${eventID}&recordingName=${encodeURIComponent(meetingData?.subject || '')}`
              );
            } else {
              Toast.show(
                "This feature is not available in your plan",
                Toast.SHORT,
                "bottom",
                "error"
              );
            }
          }}
        />
      </View>
    </ThemeView>
  );
}
