import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { useMutation } from "@tanstack/react-query";

export const useMakeLinkPublic = (eventID: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["makePublicLink"],
    mutationFn: async () => {
      const response = axiosApi({
        url: makeUrlWithParams("/make-public/{{meeting_event_id}}/", {
          meeting_event_id: eventID,
        }),
        method: "POST",
      }).then((e) => e.data);
      return response;
    },
  });
  return {
    mutateAsync,
    isPending,
  };
};
