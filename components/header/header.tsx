import { ImageBackground, Platform, View } from "react-native";
import Logo from "../logo/Logo";
import { Avatar } from "../avatar/avatar";
import { Link, router, usePathname } from "expo-router";
import { CustomButton } from "../button/CustomButton";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Header = () => {
  const pathname = usePathname();

  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  return (
    <View
      style={{
        height: 100,
        // flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
      }}
    >
      <ImageBackground
        source={require("../../assets/images/background/background-1.png")}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={require("../../assets/images/background/background-2.png")}
          resizeMode="cover"
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? statusBarHeight : 0,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <View className="flex-row items-center gap-4">
                {pathname === "/profile" && (
                  <CustomButton
                    onPress={() => router.back()}
                    icon={
                      <MaterialIcons
                        name="arrow-back-ios-new"
                        size={20}
                        color="white"
                      />
                    }
                    className="p-2 rounded-full"
                  />
                )}

                <Link href={"/recording"}>
                  <Logo />
                </Link>
              </View>

              {pathname !== "/profile" && (
                <Link href={"/profile"}>
                  <Avatar />
                </Link>
              )}
            </View>
          </View>
        </ImageBackground>
      </ImageBackground>
    </View>
  );
};
