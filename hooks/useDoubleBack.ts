import { useState, useEffect } from "react";
import { BackHandler } from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { Toast } from "@/utils/toast";

const useDoubleBackExit = () => {
  const [lastBackPressTime, setLastBackPressTime] = useState(0);
  const isFocused = useIsFocused();

  useEffect(() => {
    const backAction = () => {
      if (isFocused) {
        const currentTime = new Date().getTime();
        if (currentTime - lastBackPressTime < 3000) {
          BackHandler.exitApp();
          return true;
        } else {
          Toast.show("Press again to close the app", Toast.SHORT);
          setLastBackPressTime(currentTime);
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isFocused, lastBackPressTime]);
};

export default useDoubleBackExit;
