import { useQuery } from '@tanstack/react-query';
import { axiosApi } from '@/api/api';

export function useMeetingView(eventId: string) {
  return useQuery({
    queryKey: ['meetingView', eventId],
    queryFn: async () => {
      const response = await axiosApi({
        url: `/meeting-view/${eventId}/` as any,
        method: 'GET'
      });
      return response.data;
    },
    enabled: !!eventId
  });
}