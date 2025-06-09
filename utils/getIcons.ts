const getIcons = (inviteFrom: string): any => {
  const normalizedInviteFrom = inviteFrom
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("_");

  const icons: { [key: string]: any } = {
    Google_Meet: require("../assets/images/icon/GoogleMeet.png"),
    Microsoft_Teams: require("../assets/images/icon/MicrosoftTeams.png"),
    Zoom: require("../assets/images/icon/Zoom.png"),
  };

  return icons[normalizedInviteFrom] || "";
};

export default getIcons;
