import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import OnboardingHeader from "./OnboardingHeader";
import { CustomButton } from "@/components/button/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { syncGoogleCalendar, disconnectGoogleCalendar } from "@/api/onboardingApi";
import { useMutation } from "@tanstack/react-query";
import { Toast } from "@/utils/toast";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

interface CalendarStepProps {
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onFinish, onBack, onSkip }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const syncMutation = useMutation({
    mutationFn: syncGoogleCalendar,
    onSuccess: () => {
      setIsConnected(true);
      setLastSync("Just now");
      Toast.show("Calendar connected successfully!", Toast.SHORT);
    },
    onError: (error) => {
      Toast.show("Failed to connect calendar", Toast.SHORT, "bottom", "error");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () => {
      setIsConnected(false);
      setLastSync(null);
      Toast.show("Calendar disconnected", Toast.SHORT);
    },
    onError: (error) => {
      Toast.show("Failed to disconnect calendar", Toast.SHORT, "bottom", "error");
    },
  });

  const handleConnectCalendar = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo) {
        syncMutation.mutate();
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      Toast.show("Failed to sign in with Google", Toast.SHORT, "bottom", "error");
    }
  };

  const handleDisconnectCalendar = () => {
    disconnectMutation.mutate();
  };

  return (
    <ThemeView className="flex-1 p-6">
      <OnboardingHeader
        title="Connect Your Calendar"
        subtitle="Seamlessly sync your meetings and schedule"
      />

      <View className="mt-6">
        <View className="bg-[#1A1A1A] rounded-lg p-5 border border-gray-700">
          <View className="flex-row items-center">
            <MaterialIcons name="event" size={24} color="#3B82F6" />
            <View className="ml-3">
              <ThemeText className="font-semibold">Google Calendar</ThemeText>
              <ThemeText className="text-[#C1C1C1] text-sm">
                Sync your meetings and events with Google Calendar
              </ThemeText>
            </View>
          </View>

          {isConnected ? (
            <>
              <View className="mt-4 mb-2">
                <View className="flex-row items-center">
                  <View className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                  <ThemeText className="text-green-500 text-xs">Connected</ThemeText>
                </View>
                {lastSync && (
                  <ThemeText className="text-[#C1C1C1] text-xs mt-1">
                    Last synced: {lastSync}
                  </ThemeText>
                )}
              </View>

              <View className="mt-2">
                <ThemeText className="text-[#C1C1C1] text-sm">Features:</ThemeText>
                <View className="ml-2 mt-2">
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                    <ThemeText className="text-[#C1C1C1] text-sm ml-2">
                      Automatic meeting synchronization
                    </ThemeText>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                    <ThemeText className="text-[#C1C1C1] text-sm ml-2">
                      Automatic meeting Bot joining
                    </ThemeText>
                  </View>
                </View>
              </View>

              <CustomButton
                title="Disconnect"
                type="outline"
                className="rounded-lg py-2 mt-4 border border-red-500"
                textClassName="text-red-500"
                onPress={handleDisconnectCalendar}
                isLoading={disconnectMutation.isPending}
                disabled={disconnectMutation.isPending}
              />
            </>
          ) : (
            <CustomButton
              title="Connect Google Calendar"
              icon={<MaterialIcons name="add-circle-outline" size={20} color="#FFF" />}
              iconPosition="left"
              className="rounded-lg py-2 mt-4 bg-blue-600"
              onPress={handleConnectCalendar}
              isLoading={syncMutation.isPending}
              disabled={syncMutation.isPending}
            />
          )}
        </View>

        <View className="bg-[#162231] rounded-lg p-4 mt-6">
          <View className="flex-row items-center">
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <ThemeText className="text-[#C1C1C1] text-sm ml-2">
              Need help?
            </ThemeText>
          </View>
          <ThemeText className="text-[#C1C1C1] text-sm mt-1">
            You can always connect or change your calendar later in settings
          </ThemeText>
        </View>

        <View className="flex-row justify-between mt-10">
          <CustomButton
            title="Back"
            icon={<Ionicons name="arrow-back" size={20} color="#888" />}
            iconPosition="left"
            type="outline"
            className="rounded-lg py-3 px-6 border border-gray-700"
            onPress={onBack}
          />

          <CustomButton
            title={isConnected ? "Finish" : "Skip for now"}
            icon={<Ionicons name="checkmark" size={20} color={isConnected ? "#000" : "#888"} />}
            iconPosition="right"
            type={isConnected ? "secondary" : "outline"}
            className={`rounded-lg py-3 px-6 ${
              isConnected ? "bg-white" : "border border-gray-700"
            }`}
            onPress={isConnected ? onFinish : onSkip}
          />
        </View>
      </View>
    </ThemeView>
  );
};

export default CalendarStep;
