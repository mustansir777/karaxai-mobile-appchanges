import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { useQuery } from "@tanstack/react-query";

export const useTranscript = (eventID: string) => {
  const { data, isPending } = useQuery({
    queryKey: ["transcript", eventID],
    queryFn: async () => {
      const response = axiosApi({
        url: makeUrlWithParams(
          "/meeting-transcription-details/{{meeting_id}}/",
          {
            meeting_id: eventID,
          }
        ),
        method: "GET",
      }).then((e) => (e.status === 200 ? e.data : null));
      return response;
    },
    enabled: !!eventID,
    refetchOnWindowFocus: false,
  });
  return {
    data,
    isPending,
  };
};
