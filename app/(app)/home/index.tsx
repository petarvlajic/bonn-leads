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

// Updated Status mapping for filters to match backend expectations
export const STATUS_FILTER_MAP = {
  'All Status': null, // No filter
  Pending: 'pending',
  'Lead Assigned': 'lead_assigned',
  'Lead Not Reached': 'lead_not_reached',
  'Lead Not Relevant': 'lead_not_relevant',
  'Meeting Arranged': 'meeting_arranged',
  'Job Shadowing/Hiring': 'job_shadowing_hiring',
} as const;

// Updated Status color mapping to match backend status names
export const STATUS_COLORS = {
  pending: '#9CA3AF', // Gray for pending
  lead_assigned: '#FFC107', // Yellow
  lead_not_reached: '#FF9800', // Orange
  lead_not_relevant: '#F44336', // Red
  meeting_arranged: '#2196F3', // Blue
  job_shadowing_hiring: '#4CAF50', // Green
} as const;

// Helper function to get status color
const getStatusColor = (status: string): string => {
  // Normalize the status string to match our COLOR keys
  const statusStr = status.toLowerCase().trim().replace(/\s+/g, '_');

  console.log(
    'AdminDashboard - Getting color for status:',
    status,
    '-> normalized:',
    statusStr,
    '-> color:',
    STATUS_COLORS[statusStr as keyof typeof STATUS_COLORS]
  );

  return STATUS_COLORS[statusStr as keyof typeof STATUS_COLORS] || '#9CA3AF';
};

// Helper function to get status background color (lighter version)
const getStatusBackgroundColor = (status: string): string => {
  const colors = {
    pending: '#F3F4F6',
    lead_assigned: '#FFF8E1',
    lead_not_reached: '#FFF3E0',
    lead_not_relevant: '#FFEBEE',
    meeting_arranged: '#E3F2FD',
    job_shadowing_hiring: '#E8F5E8',
  };

  // Normalize the status string to match our COLOR keys
  const statusStr = status.toLowerCase().trim().replace(/\s+/g, '_');

  return colors[statusStr as keyof typeof colors] || '#F3F4F6';
};

type StatusFilterKey = keyof typeof STATUS_FILTER_MAP;

