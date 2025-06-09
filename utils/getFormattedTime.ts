export const getFormattedDate = () => {
  const date = new Date();

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  const hour12 = hours % 12 || 12;
  const formattedHour = hour12.toString().padStart(2, "0");

  // Format the date and time
  const formattedDate = `${day}:${month}:${year} ${formattedHour}:${minutes}:${seconds} ${ampm}`;

  return formattedDate;
};
