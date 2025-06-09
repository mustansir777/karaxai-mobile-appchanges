import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { ThemeView } from "@/components/theme/ThemeView";
import { ThemeText } from "@/components/theme/ThemeText";
import { getUserDetails } from "@/api/onboardingApi";
import { UserDetailsResponse } from "@/api/onboardingApi";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Avatar } from "@/components/avatar/avatar";

export default function ProfileDetailsScreen() {
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await getUserDetails();
        setUserDetails(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError('Failed to load user details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const renderDetailItem = (label: string, value: string | null | undefined) => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
    </View>
  );

  return (
    <ThemeView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#BBBBBB" />
          </TouchableOpacity>
          {/* Fixed: Removed style prop and used className */}
          <ThemeText className="text-2xl font-bold">Profile Details</ThemeText>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BBBBBB" />
            {/* Fixed: Removed style prop and used className */}
            <ThemeText className="mt-2.5 text-base text-[#BBBBBB]">Loading profile details...</ThemeText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            {/* Fixed: Removed style prop and used className */}
            <ThemeText className="text-base text-[#FF6B6B] text-center mb-5">{error}</ThemeText>
            <TouchableOpacity 
              onPress={() => {
                setLoading(true);
                setError(null);
                getUserDetails()
                  .then(response => {
                    setUserDetails(response);
                    setError(null);
                  })
                  .catch(err => {
                    console.error('Error fetching user details:', err);
                    setError('Failed to load user details. Please try again.');
                  })
                  .finally(() => setLoading(false));
              }}
              style={styles.retryButton}
            >
              {/* Fixed: Removed style prop and used className */}
              <ThemeText className="text-base text-white">Retry</ThemeText>
            </TouchableOpacity>
          </View>
        ) : userDetails ? (
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.detailsContainer}>
              <View style={styles.profilePhotoContainer}>
                {/* Fixed: Removed style prop and used className */}
                <ThemeText className="text-lg font-bold mt-2.5 mb-1.5 text-[#BBBBBB]">Profile Photo</ThemeText>
                <View style={styles.avatarWrapper}>
                  <Avatar size={120} />
                </View>
              </View>
              
              {/* Fixed: Removed style prop and used className */}
              <ThemeText className="text-lg font-bold mt-2.5 mb-1.5 text-[#BBBBBB]">Personal Information</ThemeText>
              {renderDetailItem('First Name', userDetails.data.user.first_name)}
              {renderDetailItem('Last Name', userDetails.data.user.last_name)}
              {renderDetailItem('Email Address', userDetails.data.user.email)}
              {renderDetailItem('Referred From', userDetails.data.profile.referred_from)}
              {renderDetailItem('Use Case', userDetails.data.profile.use_case)}
              {renderDetailItem('User Type', userDetails.data.profile.user_type)}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </ThemeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  detailsContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  detailItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    fontSize: 14,
    color: '#929292',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  profilePhotoContainer: {
    marginBottom: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
});