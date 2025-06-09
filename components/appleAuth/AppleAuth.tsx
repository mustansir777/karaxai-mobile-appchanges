import { View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect } from "react";
import { Toast } from "@/utils/toast";
import { axiosApi } from "@/api/api";
import useAuthStorage from "@/hooks/useAuthData";
import { router } from "expo-router";

export const AppleAuthButton = () => {
  const { saveAuthData } = useAuthStorage();

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log("credential", credential);
      const response = await axiosApi({
        url: "/apple-auth/",
        method: "POST",
        data: {
          authorization_code: credential.authorizationCode || "",
          username: credential.fullName?.givenName || null,
        },
      }).then((e) => e.data);

      if (response.token) {
        saveAuthData({
          userId: response.user_id.toString(),
          username: response.first_name,
          token: response.token,
          email: response.email,
          image: "",
        });
        Toast.show("Login Successfully!", Toast.SHORT);
        router.push("/(tabs)/recording");
      } else {
        Toast.show("Login failed retry.", Toast.SHORT, "bottom", "error");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        Toast.show("Canceled", Toast.SHORT, "top");
      } else {
        Toast.show("login failed!", Toast.SHORT, "top");
      }
    }
  };

  useEffect(() => {
    const checkAvialable = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log("isAvailable", isAvailable);
    };
    checkAvialable();
  }, []);

  return (
    <View className="mt-2 w-full">
      <AppleAuthentication.AppleAuthenticationButton
        style={{ height: 44 }}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={5}
        onPress={handleAppleSignIn}
      />
    </View>
  );
};
