// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import LeadCard from '../../../components/leads/lead-card';
import { Lead, LeadStatus } from '../../../types';

// Mock data for leads assigned to the current user
const mockAssignedLeads: Lead[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    status: 'Pending',
    assignedTo: '1',
    assignedToName: 'Emma',
  },
  {
    id: '4',
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    phoneNumber: '+5566778899',
    status: 'Pending',
    assignedTo: '1',
    assignedToName: 'Emma',
  },
];

export default function MyAssignedLeadsScreen() {
  const { authState } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(mockAssignedLeads);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);

  // Filter leads based on search query and selected status
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === null || lead.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleToggleExpand = (leadId: string) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleNotify = (leadId: string) => {
    // In a real app, this would trigger a notification
    console.log(`Notifying lead ${leadId}`);
  };

  const handleCall = (leadId: string) => {
    // In a real app, this would initiate a call
    console.log(`Calling lead ${leadId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Assigned Leads" />

      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Welcome, {authState.user?.firstName}
          </Text>
          <Text style={styles.assignedCount}>
            {filteredLeads.length} leads assigned
          </Text>
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
              placeholder="Search leads..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              expanded={expandedLeadId === item.id}
              onToggleExpand={() => handleToggleExpand(item.id)}
              onStatusChange={(newStatus) =>
                handleStatusChange(item.id, newStatus)
              }
              onNotify={() => handleNotify(item.id)}
              onCall={() => handleCall(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={60}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No leads assigned yet</Text>
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
  welcomeContainer: {
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  assignedCount: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
