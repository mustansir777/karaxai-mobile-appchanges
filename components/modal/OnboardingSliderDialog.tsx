// components/modal/OnboardingSliderDialog.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  Image,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { axiosApi } from '@/api/api';
import { Toast } from '@/utils/toast';

const { width } = Dimensions.get('window');

interface OnboardingSliderDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface OnboardingData {
  referred_from: string;
  use_case: string;
  user_type: string;
}

interface SimpleResponse {
  success: boolean;
  message: string;
}

interface SlideItem {
  id: string;
  image: any; // React Native image source
  title: string;
  description: string;
}

export const OnboardingSliderDialog: React.FC<OnboardingSliderDialogProps> = ({
  visible,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Sample slides with placeholder images
  // In a real implementation, you would import actual images
  const slides: SlideItem[] = [
    {
      id: '1',
      image: require('../../assets/images/app-icon.png'), // Replace with actual image path
      title: 'Get KaraX Everywhere',
      description: 'Access KaraX seamlessly across all your devices',
    },
    {
      id: '2',
      image: require('../../assets/images/app-icon.png'), // Replace with actual image path
      title: 'Choose Your Plan',
      description: 'Start with our Pro Trial and unlock all features',
    },
    {
      id: '3',
      image: require('../../assets/images/app-icon.png'), // Replace with actual image path
      title: 'Choose Your Professional Path',
      description: 'Select the option that best describes your role',
    },
    {
      id: '4',
      image: require('../../assets/images/app-icon.png'), // Replace with actual image path
      title: 'Welcome',
      description: "Let's personalize your experience",
    },
  ];

  // Mutation for submitting onboarding data
  const submitOnboardingMutation = useMutation<SimpleResponse, Error, OnboardingData>({
    mutationFn: async (data: OnboardingData) => {
      const response = await axiosApi({
        url: '/onboarding/',
        method: 'POST',
        data,
      });
      return response.data;
    },
    onSuccess: (data) => {
      Toast.show(data.message || 'Onboarding completed successfully!', Toast.SHORT);
      onClose();
    },
    onError: (error) => {
      Toast.show('Failed to complete onboarding', Toast.SHORT, 'bottom', 'error');
      console.error('Onboarding error:', error);
    },
  });

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [visible]);

  const handleFinish = () => {
    // Submit onboarding data
    submitOnboardingMutation.mutate({
      referred_from: 'mobile_app',
      use_case: 'meeting_recordings',
      user_type: 'business_executive',
    });
  };

  const renderItem = ({ item }: { item: SlideItem }) => {
    return (
      <View style={styles.slide}>
        <Image source={item.image} style={styles.slideImage} />
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          );
        })}
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      }
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: prevIndex, animated: true });
      }
      setCurrentIndex(prevIndex);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentIndex(index);
            }}
            scrollEnabled={true}
            contentContainerStyle={styles.flatListContent}
          />

          {renderDots()}

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Feather name="chevron-left" size={24} color="white" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Finish' : 'Next'}
              </Text>
              <Feather name="chevron-right" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  flatListContent: {
    alignItems: 'center',
  },
  slide: {
    width: width * 0.9,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: {
    width: width * 0.6,
    height: width * 0.6,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 16,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 4,
  },
});