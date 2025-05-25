// app/(app)/home/index.tsx
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

import { Lead, LeadFilters } from '../../../types';
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
  const [selectedStatus, setSelectedStatus] = useState<'All Status' | string>(
    'All Status'
  );
  const [notificationsInitialized, setNotificationsInitialized] =
    useState(false);

  // Loading and pagination state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Fetch leads function
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

        const filters: LeadFilters = {
          page,
          per_page: 15,
        };

        // Add search filter
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }

        // Add status filter
        if (selectedStatus !== 'All Status') {
          filters.status = selectedStatus;
        }

        const response = await LeadsService.getLeads(filters);

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
      } catch (error) {
        console.error('Error fetching leads:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch leads';
        setError(errorMessage);

        if (!isRefresh && !isLoadMore) {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, selectedStatus]
  );

  // Fetch assignees
  const fetchAssignees = useCallback(async () => {
    try {
      const assigneesList = await LeadsService.getAssignees();
      setAssignees(assigneesList);
    } catch (error) {
      console.error('Error fetching assignees:', error);
      // Don't show alert for assignees failure, just log it
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLeads(1);
    // Only fetch assignees for admins
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

  // Handle lead assignment
  const handleAssignLead = async (leadId: number, assigneeId: number) => {
    try {
      // Optimistic update
      const assignee = assignees.find((a) => a.id === assigneeId);
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                assigned_to: assigneeId,
                assignee: assignee
                  ? { id: assignee.id, name: assignee.name }
                  : null,
              }
            : lead
        )
      );

      // API call
      await LeadsService.assignLead(leadId, assigneeId);

      // Show success message
      Alert.alert('Success', 'Lead assigned successfully');
    } catch (error) {
      console.error('Error assigning lead:', error);
      Alert.alert('Error', 'Failed to assign lead');

      // Revert optimistic update
      fetchLeads(1, true);
    }
  };

  // Handle status change
  const handleStatusChange = async (
    leadId: number,
    statusNumber: LeadStatusNumber
  ) => {
    try {
      // Optimistic update - convert status number to label for display
      const statusLabel = LeadsService.getStatusLabel(statusNumber);
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId ? { ...lead, status: statusLabel } : lead
        )
      );

      // API call with status number
      await LeadsService.updateLeadStatus(leadId, statusNumber);

      // Show success message
      Alert.alert('Success', `Status updated to "${statusLabel}"`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      Alert.alert('Error', 'Failed to update lead status');

      // Revert optimistic update
      fetchLeads(1, true);
    }
  };

  const handleToggleExpand = (leadId: number) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  const handleNotify = async (leadId: number) => {
    try {
      // Show loading state if needed
      const response = await LeadsService.notifyAssignee(leadId);

      // Show success message
      Alert.alert(
        'Success',
        response.message || 'Assignee notified successfully'
      );

      console.log(`Notified assignee for lead ${leadId}`);
    } catch (error) {
      console.error('Error notifying assignee:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to notify assignee';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCall = (leadId: number) => {
    console.log(`Called lead ${leadId}`);
    // You can add analytics tracking here
  };

  const handleRetryNotifications = async () => {
    const success = await NotificationService.initializeNotifications();
    setNotificationsInitialized(success);

    if (success) {
      Alert.alert('Success', 'Notifications enabled successfully!');
    } else {
      Alert.alert(
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

          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Only show add button for admins */}
          {isAdmin && (
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color={colors.card} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusFilterContainer}>
          <TouchableOpacity
            style={[
              styles.statusFilterButton,
              selectedStatus === 'All Status' &&
                styles.statusFilterButtonActive,
            ]}
            onPress={() => setSelectedStatus('All Status')}
          >
            <Text
              style={[
                styles.statusFilterText,
                selectedStatus === 'All Status' &&
                  styles.statusFilterTextActive,
              ]}
            >
              All Status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusFilterButton,
              selectedStatus === 'Pending' && styles.statusFilterButtonActive,
            ]}
            onPress={() => setSelectedStatus('Pending')}
          >
            <Text
              style={[
                styles.statusFilterText,
                selectedStatus === 'Pending' && styles.statusFilterTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusFilterButton,
              selectedStatus === 'Finished' && styles.statusFilterButtonActive,
            ]}
            onPress={() => setSelectedStatus('Finished')}
          >
            <Text
              style={[
                styles.statusFilterText,
                selectedStatus === 'Finished' && styles.statusFilterTextActive,
              ]}
            >
              Finished
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusFilterButton,
              selectedStatus === 'Contacted' && styles.statusFilterButtonActive,
            ]}
            onPress={() => setSelectedStatus('Contacted')}
          >
            <Text
              style={[
                styles.statusFilterText,
                selectedStatus === 'Contacted' && styles.statusFilterTextActive,
              ]}
            >
              Contacted
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.leadsCount}>{totalLeads} leads</Text>

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
                {searchQuery || selectedStatus !== 'All Status'
                  ? 'Try adjusting your filters'
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
    backgroundColor: '#FFF3CD', // fallback warning background
    borderColor: '#FFC107', // fallback warning color
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  notificationWarningText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: '#856404', // fallback warning text color
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
