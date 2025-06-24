// components/leads/lead-card.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';
import { Lead } from '../../types';
import { Assignee, LeadStatusNumber } from '@/services/leads.service';

// Updated status mapping to match backend expectations
const STATUS_NUMBER_MAP: Record<
  LeadStatusNumber,
  { label: string; apiValue: string }
> = {
  1: { label: 'Pending', apiValue: 'pending' },
  2: { label: 'Lead Assigned', apiValue: 'lead_assigned' },
  3: { label: 'Lead Not Reached', apiValue: 'lead_not_reached' },
  4: { label: 'Lead Not Relevant', apiValue: 'lead_not_relevant' },
  5: { label: 'Meeting Arranged', apiValue: 'meeting_arranged' },
  6: { label: 'Job Shadowing/Hiring', apiValue: 'job_shadowing_hiring' },
} as const;

// Updated status colors to match backend status names
const STATUS_COLORS = {
  pending: '#9CA3AF', // Gray for pending
  lead_assigned: '#FFC107', // Yellow
  lead_not_reached: '#FF9800', // Orange
  lead_not_relevant: '#F44336', // Red
  meeting_arranged: '#2196F3', // Blue
  job_shadowing_hiring: '#4CAF50', // Green
} as const;

const STATUS_BACKGROUND_COLORS = {
  pending: '#F3F4F6',
  lead_assigned: '#FFF8E1',
  lead_not_reached: '#FFF3E0',
  lead_not_relevant: '#FFEBEE',
  meeting_arranged: '#E3F2FD',
  job_shadowing_hiring: '#E8F5E8',
  completed: '#E8F5E8',
} as const;

// Helper function to get status color
const getStatusColor = (status: string | number): string => {
  let statusStr: string;

  if (typeof status === 'number') {
    const statusObj = STATUS_NUMBER_MAP[status as LeadStatusNumber];
    statusStr = statusObj ? statusObj.apiValue : 'pending';
  } else {
    statusStr = status.toLowerCase().replace(/\s+/g, '_');
  }

  return STATUS_COLORS[statusStr as keyof typeof STATUS_COLORS] || '#9CA3AF';
};

// Helper function to get status background color (lighter version)
const getStatusBackgroundColor = (status: string | number): string => {
  let statusStr: string;
  if (typeof status === 'number') {
    const statusObj = STATUS_NUMBER_MAP[status as LeadStatusNumber];
    statusStr = statusObj ? statusObj.apiValue : 'pending';
  } else {
    statusStr = status.toLowerCase().replace(/\s+/g, '_');
  }

  return (
    STATUS_BACKGROUND_COLORS[
      statusStr as keyof typeof STATUS_BACKGROUND_COLORS
    ] || '#F3F4F6'
  );
};

