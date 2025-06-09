// components/modal/FeatureSliderDialog.tsx
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
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface FeatureSliderDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const FeatureSliderDialog: React.FC<FeatureSliderDialogProps> = ({
  visible,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const features: FeatureItem[] = [
    {
      id: '1',
      title: 'Meeting Summarizer',
      description: 'KaraxAI is able to summarize the meetings across Zoom, Teams and Google Meet.',
      icon: <MaterialIcons name="videocam" size={40} color="#0a7ea4" />,
    },
    {
      id: '2',
      title: 'Meeting Recordings Summarization',
      description: 'Upload your simple audio recording and get the AI Powered summary.',
      icon: <MaterialIcons name="mic" size={40} color="#0a7ea4" />,
    },
    {
      id: '3',
      title: 'Integrations',
      description: 'Integrate KaraxAI with Calendar, and across other platforms.',
      icon: <MaterialCommunityIcons name="calendar-sync" size={40} color="#0a7ea4" />,
    },
  ];

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [visible]);

  const handleDontShowAgain = async () => {
    setDontShowAgain(!dontShowAgain);
  };

  const handleClose = async () => {
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem('dontShowFeatureSlider', 'true');
      } catch (error) {
        console.error('Error saving preference:', error);
      }
    }
    onClose();
  };

  const renderItem = ({ item }: { item: FeatureItem }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>{item.icon}</View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotContainer}>
        {features.map((_, index) => {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>KaraxAI Core Functionalities</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={features}
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
            contentContainerStyle={styles.flatListContent}
          />

          {renderDots()}

          <View style={styles.footer}>
            <Pressable 
              style={styles.checkboxContainer} 
              onPress={handleDontShowAgain}
            >
              <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                {dontShowAgain && <Feather name="check" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Don't show again</Text>
            </Pressable>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
  },
  checkboxLabel: {
    color: '#BBBBBB',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});