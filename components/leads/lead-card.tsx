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
      statusStr = statusObj ? statusObj.label.toLowerCase() : 'unknown';
    } else {
      statusStr = status.toLowerCase();
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
      return statusObj ? statusObj.label : 'Unknown';
    }
    return status;
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
                      {assignee.avatar_url ? (
                        <Image
                          source={{ uri: assignee.avatar_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {assignee.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.assigneeDetails}>
                      <Text style={styles.assigneeName}>{assignee.name}</Text>
                      <Text style={styles.assigneeEmail}>{assignee.email}</Text>
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
                const isCurrentStatus = currentStatusLabel === statusObj.label;

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
                        {statusObj.label}
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
            <Text style={styles.name}>{name}</Text>
            <View style={styles.typeContainer}>
              <Ionicons
                name={getTypeIcon(lead.type)}
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.type}>{lead.type}</Text>
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
            <Text style={styles.statusText}>{getStatusLabel(lead.status)}</Text>
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
              <Text style={[styles.infoText, styles.linkText]}>
                {lead.email}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{lead.email}</Text>
            </View>
          )}

          {/* Phone - clickable for users, display only for admins */}
          {isUser ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text style={[styles.infoText, styles.linkText]}>
                {lead.phone}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{lead.phone}</Text>
            </View>
          )}

          {/* Assignment - only for admins */}
          {isAdmin &&
            (lead.assignee ? (
              <View style={styles.infoRow}>
                <Ionicons
                  name="person"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.infoText}>
                  Assigned to: {lead.assignee.name}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setShowAssigneeModal(true)}
              >
                <Ionicons name="person-add" size={16} color={colors.primary} />
                <Text style={[styles.infoText, styles.assignText]}>
                  Tap to assign
                </Text>
              </TouchableOpacity>
            ))}

          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
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
  },
  nameContainer: {
    flexDirection: 'column',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.white,
    fontWeight: fontWeights.medium as any,
    textTransform: 'capitalize',
  },
  content: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  assignText: {
    color: colors.primary,
    fontStyle: 'italic',
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
});

export default LeadCard;
