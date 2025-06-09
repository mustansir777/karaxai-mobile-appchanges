import RNToast from "react-native-toast-message";

type ToastType = "success" | "error" | "info";
type ToastPosition = "top" | "bottom";

export const Toast = {
  show: (
    message: string,
    duration: number,
    position: ToastPosition = "bottom",
    type: ToastType = "success"
  ) => {
    console.log(message);
    RNToast.show({
      text1: message,
      position: position,
      type: type,
    });
    setTimeout(() => {
      RNToast.hide();
    }, duration);
  },
  SHORT: 2000,
  LONG: 3500,
};