interface LeadCardProps {
  lead: Lead;
  name: string; // Full name passed from parent
  assignees: Assignee[];
  expanded: boolean;
  mode: 'admin' | 'user'; // Add mode prop
  onToggleExpand: () => void;
  onStatusChange?: (statusNumber: LeadStatusNumber) => void; // Changed to use status number
  onAssignLead?: (assigneeId: number) => void; // Optional for admin
  onUnassignLead?: () => void; // Optional for admin
  onNotify?: () => void; // Optional for admin
  onCall?: () => void; // Optional for regular user
  StatusBadge?: React.ComponentType<{ status: string }>; // Optional StatusBadge component from parent
  getStatusColor?: (status: string) => string; // Optional color function from parent
  getStatusBackgroundColor?: (status: string) => string; // Optional background color function from parent
  statusFilterMap?: any; // Optional status mapping from parent (not used anymore)
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  name,
  assignees,
  expanded,
  mode,
  onToggleExpand,
  onStatusChange,
  onAssignLead,
  onUnassignLead,
  onNotify,
  onCall,
  StatusBadge,
  getStatusColor: parentGetStatusColor,
  getStatusBackgroundColor: parentGetStatusBackgroundColor,
}) => {
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const isAdmin = mode === 'admin';
  const isUser = mode === 'user';

  // Use parent functions if provided, otherwise use local functions
  const finalGetStatusColor = parentGetStatusColor || getStatusColor;
  const finalGetStatusBackgroundColor =
    parentGetStatusBackgroundColor || getStatusBackgroundColor;

  const getStatusLabel = (status: string | number): string => {
    if (typeof status === 'number') {
      const statusObj = STATUS_NUMBER_MAP[status as LeadStatusNumber];
      return statusObj ? statusObj.label : 'Unknown';
    }

    // For string status, format it properly
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleAssigneeSelect = (assigneeId: number) => {
    if (onAssignLead) {
      onAssignLead(assigneeId);
    }
    setShowAssigneeModal(false);
  };

  const handleStatusSelect = (statusNumber: LeadStatusNumber) => {
    if (onStatusChange) {
      onStatusChange(statusNumber);
    }
    setShowStatusModal(false);
  };

  const handleUnassign = () => {
    Alert.alert(
      'Lead-Zuweisung aufheben',
      `Möchten Sie wirklich ${
        lead.assignee?.name || 'diesen Zuweisungspartner'
      } von diesem Lead entfernen?`,
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            if (onUnassignLead) {
              onUnassignLead();
            }
          },
        },
      ]
    );
  };

  const renderAssigneeModal = () => (
    <Modal
      visible={showAssigneeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAssigneeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lead zuweisen</Text>
            <TouchableOpacity onPress={() => setShowAssigneeModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.assigneeList}>
              {assignees.map((assignee) => (
                <TouchableOpacity
                  key={assignee.id}
                  style={styles.assigneeItem}
                  onPress={() => handleAssigneeSelect(assignee.id)}
                >
                  <View style={styles.assigneeInfo}>
                    <View style={styles.assigneeAvatar}>
                      {assignee.first_name && assignee.last_name ? (
                        <Text style={styles.avatarText}>
                          {assignee.first_name.charAt(0) +
                            assignee.last_name.charAt(0)}
                        </Text>
                      ) : (
                        <Text style={styles.avatarText}>
                          {assignee.id.toString()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.assigneeDetails}>
                      <Text style={styles.assigneeName}>
                        {assignee.first_name && assignee.last_name
                          ? `${assignee.first_name} ${assignee.last_name}`
                          : `User ${assignee.id}`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Status ändern</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.statusList}>
              {Object.entries(STATUS_NUMBER_MAP).map(([number, statusObj]) => {
                const statusNumber = Number(number) as LeadStatusNumber;
                const currentStatusLabel = getStatusLabel(lead.status);
                const isCurrentStatus = currentStatusLabel === statusObj.label;

                return (
                  <TouchableOpacity
                    key={number}
                    style={[
                      styles.statusItem,
                      isCurrentStatus && {
                        backgroundColor: finalGetStatusBackgroundColor(
                          statusObj.apiValue
                        ),
                      },
                    ]}
                    onPress={() => handleStatusSelect(statusNumber)}
                  >
                    <View style={styles.statusInfo}>
                      <View
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor: finalGetStatusColor(
                              statusObj.apiValue
                            ),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          isCurrentStatus && {
                            color: finalGetStatusColor(statusObj.apiValue),
                            fontWeight: fontWeights.medium as any,
                          },
                        ]}
                      >
                        {statusObj.label}
                      </Text>
                    </View>
                    {isCurrentStatus && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={finalGetStatusColor(statusObj.apiValue)}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'nurse':
        return 'medical';
      case 'trainee':
        return 'school';
      default:
        return 'person';
    }
  };

  const handleCall = async () => {
    try {
      const phoneNumber = lead.phone.replace(/[^\d+]/g, ''); // Clean phone number
      const phoneUrl = `tel:${phoneNumber}`;

      // Check if the device can handle phone calls
      const supported = await Linking.canOpenURL(phoneUrl);

      if (supported) {
        await Linking.openURL(phoneUrl);
        // Call the parent onCall function for any additional logic (analytics, etc.)
        if (onCall) {
          onCall();
        }
      } else {
        Alert.alert(
          'Anruf nicht möglich',
          'Ihr Gerät unterstützt keine Anrufe oder die Telefonnummer ist ungültig.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert(
        'Anruf fehlgeschlagen',
        'Anruf konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmail = async () => {
    try {
      const emailUrl = `mailto:${lead.email}`;

      const supported = await Linking.canOpenURL(emailUrl);

      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'E-Mail nicht möglich',
          'Auf Ihrem Gerät ist keine E-Mail-App verfügbar.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert(
        'E-Mail fehlgeschlagen',
        'E-Mail-App konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.leadId}>#{lead.id}</Text>
            </View>
            <View style={styles.typeContainer}>
              <Ionicons
                name={getTypeIcon(lead.type)}
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.type} numberOfLines={1}>
                {lead.type}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {StatusBadge ? (
            <StatusBadge status={lead.status} />
          ) : (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: finalGetStatusColor(lead.status),
                  borderColor: finalGetStatusColor(lead.status),
                },
              ]}
            >
              <Text style={styles.statusText} numberOfLines={2}>
                {getStatusLabel(lead.status)}
              </Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Email - clickable for users, display only for admins */}
          {isUser ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <Ionicons name="mail" size={16} color={colors.primary} />
              <Text
                style={[styles.infoText, styles.linkText]}
                numberOfLines={2}
              >
                {lead.email}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={2}>
                {lead.email}
              </Text>
            </View>
          )}

          {/* Phone - clickable for users, display only for admins */}
          {isUser ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text
                style={[styles.infoText, styles.linkText]}
                numberOfLines={1}
              >
                {lead.phone}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {lead.phone}
              </Text>
            </View>
          )}

          {/* Assignment - only for admins */}
          {isAdmin && (
            <View style={styles.assignmentSection}>
              {lead.assignee ? (
                <View style={styles.assignedRow}>
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="person"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.infoText} numberOfLines={2}>
                      Assigned to: {lead.assignee?.name || 'Unknown User'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unassignButton}
                    onPress={handleUnassign}
                  >
                    <Ionicons
                      name="person-remove"
                      size={16}
                      color={colors.error}
                    />
                    <Text style={styles.unassignText}>Entfernen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => setShowAssigneeModal(true)}
                >
                  <Ionicons
                    name="person-add"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.infoText, styles.assignText]}>
                    Tippen, um zuzuweisen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              Erstellt: {new Date(lead.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Action buttons based on mode */}
          <View style={styles.actions}>
            {isUser && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={handleCall}
                >
                  <Ionicons name="call" size={16} color={colors.white} />
                  <Text style={styles.actionButtonText}>Anrufen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.emailButton]}
                  onPress={handleEmail}
                >
                  <Ionicons name="mail" size={16} color={colors.white} />
                  <Text style={styles.actionButtonText}>E-Mail</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: finalGetStatusColor(lead.status) },
                  ]}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.actionButtonText}>Status</Text>
                </TouchableOpacity>
              </>
            )}

            {isAdmin && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.notifyButton]}
                  onPress={onNotify}
                >
                  <Ionicons
                    name="notifications"
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.actionButtonText}>Benachrichtigen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: finalGetStatusColor(lead.status) },
                  ]}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.actionButtonText}>Status</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Modals */}
      {isAdmin && renderAssigneeModal()}
      {renderStatusModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameContainer: {
    flexDirection: 'column',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  leadId: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  type: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    maxWidth: 120,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.white,
    fontWeight: fontWeights.medium as any,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  content: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  infoText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  assignText: {
    color: colors.primary,
    fontStyle: 'italic',
  },
  assignmentSection: {
    marginBottom: spacing.sm,
  },
  assignedRow: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  unassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '15', // Add transparency
    alignSelf: 'flex-start',
  },
  unassignText: {
    marginLeft: spacing.xs,
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: fontWeights.medium as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  assigneeList: {
    paddingVertical: spacing.sm,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold as any,
  },
  assigneeDetails: {
    flex: 1,
  },
  assigneeName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    color: colors.text,
  },
  assigneeEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusList: {
    paddingVertical: spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  statusLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: colors.success || '#28A745',
  },
  emailButton: {
    backgroundColor: '#17A2B8', // fallback info color
  },
  notifyButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium as any,
    marginLeft: spacing.xs,
  },
  noAssigneesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssigneesText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default LeadCard;
