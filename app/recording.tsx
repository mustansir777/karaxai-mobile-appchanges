import { CustomButton } from "@/components/button/CustomButton";
import Recorder from "@/components/recorder/Recorder";
import { ThemeView } from "@/components/theme/ThemeView";
import { ActivityIndicator, Animated, Text, View, Alert } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRecording } from "@/hooks/useRecording";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosApi, ProccessAudio } from "@/api/api";
import { Toast } from "@/utils/toast";
import { useNetworkState } from "expo-network";
import { router, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFormattedDate } from "@/utils/getFormattedTime";
import { saveRecording } from "@/database/database";
import { RecordingDetails } from "@/constants/RecordingDetails";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import ResumeIcon from "@/components/icon/ResumeIcon";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { UploadRecord } from "@/components/upload/UploadRecord";
import axios, { CancelTokenSource } from "axios";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const axiosWithoutAuth = axios.create();

export default function RecordingScreen() {
  const networkState = useNetworkState();
  const [showRetry, setShowRetry] = useState(false);
  const recordUriRef = useRef<string>("");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const queryClient = useQueryClient();
  const pathname = usePathname(); // Add this to get current route
  
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    formattedDuration,
    isPaused,
    isInitializing,
    isRecordingStopping,
  } = useRecording({ scaleAnim: scaleAnim });

  const [isFectingRecordingDetails, setIsFectingRecordingDetails] =
    useState(false);

  const eventIdRef = useRef("");
  const [eventId, _setEventId] = useState("");
  const setEventId = (eventId: string) => {
    eventIdRef.current = eventId;
    _setEventId(eventId);
  };

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  // Helper function to update recording status in cache
  const updateRecordingStatusInCache = (eventId: string, status: 'processing' | 'completed' | 'failed') => {
    // Update categoriesWithMeetings cache
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

    // Update uncategorizedMeetings cache
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

    // Invalidate and refetch the queries to ensure UI updates
    queryClient.invalidateQueries({ queryKey: ['categoriesWithMeetings'] });
    queryClient.invalidateQueries({ queryKey: ['uncategorizedMeetings'] });
  };

  // Helper function to add new recording to cache with processing status
  const addNewRecordingToCache = (eventId: string, meetingTitle: string, date: string) => {
    const newRecording = {
      id: Date.now(), // Temporary ID
      event_id: eventId,
      meeting_title: meetingTitle,
      meeting_date: date.split(' ')[0], // Extract date part
      meeting_start_time: date.split(' ')[1] || '00:00:00', // Extract time part
      meeting_end_time: date.split(' ')[1] || '00:00:00',
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

    // Add to uncategorized meetings cache
    queryClient.setQueryData(['uncategorizedMeetings'], (oldData: any) => {
      if (!oldData) return { data: [{ meetings: [newRecording] }] };
      
      const updatedData = { ...oldData };
      if (updatedData.data && updatedData.data.length > 0) {
        // Add to first category's meetings
        updatedData.data[0] = {
          ...updatedData.data[0],
          meetings: [newRecording, ...(updatedData.data[0].meetings || [])]
        };
      } else {
        // Create new category with the recording
        updatedData.data = [{ meetings: [newRecording] }];
      }
      return updatedData;
    });

    // Invalidate queries to trigger UI updates
    queryClient.invalidateQueries({ queryKey: ['categoriesWithMeetings'] });
    queryClient.invalidateQueries({ queryKey: ['uncategorizedMeetings'] });
  };

  const proccessRecordingMutation = useMutation({
    mutationKey: ["transcribe"],
    mutationFn: async (payload: ProccessAudio) => {
      const response = await axiosApi({
        url: "/process-audio/",
        method: "POST",
        data: payload,
        // Add timeout for large files processing request
        timeout: 600000, // 10 minutes timeout for processing request
      }).then((res) => res.data);
      return response;
    },
    retry: 2, // Add retry at the mutation level
    retryDelay: 10000, // 10 seconds between retries
  });

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
          // Add timeout and increase it for large files
          timeout: 300000, // 5 minutes timeout for large files
          // Add onUploadProgress to track upload progress
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          },
        })
        .then((res) => res.data);
      return response;
    },
  });

  // Track polling attempts for recording details
  const pollingAttemptsRef = useRef(0);
  // For large recordings (30+ minutes), we need to poll for a longer time
  // 60 attempts * 15 seconds = 15 minutes max polling time
  const maxPollingAttempts = 60;
  const pollingInterval = 15000; // 15 seconds between polls for large files
  
  // Track if we're dealing with a large file
  const isLargeFileRef = useRef(false);
  
  // Set this flag when we detect the recording is being processed
  const isProcessingDetectedRef = useRef(false);
  
  const recordingDetailsViewApi = useQuery({
    queryKey: ["meetingView", eventId],
    queryFn: async () => {
      const eventID = eventIdRef.current;
      pollingAttemptsRef.current += 1;
      
      console.log(`Polling attempt ${pollingAttemptsRef.current}/${maxPollingAttempts} for event ID: ${eventID}`);
      
      // Implement exponential backoff for polling
      const getPollingBackoff = () => {
        // Start with normal interval, then increase if we detect it's a large file
        if (isLargeFileRef.current && pollingAttemptsRef.current > 10) {
          // After 10 attempts with a large file, increase polling interval
          return pollingInterval * 1.5;
        }
        return pollingInterval;
      };
      
      try {
        const response = await axiosApi({
          url: makeUrlWithParams("/meeting-view/{{eventId}}/", {
            eventId: eventID,
          }),
          method: "GET",
          // Add timeout for the polling request
          timeout: 30000, // 30 seconds timeout for polling
        });
        
        const data = response.data;
        
        // Check if the response indicates this is a large file being processed
        if (data.error_message && 
            (data.error_message.includes('still being processed') || 
             data.error_message.includes('large file'))) {
          isLargeFileRef.current = true;
          isProcessingDetectedRef.current = true;
          console.log('Detected large file being processed');
          
          // Update status to processing in the UI
          updateRecordingStatusInCache(eventID, 'processing');
        }
        
        // Check if processing is complete (success or failure)
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
          
          // Reset polling counter
          pollingAttemptsRef.current = 0;
          isLargeFileRef.current = false;
          isProcessingDetectedRef.current = false;
          
          // Save recording first
          await saveRecording(data, eventID, date);
          
          // Only update status to completed AFTER successful save and success message
          const finalStatus = data.trascription_status === "success" ? 'completed' : 'failed';
          updateRecordingStatusInCache(eventID, finalStatus);
          
          if (data.trascription_status === "success") {
            Toast.show("Recording processed successfully!", Toast.SHORT, "top", "success");
          } else {
            Toast.show("Processing completed with issues. Check details.", Toast.SHORT, "top", "info");
          }
          
          // Only navigate if user is still on the recording screen
          // If they're already on the recording list, the status will update automatically
          if (pathname && pathname.includes('recording') && !pathname.includes('recordinglist')) {
            router.push(`/recordingview?eventID=${eventID}`);
          }
          
          setEventId("");
          setIsFectingRecordingDetails(false);
        } else if (pollingAttemptsRef.current >= maxPollingAttempts) {
          // If we've reached max polling attempts but processing isn't complete
          console.log('Maximum polling attempts reached, saving event ID for later');
          
          // Update status to failed in cache
          updateRecordingStatusInCache(eventID, 'failed');
          
          Toast.show(
            "Processing is taking longer than expected. You can check status later.",
            Toast.LONG,
            "top",
            "info"
          );
          
          // Save the event ID for later checking
          await AsyncStorage.setItem("pending_recording_event_id", eventID);
          await AsyncStorage.setItem("pending_recording_timestamp", new Date().toISOString());
          
          // Reset polling counter
          pollingAttemptsRef.current = 0;
          setEventId("");
          setIsFectingRecordingDetails(false);
          
          // Navigate to recordings list or home
          router.back();
        } else if (pollingAttemptsRef.current % 3 === 0 || 
                  (isLargeFileRef.current && pollingAttemptsRef.current % 2 === 0)) {
          // Show status updates more frequently for large files
          const percentage = Math.round((pollingAttemptsRef.current / maxPollingAttempts) * 100);
          
          // Update processing status in cache during polling
          updateRecordingStatusInCache(eventID, 'processing');
          
          // For large files, provide more detailed status messages
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
        
        // Check for specific error types
        const typedError = error as any;
        const isNetworkError = typedError.message?.includes('network') || 
                              typedError.message?.includes('timeout') || 
                              typedError.status === 503 || 
                              typedError.status === 504;
        
        // For network errors, we should continue polling
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
            (error as any).message?.message || "Error getting recording details",
            Toast.SHORT,
            "top",
            "error"
          );
        }
        
        // If we've had too many consecutive errors, stop polling
        // But be more lenient with large files
        const maxConsecutiveErrors = isLargeFileRef.current ? 10 : 5;
        
        if (pollingAttemptsRef.current >= maxConsecutiveErrors && !isProcessingDetectedRef.current) {
          console.log('Too many consecutive errors, stopping polling');
          // Update status to failed in cache
          updateRecordingStatusInCache(eventIdRef.current, 'failed');
          setIsFectingRecordingDetails(false);
          setEventId("");
          pollingAttemptsRef.current = 0;
        }
        
        return { error: (error as any).message };
      }
    },
    enabled: !!eventId,
    refetchInterval: pollingInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000), // Exponential backoff for retries
  });

  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Upload cancelled by the user");
      setEventId("");
      setShowRetry(false);
    }
  };

  // Track processing attempts
  const processingAttemptsRef = useRef(0);
  const maxProcessingAttempts = 10; // Increased from 3 to 10 for large files
  
  const handleProccessRecording = (payload: ProccessAudio) => {
    // Reset attempts counter when starting a new processing request
    processingAttemptsRef.current = 0;
    
    // Calculate retry delay based on attempt number (exponential backoff)
    const getRetryDelay = (attempt: number) => {
      // Start with 10 seconds, then 20, 40, etc. (capped at 2 minutes)
      return Math.min(10000 * Math.pow(2, attempt - 1), 120000);
    };
    
    const attemptProcessing = () => {
      processingAttemptsRef.current += 1;
      
      // For large files, we need to be more patient with processing
      const isLargeFile = payload.file_path.includes('large') || 
                         (payload.meeting_title || '').toLowerCase().includes('large');
      
      // Show different messages based on attempt number
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
            processingAttemptsRef.current = 0; // Reset counter on success
            const currentEventId = e.data.event_id;
            setEventId(currentEventId);
            setIsFectingRecordingDetails(true);
            
            // Add new recording to cache with processing status immediately
            const currentDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            addNewRecordingToCache(currentEventId, payload.meeting_title, currentDate);
            
            Toast.show(
              "Processing started successfully! You can monitor progress in your recordings.",
              Toast.LONG,
              "top",
              "success"
            );

            // Redirect to recording list immediately after processing starts
            // This allows user to see the "Processing..." status in the list
            setTimeout(() => {
              router.push('/(tabs)/recordinglist');
            }, 1000); // Small delay to ensure cache is updated and user sees the success message

            // Continue polling in background for status updates
            // The polling will continue and update the cache automatically
          } else {
            console.error('Processing failed with message:', e.message);
            Toast.show(e.message, Toast.SHORT, "top", "error");
            
            // Retry logic for processing with exponential backoff
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
          
          // Check if error is related to timeout or server overload
          const isTimeoutOrServerError = 
            e.message?.includes('timeout') || 
            e.message?.includes('network') || 
            e.status === 503 || 
            e.status === 504;
          
          // For timeout errors, we should definitely retry
          if (isTimeoutOrServerError) {
            console.log('Detected timeout or server error, will retry with longer delay');
          }
          
          Toast.show(
            e.message?.message || "Processing audio failed",
            Toast.SHORT,
            "top",
            "error"
          );
          
          // Retry logic for errors with exponential backoff
          if (processingAttemptsRef.current < maxProcessingAttempts) {
            const retryDelay = getRetryDelay(processingAttemptsRef.current);
            
            // Use longer delay for timeout errors
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
    
    // Start the first attempt
    attemptProcessing();
  };

  // Define file size thresholds for different handling
  const LARGE_FILE_THRESHOLD_MB = 50;
  const VERY_LARGE_FILE_THRESHOLD_MB = 100;
  
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
      
      // Check file size before uploading
      try {
        const fileInfo = await fetch(uri);
        const blob = await fileInfo.blob();
        fileSizeInMB = blob.size / (1024 * 1024);
        console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);
        
        isLargeFile = fileSizeInMB > LARGE_FILE_THRESHOLD_MB;
        isVeryLargeFile = fileSizeInMB > VERY_LARGE_FILE_THRESHOLD_MB;
        
        // Warn user if file is large
        if (isVeryLargeFile) {
          Toast.show(
            `Very large file (${fileSizeInMB.toFixed(2)} MB). Upload and processing may take significantly longer.`,
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
        }
      } catch (error) {
        console.log("Error checking file size:", error);
      }

      // Create a more descriptive filename that includes file size for better server-side handling
      const fileSize = fileSizeInMB > 0 ? `_${fileSizeInMB.toFixed(0)}MB` : '';
      const fileType = isLargeFile ? '_large' : '';
      
      const file = {
        uri: uri,
        name: `audio-${date}${fileSize}${fileType}.m4a`,
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
                
                // Calculate appropriate delay based on file size
                // Larger files need more time for S3 to process
                let processingDelay = 1000; // Default 1 second
                
                if (isVeryLargeFile) {
                  processingDelay = 10000; // 10 seconds for very large files
                  Toast.show(
                    "Very large file uploaded. Preparing for processing...",
                    Toast.LONG,
                    "top",
                    "info"
                  );
                } else if (isLargeFile) {
                  processingDelay = 5000; // 5 seconds for large files
                  Toast.show(
                    "Large file uploaded. Preparing for processing...",
                    Toast.SHORT,
                    "top",
                    "info"
                  );
                }
                
                // Add a delay before processing to ensure S3 has fully processed the upload
                // The delay is proportional to the file size
                setTimeout(() => {
                  Toast.show("Starting audio processing...", Toast.SHORT, "top", "info");
                  
                  // Create a more descriptive meeting title that includes file size
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
                  
                  // Provide more specific error messages for common upload issues
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

  const handleStopRecording = async () => {
    const url = await stopRecording();
    if (url) {
      recordUriRef.current = url;
      handleUpload(url);
    }
  };

  const handleStartRecording = async () => {
    setShowRetry(false);
    await startRecording();
  };

  // const saveDummpyRecording = () => {
  //   saveRecording(RecordingDetails, "78d79690-b854-4f6a-a02b-1dba02cd73ac");
  // };

  // Check for pending recordings when component mounts
  useEffect(() => {
    const checkPendingRecordings = async () => {
      try {
        const pendingEventId = await AsyncStorage.getItem("pending_recording_event_id");
        if (pendingEventId) {
          // Ask user if they want to check the status of the pending recording using Alert
          Alert.alert(
            "Pending Recording Found",
            "You have a recording that was being processed. Do you want to check its status?",
            [
              {
                text: "No",
                style: "cancel",
                onPress: async () => {
                  // Clear the pending recording ID if user doesn't want to check
                  await AsyncStorage.removeItem("pending_recording_event_id");
                  await AsyncStorage.removeItem("pending_recording_timestamp");
                }
              },
              {
                text: "Yes",
                onPress: async () => {
                  // Clear the pending recording ID
                  await AsyncStorage.removeItem("pending_recording_event_id");
                  await AsyncStorage.removeItem("pending_recording_timestamp");
                  
                  // Navigate to the recording view
                  router.push(`/recordingview?eventID=${pendingEventId}`);
                }
              }
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error("Error checking pending recordings:", error);
      }
    };
    
    checkPendingRecordings();
  }, []);
  
  // Keep device awake during recording
  useEffect(() => {
    const enableKeepAwake = async () => {
      await activateKeepAwakeAsync();
    };
    if (isRecording) {
      enableKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  }, [isRecording]);

  // console.log("isRecording", isRecording);
  const handleSelectedUploadFile = (url: string) => {
    recordUriRef.current = url;
    handleUpload(url);
  };

  return (
    <ThemeView>
      {uploadRecordingMutation.isPending ||
      proccessRecordingMutation.isPending ||
      uploadRecordToS3.isPending ||
      isFectingRecordingDetails ? (
        <View className="flex-1 items-center justify-center px-12">
          <View className="bg-[#0F0F0F] rounded-xl p-12">
            <Text
              className="text-center text-xl text-white mb-4"
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {uploadRecordingMutation.isPending
                ? "Preparing.."
                : proccessRecordingMutation.isPending
                ? "Processing the audio file. please wait..."
                : isFectingRecordingDetails
                ? "Processing the audio file. please wait..."
                : uploadRecordToS3.isPending
                ? "Uploading your recording..."
                : ""}
            </Text>
            <ActivityIndicator size="large" color="#004aad" />

            {uploadRecordToS3.isPending && (
              <CustomButton
                onPress={cancelUpload}
                type="secondary"
                className="px-4 py-2 rounded-lg mt-4"
                title="Cancel upload"
              />
            )}
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-12">
          <Recorder scaleAnim={scaleAnim} />

          {isRecording && (
            <View className="flex-row items-center justify-between gap-10 mb-12">
              <CustomButton
                onPress={isPaused ? resumeRecording : pauseRecording}
                type="primary"
                className="h-16 w-16 rounded-full"
                icon={
                  isPaused ? (
                    <Entypo name="controller-play" size={24} color="white" />
                  ) : (
                    <FontAwesome6 name="pause" size={24} color="white" />
                  )
                }
              />
              <Text className="text-[#BBBBBB] text-lg">
                {formattedDuration}
              </Text>
              <CustomButton
                onPress={handleStopRecording}
                type="primary"
                className="h-16 w-16 rounded-full"
                icon={<FontAwesome name="stop" size={24} color="red" />}
              />
            </View>
          )}

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

          {!isRecording && (
            <CustomButton
              title={
                showRetry
                  ? "Start new recording"
                  : isRecordingStopping
                  ? "Stopping Recording..."
                  : isInitializing
                  ? "Initializing..."
                  : "Start Meeting Recording"
              }
              onPress={handleStartRecording}
              disabled={isInitializing || isRecordingStopping}
              type={isRecording ? "primary" : "secondary"}
              className={`py-3 w-full  rounded-lg  bg-red-600 ${
                isRecording ? "mb-14" : "mb-4"
              }`}
            />
          )}

          {!isRecording && (
            <View className="mb-10 w-full">
              <UploadRecord onUpload={handleSelectedUploadFile} />
            </View>
          )}

          {/* <CustomButton
            onPress={saveDummpyRecording}
            type="secondary"
            className="p-4 rounded-full"
            title="Save Dummy Recording"
          /> */}
        </View>
      )}
    </ThemeView>
  );
}
