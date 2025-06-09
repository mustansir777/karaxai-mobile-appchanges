import { axiosApi } from "@/api/api";
import { RecordingItem, saveRecording, tableName } from "@/database/database";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { Toast } from "@/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useNetworkState } from "expo-network";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";

export const useSyncMeetingToDB = () => {
  const [isSyncInProgress, setIsSyncInProgress] = useState(false);
  const db = useSQLiteContext();
  const networkState = useNetworkState();

  const listMeetingMutation = useMutation({
    mutationKey: ["listMeeting"],
    mutationFn: async () => {
      const response = axiosApi({
        url: "/list-meetings/",
        method: "GET",
        params: {
          transcription_status: "success",
          page_size: 10000,
        },
      }).then((res) => res.data);
      return response;
    },
  });

  const meetingViewMutation = useMutation({
    mutationKey: ["meetingView"],
    mutationFn: async (eventID: string) => {
      const response = axiosApi({
        url: makeUrlWithParams("/meeting-view/{{eventId}}/", {
          eventId: eventID,
        }),
        method: "GET",
      }).then((res) => res.data);
      return response;
    },
  });

  const syncMeetingToDB = async (userId: string) => {
    try {
      // Check if internet is available
      if (!networkState.isConnected) {
        console.warn("No internet connection.");
        Toast.show(
          "No internet connection. Please check your network.",
          Toast.SHORT,
          "top",
          "error"
        );
        return;
      }

      console.log("Syncing meetings to the database...");
      setIsSyncInProgress(true);

      // Fetch local recordings from SQLite
      console.log("Fetching local recordings...");
      const query = `SELECT event_id FROM ${tableName}  WHERE user_id = '${userId}'`;
      const recordingList = await db.getAllAsync<RecordingItem>(query);
      const localRecordingEventId = recordingList.map(
        (record) => record.event_id
      );
      console.log(
        "Local recording event IDs:",
        JSON.stringify(localRecordingEventId, null, 2)
      );

      // Fetch remote recordings from API
      console.log("Fetching remote recordings...");
      const remoteRecordingList = await listMeetingMutation.mutateAsync();
      const remoteRecordingEventId = remoteRecordingList.results.meetings.map(
        (record) => ({
          eventId: record.event_id,
          date: record.meeting_date,
          startTime: record.meeting_start_time,
        })
      );

      console.log(
        "Remote recording event IDs:",
        JSON.stringify(remoteRecordingEventId, null, 2)
      );

      // Filter out event IDs that are already in local storage
      console.log("Filtering new recordings...");
      const excludedEventIDs = remoteRecordingEventId.filter(
        (event) => !localRecordingEventId.includes(event.eventId)
      );

      if (excludedEventIDs.length === 0) {
        console.log("No new recordings to sync.");
        Toast.show("No new recordings to sync", Toast.SHORT, "top", "success");
        return;
      }

      console.log(
        "New event IDs to be synced:",
        JSON.stringify(excludedEventIDs, null, 2)
      );

      // Fetch meeting data and save it sequentially
      for (const event of excludedEventIDs) {
        try {
          console.log(
            `Fetching meeting view for event ID: ${event.eventId}...`
          );
          const meetingData = await meetingViewMutation.mutateAsync(
            event.eventId
          );
          console.log(
            `Meeting data for event ${event.eventId}:`,
            JSON.stringify(meetingData, null, 2)
          );

          // Save the recording to the local database
          const dt = `${event.date} ${event.startTime}`;

          console.log("date", dt);
          await saveRecording(meetingData, event.eventId, dt);
          console.log(
            `Successfully saved meeting ${event.eventId} to the database.`
          );
        } catch (error) {
          console.error(
            `Error fetching meeting view for event ${event.eventId}:`,
            error
          );
        }
      }

      console.log("Meeting sync completed successfully!");
      Toast.show(
        "Meeting sync completed successfully!",
        Toast.SHORT,
        "top",
        "success"
      );
    } catch (error) {
      console.error("Error syncing meetings:", error);
      Toast.show("Error syncing meetings", Toast.SHORT, "top", "error");
    } finally {
      setIsSyncInProgress(false);
      console.log("Sync process ended.");
    }
  };

  return {
    syncMeetingToDB,
    isSyncInProgress:
      isSyncInProgress ||
      meetingViewMutation.isPending ||
      listMeetingMutation.isPending,
  };
};
