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

// Streaming upload configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_CHUNKS = 3; // Upload 3 chunks simultaneously
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Upload interfaces
interface StreamingUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
}

export default function RecordingScreen() {
  const networkState = useNetworkState();
  const [showRetry, setShowRetry] = useState(false);
  const recordUriRef = useRef<string>("");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const queryClient = useQueryClient();
  const pathname = usePathname();
  
  // Streaming upload state
  const [uploadProgress, setUploadProgress] = useState<StreamingUploadProgress>({
    uploadedBytes: 0,
    totalBytes: 0,
    currentChunk: 0,
    totalChunks: 0,
    percentage: 0
  });
  const [isStreamingUpload, setIsStreamingUpload] = useState(false);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  
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

  const [isFectingRecordingDetails, setIsFectingRecordingDetails] = useState(false);

  const eventIdRef = useRef("");
  const [eventId, _setEventId] = useState("");
  const setEventId = (eventId: string) => {
    eventIdRef.current = eventId;
    _setEventId(eventId);
  };

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  // FIXED: Simplified upload method using the working pattern from reference code
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

  // FIXED: Upload to S3 using the working pattern from reference code
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
          timeout: 300000, // 5 minutes timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            console.log(`Upload progress: ${percentCompleted}%`);
            
            // Update progress state for UI
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

  // FIXED: Alternative streaming upload method with better error handling
  const streamingUploadToS3 = async (uri: string, filename: string): Promise<{ success: boolean, fileUrl?: string, filePath?: string }> => {
    try {
      setIsStreamingUpload(true);
      uploadAbortControllerRef.current = new AbortController();
      
      // Step 1: Get file info and check size
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
      
      // Step 2: Get presigned URL using the working method
      Toast.show("Getting upload URL...", Toast.SHORT, "top", "info");
      const uploadUrlResponse = await uploadRecordingMutation.mutateAsync();
      
      if (!uploadUrlResponse.success) {
        throw new Error(uploadUrlResponse.message || 'Failed to get upload URL');
      }
      
      const uploadUrl = uploadUrlResponse.data.url;
      const filePath = uploadUrlResponse.data.file_path;
      
      console.log('Upload URL obtained successfully');
      
      // Step 3: Upload file using fetch (simpler and more reliable than axios for large files)
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
      
      // Update progress to 100%
      setUploadProgress(prev => ({
        ...prev,
        uploadedBytes: totalSize,
        percentage: 100
      }));
      
      return {
        success: true,
        fileUrl: uploadUrl.split('?')[0], // Remove query parameters to get clean URL
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
        timeout: 600000, // 10 minutes timeout for processing request
      }).then((res) => res.data);
      return response;
    },
    retry: 2,
    retryDelay: 10000,
  });

  // Track polling attempts for recording details
  const pollingAttemptsRef = useRef(0);
  const maxPollingAttempts = 60;
  const pollingInterval = 15000;
  const isLargeFileRef = useRef(false);
  const isProcessingDetectedRef = useRef(false);
  
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
          
          const finalStatus = data.trascription_status === "success" ? 'completed' : 'failed';
          updateRecordingStatusInCache(eventID, finalStatus);
          
          if (data.trascription_status === "success") {
            Toast.show("Recording processed successfully!", Toast.SHORT, "top", "success");
          } else {
            Toast.show("Processing completed with issues. Check details.", Toast.SHORT, "top", "info");
          }
          
          if (pathname && pathname.includes('recording') && !pathname.includes('recordinglist')) {
            router.push(`/recordingview?eventID=${eventID}`);
          }
          
          setEventId("");
          setIsFectingRecordingDetails(false);
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
          setIsFectingRecordingDetails(false);
          
          router.back();
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
          setIsFectingRecordingDetails(false);
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

  // Track processing attempts
  const processingAttemptsRef = useRef(0);
  const maxProcessingAttempts = 10;
  
  const handleProccessRecording = (payload: ProccessAudio) => {
    processingAttemptsRef.current = 0;
    
    const getRetryDelay = (attempt: number) => {
      return Math.min(10000 * Math.pow(2, attempt - 1), 120000);
    };
    
    const attemptProcessing = () => {
      processingAttemptsRef.current += 1;
      
      const isLargeFile = payload.file_path.includes('large') || 
                         (payload.meeting_title || '').toLowerCase().includes('large');
      
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
            setIsFectingRecordingDetails(true);
            
            const currentDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            addNewRecordingToCache(currentEventId, payload.meeting_title, currentDate);
            
            Toast.show(
              "Processing started successfully! You can monitor progress in your recordings.",
              Toast.LONG,
              "top",
              "success"
            );

            setTimeout(() => {
              router.push('/(tabs)/recordinglist');
            }, 1000);
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
          
          if (isTimeoutOrServerError) {
            console.log('Detected timeout or server error, will retry with longer delay');
          }
          
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

  // Define file size thresholds for different handling
  const LARGE_FILE_THRESHOLD_MB = 50;
  const VERY_LARGE_FILE_THRESHOLD_MB = 100;
  
  // FIXED: Simplified upload function with fallback to original method
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
        }
      } catch (error) {
        console.log("Error checking file size:", error);
      }

      const fileSize = fileSizeInMB > 0 ? `_${fileSizeInMB.toFixed(0)}MB` : '';
      const fileType = isLargeFile ? '_large' : '';
      const filename = `audio-${date}${fileSize}${fileType}.m4a`;

      // For large files, try streaming upload first, then fallback to original method
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

      // Fallback to original upload method (same as reference code)
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

  // Check for pending recordings when component mounts
  useEffect(() => {
    const checkPendingRecordings = async () => {
      try {
        const pendingEventId = await AsyncStorage.getItem("pending_recording_event_id");
        if (pendingEventId) {
          Alert.alert(
            "Pending Recording Found",
            "You have a recording that was being processed. Do you want to check its status?",
            [
              {
                text: "No",
                style: "cancel",
                onPress: async () => {
                  await AsyncStorage.removeItem("pending_recording_event_id");
                  await AsyncStorage.removeItem("pending_recording_timestamp");
                }
              },
              {
                text: "Yes",
                onPress: async () => {
                  await AsyncStorage.removeItem("pending_recording_event_id");
                  await AsyncStorage.removeItem("pending_recording_timestamp");
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

  const handleSelectedUploadFile = (url: string) => {
    recordUriRef.current = url;
    handleUpload(url);
  };

  // Helper function to format bytes
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
      <View className="bg-[#0F0F0F] rounded-xl p-6 mx-4 mb-4">
        <Text className="text-white text-lg font-semibold mb-2">
          {isStreamingUpload ? "Streaming Upload Progress" : "Upload Progress"}
        </Text>
        
        <View className="bg-gray-700 rounded-full h-2 mb-2">
          <View 
            className="bg-blue-500 h-2 rounded-full" 
            style={{ width: `${uploadProgress.percentage}%` }}
          />
        </View>
        
        <Text className="text-gray-300 text-sm mb-1">
          {uploadProgress.percentage}% • {formatBytes(uploadProgress.uploadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
        </Text>
        
        {isStreamingUpload && uploadProgress.totalChunks > 1 && (
          <Text className="text-gray-400 text-xs">
            Chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
          </Text>
        )}
        
        <CustomButton
          onPress={cancelUpload}
          type="secondary"
          className="px-4 py-2 rounded-lg mt-3"
          title="Cancel Upload"
        />
      </View>
    );
  };

  return (
    <ThemeView>
      {uploadRecordingMutation.isPending ||
      proccessRecordingMutation.isPending ||
      uploadRecordToS3.isPending ||
      isStreamingUpload ||
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
                ? "Preparing upload..."
                : proccessRecordingMutation.isPending
                ? "Processing the audio file. please wait..."
                : isFectingRecordingDetails
                ? "Processing the audio file. please wait..."
                : isStreamingUpload
                ? "Streaming upload in progress..."
                : uploadRecordToS3.isPending
                ? "Uploading your recording..."
                : ""}
            </Text>
            
            {!(isStreamingUpload || uploadRecordToS3.isPending) && (
              <ActivityIndicator size="large" color="#004aad" />
            )}
          </View>
          
          {renderUploadProgress()}
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
              disabled={isStreamingUpload || uploadRecordingMutation.isPending}
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
        </View>
      )}
    </ThemeView>
  );
}
