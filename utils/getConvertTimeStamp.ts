import { formatDistanceToNow, format } from "date-fns";

const convertTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

  if (diffInMinutes < 1) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else {
    return format(date, "HH:mm a");
  }
};

export default convertTimestamp;
