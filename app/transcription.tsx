import { View } from 'react-native';
import { ThemeView } from '@/components/theme/ThemeView';
import { useLocalSearchParams, router } from 'expo-router';
import { CustomButton } from '@/components/button/CustomButton';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TranscriptionView } from '@/components/transcription/TranscriptionView';
import { useTranscript } from '@/hooks/useTranscript';
import { ThemeText } from '@/components/theme/ThemeText';

export default function TranscriptionScreen() {
  const { eventID } = useLocalSearchParams<{ eventID: string }>();
  const { data: transcriptData, isPending } = useTranscript(eventID);

  return (
    <ThemeView>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center w-full px-4 py-3 border-b border-gray-200">
          <CustomButton
            onPress={() => router.back()}
            icon={<MaterialIcons name="arrow-back-ios-new" size={20} color="white" />}
            className="p-2 rounded-full mr-4"
          />
          <ThemeText className="text-lg font-semibold">Transcription</ThemeText>
        </View>

        {/* Content */}
        {transcriptData?.data && (
          <TranscriptionView
            transcript={transcriptData.data.transcript}
            aaiResponse={transcriptData.data.aai_response}
          />
        )}
      </View>
    </ThemeView>
  );
}