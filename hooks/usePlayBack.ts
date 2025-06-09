import { useState, useEffect } from "react";
import { Audio } from "expo-av";
import { Toast } from "@/utils/toast";

export const usePlayback = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAndPlay = async (uri: string) => {
    try {
      setIsLoading(true);
      if (sound) {
        await sound.unloadAsync();
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: uri,
      });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackDuration(status.durationMillis || 0);
          setPlaybackPosition(status.positionMillis || 0);

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        } else if (status.error) {
          console.error("Playback error:", status.error);
          Toast.show("Playback error", Toast.SHORT, "top", "error");
        }
      });
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error loading or playing the recording:", error);
      Toast.show("Playback failed", Toast.SHORT, "top", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const play = async () => {
    if (sound && !isPlaying) {
      await sound.playAsync();
      setIsPlaying(true);
      // Toast.show("Playback resumed", Toast.SHORT, "top", "info");
    }
  };

  const pause = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
      // Toast.show("Playback paused", Toast.SHORT, "top", "info");
    }
  };

  const stop = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setPlaybackPosition(0);
      Toast.show("Playback stopped", Toast.SHORT, "top", "info");
    }
  };

  const seek = async (position: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(position);
        setPlaybackPosition(position);
      } catch (error) {
        console.error("Error seeking:", error);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return "00:00";

    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    return `${hours > 0 ? `${hours}:` : ""}${
      minutes < 10 ? "0" : ""
    }${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return {
    isPlaying,
    playbackDuration,
    playbackPosition,
    formatTime,
    isLoading,
    loadAndPlay,
    play,
    pause,
    stop,
    seek,
  };
};
