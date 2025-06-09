import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { useMutation } from "@tanstack/react-query";

export const useRecordingDetailViewMutation = () => {
  const recordingDetails = useMutation({
    mutationKey: ["meetingView"],
    mutationFn: async (eventID: string) => {
      const response = await axiosApi({
        url: makeUrlWithParams("/meeting-view/{{eventId}}/", {
          eventId: eventID,
        }),
        method: "GET",
      }).then((res) => res.data);
      return response;
    },
  });

  return recordingDetails;
};
