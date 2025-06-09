export const getFormattedDateAndTime = (dateString: string) => {
  const dt = new Date(`${dateString}Z`);

  // Extract local date and time components
  const day = dt.getDate().toString().padStart(2, "0");
  const month = (dt.getMonth() + 1).toString().padStart(2, "0");
  const year = dt.getFullYear();
  const hours = dt.getHours();
  const minutes = dt.getMinutes().toString().padStart(2, "0");
  const seconds = dt.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  const hour12 = hours % 12 || 12;
  const formattedHour = hour12.toString().padStart(2, "0");

  return `${day}:${month}:${year} ${formattedHour}:${minutes}:${seconds} ${ampm}`;
};
