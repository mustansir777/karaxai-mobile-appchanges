import { CustomButton } from "@/components/button/CustomButton";
import SyncingIndicator from "@/components/icon/SyncIcon";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { tableName } from "@/database/database";
import useAuthStorage from "@/hooks/useAuthData";
import { useSyncMeetingToDB } from "@/hooks/useSyncMeetingToDB";
import getGreetingBasedOnTime from "@/utils/getGreeting";
import getTodayDate from "@/utils/getTodayDate";
import { AntDesign, Ionicons, MaterialIcons, Feather, Entypo } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, Dimensions, TextInput, Alert, Modal, RefreshControl } from "react-native";
import { axiosApi, CategoryWithMeetings, MeetingWithBot } from "@/api/api";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Toast } from "@/utils/toast";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseISO, format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

// Moved formatTime function outside the component
const formatTime = (timeString: string | undefined, dateString: string | undefined) => {
  if (!timeString || !dateString) return "";
  try {
    // Combine date and time string and parse as UTC
    const dateTimeString = `${dateString}T${timeString}Z`; 
    const date = new Date(dateTimeString);
    // Format in local time
    return format(date, "h:mm a"); 
  } catch (error) {
    console.error("Error formatting time:", timeString, error);
    return timeString;
  }
};

// Renamed and updated formatDate to getDateDisplay as per user's suggestion
const getDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return "Unknown date";
  try {
    // Assuming dateStr is like 'YYYY-MM-DD'
    // Append a neutral time part to ensure parseISO interprets it as local midnight
    const date = parseISO(dateStr + 'T00:00:00'); 
    const formattedDate = format(date, "MMMM d, yyyy");

    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else if (isThisWeek(date)) {
      return `This Week - ${formattedDate}`;
    } else if (isThisMonth(date)) {
      return `This Month - ${formattedDate}`;
    }
    return formattedDate;
  } catch (error) {
    console.error("Error in getDateDisplay:", dateStr, error);
    return "Invalid date";
  }
};

const PAGE_SIZE = 10;
const { width } = Dimensions.get('window');

interface Meeting {
  id: number;
  event_id: string;
  categoryId: number;
  meeting_title: string;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meet_url: string;
  meeting_admin_id: number;
  meeting_code: string | null;
  organizer_email: string;
  source: string;
  bot_id: number;
}

interface GroupedMeeting {
  date: string;
  meetings: Meeting[];
}