// Polling configuration
const POLLING_INTERVAL = 20000; // 20 seconds

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

  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  // Operation loading states
  const [assigningLead, setAssigningLead] = useState<number | null>(null);
  const [unassigningLead, setUnassigningLead] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [notifyingAssignee, setNotifyingAssignee] = useState<number | null>(
    null
  );

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const isComponentMounted = useRef(true);

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
          text: 'Abbrechen',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Bestätigen',
          style: 'default',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    isComponentMounted.current = false;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

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
  }, []);

  // Initialize notifications when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const success = await NotificationService.initializeNotifications();
        if (isComponentMounted.current) {
          setNotificationsInitialized(success);
        }

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

    // Cleanup on unmount
    return cleanup;
  }, [cleanup]);

  // Fetch leads function using LeadsService with advanced filters
  const fetchLeads = useCallback(
    async (
      page: number = 1,
      isRefresh: boolean = false,
      isLoadMore: boolean = false,
      isPollingUpdate: boolean = false
    ) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setError(null);
        } else if (isLoadMore) {
          setLoadingMore(true);
        } else if (page === 1 && !isPollingUpdate) {
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

        // Only update state if component is still mounted
        if (!isComponentMounted.current) return;

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

        // Update last polled timestamp
        if (isPollingUpdate) {
          setLastPolledAt(new Date());
        }

        // Show success message for refresh (but not for polling)
        if (isRefresh && !isPollingUpdate) {
          showSuccessAlert('Refreshed', 'Leads updated successfully');
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch leads';

        if (isComponentMounted.current) {
          setError(errorMessage);

          // Only show error alert for user-initiated actions, not polling
          if (!isRefresh && !isLoadMore && !isPollingUpdate) {
            showErrorAlert('Failed to Load', errorMessage);
          }
        }
      } finally {
        if (isComponentMounted.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [selectedStatus, searchQuery]
  );

  // Polling function
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPolling(true);

    pollingIntervalRef.current = setInterval(() => {
      if (isComponentMounted.current) {
        console.log('Polling for leads updates...');
        fetchLeads(1, false, false, true); // isPollingUpdate = true
      }
    }, POLLING_INTERVAL);
  }, [fetchLeads]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
    }
    setIsPolling(false);
  }, []);

  // Fetch assignees
  const fetchAssignees = useCallback(async () => {
    try {
      const assigneesList = await LeadsService.getAssignees();
      if (isComponentMounted.current) {
        setAssignees(assigneesList);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
      if (isComponentMounted.current) {
        showErrorAlert('Failed to Load', 'Could not fetch assignees list');
      }
    }
  }, []);

  // Initial load and start polling
  useEffect(() => {
    fetchLeads(1);
    if (isAdmin) {
      fetchAssignees();
    }

    // Start polling after initial load
    const pollingTimeout = setTimeout(() => {
      if (isComponentMounted.current) {
        startPolling();
      }
    }, 1000);

    return () => {
      clearTimeout(pollingTimeout);
      stopPolling();
    };
  }, [isAdmin, startPolling, stopPolling]);

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
      `Assign "${getFullName(lead)}" to ${
        assignee.first_name + ' ' + assignee.last_name || assignee.name
      }?`,
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
            `"${getFullName(lead)}" has been assigned to ${
              assignee.first_name + ' ' + assignee.last_name || assignee.name
            }`
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
          // Optimistic update with the API name instead of label
          const statusApiName = LeadsService.getStatusApiName(statusNumber);
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId ? { ...lead, status: statusApiName } : lead
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
      `Send notification to ${
        lead.assignee.first_name + ' ' + lead.assignee.last_name
      } about "${getFullName(lead)}"?`,
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
    try {
      const { success, error } =
        await NotificationService.initializeNotifications();
      setNotificationsInitialized(success);

      if (success) {
        showSuccessAlert('Erfolg', 'Benachrichtigungen erfolgreich aktiviert!');
      } else {
        showErrorAlert(
          'Fehler',
          error ||
            'Benachrichtigungen konnten nicht aktiviert werden. Bitte überprüfen Sie Ihre Einstellungen.'
        );
      }
    } catch (error) {
      console.log('Error initializing notifications:', error);
      showErrorAlert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    }
  };

  // Format last polled time
  const formatLastPolled = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) {
      return `${diffSecs}s ago`;
    } else if (diffSecs < 3600) {
      return `${Math.floor(diffSecs / 60)}m ago`;
    } else {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    // Helper function to format status for display
    const formatStatusLabel = (status: string): string => {
      if (!status) return 'Unknown';

      // Use LeadsService.getStatusLabel for consistent formatting
      try {
        if (
          LeadsService.getStatusLabel &&
          typeof LeadsService.getStatusLabel === 'function'
        ) {
          const label = LeadsService.getStatusLabel(status);
          if (label && label !== 'Unknown') {
            return label;
          }
        }
      } catch (error) {
        console.warn('Error using LeadsService.getStatusLabel:', error);
      }

      // Fallback: format the status string manually
      return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: getStatusBackgroundColor(status),
            borderColor: getStatusColor(status),
          },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(status) },
          ]}
        />
        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
          {formatStatusLabel(status)}
        </Text>
      </View>
    );
  };

  // Render loading state
  if (loading && leads?.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={isAdmin ? 'Admin-Dashboard' : 'Meine Leads'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Leads werden geladen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && leads.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={isAdmin ? 'Admin-Dashboard' : 'Meine Leads'} />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={60}
            color={colors.error}
          />
          <Text style={styles.errorText}>Fehler beim Laden der Leads</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLeads(1)}
          >
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isAdmin ? 'Admin-Dashboard' : 'Meine Leads'} />

      <View style={styles.content}>
        {/* Notification status indicator */}
        {!notificationsInitialized && (
          <View style={styles.notificationWarning}>
            <Ionicons name="warning-outline" size={20} color="#FFC107" />
            <Text style={styles.notificationWarningText}>
              Benachrichtigungen nicht aktiviert
            </Text>
            <TouchableOpacity onPress={handleRetryNotifications}>
              <Text style={styles.retryText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Polling status indicator */}
        <View style={styles.pollingStatus}>
          <View style={styles.pollingIndicator}>
            <View
              style={[
                styles.pollingDot,
                { backgroundColor: isPolling ? '#4CAF50' : '#FF9800' },
              ]}
            />
            <Text style={styles.pollingText}>
              {isPolling ? 'Auto-refresh active' : 'Auto-refresh paused'}
            </Text>
          </View>
          {lastPolledAt && (
            <Text style={styles.lastPolledText}>
              Updated {formatLastPolled(lastPolledAt)}
            </Text>
          )}
        </View>

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
              placeholder="Leads suchen..."
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
            {Object.keys(STATUS_FILTER_MAP).map((status) => {
              const statusValue = STATUS_FILTER_MAP[status as StatusFilterKey];
              const isSelected = selectedStatus === status;

              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusFilterButton,
                    isSelected && {
                      backgroundColor: statusValue
                        ? getStatusBackgroundColor(statusValue)
                        : colors.primary,
                      borderColor: statusValue
                        ? getStatusColor(statusValue)
                        : colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus(status as StatusFilterKey)}
                >
                  {statusValue && (
                    <View
                      style={[
                        styles.filterStatusDot,
                        { backgroundColor: getStatusColor(statusValue) },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.statusFilterText,
                      isSelected && {
                        color: statusValue
                          ? getStatusColor(statusValue)
                          : colors.card,
                      },
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.leadsCount}>
          {totalLeads} Leads
          {(selectedStatus !== 'All Status' || searchQuery.trim()) && (
            <Text style={styles.filterIndicator}>
              {' '}
              (
              {[
                searchQuery.trim() && `Suche: "${searchQuery.trim()}"`,
                selectedStatus !== 'All Status' && `Status: ${selectedStatus}`,
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
              StatusBadge={StatusBadge}
              getStatusColor={getStatusColor}
              getStatusBackgroundColor={getStatusBackgroundColor}
              statusFilterMap={STATUS_FILTER_MAP}
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
              <Text style={styles.emptyText}>Keine Leads gefunden</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() || selectedStatus !== 'All Status'
                  ? 'Passen Sie Ihre Suche oder Filter an'
                  : 'Keine Leads verfügbar'}
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
  pollingStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pollingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  pollingText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: fontWeights.medium as any,
  },
  lastPolledText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
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
  statusFilterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusFilterText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  filterStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
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
  // Status Badge Styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
});
