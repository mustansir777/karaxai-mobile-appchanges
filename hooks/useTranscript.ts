import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { useQuery } from "@tanstack/react-query";
import { Toast } from "@/utils/toast";

export const useTranscript = (eventID: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: ["transcript", eventID],
    queryFn: async () => {
      try {
        // For large recordings, we need a longer timeout
        const response = await axiosApi({
          url: makeUrlWithParams(
            "/meeting-transcription-details/{{meeting_id}}/",
            {
              meeting_id: eventID,
            }
          ),
          method: "GET",
          // Add a longer timeout for large recordings
          timeout: 30000 // 30 seconds timeout
        });
        
        if (response.status === 200) {
          return response.data;
        }
        
        return null;
      } catch (error: any) {
        console.error('Error fetching transcript:', error);
        
        const errorMessage = error?.message || '';
        const errorDetail = error?.response?.data?.detail || '';
        
        // Check if this might be related to a large file
        const isLargeFile = 
          errorDetail.includes('large file') || 
          errorDetail.includes('longer recording') || 
          errorDetail.includes('30 min') ||
          errorMessage.includes('timeout');
        
        // For timeout errors, which are common with large files
        if (errorMessage.includes('timeout')) {
          console.log('Transcript request timeout detected, likely a large file');
          Toast.show(
            'The transcript is taking longer to load. This is common for longer recordings.',
            Toast.LONG,
            'bottom',
            'info'
          );
        }
        
        // For network errors, show a toast
        if (errorMessage.includes('Network Error')) {
          Toast.show(
            'Network error while fetching transcript. Please check your connection.',
            Toast.LONG,
            'bottom',
            'error'
          );
        }
        
        // For server errors (500, 503) which might happen with large files
        if (error?.response?.status >= 500) {
          Toast.show(
            'Server is busy processing your recording. This is common for longer recordings.',
            Toast.LONG,
            'bottom',
            'info'
          );
        }
        
        // Rethrow to let react-query handle retries
        throw error;
      }
    },
    enabled: !!eventID,
    refetchOnWindowFocus: true,
    // Add retry logic for better handling of temporary issues
    retry: 5, // Increase retries for large files
    retryDelay: (attemptIndex) => {
      // Longer exponential backoff for large files
      const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
      console.log(`Retrying transcript fetch in ${delay}ms (attempt ${attemptIndex})`);
      return delay;
    },
    staleTime: 30000, // 30 seconds
  
  });
  
  return {
    data,
    isPending,
    error
  };
};