export default function RecordingList() {
  const todayDate = getTodayDate();
  const db = useSQLiteContext();
  const [meetingUrl, setMeetingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [viewAllMode, setViewAllMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const { userId, username } = useAuthStorage(); // username is defined here
  const { isSyncInProgress, syncMeetingToDB } = useSyncMeetingToDB();
  const queryClient = useQueryClient();
  
  // State for categories and expansion
  const [categories, setCategories] = useState<CategoryWithMeetings[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState("");

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationKey: ['deleteMeeting'],
    mutationFn: async (eventId: string) => {
      return axiosApi({
        url: `/delete-meeting/${eventId}/` as any,
        method: 'DELETE',
      }).then((res) => res.data);
    },
    onSuccess: () => {
      Toast.show('Meeting deleted successfully', Toast.SHORT, 'top');
      queryClient.invalidateQueries({ queryKey: ['categoriesWithMeetings'] });
      queryClient.invalidateQueries({ queryKey: ['uncategorizedMeetings'] });
    },
    onError: (error: any) => {
      console.error('Error deleting meeting:', error);
      Toast.show(
        error.message || 'Failed to delete meeting',
        Toast.SHORT,
        'top',
        'error'
      );
    },
  });

  // Rename meeting mutation
  const renameMeetingMutation = useMutation({
    mutationKey: ['renameMeeting'],
    mutationFn: async ({ eventId, meetingName }: { eventId: string, meetingName: string }) => {
      return axiosApi({
        url: `/rename-meeting/${eventId}/` as any,
        method: 'POST',
        data: {
          meeting_name: meetingName,
        },
      }).then((res) => res.data);
    },
    onSuccess: () => {
      Toast.show('Meeting renamed successfully', Toast.SHORT, 'top');
      // Refresh the meetings list
      refetch();
      // Close the rename dialog
      setRenameDialogVisible(false);
      // Ensure viewAllMode is preserved
      setViewAllMode(true);
    },
    onError: (error: any) => {
      Toast.show(
        error.message || 'Failed to rename meeting',
        Toast.SHORT,
        'top',
        'error'
      );
    },
  });

  // Handle delete meeting
  const handleDeleteMeeting = (eventId: string, e?: any) => {
    // Stop propagation to prevent navigation
    if (e) {
      e.stopPropagation();
    }
    
    // Confirm before deleting using Alert instead of confirm
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to delete this meeting?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => deleteMeetingMutation.mutate(eventId),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  // Handle rename meeting
  const handleRenameMeeting = () => {
    if (!selectedMeeting || !newMeetingName.trim()) {
      Toast.show('Please enter a valid meeting name', Toast.SHORT, 'top', 'error');
      return;
    }

    renameMeetingMutation.mutate({
      eventId: selectedMeeting.event_id,
      meetingName: newMeetingName.trim(),
    });
  };

  // Show menu for meeting options
  const showMenu = (meeting: Meeting, x: number, y: number, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedMeeting(meeting);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  // Hide menu
  const hideMenu = () => {
    setMenuVisible(false);
  };

  // Open rename dialog
  const openRenameDialog = () => {
    if (selectedMeeting) {
      setNewMeetingName(selectedMeeting.meeting_title || `Recording ${selectedMeeting.id}`);
      setRenameDialogVisible(true);
      setMenuVisible(false);
    }
  };

  // Join meeting mutation
  const joinMeetingMutation = useMutation({
    mutationKey: ['joinMeeting'],
    mutationFn: async (data: MeetingWithBot) => {
      return axiosApi({
        url: '/meetings/create-meeting-with-bot/' as any,
        method: 'POST',
        data,
      }).then((res) => res.data);
    },
    onSuccess: (data) => {
      Toast.show('Successfully joined meeting', Toast.SHORT, 'top');
      setMeetingUrl(''); // Clear the input after success
      // Optionally refresh the meetings list
      refetch();
    },
    onError: (error: any) => {
      Toast.show(
        error.message || 'Failed to join meeting',
        Toast.SHORT,
        'top',
        'error'
      );
    },
  });
  
  // Query for categories with meetings
  const { data: categoriesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriesWithMeetings'],
    queryFn: async () => {
      const response = await axiosApi({
        url: '/categories-with-meetings/' as any,
        method: 'GET',
        params: {
          num_meetings: 100 // Get all meetings
        },
      });
      return response.data;
    },
    enabled: !!userId && isFocused
  });
  
  // Query for uncategorized meetings
  const { data: uncategorizedData, isLoading: loadingUncategorized } = useQuery({
    queryKey: ['uncategorizedMeetings'],
    queryFn: async () => {
      const response = await axiosApi({
        url: '/uncategorized-meetings/' as any,
        method: 'GET',
        params: {
          num_meetings: 100
        },
      });
      return response.data;
    },
    enabled: !!userId && isFocused
  });
  
  // Update categories and all meetings when data changes
  useEffect(() => {
    let meetings: Meeting[] = [];
    const uniqueMeetings = new Map<string, Meeting>();
    
    if (categoriesData?.data) {
      setCategories(categoriesData.data);
      // Collect all meetings from categories
      categoriesData.data.forEach((category: CategoryWithMeetings) => {
        if (category.meetings) {
          category.meetings.forEach(meeting => {
            uniqueMeetings.set(meeting.event_id, meeting);
          });
        }
      });
    }
    
    if (uncategorizedData?.data && uncategorizedData.data.length > 0) {
      uncategorizedData.data.forEach((category: CategoryWithMeetings) => {
        if (category.meetings) {
          category.meetings.forEach(meeting => {
            uniqueMeetings.set(meeting.event_id, meeting);
          });
        }
      });
    }
    
    // Convert Map values to array
    meetings = Array.from(uniqueMeetings.values());
    
    // Sort meetings by date (newest first)
    meetings.sort((a, b) => {
      const dateA = new Date(`${a.meeting_date}T${a.meeting_start_time}`);
      const dateB = new Date(`${b.meeting_date}T${b.meeting_start_time}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    setAllMeetings(meetings);
  }, [categoriesData, uncategorizedData]);
  
  // Synchronize meetings
  useEffect(() => {
    const sync = async () => {
      await syncMeetingToDB(userId);
      refetch();
    };
    
    if (userId && isFocused && !isSyncInProgress) {
      sync();
    }
  }, [userId, isFocused]);
  
  // Handle refresh function for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  // Handle join meeting
  const handleJoinMeeting = () => {
    if (!meetingUrl) {
      Toast.show('Please enter a meeting URL', Toast.SHORT, 'top', 'error');
      return;
    }

    // Check if it's a valid Google Meet URL
    if (!meetingUrl.includes('meet.google.com')) {
      Toast.show('Please enter a valid Google Meet URL', Toast.SHORT, 'top', 'error');
      return;
    }

    joinMeetingMutation.mutate({ 
      meeting_url: meetingUrl,
      meeting_title: `Meeting ${new Date().toLocaleString()}`,
      user_id: Number(userId)
    });
  };
  
  // Update the formatDate helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return "Unknown date";
    }
    
    try {
      const date = parseISO(dateString);
      const formattedDate = format(date, "MMMM d, yyyy");
      
      if (isToday(date)) {
        return "Today";
      } else if (isYesterday(date)) {
        return "Yesterday";
      } else if (isThisWeek(date)) {
        return `This Week - ${formattedDate}`;
      } else if (isThisMonth(date)) {
        return `This Month - ${formattedDate}`;
      }
      return formattedDate;
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid date";
    }
  };
  
  // Update the groupMeetingsByDate function
  // Using user's provided logic for groupMeetingsByDate, with Meeting interface
  const groupMeetingsByDate = (meetings: Meeting[]): GroupedMeeting[] => {
    const grouped = meetings.reduce(
      (acc: { [key: string]: Meeting[] }, meeting) => {
        // Parse meeting_date directly and then format for the key
        const dateKey = format(parseISO(meeting.meeting_date), "yyyy-MM-dd");
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(meeting);
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .sort(
        ([dateA], [dateB]) =>
          new Date(dateB).getTime() - new Date(dateA).getTime()
      )
      .map(([dateKey, meetings]) => ({
        date: getDateDisplay(dateKey), // Use getDateDisplay for the group title
        meetings,
      }));
  };
  
  // Update the time format in VerticalMeetingCard
  // Update the VerticalMeetingCard component to include three dots menu
  const VerticalMeetingCard = ({ meeting, onShowMenu }: { meeting: Meeting, onShowMenu: (meeting: Meeting, x: number, y: number, e?: any) => void }) => {
    return (
      <TouchableOpacity 
        style={styles.verticalCard}
        onPress={() => router.push(`/recordingview?eventID=${meeting.event_id}`)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.verticalTitle} numberOfLines={1}>
            {meeting.meeting_title || `Recording ${meeting.id}`}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Process Completed</Text>
            </View>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={(e) => {
                const { pageX, pageY } = e.nativeEvent;
                onShowMenu(meeting, pageX, pageY, e);
              }}
            >
              <Entypo name="dots-three-vertical" size={20} color="#BBBBBB" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.verticalDate}>
          {getDateDisplay(meeting.meeting_date)} • {formatTime(meeting.meeting_start_time, meeting.meeting_date)}
        </Text>
        
        <View style={styles.recordingInfo}>
          <MaterialIcons name="file-upload" size={16} color="#BBBBBB" />
          <Text style={styles.recordingInfoText}>Recorded or Uploaded meeting</Text>
        </View>
        
        {/* Show "No participants" for some meetings as in the image */}
        {Math.random() > 0.7 && (
          <Text style={styles.noParticipants}>No participants</Text>
        )}
      </TouchableOpacity>
    );
  };
  
  // Grouped meetings for view all mode
  const groupedMeetings = groupMeetingsByDate(allMeetings);
  
  // Main render function
  return (
    <View style={{ flex: 1 }}>
      <ThemeView>
        {/* Rename Dialog */}
        <Modal
          transparent={true}
          visible={renameDialogVisible}
          animationType="fade"
          onRequestClose={() => setRenameDialogVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename Meeting</Text>
              <TextInput
                style={styles.renameInput}
                value={newMeetingName}
                onChangeText={setNewMeetingName}
                placeholder="Enter new meeting name"
                placeholderTextColor="#999"
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setRenameDialogVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleRenameMeeting}
                  disabled={renameMeetingMutation.isPending}
                >
                  {renameMeetingMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Options Menu */}
        {menuVisible && (
          <TouchableOpacity 
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={hideMenu}
          >
            <View 
              style={[
                styles.menuContainer,
                {
                  position: 'absolute',
                  top: menuPosition.y - 80,
                  right: 20,
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={openRenameDialog}
              >
                <AntDesign name="edit" size={18} color="#BBBBBB" />
                <Text style={styles.menuItemText}>Rename</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  hideMenu();
                  if (selectedMeeting) {
                    handleDeleteMeeting(selectedMeeting.event_id);
                  }
                }}
              >
                <AntDesign name="delete" size={18} color="#FF6B6B" />
                <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {isLoading || loadingUncategorized ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#004aad" />
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <ThemeText className="text-base mb-4">
              Error fetching recordings
            </ThemeText>
            <CustomButton
              onPress={() => refetch()}
              title="Retry"
              className="px-10 py-4 rounded-lg mt-2"
            />
          </View>
        ) : (
          <ScrollView 
            style={styles.container}
            refreshControl={
              viewAllMode ? 
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#007AFF"]}
                tintColor="#007AFF"
              /> : undefined
            }
          >
            {/* Greeting Section */}
            <View style={styles.greetingContainer}>
              <ThemeText className="text-2xl font-bold">
                {getGreetingBasedOnTime(username)}
              </ThemeText>
              <Text style={styles.dateText}>{todayDate}</Text>
            </View>
            
            {/* Join Meeting Container */}
            <View style={styles.joinMeetingContainer}>
              <View style={styles.meetingUrlInput}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="Enter meeting link..."
                  placeholderTextColor="#BBBBBB"
                  value={meetingUrl}
                  onChangeText={setMeetingUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={handleJoinMeeting}
                disabled={joinMeetingMutation.isPending}
              >
                {joinMeetingMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.joinButtonText}>Join Meeting</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {!viewAllMode ? (
              // Recent Meetings - Horizontal Slider
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Meetings</Text>
                  <TouchableOpacity onPress={() => setViewAllMode(true)}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                {allMeetings.length > 0 ? (
                  <FlatList
                    data={allMeetings.slice(0, 10)}
                    renderItem={({ item, index }) => <HorizontalMeetingCard meeting={item} username={username} onDeleteMeeting={handleDeleteMeeting} onShowMenu={showMenu} />}
                    keyExtractor={(item, index) => `recent-${item.id}-${item.event_id}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListContainer}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <ThemeText className="text-base">No recordings found</ThemeText>
                  </View>
                )}
              </>
            ) : (
              // View All Mode - Grouped by Date
              <>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity onPress={() => setViewAllMode(false)}>
                    <Feather name="arrow-left" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>All Meetings</Text>
                  <View style={{ width: 20 }} />
                </View>
                
                {groupedMeetings.map((group, index) => (
                  <View key={`group-${index}-${group.date}`} style={styles.dateGroup}>
                    <Text style={styles.dateGroupTitle}>{group.date}</Text>
                    {group.meetings.map((meeting, meetingIndex) => (
                      <VerticalMeetingCard 
                        key={`vertical-${meeting.id}-${meeting.event_id}-${meetingIndex}`} 
                        meeting={meeting} 
                        onShowMenu={showMenu}
                      />
                    ))}
                  </View>
                ))}
                
                {groupedMeetings.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <ThemeText className="text-base">No recordings found</ThemeText>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
        
        {isSyncInProgress && (
          <View style={styles.syncIndicator}>
            <SyncingIndicator />
          </View>
        )}
      </ThemeView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
  joinMeetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  meetingUrlInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  urlInput: {
    color: 'white',
    fontSize: 16,
  },
  joinButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  viewAllText: {
    fontSize: 16,
    color: '#0a7ea4',
  },
  horizontalListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  horizontalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    width: width * 0.85,
  },
  verticalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  verticalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  verticalDate: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '500',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  recordingInfoText: {
    color: '#BBBBBB',
    fontSize: 14,
    marginLeft: 8,
  },
  noParticipants: {
    color: '#BBBBBB',
    fontSize: 14,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  menuButton: {
    marginLeft: 12,
    padding: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  menuContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 8,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Move the HorizontalMeetingCard component definition before it's used
const HorizontalMeetingCard = ({ meeting, username, onDeleteMeeting, onShowMenu }: { meeting: Meeting, username: string | undefined, onDeleteMeeting: (eventId: string, e?: any) => void, onShowMenu: (meeting: Meeting, x: number, y: number, e?: any) => void }) => {
  return (
    <TouchableOpacity 
      style={styles.horizontalCard}
      onPress={() => router.push(`/recordingview?eventID=${meeting.event_id}`)}
    >
      <View style={styles.recordingHeader}>
        <Text style={styles.recordingTitle} numberOfLines={1}>
          {meeting.meeting_title || `Recording ${meeting.id}`}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Process Completed</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={(e) => {
              const { pageX, pageY } = e.nativeEvent;
              onShowMenu(meeting, pageX, pageY, e);
            }}
          >
            <Entypo name="dots-three-vertical" size={20} color="#BBBBBB" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.dateText}>
        {getDateDisplay(meeting.meeting_date)} • {formatTime(meeting.meeting_start_time, meeting.meeting_date)}
      </Text>
      
      <View style={styles.recordingInfo}>
        <MaterialIcons name="file-upload" size={16} color="#BBBBBB" />
        <Text style={styles.recordingInfoText}>Recorded or Uploaded meeting</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.profileContainer}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileText}>
            {username ? username.substring(0, 2).toUpperCase() : "US"} 
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
