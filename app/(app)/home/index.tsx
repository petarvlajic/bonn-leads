import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  shadows,
  borderRadius,
} from '../../../styles/theme';
import Header from '../../../components/ui/header';
import { useAuth } from '../../../providers/auth-provider';

import { Lead } from '../../../types';
import {
  Assignee,
  LeadsService,
  LeadStatusNumber,
} from '@/services/leads.service';
import { NotificationService } from '@/services/notification.service';
import LeadCard from '@/components/leads/lead-card';

// Helper function to get full name
const getFullName = (lead: Lead): string => {
  return `${lead.first_name} ${lead.last_name}`.trim();
};

// Status mapping for filters (display name to API value)
const STATUS_FILTER_MAP = {
  'All Status': null, // No filter
  Pending: 'pending',
  'Lead Assigned': 'lead_assigned',
  'Lead Contacted': 'lead_contacted',
  'Waiting Recall': 'waiting_recall',
  'Interview Arranged': 'interview_arranged',
  Finished: 'finished',
} as const;

type StatusFilterKey = keyof typeof STATUS_FILTER_MAP;

export default function AdminDashboardScreen() {
  const { authState } = useAuth();

  // Determine user mode based on role
  const userMode: 'admin' | 'user' =
    authState.user?.role.toLocaleLowerCase() === 'admin' ? 'admin' : 'user';
  const isAdmin = userMode === 'admin';

  // State management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilterKey>('All Status');
  const [showFilters, setShowFilters] = useState(true);
  const [notificationsInitialized, setNotificationsInitialized] =
    useState(false);

  // Loading and pagination state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);

  // Operation loading states
  const [assigningLead, setAssigningLead] = useState<number | null>(null);
  const [unassigningLead, setUnassigningLead] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [notifyingAssignee, setNotifyingAssignee] = useState<number | null>(
    null
  );

  // Error state
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced Alert function with better UX
  const showSuccessAlert = (title: string, message: string) => {
    Alert.alert(`✅ ${title}`, message, [{ text: 'OK', style: 'default' }], {
      cancelable: true,
    });
  };

  const showErrorAlert = (title: string, message: string) => {
    Alert.alert(
      `❌ ${title}`,
      message,
      [{ text: 'OK', style: 'destructive' }],
      { cancelable: true }
    );
  };

  const showConfirmAlert = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  };

  // Initialize notifications when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const success = await NotificationService.initializeNotifications();
        setNotificationsInitialized(success);

        if (success) {
          console.log('Notifications initialized successfully');
        } else {
          console.warn('Failed to initialize notifications');
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Set up notification listeners
    notificationListener.current =
      NotificationService.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        Alert.alert(
          notification.request.content.title || 'Notification',
          notification.request.content.body || 'You have a new notification'
        );
      });

    responseListener.current =
      NotificationService.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          const notificationData = response.notification.request.content.data;
          if (notificationData?.leadId) {
            setExpandedLeadId(notificationData.leadId as number);
          }
        }
      );

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        NotificationService.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        NotificationService.removeNotificationSubscription(
          responseListener.current
        );
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch leads function using LeadsService with advanced filters
  const fetchLeads = useCallback(
    async (
      page: number = 1,
      isRefresh: boolean = false,
      isLoadMore: boolean = false
    ) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setError(null);
        } else if (isLoadMore) {
          setLoadingMore(true);
        } else if (page === 1) {
          setLoading(true);
          setError(null);
        }

        // Build filters array using LeadsService helper
        const statusValue = STATUS_FILTER_MAP[selectedStatus];
        const filters = LeadsService.buildFilters(
          undefined, // Don't use search in filters anymore
          statusValue || undefined
        );

        console.log('Fetching leads with filters:', filters);
        console.log('Search term:', searchQuery);
        console.log(
          'Selected status:',
          selectedStatus,
          '-> API value:',
          statusValue
        );

        // Use the advanced filtering method with search_term
        const response = await LeadsService.getLeadsAdvanced({
          page,
          per_page: 15,
          filters: filters.length > 0 ? filters : undefined,
          search_term: searchQuery.trim() || undefined, // Add search_term parameter
        });

        if (isRefresh || page === 1) {
          setLeads(response.leads);
          setCurrentPage(1);
        } else {
          // Load more - append to existing leads
          setLeads((prev) => [...prev, ...response.leads]);
        }

        setHasNextPage(response.pagination.hasNextPage);
        setTotalLeads(response.pagination.total);
        setCurrentPage(response.pagination.currentPage);

        // Show success message for refresh
        if (isRefresh) {
          showSuccessAlert('Refreshed', 'Leads updated successfully');
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch leads';
        setError(errorMessage);

        if (!isRefresh && !isLoadMore) {
          showErrorAlert('Failed to Load', errorMessage);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedStatus, searchQuery]
  );

  // Fetch assignees
  const fetchAssignees = useCallback(async () => {
    try {
      const assigneesList = await LeadsService.getAssignees();
      setAssignees(assigneesList);
    } catch (error) {
      console.error('Error fetching assignees:', error);
      showErrorAlert('Failed to Load', 'Could not fetch assignees list');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLeads(1);
    if (isAdmin) {
      fetchAssignees();
    }
  }, [isAdmin]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLeads(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle status filter change
  useEffect(() => {
    console.log('Status filter changed to:', selectedStatus);
    setCurrentPage(1);
    fetchLeads(1);
  }, [selectedStatus]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchLeads(1, true);
  }, [fetchLeads]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      fetchLeads(currentPage + 1, false, true);
    }
  }, [loadingMore, hasNextPage, currentPage, fetchLeads]);

  // Handle lead assignment with enhanced alerts
  const handleAssignLead = async (leadId: number, assigneeId: number) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    const lead = leads.find((l) => l.id === leadId);

    if (!assignee || !lead) {
      showErrorAlert('Assignment Failed', 'Could not find assignee or lead');
      return;
    }

    showConfirmAlert(
      'Assign Lead',
      `Assign "${getFullName(lead)}" to ${assignee.name}?`,
      async () => {
        setAssigningLead(leadId);

        try {
          // Optimistic update
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId
                ? {
                    ...lead,
                    assigned_to: assigneeId,
                    assignee: { id: assignee.id, name: assignee.name },
                  }
                : lead
            )
          );

          await LeadsService.assignLead(leadId, assigneeId);

          showSuccessAlert(
            'Assignment Successful',
            `"${getFullName(lead)}" has been assigned to ${assignee.name}`
          );
        } catch (error) {
          console.error('Error assigning lead:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to assign lead';

          showErrorAlert('Assignment Failed', errorMessage);

          // Revert optimistic update
          fetchLeads(1, true);
        } finally {
          setAssigningLead(null);
        }
      }
    );
  };

  // Handle lead unassignment with enhanced alerts
  const handleUnassignLead = async (leadId: number) => {
    const lead = leads.find((l) => l.id === leadId);

    if (!lead) {
      showErrorAlert('Unassignment Failed', 'Could not find lead');
      return;
    }

    if (!lead.assignee) {
      showErrorAlert(
        'Unassignment Failed',
        'This lead is not assigned to anyone'
      );
      return;
    }

    const assigneeName = lead.assignee.name;

    showConfirmAlert(
      'Unassign Lead',
      `Remove "${getFullName(lead)}" from ${assigneeName}?`,
      async () => {
        setUnassigningLead(leadId);

        try {
          // Optimistic update
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId
                ? {
                    ...lead,
                    assigned_to: null,
                    assignee: null,
                  }
                : lead
            )
          );

          await LeadsService.unassignLead(leadId);

          showSuccessAlert(
            'Unassignment Successful',
            `"${getFullName(lead)}" has been unassigned from ${assigneeName}`
          );
        } catch (error) {
          console.error('Error unassigning lead:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to unassign lead';

          showErrorAlert('Unassignment Failed', errorMessage);

          // Revert optimistic update
          fetchLeads(1, true);
        } finally {
          setUnassigningLead(null);
        }
      }
    );
  };

  // Handle status change with enhanced alerts
  const handleStatusChange = async (
    leadId: number,
    statusNumber: LeadStatusNumber
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    const statusLabel = LeadsService.getStatusLabel(statusNumber);

    if (!lead) {
      showErrorAlert('Status Update Failed', 'Could not find lead');
      return;
    }

    showConfirmAlert(
      'Change Status',
      `Change "${getFullName(lead)}" status to "${statusLabel}"?`,
      async () => {
        setChangingStatus(leadId);

        try {
          // Optimistic update
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId ? { ...lead, status: statusLabel } : lead
            )
          );

          await LeadsService.changeLeadStatus(leadId, statusNumber);

          showSuccessAlert(
            'Status Updated',
            `"${getFullName(lead)}" status changed to "${statusLabel}"`
          );
        } catch (error) {
          console.error('Error updating lead status:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to update lead status';

          showErrorAlert('Status Update Failed', errorMessage);

          // Revert optimistic update
          fetchLeads(1, true);
        } finally {
          setChangingStatus(null);
        }
      }
    );
  };

  const handleToggleExpand = (leadId: number) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  // Handle notify with enhanced alerts
  const handleNotify = async (leadId: number) => {
    const lead = leads.find((l) => l.id === leadId);

    if (!lead) {
      showErrorAlert('Notification Failed', 'Could not find lead');
      return;
    }

    if (!lead.assignee) {
      showErrorAlert(
        'Notification Failed',
        'This lead is not assigned to anyone'
      );
      return;
    }

    showConfirmAlert(
      'Send Notification',
      `Send notification to ${lead.assignee.name} about "${getFullName(
        lead
      )}"?`,
      async () => {
        setNotifyingAssignee(leadId);

        try {
          const response = await LeadsService.notifyAssignee(leadId);

          showSuccessAlert(
            'Notification Sent',
            `${lead.assignee.name} has been notified about "${getFullName(
              lead
            )}"`
          );

          console.log(`Notified assignee for lead ${leadId}`);
        } catch (error) {
          console.error('Error notifying assignee:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to notify assignee';

          showErrorAlert('Notification Failed', errorMessage);
        } finally {
          setNotifyingAssignee(null);
        }
      }
    );
  };

  // Handle call with alert
  const handleCall = (leadId: number) => {
    const lead = leads.find((l) => l.id === leadId);

    if (lead) {
      showSuccessAlert(
        'Call Initiated',
        `Calling ${getFullName(lead)} at ${
          lead.phone || 'phone number not available'
        }`
      );
      console.log(`Called lead ${leadId}`);
    }
  };

  const handleRetryNotifications = async () => {
    const success = await NotificationService.initializeNotifications();
    setNotificationsInitialized(success);

    if (success) {
      showSuccessAlert('Success', 'Notifications enabled successfully!');
    } else {
      showErrorAlert(
        'Error',
        'Failed to enable notifications. Please check your settings.'
      );
    }
  };

  // Render loading state
  if (loading && leads?.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={isAdmin ? 'Admin Dashboard' : 'My Leads'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && leads.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={isAdmin ? 'Admin Dashboard' : 'My Leads'} />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={60}
            color={colors.error}
          />
          <Text style={styles.errorText}>Failed to load leads</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLeads(1)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isAdmin ? 'Admin Dashboard' : 'My Leads'} />

      <View style={styles.content}>
        {/* Notification status indicator */}
        {!notificationsInitialized && (
          <View style={styles.notificationWarning}>
            <Ionicons name="warning-outline" size={20} color="#FFC107" />
            <Text style={styles.notificationWarningText}>
              Notifications not enabled
            </Text>
            <TouchableOpacity onPress={handleRetryNotifications}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search leads..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="filter"
              size={24}
              color={showFilters ? colors.card : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Status Filter Pills - Only show if showFilters is true */}
        {showFilters && (
          <View style={styles.statusFilterContainer}>
            {Object.keys(STATUS_FILTER_MAP).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusFilterButton,
                  selectedStatus === status && styles.statusFilterButtonActive,
                ]}
                onPress={() => setSelectedStatus(status as StatusFilterKey)}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    selectedStatus === status && styles.statusFilterTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.leadsCount}>
          {totalLeads} leads
          {(selectedStatus !== 'All Status' || searchQuery.trim()) && (
            <Text style={styles.filterIndicator}>
              {' '}
              (
              {[
                searchQuery.trim() && `search: "${searchQuery.trim()}"`,
                selectedStatus !== 'All Status' && `status: ${selectedStatus}`,
              ]
                .filter(Boolean)
                .join(', ')}
              )
            </Text>
          )}
        </Text>

        <FlatList
          data={leads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              name={getFullName(item)}
              assignees={assignees}
              mode={userMode}
              expanded={expandedLeadId === item.id}
              onToggleExpand={() => handleToggleExpand(item.id)}
              onStatusChange={(statusNumber) =>
                handleStatusChange(item.id, statusNumber)
              }
              onAssignLead={
                isAdmin
                  ? (assigneeId) => handleAssignLead(item.id, assigneeId)
                  : undefined
              }
              onUnassignLead={
                isAdmin ? () => handleUnassignLead(item.id) : undefined
              }
              onNotify={isAdmin ? () => handleNotify(item.id) : undefined}
              onCall={!isAdmin ? () => handleCall(item.id) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={60}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No leads found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() || selectedStatus !== 'All Status'
                  ? 'Try adjusting your search or filters'
                  : 'No leads available'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium as any,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
  },
  notificationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  notificationWarningText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: '#856404',
    fontSize: fontSizes.sm,
  },
  retryText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium as any,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  filterButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  addButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statusFilterButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusFilterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  statusFilterTextActive: {
    color: colors.card,
  },
  leadsCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  filterIndicator: {
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    color: colors.primary,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingMoreText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium as any,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
