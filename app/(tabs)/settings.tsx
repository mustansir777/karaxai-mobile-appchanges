// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemeView } from "@/components/theme/ThemeView";
import { ThemeText } from "@/components/theme/ThemeText";
import useAuthStorage from "@/hooks/useAuthData";
import useOnboardingStatus from "@/hooks/useOnboardingStatus";
import FontAwesome from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import * as Linking from 'expo-linking';
import OnboardingModal from "@/components/onboarding/OnboardingModal";

export default function SettingsScreen() {
  const auth = useAuthStorage();
  const { onboardingStatus } = useOnboardingStatus();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleOnboardingPress = () => {
    if (onboardingStatus.completed) {
      Alert.alert(
        "Onboarding Completed",
        "You have already completed the onboarding process.",
        [{ text: "OK", style: "default" }]
      );
    } else {
      setShowOnboarding(true);
    }
  };

  return (
    <ThemeView>
      <View style={styles.container}>
        <ThemeText style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }} className="text-white">Settings</ThemeText>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push("/profile")}>
          <View style={styles.iconContainer}>
            <FontAwesome name="user" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Account</Text>
            <Text style={styles.settingValue}>{auth.username || 'Not signed in'}</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push("/profile-details")}>
          <View style={styles.iconContainer}>
            <FontAwesome name="id-card" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Profile Details</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity>
        

        
        {/* <TouchableOpacity style={styles.settingItem}>
          <View style={styles.iconContainer}>
            <FontAwesome name="bell" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity> */}
        
        {/* <TouchableOpacity style={styles.settingItem}>
          <View style={styles.iconContainer}>
            <FontAwesome name="shield-alt" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Privacy</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity> */}
        
        <TouchableOpacity 
          style={styles.settingItem} 
          onPress={() => Linking.openURL('https://karax.ai/contact')}
        >
          <View style={styles.iconContainer}>
            <FontAwesome name="question-circle" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Help & Support</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.iconContainer}>
            <FontAwesome name="info-circle" size={18} color="#BBBBBB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>About</Text>
            <Text style={styles.settingValue}>Version 1.0.0</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#BBBBBB" />
        </TouchableOpacity>
      </View>
      
      <OnboardingModal 
        visible={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </ThemeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 12,
    color: '#929292',
    marginTop: 2,
  },
  completedText: {
    color: '#4CAF50',
  }
});
