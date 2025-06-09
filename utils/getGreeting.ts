function getGreetingBasedOnTime(name: string): string {
  const hours = new Date().getHours();

  if (hours >= 5 && hours < 12) {
    return `Good Morning, ${name}`;
  } else if (hours >= 12 && hours < 17) {
    return `Good Afternoon, ${name}`;
  } else if (hours >= 17 && hours < 21) {
    return `Good Evening ${name}`;
  } else {
    return `Good Night ${name}`;
  }
}

export default getGreetingBasedOnTime;
