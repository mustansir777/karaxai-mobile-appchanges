import { Toast } from "@/utils/toast";
import { Audio } from "expo-av";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAnimation } from "@/hooks/useAnimation";
import { Animated } from "react-native";
import { saveRecording } from "@/database/database";

export const useRecording = ({ scaleAnim }: { scaleAnim: Animated.Value }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isInitializing, setIsInitializing] = useState(false); // Added initializing state
  const [isRecordingStopping, setIsRecordingStopping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animation = useAnimation({ scaleAnim });
  const startTime = useRef(0);
  const isFocused = useRef(false);
  const pausedDurationRef = useRef(0);

  const updateTimer = useCallback(() => {
    const diff = new Date().getTime() - startTime.current;
    const diffInSeconds = Math.floor(diff / 1000);
    setRecordingDuration(diffInSeconds);
  }, []);

  useEffect(() => {
    if (isFocused.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      console.log("resume interval");
      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      console.log("clear interval");
    };
  }, [isFocused]);

  const startTimer = (reuse = false) => {
    if (!reuse) {
      startTime.current = new Date().getTime();
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startRecording = async () => {
    try {
      setIsInitializing(true);
      if (recording) {
        console.log("Stopping the existing recording...");
        await stopRecording();
      }

      if (permissionResponse?.status !== "granted") {
        console.log("Requesting permission..");
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      console.log("Starting recording..");
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      startTimer();
      animation.start();
      console.log("Recording started");
      Toast.show("Recording started", Toast.SHORT, "top", "info");
    } catch (err) {
      animation.stop();
      console.error("Failed to start recording", err);
      Toast.show("Recording failed", Toast.SHORT, "top", "error");
    } finally {
      setIsInitializing(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecordingStopping(true);
      if (recording) {
        console.log("Stopping recording..");
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log("Recording stopped and stored at", uri);
        Toast.show("Recording stopped", Toast.SHORT, "top", "info");
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
        stopTimer();
        animation.stop();
        if (uri) {
          return uri;
        }
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    } finally {
      setIsRecordingStopping(false);
    }
  };

  const pauseRecording = async () => {
    if (recording && isRecording && !isPaused) {
      try {
        pausedDurationRef.current = recordingDuration;
        await recording.pauseAsync();
        setIsPaused(true);
        stopTimer();
        console.log("Recording paused");
        animation.stop();
        Toast.show("Recording paused", Toast.SHORT, "top", "info");
      } catch (err) {
        console.error("Failed to pause recording", err);
      }
    }
  };

  const resumeRecording = async () => {
    if (recording && isRecording && isPaused) {
      try {
        startTime.current =
          new Date().getTime() - pausedDurationRef.current * 1000;
        await recording.startAsync();
        setIsPaused(false);
        startTimer(true);
        console.log("Recording resumed");
        animation.start();
        Toast.show("Recording resumed", Toast.SHORT, "top", "info");
      } catch (err) {
        console.error("Failed to resume recording", err);
      }
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  return {
    recording,
    isRecording,
    isPaused,
    recordingDuration,
    isInitializing,
    isRecordingStopping,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    formattedDuration: formatTime(recordingDuration),
  };
};
