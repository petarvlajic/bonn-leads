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
import {
  Assignee,
  LEAD_STATUSES,
  LeadStatusNumber,
} from '@/services/leads.service';

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
}) => {
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const isAdmin = mode === 'admin';
  const isUser = mode === 'user';

  const getStatusColor = (status: string | number) => {
    // Handle both string and number status
    let statusStr: string;

    if (typeof status === 'number') {
      const statusObj = LEAD_STATUSES[status as LeadStatusNumber];
      statusStr = statusObj
        ? statusObj.label.toLowerCase().replace(/_/g, ' ')
        : 'unknown';
    } else {
      statusStr = status.toLowerCase().replace(/_/g, ' ');
    }

    switch (statusStr) {
      case 'pending':
        return '#FFC107'; // Yellow
      case 'finished':
        return colors.success || '#28A745'; // Green
      case 'lead contacted':
      case 'contacted':
        return '#17A2B8'; // Blue
      case 'waiting recall':
      case 'waiting for recall':
        return '#FD7E14'; // Orange
      case 'interview arranged':
        return '#6F42C1'; // Purple
      case 'lead assigned':
        return '#007BFF'; // Blue
      case 'not interested':
        return colors.error || '#DC3545'; // Red
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string | number): string => {
    if (typeof status === 'number') {
      const statusObj = LEAD_STATUSES[status as LeadStatusNumber];
      return statusObj ? statusObj.label.replace(/_/g, ' ') : 'Unknown';
    }
    return status.replace(/_/g, ' ');
  };

  const handleAssigneeSelect = (assigneeId: number) => {
    if (onAssignLead) {
      onAssignLead(assigneeId);
    }
    setShowAssigneeModal(false);
  };

  const handleUnassign = () => {
    Alert.alert(
      'Unassign Lead',
      `Are you sure you want to unassign ${
        lead.assignee?.name || 'this assignee'
      } from this lead?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unassign',
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

  const handleStatusSelect = (statusNumber: LeadStatusNumber) => {
    if (onStatusChange) {
      onStatusChange(statusNumber);
    }
    setShowStatusModal(false);
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
            <Text style={styles.modalTitle}>Assign Lead</Text>
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
                      {assignee?.avatar_url ? (
                        <Image
                          source={{ uri: assignee?.avatar_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(() => {
                            // Check if assignee has proper first/last name
                            if (assignee.first_name && assignee.last_name) {
                              return `${assignee.first_name.charAt(
                                0
                              )}${assignee.last_name.charAt(0)}`.toUpperCase();
                            }
                            // If only one name is available
                            if (assignee.first_name) {
                              return assignee.first_name
                                .charAt(0)
                                .toUpperCase();
                            }
                            if (assignee.last_name) {
                              return assignee.last_name.charAt(0).toUpperCase();
                            }
                            // Fallback to email from user object
                            const email = assignee.user?.email || '';
                            return email.charAt(0).toUpperCase();
                          })()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.assigneeDetails}>
                      <Text style={styles.assigneeName}>
                        {(() => {
                          // Build name from first_name and last_name
                          const firstName = assignee.first_name || '';
                          const lastName = assignee.last_name || '';
                          const fullName = `${firstName} ${lastName}`.trim();

                          // If we have a proper name, use it
                          if (fullName) {
                            return fullName;
                          }

                          // Fallback to email from user object
                          return assignee.user?.email || 'Unknown User';
                        })()}
                      </Text>
                      <Text style={styles.assigneeEmail}>
                        {assignee.user?.email || ''}
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
            <Text style={styles.modalTitle}>Change Status</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.statusList}>
              {Object.entries(LEAD_STATUSES).map(([number, statusObj]) => {
                const statusNumber = Number(number) as LeadStatusNumber;
                const currentStatusLabel = getStatusLabel(lead.status);
                const isCurrentStatus =
                  currentStatusLabel === statusObj.label.replace(/_/g, ' ');

                return (
                  <TouchableOpacity
                    key={number}
                    style={[
                      styles.statusItem,
                      isCurrentStatus && styles.statusItemActive,
                    ]}
                    onPress={() => handleStatusSelect(statusNumber)}
                  >
                    <View style={styles.statusInfo}>
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: getStatusColor(statusNumber) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          isCurrentStatus && styles.statusLabelActive,
                        ]}
                      >
                        {statusObj.label.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    {isCurrentStatus && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
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
          'Unable to make call',
          'Your device does not support phone calls or the phone number is invalid.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert(
        'Call Failed',
        'Unable to initiate phone call. Please try again.',
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
          'Unable to open email',
          'No email app is available on your device.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert(
        'Email Failed',
        'Unable to open email app. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
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
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(lead.status) },
            ]}
          >
            <Text style={styles.statusText} numberOfLines={2}>
              {getStatusLabel(lead.status)}
            </Text>
          </View>
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
                      Assigned to:{' '}
                      {(() => {
                        const firstName = lead.assignee.first_name || '';
                        const lastName = lead.assignee.last_name || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        return (
                          fullName ||
                          lead.assignee.user?.email ||
                          'Unknown User'
                        );
                      })()}
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
                    <Text style={styles.unassignText}>Unassign</Text>
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
                    Tap to assign
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              Created: {new Date(lead.created_at).toLocaleDateString()}
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
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.emailButton]}
                  onPress={handleEmail}
                >
                  <Ionicons name="mail" size={16} color={colors.white} />
                  <Text style={styles.actionButtonText}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.statusButton]}
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
                  <Text style={styles.actionButtonText}>Notify</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.statusButton]}
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
  name: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
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
  statusItemActive: {
    backgroundColor: colors.primary + '10', // Add transparency
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
  statusLabelActive: {
    fontWeight: fontWeights.medium as any,
    color: colors.primary,
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
  statusButton: {
    backgroundColor: '#FFC107', // fallback warning color
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
