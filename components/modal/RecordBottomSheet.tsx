// components/modal/RecordBottomSheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosApi, ProccessAudio } from '@/api/api';
import { Toast } from '@/utils/toast';
import { useNetworkState } from 'expo-network';
import { getFormattedDate } from '@/utils/getFormattedTime';
import { saveRecording } from '@/database/database';
import axios, { CancelTokenSource } from 'axios';
import { UploadRecord } from '@/components/upload/UploadRecord';
import { CustomButton } from '@/components/button/CustomButton';
import { JoinMeetingModal } from './JoinMeetingModal';
import { useCallback } from 'react';
import { makeUrlWithParams } from '@/utils/makeUrlWithParam';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RecordBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const axiosWithoutAuth = axios.create();

// File size thresholds
const SMALL_FILE_THRESHOLD_MB = 10;
const LARGE_FILE_THRESHOLD_MB = 50;
const VERY_LARGE_FILE_THRESHOLD_MB = 100;

// Upload interfaces
interface StreamingUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
}

export const RecordBottomSheet: React.FC<RecordBottomSheetProps> = ({ visible, onClose }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const networkState = useNetworkState();
  const queryClient = useQueryClient();
  
  // Existing states
  const [showRetry, setShowRetry] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showJoinMeetingModal, setShowJoinMeetingModal] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const recordUriRef = useRef<string>('');
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const eventIdRef = useRef('');
  const [eventId, _setEventId] = useState('');
  const [isFetchingRecordingDetails, setIsFetchingRecordingDetails] = useState(false);
  
  // New streaming upload states
  const [uploadProgress, setUploadProgress] = useState<StreamingUploadProgress>({
    uploadedBytes: 0,
    totalBytes: 0,
    currentChunk: 0,
    totalChunks: 0,
    percentage: 0
  });
  const [isStreamingUpload, setIsStreamingUpload] = useState(false);
  const [fileSize, setFileSize] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(15000);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  
  // Processing tracking
  const pollingAttemptsRef = useRef(0);
  const maxPollingAttempts = 60;
  const processingAttemptsRef = useRef(0);
  const maxProcessingAttempts = 10;
  const isLargeFileRef = useRef(false);
  const isProcessingDetectedRef = useRef(false);
  
  const setEventId = (eventId: string) => {
    eventIdRef.current = eventId;
    _setEventId(eventId);
  };

  // Get polling interval based on file size
  const getPollingInterval = (fileSize: number) => {
    if (fileSize > VERY_LARGE_FILE_THRESHOLD_MB) {
      return 30000; // 30 seconds for very large files
    } else if (fileSize > LARGE_FILE_THRESHOLD_MB) {
      return 15000; // 15 seconds for large files
    } else if (fileSize <= SMALL_FILE_THRESHOLD_MB) {
      return 3000; // 3 seconds for small files (optimized processing)
    } else {
      return 5000; // 5 seconds for medium-sized files
    }
  };

  // Update polling interval when file size changes
  useEffect(() => {
    const interval = getPollingInterval(fileSize);
    setPollingInterval(interval);
    isLargeFileRef.current = fileSize > LARGE_FILE_THRESHOLD_MB;
    console.log(`Set polling interval to ${interval/1000}s for file size ${fileSize.toFixed(2)} MB`);
  }, [fileSize]);

  // Bot status functionality
  const checkBotStatus = useCallback(
    async (botId: string) => {
      try {
        const response = await axiosApi({
          url: `/meetings/bot/status/${botId}/` as any,
          method: 'GET',
        });
        return response.data;
      } catch (error) {
        console.error('Error checking bot status:', error);
        return null;
      }
    },
    []
  );

  const botStatusQuery = useQuery({
    queryKey: ['botStatus', botId],
    queryFn: () => {
      if (!botId) return Promise.resolve(null);
      return checkBotStatus(botId);
    },
    enabled: !!botId,
    refetchInterval: botId ? 5000 : false,
  });

  useEffect(() => {
    const data = botStatusQuery.data;
    if (data && data.status_text === 'JOINED') {
      Toast.show('Bot successfully joined the meeting', Toast.SHORT, 'top');
      router.push(`/recordingview?botId=${botId}`);
      onClose();
    }
  }, [botStatusQuery.data, botId, router, onClose]);

  // Helper functions for cache updates (same as recording.tsx)
  const updateRecordingStatusInCache = (eventId: string, status: 'processing' | 'completed' | 'failed') => {
    const apiStatus = status === 'processing' ? 'Processing' : 
                      status === 'completed' ? 'Process Completed' : 
                      'Processing Failed';
    
    queryClient.setQueryData(['categoriesWithMeetings'], (oldData: any) => {
      if (!oldData) return oldData;
      
      const updatedData = { ...oldData };
      if (updatedData.data) {
        updatedData.data = updatedData.data.map((category: any) => {
          if (category.meetings) {
            return {
              ...category,
              meetings: category.meetings.map((meeting: any) => {
                if (meeting.event_id === eventId) {
                  return {
                    ...meeting,
                    status: apiStatus,
                    processing_status: status,
                    trascription_status: status === 'completed' ? 'success' : status === 'failed' ? 'failed' : 'processing'
                  };
                }
                return meeting;
              })
            };
          }
          return category;
        });
      }
      return updatedData;
    });

    queryClient.setQueryData(['uncategorizedMeetings'], (oldData: any) => {
      if (!oldData) return oldData;
      
      const updatedData = { ...oldData };
      if (updatedData.data) {
        updatedData.data = updatedData.data.map((category: any) => {
          if (category.meetings) {
            return {
              ...category,
              meetings: category.meetings.map((meeting: any) => {
                if (meeting.event_id === eventId) {
                  return {
                    ...meeting,
                    status: apiStatus,
                    processing_status: status,
                    trascription_status: status === 'completed' ? 'success' : status === 'failed' ? 'failed' : 'processing'
                  };
                }
                return meeting;
              })
            };
          }
          return category;
        });
      }
      return updatedData;
    });

    queryClient.invalidateQueries({ queryKey: ['categoriesWithMeetings'] });
    queryClient.invalidateQueries({ queryKey: ['uncategorizedMeetings'] });
  };

  const addNewRecordingToCache = (eventId: string, meetingTitle: string, date: string) => {
    const newRecording = {
      id: Date.now(),
      event_id: eventId,
      meeting_title: meetingTitle,
      meeting_date: date.split(' ')[0],
      meeting_start_time: date.split(' ')[1] || '00:00:00',
      meeting_end_time: date.split(' ')[1] || '00:00:00',
      status: 'Processing',
      processing_status: 'processing',
      trascription_status: 'processing',
      categoryId: 0,
      meet_url: '',
      meeting_admin_id: 0,
      meeting_code: null,
      organizer_email: '',
      source: 'recording',
      bot_id: 0
    };

    queryClient.setQueryData(['uncategorizedMeetings'], (oldData: any) => {
      if (!oldData) return { data: [{ meetings: [newRecording] }] };
      
      const updatedData = { ...oldData };
      if (updatedData.data && updatedData.data.length > 0) {
        updatedData.data[0] = {
          ...updatedData.data[0],
          meetings: [newRecording, ...(updatedData.data[0].meetings || [])]
        };
      } else {
        updatedData.data = [{ meetings: [newRecording] }];
      }
      return updatedData;
    });

    queryClient.invalidateQueries({ queryKey: ['categoriesWithMeetings'] });
    queryClient.invalidateQueries({ queryKey: ['uncategorizedMeetings'] });
  };

  // Recording details query (same as recording.tsx)
  const recordingDetailsViewApi = useQuery({
    queryKey: ["meetingView", eventId],
    queryFn: async () => {
      const eventID = eventIdRef.current;
      pollingAttemptsRef.current += 1;
      
      console.log(`Polling attempt ${pollingAttemptsRef.current}/${maxPollingAttempts} for event ID: ${eventID}`);
      
      try {
        const response = await axiosApi({
          url: makeUrlWithParams("/meeting-view/{{eventId}}/", {
            eventId: eventID,
          }),
          method: "GET",
          timeout: 30000,
        });
        
        const data = response.data;
        
        if (data.error_message && 
            (data.error_message.includes('still being processed') || 
             data.error_message.includes('large file'))) {
          isLargeFileRef.current = true;
          isProcessingDetectedRef.current = true;
          console.log('Detected large file being processed');
          updateRecordingStatusInCache(eventID, 'processing');
        }
        
        if (
          (data.trascription_status == "success" ||
            data.trascription_status == "failed") &&
          (data.error_message || data.summary)
        ) {
          const date = new Date()
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);
          console.log('Processing completed:', data.trascription_status);
          
          pollingAttemptsRef.current = 0;
          isLargeFileRef.current = false;
          isProcessingDetectedRef.current = false;
          
          await saveRecording(data, eventID, date);
          
          const finalStatus = data.trascription_status === "success" && data.summary ? 'completed' : 
                             data.trascription_status === "success" && !data.summary ? 'processing' : 'failed';
          updateRecordingStatusInCache(eventID, finalStatus);
          
          if (data.trascription_status === "success") {
            Toast.show("Recording processed successfully!", Toast.SHORT, "top", "success");
            
            // IMPORTANT: Close bottom sheet and navigate to recording view
            if (data.summary) {
              onClose(); // Close the bottom sheet
              router.push(`/recordingview?eventID=${eventID}`);
            }
          } else {
            Toast.show("Processing completed with issues. Check details.", Toast.SHORT, "top", "info");
          }
          
          setEventId("");
          setIsFetchingRecordingDetails(false);
        } else if (pollingAttemptsRef.current >= maxPollingAttempts) {
          console.log('Maximum polling attempts reached, saving event ID for later');
          
          updateRecordingStatusInCache(eventID, 'failed');
          
          Toast.show(
            "Processing is taking longer than expected. You can check status later.",
            Toast.LONG,
            "top",
            "info"
          );
          
          await AsyncStorage.setItem("pending_recording_event_id", eventID);
          await AsyncStorage.setItem("pending_recording_timestamp", new Date().toISOString());
          
          pollingAttemptsRef.current = 0;
          setEventId("");
          setIsFetchingRecordingDetails(false);
          
          onClose(); // Close bottom sheet
        } else if (pollingAttemptsRef.current % 3 === 0 || 
                  (isLargeFileRef.current && pollingAttemptsRef.current % 2 === 0)) {
          const percentage = Math.round((pollingAttemptsRef.current / maxPollingAttempts) * 100);
          
          updateRecordingStatusInCache(eventID, 'processing');
          
          if (isLargeFileRef.current) {
            Toast.show(
              `Processing large recording... (${percentage}%) This may take several minutes.`,
              Toast.SHORT,
              "top",
              "info"
            );
          } else {
            Toast.show(
              `Still processing your recording... (${percentage}%)`,
              Toast.SHORT,
              "top",
              "info"
            );
          }
        }
        
        return data;
      } catch (error) {
        console.error('Error polling recording details:', error);
        
        const typedError = error as any;
        const isNetworkError = typedError.message?.includes('network') || 
                              typedError.message?.includes('timeout') || 
                              typedError.status === 503 || 
                              typedError.status === 504;
        
        if (isNetworkError) {
          console.log('Network error during polling, will continue polling');
          Toast.show(
            "Network issue while checking status. Will retry...",
            Toast.SHORT,
            "top",
            "info"
          );
        } else {
          Toast.show(
            typedError.message?.message || "Error getting recording details",
            Toast.SHORT,
            "top",
            "error"
          );
        }
        
        const maxConsecutiveErrors = isLargeFileRef.current ? 10 : 5;
        
        if (pollingAttemptsRef.current >= maxConsecutiveErrors && !isProcessingDetectedRef.current) {
          console.log('Too many consecutive errors, stopping polling');
          updateRecordingStatusInCache(eventIdRef.current, 'failed');
          setIsFetchingRecordingDetails(false);
          setEventId("");
          pollingAttemptsRef.current = 0;
        }
        
        return { error: typedError.message };
      }
    },
    enabled: !!eventId,
    refetchInterval: pollingInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });

  // Upload mutations (same as recording.tsx)
  const uploadRecordingMutation = useMutation({
    mutationKey: ["uploadRecording"],
    mutationFn: async () => {
      const response = await axiosApi({
        url: "/generate-presigned-url/",
        method: "POST",
        params: {
          only_pre_signed_url: 1,
        },
      }).then((res) => res.data);
      return response;
    },
  });

  const uploadRecordToS3 = useMutation({
    mutationKey: ["uploadRecordToS3"],
    mutationFn: async (payload: { url: string; file: Blob }) => {
      cancelTokenRef.current = axios.CancelToken.source();
      const response = await axiosWithoutAuth
        .put(payload.url, payload.file, {
          headers: {
            "Content-Type": "audio/*",
          },
          cancelToken: cancelTokenRef.current.token,
          transformRequest: (data) => {
            return data;
          },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            console.log(`Upload progress: ${percentCompleted}%`);
            
            setUploadProgress(prev => ({
              ...prev,
              uploadedBytes: progressEvent.loaded,
              totalBytes: progressEvent.total || 0,
              percentage: percentCompleted
            }));
          },
        })
        .then((res) => res.data);
      return response;
    },
  });

  // Direct upload for small files
  const directUploadForSmallFiles = async (uri: string, filename: string): Promise<{ success: boolean, fileUrl?: string, filePath?: string }> => {
    try {
      Toast.show("Preparing small file for direct upload...", Toast.SHORT, "top", "info");
      
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();
      
      console.log(`Small file loaded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      
      Toast.show("Getting upload URL...", Toast.SHORT, "top", "info");
      const uploadUrlResponse = await uploadRecordingMutation.mutateAsync();
      
      if (!uploadUrlResponse.success) {
        throw new Error(uploadUrlResponse.message || 'Failed to get upload URL');
      }
      
      const uploadUrl = uploadUrlResponse.data.url;
      const filePath = uploadUrlResponse.data.file_path;
      
      Toast.show("Fast-tracking small file upload...", Toast.SHORT, "top", "info");
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          "Content-Type": "audio/*",
        },
        body: blob
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Direct upload failed:', response.status, response.statusText, errorText);
        throw new Error(`Direct upload failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('Small file upload successful');
      
      return {
        success: true,
        fileUrl: uploadUrl.split('?')[0],
        filePath: filePath
      };
      
    } catch (error) {
      console.error('Small file upload error:', error);
      throw error;
    }
  };

  // Streaming upload
  const streamingUploadToS3 = async (uri: string, filename: string): Promise<{ success: boolean, fileUrl?: string, filePath?: string }> => {
    try {
      setIsStreamingUpload(true);
      uploadAbortControllerRef.current = new AbortController();
      
      Toast.show("Preparing file for upload...", Toast.SHORT, "top", "info");
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();
      const totalSize = blob.size;
      
      console.log(`File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      setUploadProgress({
        uploadedBytes: 0,
        totalBytes: totalSize,
        currentChunk: 0,
        totalChunks: 1,
        percentage: 0
      });
      
      Toast.show("Getting upload URL...", Toast.SHORT, "top", "info");
      const uploadUrlResponse = await uploadRecordingMutation.mutateAsync();
      
      if (!uploadUrlResponse.success) {
        throw new Error(uploadUrlResponse.message || 'Failed to get upload URL');
      }
      
      const uploadUrl = uploadUrlResponse.data.url;
      const filePath = uploadUrlResponse.data.file_path;
      
      console.log('Upload URL obtained successfully');
      
      Toast.show("Uploading file...", Toast.SHORT, "top", "info");
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          "Content-Type": "audio/*",
        },
        body: blob,
        signal: uploadAbortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Upload failed:', response.status, response.statusText, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('Upload successful');
      
      setUploadProgress(prev => ({
        ...prev,
        uploadedBytes: totalSize,
        percentage: 100
      }));
      
      return {
        success: true,
        fileUrl: uploadUrl.split('?')[0],
        filePath: filePath
      };
      
    } catch (error) {
      console.error('Streaming upload error:', error);
      
      const typedError = error as Error;
      if (typedError.name === 'AbortError') {
        throw new Error('Upload cancelled by user');
      }
      
      throw error;
    } finally {
      setIsStreamingUpload(false);
      uploadAbortControllerRef.current = null;
    }
  };

  // Process recording mutation
  const proccessRecordingMutation = useMutation({
    mutationKey: ["transcribe"],
    mutationFn: async (payload: ProccessAudio) => {
      const response = await axiosApi({
        url: "/process-audio/",
        method: "POST",
        data: payload,
        timeout: 600000,
      }).then((res) => res.data);
      return response;
    },
    retry: 2,
    retryDelay: 10000,
  });

  // Handle process recording with retry logic
  const handleProccessRecording = (payload: ProccessAudio) => {
    processingAttemptsRef.current = 0;
    
    const getRetryDelay = (attempt: number) => {
      return Math.min(10000 * Math.pow(2, attempt - 1), 120000);
    };
    
    const attemptProcessing = () => {
      processingAttemptsRef.current += 1;
      
      const isLargeFile = payload.file_path.includes('large') || 
                         (payload.meeting_title || '').toLowerCase().includes('large');
      const isVeryLargeFile = (payload.meeting_title || '').toLowerCase().includes('large') && 
                             (payload.meeting_title || '').match(/\d+MB/) && 
                             parseInt((payload.meeting_title || '').match(/\d+MB/)?.[0] || '0') > 100;
      
      if (isVeryLargeFile) {
        setPollingInterval(30000);
      } else if (isLargeFile) {
        setPollingInterval(15000);
      } else if (fileSize <= SMALL_FILE_THRESHOLD_MB) {
        setPollingInterval(3000);
      } else {
        setPollingInterval(5000);
      }
      
      if (processingAttemptsRef.current === 1) {
        Toast.show(
          `Starting audio processing...`,
          Toast.SHORT,
          "top",
          "info"
        );
      } else {
        Toast.show(
          `Processing attempt ${processingAttemptsRef.current}/${maxProcessingAttempts}...`,
          Toast.SHORT,
          "top",
          "info"
        );
      }
      
      console.log(`Processing attempt ${processingAttemptsRef.current}/${maxProcessingAttempts} for file: ${payload.file_path}`);
      
      proccessRecordingMutation
        .mutateAsync(payload)
        .then((e) => {
          console.log('Processing response:', e);
          if (e.success) {
            processingAttemptsRef.current = 0;
            const currentEventId = e.data.event_id;
            setEventId(currentEventId);
            setIsFetchingRecordingDetails(true);
            
            const currentDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            addNewRecordingToCache(currentEventId, payload.meeting_title, currentDate);
            
            if (fileSize <= SMALL_FILE_THRESHOLD_MB) {
              Toast.show(
                "Fast-track processing started! This should complete quickly.",
                Toast.SHORT,
                "top",
                "success"
              );
              setPollingInterval(2000);
            } else if (isLargeFile) {
              Toast.show(
                "Processing started successfully! This may take several minutes.",
                Toast.LONG,
                "top",
                "success"
              );
            } else {
              Toast.show(
                "Processing started successfully! Please wait while we process your recording.",
                Toast.LONG,
                "top",
                "success"
              );
            }
          } else {
            console.error('Processing failed with message:', e.message);
            Toast.show(e.message, Toast.SHORT, "top", "error");
            
            if (processingAttemptsRef.current < maxProcessingAttempts) {
              const retryDelay = getRetryDelay(processingAttemptsRef.current);
              
              Toast.show(
                `Retrying processing in ${retryDelay/1000} seconds... (Attempt ${processingAttemptsRef.current}/${maxProcessingAttempts})`,
                Toast.LONG,
                "top",
                "info"
              );
              setTimeout(attemptProcessing, retryDelay);
            } else {
              Toast.show(
                "Maximum processing attempts reached. Please try again later.",
                Toast.LONG,
                "top",
                "error"
              );
              setShowRetry(true);
            }
          }
        })
        .catch((e) => {
          console.error('Processing error:', e);
          
          const typedError = e as any;
          const isTimeoutOrServerError = 
            typedError.message?.includes('timeout') || 
            typedError.message?.includes('network') || 
            typedError.status === 503 || 
            typedError.status === 504;
          
          Toast.show(
            typedError.message?.message || "Processing audio failed",
            Toast.SHORT,
            "top",
            "error"
          );
          
          if (processingAttemptsRef.current < maxProcessingAttempts) {
            const retryDelay = getRetryDelay(processingAttemptsRef.current);
            const adjustedDelay = isTimeoutOrServerError ? retryDelay * 2 : retryDelay;
            
            Toast.show(
              `Retrying processing in ${adjustedDelay/1000} seconds... (Attempt ${processingAttemptsRef.current}/${maxProcessingAttempts})`,
              Toast.LONG,
              "top",
              "info"
            );
            setTimeout(attemptProcessing, adjustedDelay);
          } else {
            Toast.show(
              "Maximum processing attempts reached. Please try again later.",
              Toast.LONG,
              "top",
              "error"
            );
            setShowRetry(true);
          }
        });
    };
    
    attemptProcessing();
  };

  // Main upload handler
  const handleUpload = async (uri: string) => {
    try {
      if (!networkState.isConnected) {
        setShowRetry(true);
        return Toast.show(
          "No internet connection",
          Toast.SHORT,
          "top",
          "error"
        );
      }

      setShowRetry(false);

      const date = getFormattedDate();
      let fileSizeInMB = 0;
      let isLargeFile = false;
      let isVeryLargeFile = false;
      
      let fileSize = '';
      let fileType = '';
      let filename = `audio-${date}.m4a`;
      
      // Check file size before uploading
      try {
        const fileInfo = await fetch(uri);
        const blob = await fileInfo.blob();
        fileSizeInMB = blob.size / (1024 * 1024);
        console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);
        
        setFileSize(fileSizeInMB);
        
        isLargeFile = fileSizeInMB > LARGE_FILE_THRESHOLD_MB;
        isVeryLargeFile = fileSizeInMB > VERY_LARGE_FILE_THRESHOLD_MB;
        const isSmallFile = fileSizeInMB <= SMALL_FILE_THRESHOLD_MB;
        
        fileSize = fileSizeInMB > 0 ? `_${fileSizeInMB.toFixed(0)}MB` : '';
        fileType = isLargeFile ? '_large' : '';
        filename = `audio-${date}${fileSize}${fileType}.m4a`;
        
        console.log(`File categorization - Small: ${isSmallFile}, Large: ${isLargeFile}, Very Large: ${isVeryLargeFile}`);
        
        if (isVeryLargeFile) {
          Toast.show(
            `Very large file (${fileSizeInMB.toFixed(2)} MB). Upload may take longer.`,
            Toast.LONG,
            "top",
            "info"
          );
        } else if (isLargeFile) {
          Toast.show(
            `Large file (${fileSizeInMB.toFixed(2)} MB). Upload may take longer.`,
            Toast.LONG,
            "top",
            "info"
          );
        } else if (isSmallFile) {
          Toast.show(
            `Small file detected (${fileSizeInMB.toFixed(2)} MB) - Using optimized processing`,
            Toast.SHORT,
            "top",
            "info"
          );
          
          try {
            const uploadResult = await directUploadForSmallFiles(uri, filename);
            
            if (uploadResult.success) {
              Toast.show("Small file uploaded successfully!", Toast.SHORT, "top", "success");
              
              Toast.show("Starting audio processing...", Toast.SHORT, "top", "info");
              
              handleProccessRecording({
                file_url: uploadResult.fileUrl!,
                file_path: uploadResult.filePath!,
                meeting_title: `recording ${new Date().toISOString()} (fast-processed)`,
              });
              return;
            }
          } catch (directUploadError) {
            console.log("Direct upload failed, falling back to standard method:", directUploadError);
            Toast.show("Fast upload failed, trying standard upload...", Toast.SHORT, "top", "info");
          }
        }
      } catch (error) {
        console.log("Error checking file size:", error);
      }
      
      // For large files, try streaming upload first
      if (isLargeFile) {
        try {
          Toast.show("Starting streaming upload...", Toast.SHORT, "top", "info");
          const uploadResult = await streamingUploadToS3(uri, filename);
          
          if (uploadResult.success) {
            Toast.show("Upload completed successfully!", Toast.SHORT, "top", "success");
            
            let processingDelay = isVeryLargeFile ? 10000 : 5000;
            
            setTimeout(() => {
              Toast.show("Starting audio processing...", Toast.SHORT, "top", "info");
              
              const meetingTitle = isLargeFile 
                ? `recording ${date} (large ${fileSizeInMB.toFixed(0)}MB)` 
                : `recording ${date}`;
              
              handleProccessRecording({
                file_url: uploadResult.fileUrl!,
                file_path: uploadResult.filePath!,
                meeting_title: meetingTitle,
              });
            }, processingDelay);
            return;
          }
        } catch (streamError) {
          console.log("Streaming upload failed, falling back to standard method:", streamError);
          Toast.show("Streaming upload failed, trying standard upload...", Toast.SHORT, "top", "info");
        }
      }

      // Fallback to original upload method
      const file = {
        uri: uri,
        name: filename,
        type: "audio/*",
      };

      Toast.show("Preparing upload...", Toast.SHORT, "top", "info");
      
      uploadRecordingMutation
        .mutateAsync()
        .then((e) => {
          console.log('Presigned URL response:', e);
          if (e.success) {
            Toast.show("Starting upload...", Toast.SHORT, "top", "info");
            uploadRecordToS3
              .mutateAsync({
                file: file as unknown as Blob,
                url: e.data.url,
              })
              .then(() => {
                Toast.show("Uploaded Successfully!", Toast.SHORT, "top", "success");
                
                let processingDelay = 1000;
                
                if (isVeryLargeFile) {
                  processingDelay = 10000;
                  Toast.show(
                    "Very large file uploaded. Preparing for processing...",
                    Toast.LONG,
                    "top",
                    "info"
                  );
                } else if (isLargeFile) {
                  processingDelay = 5000;
                  Toast.show(
                    "Large file uploaded. Preparing for processing...",
                    Toast.SHORT,
                    "top",
                    "info"
                  );
                }
                
                setTimeout(() => {
                  Toast.show("Starting audio processing...", Toast.SHORT, "top", "info");
                  
                  const meetingTitle = isLargeFile 
                    ? `recording ${date} (large ${fileSizeInMB.toFixed(0)}MB)` 
                    : `recording ${date}`;
                  
                  handleProccessRecording({
                    file_url: e.data.url,
                    file_path: e.data.file_path,
                    meeting_title: meetingTitle,
                  });
                }, processingDelay);
              })
              .catch((e) => {
                if (axios.isCancel(e)) {
                  Toast.show("Upload canceled", Toast.SHORT, "top", "info");
                } else {
                  console.error("Upload error:", e);
                  
                  let errorMessage = "Upload Failed! Please try again.";
                  
                  if (e.message?.includes('timeout')) {
                    errorMessage = "Upload timed out. Try with a smaller file or better connection.";
                  } else if (e.message?.includes('network')) {
                    errorMessage = "Network error during upload. Check your connection and try again.";
                  }
                  
                  Toast.show(errorMessage, Toast.LONG, "top", "error");
                  setShowRetry(true);
                }
              });
          } else {
            Toast.show("Failed to get upload URL!", Toast.SHORT, "top", "error");
            setShowRetry(true);
          }
        })
        .catch((e) => {
          console.error("Upload preparation error:", e);
          Toast.show(
            e.message?.message || "Upload Failed!",
            Toast.SHORT,
            "top",
            "error"
          );
          setShowRetry(true);
        });
    } catch (error) {
      console.error("Unexpected upload error:", error);
      Toast.show("Unexpected error during upload", Toast.SHORT, "top", "error");
      setShowRetry(true);
    }
  };

  // Cancel upload function
  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Upload cancelled by the user");
      setEventId("");
      setShowRetry(false);
    }
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      Toast.show("Upload cancelled", Toast.SHORT, "top", "info");
      setShowRetry(true);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render upload progress
  const renderUploadProgress = () => {
    if (!isStreamingUpload && !uploadRecordToS3.isPending) return null;
    
    return (
      <View style={styles.uploadProgressContainer}>
        <Text style={styles.uploadProgressTitle}>
          {isStreamingUpload ? "Streaming Upload Progress" : "Upload Progress"}
        </Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${uploadProgress.percentage}%` }]}
          />
        </View>
        
        <Text style={styles.progressText}>
          {uploadProgress.percentage}% • {formatBytes(uploadProgress.uploadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
        </Text>
        
        {isStreamingUpload && uploadProgress.totalChunks > 1 && (
          <Text style={styles.chunkText}>
            Chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
          </Text>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Reset states when closing
      setShowUploadSection(false);
      setShowRetry(false);
      setShowJoinMeetingModal(false);
      setEventId("");
      setIsFetchingRecordingDetails(false);
      pollingAttemptsRef.current = 0;
      processingAttemptsRef.current = 0;
    }
  }, [visible, translateY]);

  const handleStartRecording = () => {
    onClose();
    router.push('/recording');
  };

  const handleSelectedUploadFile = (url: string) => {
    recordUriRef.current = url;
    handleUpload(url);
  };

  const handleImportRecording = () => {
    setShowUploadSection(true);
  };

  const handleJoinMeeting = () => {
    setShowJoinMeetingModal(true);
  };
  
  const handleJoinMeetingSuccess = (newBotId: string) => {
    setBotId(newBotId);
    setShowJoinMeetingModal(true);
    Toast.show('Bot is joining the meeting, please wait...', Toast.SHORT, 'top');
  };

  const handleBackdropPress = () => {
    // Don't allow closing if processing
    if (!isFetchingRecordingDetails && 
        !uploadRecordingMutation.isPending && 
        !proccessRecordingMutation.isPending && 
        !uploadRecordToS3.isPending && 
        !isStreamingUpload) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop}>
            <Animated.View 
              style={[
                styles.bottomSheetContainer,
                { transform: [{ translateY }] }
              ]}
            >
              <View style={styles.handle} />
              
              {uploadRecordingMutation.isPending ||
               proccessRecordingMutation.isPending ||
               uploadRecordToS3.isPending ||
               isFetchingRecordingDetails ||
               isStreamingUpload ||
               botStatusQuery.isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    {uploadRecordingMutation.isPending
                      ? 'Preparing..'
                      : proccessRecordingMutation.isPending
                      ? 'Processing the audio file. please wait...'
                      : isFetchingRecordingDetails
                      ? 'Processing your recording...'
                      : isStreamingUpload
                      ? 'Streaming upload in progress...'
                      : uploadRecordToS3.isPending
                      ? 'Uploading your recording...'
                      : botStatusQuery.isLoading && botId
                      ? 'Connecting to meeting. please wait...'
                      : ''}
                  </Text>

                  {isFetchingRecordingDetails && (
                    <Text style={styles.processingSubText}>
                      {pollingAttemptsRef.current > 0 ? 
                        `` : 
                        "Starting processing..."}
                      {isLargeFileRef.current ? 
                        "\nLarge files may take several minutes to process." : 
                        fileSize <= SMALL_FILE_THRESHOLD_MB ?
                        "\nSmall files are processed with optimized method for faster results." :
                        "\nProcessing typically takes 1-2 minutes."}
                    </Text>
                  )}

                  {!isStreamingUpload && !uploadRecordToS3.isPending && (
                    <ActivityIndicator 
                      size="large" 
                      color={isFetchingRecordingDetails && fileSize <= SMALL_FILE_THRESHOLD_MB ? "#0a7ea4" : "#004aad"} 
                    />
                  )}

                  {renderUploadProgress()}

                  {(uploadRecordToS3.isPending || isStreamingUpload) && (
                    <CustomButton
                      onPress={cancelUpload}
                      type="secondary"
                      className="px-4 py-2 rounded-lg mt-4"
                      title="Cancel upload"
                    />
                  )}

                  {isFetchingRecordingDetails && (
                    <View style={styles.processingActions}>
                      {/* <CustomButton
                        onPress={() => {
                          // Don't close, just navigate to recordings list while keeping processing
                          router.push('/(tabs)/recordinglist');
                        }}
                        title="View Recordings List"
                        className="py-3 rounded-lg mt-2"
                        style={{ 
                          backgroundColor: fileSize <= SMALL_FILE_THRESHOLD_MB ? '#0a7ea4' : '#0a7ea4' 
                        }}
                      />
                      <Text style={styles.processingNote}>
                        Processing will continue in the background. You'll be notified when complete.
                      </Text> */}
                    </View>
                  )}
                </View>
              ) : showUploadSection ? (
                <View style={styles.uploadContainer}>
                  <Text style={styles.title}>Upload Recording</Text>
                  
                  {showRetry && (
                    <CustomButton
                      title="Retry Upload"
                      disabled={uploadRecordingMutation.isPending}
                      onPress={async () => {
                        await handleUpload(recordUriRef.current);
                      }}
                      type="primary"
                      className="py-3 w-full mb-4 rounded-lg bg-red-600 text-white"
                    />
                  )}
                  
                  <UploadRecord onUpload={handleSelectedUploadFile} />
                  
                  <CustomButton
                    title="Back"
                    onPress={() => setShowUploadSection(false)}
                    type="secondary"
                    className="py-3 w-full mt-4 rounded-lg"
                  />
                  
                  <View style={styles.supportedFormatsContainer}>
                    <Text style={styles.supportedFormatsText}>
                      Supported formats: MP3, M4A only
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Recording Options</Text>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleStartRecording}
                  >
                  <View style={[styles.blueGradientButton, { backgroundColor: '#0a7ea4' }]}>
                    <FontAwesome5 name="microphone-alt" size={24} color="white" />
                  </View>
                    <Text style={styles.optionText}>Start Meeting Recording</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleImportRecording}
                  >
                    <View style={styles.optionIconContainer}>
                      <Feather name="upload-cloud" size={24} color="white" />
                    </View>
                    <Text style={styles.optionText}>Upload Meeting Recording</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleJoinMeeting}
                  >
                    <View style={styles.optionIconContainer}>
                      <MaterialCommunityIcons name="account-group" size={24} color="white" />
                    </View>
                    <Text style={styles.optionText}>Join Meeting</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.supportedFormatsContainer}>
                    <Text style={styles.supportedFormatsText}>
                      Supported formats: MP3, M4A only
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Join Meeting Modal */}
      <JoinMeetingModal 
        visible={showJoinMeetingModal}
        onClose={() => setShowJoinMeetingModal(false)}
        onSuccess={handleJoinMeetingSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    height: 'auto',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  blueGradientButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#0052D4',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  supportedFormatsContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  supportedFormatsText: {
    fontSize: 12,
    color: '#888',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  processingSubText: {
    color: '#BBBBBB',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  processingActions: {
    marginTop: 16,
    width: '100%',
  },
  processingNote: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  uploadContainer: {
    padding: 10,
  },
  uploadProgressContainer: {
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    width: '100%',
  },
  uploadProgressTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    backgroundColor: '#444',
    borderRadius: 4,
    height: 8,
    marginBottom: 8,
  },
  progressFill: {
    backgroundColor: '#0a7ea4',
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    color: '#BBB',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  chunkText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});
