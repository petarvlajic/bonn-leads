// app/(app)/home/index.tsx
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

// Mock data for leads
const mockLeads: Lead[] = [
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
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+9876543210',
    status: 'Finished',
    assignedTo: '3',
    assignedToName: 'Michael',
  },
  {
    id: '3',
    name: 'Robert Johnson',
    email: 'robert.j@example.com',
    phoneNumber: '+1122334455',
    status: 'Pending',
    assignedTo: null,
    assignedToName: 'Unassigned',
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

export default function AdminDashboardScreen() {
  const { authState } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    'All Status' | LeadStatus
  >('All Status');

  // Filter leads based on search query and selected status
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'All Status' || lead.status === selectedStatus;

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
      <Header title="Admin Dashboard" />

      <View style={styles.content}>
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

          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.card} />
          </TouchableOpacity>
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
        </View>

        <Text style={styles.leadsCount}>{filteredLeads.length} leads</Text>

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
              <Text style={styles.emptyText}>No leads found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters
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
  },
  statusFilterButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
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
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
