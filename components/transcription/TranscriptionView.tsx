import { View, Text, ScrollView } from 'react-native';
import { ThemeText } from '@/components/theme/ThemeText';
import { ThemeView } from '@/components/theme/ThemeView';
import { TranscriptionItems } from '@/api/api';

interface TranscriptionViewProps {
  transcript: string;
  aaiResponse: TranscriptionItems[];
}

export function TranscriptionView({ transcript, aaiResponse }: TranscriptionViewProps) {
  return (
    <ScrollView className="px-6">
      {/* Transcript Section */}
      {transcript && (
        <View className="mt-5">
          <ThemeText className="text-xl font-bold mb-4">Transcript</ThemeText>
          <Text className="text-[#BBBBBB]">{transcript}</Text>
        </View>
      )}

      {/* AI Response Section */}
      {aaiResponse && aaiResponse.length > 0 && (
        <View className="mt-8">
          <ThemeText className="text-xl font-bold mb-4">Detailed Conversation</ThemeText>
          {aaiResponse.map((item, index) => (
            <View key={index} className="mb-4">
              <Text style={{ color: '#007AFF', fontWeight: 'bold', marginBottom: 4 }}>{item.speaker}</Text>
              <Text className="text-[#BBBBBB]">{item.text}</Text>
            </View>
          ))}
        </View>
      )}
      <View className="h-10" />
    </ScrollView>
  );
}