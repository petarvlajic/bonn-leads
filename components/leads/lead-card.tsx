// components/leads/lead-card.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontSizes,
  fontWeights,
  borderRadius,
  spacing,
  shadows,
} from '../../styles/theme';
import StatusBadge from './status-badge';
import { LeadCardProps, LeadStatus } from '../../types';

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  expanded = false,
  onToggleExpand,
  onStatusChange,
  onAssigneeChange,
  onNotify,
  onCall,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={styles.name}>{lead.name}</Text>
          <View style={styles.assignmentContainer}>
            <StatusBadge status={lead.status} size="small" />
            <Text style={styles.assignmentText}>
              Assigned to: {lead.assignedToName || 'Unassigned'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.contactText}>{lead.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.contactText}>{lead.phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.dropdownContainer}>
              <DropdownButton
                label={lead.assignedToName || 'Unassigned'}
                onPress={() => {}}
              />
            </View>
            <View style={styles.actionButtons}>
              <ActionButton
                icon="notifications-outline"
                label="Notify"
                onPress={onNotify}
              />
              <View style={styles.actionSeparator} />
              <ActionButton icon="call-outline" label="Call" onPress={onCall} />
            </View>
          </View>

          <View style={styles.statusDropdown}>
            <DropdownButton
              label={lead.status}
              onPress={() => {
                const newStatus: LeadStatus =
                  lead.status === 'Pending' ? 'Finished' : 'Pending';
                onStatusChange && onStatusChange(newStatus);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

// Helper component for dropdown buttons
const DropdownButton: React.FC<{ label: string; onPress: () => void }> = ({
  label,
  onPress,
}) => (
  <TouchableOpacity style={styles.dropdownButton} onPress={onPress}>
    <Text style={styles.dropdownButtonText}>{label}</Text>
    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
  </TouchableOpacity>
);

// Helper component for action buttons
const ActionButton: React.FC<{
  icon: string;
  label: string;
  onPress?: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Ionicons name={icon as any} size={18} color={colors.text} />
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '600', // Use a valid numeric or predefined value
    color: colors.text,
    marginBottom: spacing.xs,
  },
  assignmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  contactInfo: {
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dropdownContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionSeparator: {
    width: spacing.sm,
  },
  statusDropdown: {
    maxWidth: '50%',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  dropdownButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  actionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '400', // Add a valid fontWeight if needed
    color: colors.text,
    marginLeft: spacing.xs,
  },
});

export default LeadCard;
