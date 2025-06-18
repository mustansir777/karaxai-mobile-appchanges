import { useQuery } from '@tanstack/react-query';
import { axiosApi } from '@/api/api';
import { Toast } from '@/utils/toast';

export function useMeetingView(eventId: string) {
  return useQuery({
    queryKey: ['meetingView', eventId],
    queryFn: async () => {
      try {
        const response = await axiosApi({
          url: `/meeting-view/${eventId}/` as any,
          method: 'GET',
          // Add a longer timeout for large recordings
          timeout: 30000 // 30 seconds timeout
        });
        return response.data;
      } catch (error: any) {
        console.error('Error fetching meeting view:', error);
        
        // Check if the error response contains information about file size
        const errorDetail = error?.response?.data?.detail || '';
        const errorMessage = error?.message || '';
        
        // Detect if this is a large file being processed
        const isLargeFile = 
          errorDetail.includes('large file') || 
          errorDetail.includes('longer recording') || 
          errorDetail.includes('30 min') ||
          errorMessage.includes('timeout');
        
        // Check if the error is related to the meeting still being processed
        if (error?.response?.status === 404 || 
            errorDetail.includes('processing') ||
            errorDetail.includes('not found')) {
          
          // Provide a more specific message for large files
          if (isLargeFile) {
            console.log('Large file detected, will use longer polling interval');
            return {
              error_message: 'This large recording is still being processed. Longer recordings (30+ minutes) may take several minutes to complete processing.',
              is_large_file: true
            };
          }
          
          return {
            error_message: 'This recording is still being processed. Please check back later.'
          };
        }
        
        // For timeout errors, which are common with large files
        if (errorMessage.includes('timeout')) {
          console.log('Request timeout detected, likely a large file');
          return {
            error_message: 'The server is taking longer than expected to process this recording. This is common for longer recordings.',
            is_large_file: true
          };
        }
        
        // For network errors
        if (errorMessage.includes('Network Error')) {
          Toast.show(
            'Network error. Please check your connection and try again.',
            Toast.LONG,
            'bottom',
            'error'
          );
          return {
            error_message: 'Network error. Please check your connection and try again.'
          };
        }
        
        // For server errors (500, 503)
        if (error?.response?.status >= 500) {
          return {
            error_message: 'The server is currently experiencing high load. This is common when processing large recordings. Please try again in a few minutes.'
          };
        }
        
        // For other errors
        return {
          error_message: 'An error occurred while fetching the meeting data. Please try again later.'
        };
      }
    },
    enabled: !!eventId,
    // Add retry logic for better handling of temporary issues
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with longer max delay
    // Refetch periodically if the meeting is still processing
    refetchInterval: (data: any) => {
      // For large files, use a longer interval to reduce server load
      if (data?.is_large_file) {
        console.log('Using longer refetch interval for large file');
        return 30000; // 30 seconds for large files
      }
      // For normal processing
      if (data?.error_message?.includes('still being processed')) {
        return 10000; // 10 seconds for normal files
      }
      return false;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}
