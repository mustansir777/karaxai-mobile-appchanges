const getTodayDate = (): string => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return today.toLocaleDateString("en-US", options);
};

export default getTodayDate;
