import { axiosApi } from "@/api/api";
import { useQuery } from "@tanstack/react-query";

export const useSubscriptionStatus = () => {
  const subscriptionStatus = useQuery({
    queryKey: ["SubscriptionStatus"],
    queryFn: async () => {
      const response = axiosApi({
        url: "/subscriptions/subscription-status/",
        method: "GET",
      }).then((e) => e.data);
      return response;
    },
  });

  const isSubscribedOrTrial =
    subscriptionStatus.data?.data.is_subscribed ||
    subscriptionStatus.data?.data.is_trial;

  return {
    subscriptionStatus,
    isSubscribedOrTrial,
  };
};
