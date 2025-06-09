import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { useMutation } from "@tanstack/react-query";

export const useDownload = (eventID: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["downloadReport"],
    mutationFn: async () => {
      const response = axiosApi({
        url: makeUrlWithParams(
          "/download-meeting-report/{{meeting_event_id}}/",
          {
            meeting_event_id: eventID,
          }
        ),
        method: "GET",
      }).then((e) => e.data);
      return response;
    },
  });
  return {
    mutateAsync,
    isPending,
  };
};
