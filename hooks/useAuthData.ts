import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useAuthStorage = () => {
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<null | string>(null);

  // Load userId, username, token, email, and image from AsyncStorage when the component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        const storedUsername = await AsyncStorage.getItem("username");
        const storedToken = await AsyncStorage.getItem("token");
        const storedEmail = await AsyncStorage.getItem("email");
        const storedImage = await AsyncStorage.getItem("image");

        if (storedUserId !== null) {
          setUserId(storedUserId);
        }

        if (storedUsername !== null) {
          setUsername(storedUsername);
        }

        if (storedToken !== null) {
          setToken(storedToken);
        }

        if (storedEmail !== null) {
          setEmail(storedEmail);
        }

        if (storedImage !== null) {
          setImage(storedImage);
        }
      } catch (error) {
        console.error("Error loading data from AsyncStorage:", error);
      }
    };

    loadData();
  }, []);

  // Function to save userId, username, token, email, and image to AsyncStorage
  const saveAuthData = async (authResponse: {
    userId: string;
    username: string;
    token: string;
    email: string;
    image: string | null;
  }) => {
    try {
      await AsyncStorage.setItem("userId", authResponse.userId);
      await AsyncStorage.setItem("username", authResponse.username);
      await AsyncStorage.setItem("token", authResponse.token);
      await AsyncStorage.setItem("email", authResponse.email);
      await AsyncStorage.setItem("image", authResponse.image ?? "");

      setUserId(authResponse.userId);
      setUsername(authResponse.username);
      setToken(authResponse.token);
      setEmail(authResponse.email);
      setImage(authResponse.image);
    } catch (error) {
      console.error("Error saving data to AsyncStorage:", error);
    }
  };

  // Function to clear userId, username, token, email, and image from AsyncStorage
  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("username");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("email");
      await AsyncStorage.removeItem("image");

      setUserId("");
      setUsername("");
      setToken("");
      setEmail("");
      setImage("");
    } catch (error) {
      console.error("Error clearing data from AsyncStorage:", error);
    }
  };

  return {
    userId,
    username,
    token,
    email,
    image,
    saveAuthData,
    clearAuthData,
  };
};

export default useAuthStorage;
