// services/leads-service.ts
import { fetchApi, ApiError } from '@/utils/api';
import { Lead, LeadsApiResponse, LeadsResponse, LeadFilters } from '@/types';
import { objectToQueryParams } from '@/utils/objectToQueryParams';

// Profile/Assignee types
export interface Profile {
  id: number;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  department: string | null;
  expo_tokens: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    email: string;
    email_verified_at: string | null;
    username: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

export interface ProfilesApiResponse {
  current_page: number;
  data: Profile[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// Updated Assignee interface to match the actual API response structure
export interface Assignee {
  id: number;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  department: string | null;
  expo_tokens: string[] | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    email: string;
    email_verified_at: string | null;
    username: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

// Filter types for advanced filtering
export interface LeadFilter {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'like'
    | 'in'
    | 'not_in'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte';
  value: string | number | string[] | number[];
}

export interface AdvancedLeadFilters {
  page?: number;
  per_page?: number;
  filters?: LeadFilter[];
  search_term?: string;
}

// Updated Lead status options to match backend expectations
export const LEAD_STATUSES = {
  1: { label: 'Pending', apiName: 'pending' },
  2: { label: 'Lead Assigned', apiName: 'lead_assigned' },
  3: { label: 'Lead Not Reached', apiName: 'lead_not_reached' },
  4: { label: 'Lead Not Relevant', apiName: 'lead_not_relevant' },
  5: { label: 'Meeting Arranged', apiName: 'meeting_arranged' },
  6: { label: 'Job Shadowing/Hiring', apiName: 'job_shadowing_hiring' },
} as const;

export type LeadStatusNumber = keyof typeof LEAD_STATUSES;
export type LeadStatusLabel = (typeof LEAD_STATUSES)[LeadStatusNumber]['label'];
export type LeadStatusApiName =
  (typeof LEAD_STATUSES)[LeadStatusNumber]['apiName'];

export class LeadsService {
  /**
   * Fetch leads with advanced filters and pagination
   */
  static async getLeadsAdvanced(
    filters: AdvancedLeadFilters = {}
  ): Promise<LeadsResponse> {
    try {
      // Build query parameters
      const queryParams: any = {
        page: filters.page || 1,
        per_page: filters.per_page || 15,
      };

      // Add search_term if provided
      if (filters.search_term && filters.search_term.trim()) {
        queryParams.search_term = filters.search_term.trim();
      }

      // Add filters if provided
      if (filters.filters && filters.filters.length > 0) {
        queryParams.filters = filters.filters;
      }

      // Convert to query string
      const queryString = objectToQueryParams(queryParams);
      const endpoint = `/lead?${queryString}`;

      console.log('Advanced filter endpoint:', endpoint);
      console.log('Applied filters:', filters.filters);
      console.log('Search term:', filters.search_term);

      const response = await fetchApi<LeadsApiResponse>(endpoint, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch leads', response.statusCode);
      }

      const apiData = response.result;

      // Map pagination data
      const pagination = {
        currentPage: apiData.current_page,
        lastPage: apiData.last_page,
        perPage: apiData.per_page,
        total: apiData.total,
        hasNextPage: !!apiData.next_page_url,
        hasPrevPage: !!apiData.prev_page_url,
      };

      return {
        leads: apiData.data,
        pagination,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch leads'
      );
    }
  }

  /**
   * Fetch leads with optional filters and pagination (Legacy method)
   */
  static async getLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (filters.page && filters.page > 1) {
        queryParams.append('page', filters.page.toString());
      }

      if (filters.per_page) {
        queryParams.append('per_page', filters.per_page.toString());
      }

      if (filters.search && filters.search.trim()) {
        queryParams.append('search', filters.search.trim());
      }

      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }

      if (filters.assigned_to && filters.assigned_to !== 'all') {
        if (filters.assigned_to === 'unassigned') {
          queryParams.append('assigned_to', '');
        } else {
          queryParams.append('assigned_to', filters.assigned_to.toString());
        }
      }

      if (filters.type) {
        queryParams.append('type', filters.type);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/lead?${queryString}` : '/lead';

      const response = await fetchApi<LeadsApiResponse>(endpoint, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch leads', response.statusCode);
      }

      const apiData = response.result;

      // Map pagination data
      const pagination = {
        currentPage: apiData.current_page,
        lastPage: apiData.last_page,
        perPage: apiData.per_page,
        total: apiData.total,
        hasNextPage: !!apiData.next_page_url,
        hasPrevPage: !!apiData.prev_page_url,
      };

      return {
        leads: apiData.data,
        pagination,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch leads'
      );
    }
  }

  /**
   * Helper method to build filter array from status (no longer includes search)
   */
  static buildFilters(searchQuery?: string, status?: string): LeadFilter[] {
    const filters: LeadFilter[] = [];

    // Add status filter if provided and not "All Status"
    if (status && status !== 'all' && status !== 'All Status') {
      filters.push({
        field: 'status',
        operator: 'eq',
        value: status,
      });
    }

    // Note: Search is now handled separately via search_term parameter
    // searchQuery parameter is kept for backward compatibility but not used

    return filters;
  }

  /**
   * Get a single lead by ID
   */
  static async getLead(leadId: number): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new ApiError('Failed to fetch lead', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch lead'
      );
    }
  }

  /**
   * Change lead status using the specific endpoint
   * POST /lead/{lead.id}/change_status/{status.name}
   */
  static async changeLeadStatus(
    leadId: number,
    statusNumber: LeadStatusNumber
  ): Promise<Lead> {
    try {
      // Get the API name for the status
      const statusApiName = LEAD_STATUSES[statusNumber].apiName;

      console.log(`Changing lead ${leadId} status to: ${statusApiName}`);

      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}/change_status/${statusApiName}`,
        {
          method: 'POST',
        }
      );

      console.log('Change lead status response:', response);

      if (!response.ok) {
        throw new ApiError('Failed to change lead status', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to change lead status'
      );
    }
  }

  /**
   * Update lead with any field(s)
   * Uses POST with _method: PUT pattern
   */
  static async updateLead(
    leadId: number,
    updates: Record<string, any>
  ): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...updates,
            _method: 'PUT',
          }),
        }
      );

      if (!response.ok) {
        throw new ApiError('Failed to update lead', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to update lead'
      );
    }
  }

  /**
   * Update lead status (using status number) - Legacy method
   * @deprecated Use changeLeadStatus instead
   */
  static async updateLeadStatus(
    leadId: number,
    statusNumber: LeadStatusNumber
  ): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            status: statusNumber,
            _method: 'PUT',
          }),
        }
      );

      if (!response.ok) {
        throw new ApiError('Failed to update lead status', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to update lead status'
      );
    }
  }

  /**
   * Get all profiles/assignees
   */
  static async getAssignees(): Promise<Assignee[]> {
    try {
      const response = await fetchApi<ProfilesApiResponse>('/profile', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch assignees', response.statusCode);
      }

      // Based on your API response structure: { ok: true, statusCode: 200, result: { message: "...", data: { current_page: ..., data: [...] } } }
      const profilesData = response.result;
      const profiles = profilesData.data; // This is the actual array of profiles

      console.log('Profiles response:', profilesData);
      console.log('Profiles array:', profiles);

      // Map profiles to match the Assignee interface structure like in leads
      const assignees: Assignee[] = profiles.map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        department: profile.department,
        expo_tokens: Array.isArray(profile.expo_tokens)
          ? profile.expo_tokens
          : profile.expo_tokens
          ? [profile.expo_tokens]
          : null, // Handle both string and array
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        user: profile.user,
      }));

      console.log('Mapped assignees:', assignees);
      return assignees;
    } catch (error) {
      console.error('Error fetching assignees:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch assignees'
      );
    }
  }

  /**
   * Assign lead to user
   * POST /lead/{lead.id}/assign/{profile.id}
   */
  static async assignLead(leadId: number, profileId: number): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}/assign/${profileId}`,
        {
          method: 'POST',
        }
      );

      console.log('Lead assignment response:', response);

      if (!response.ok) {
        throw new ApiError('Failed to assign lead', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to assign lead'
      );
    }
  }

  /**
   * Unassign lead from current assignee
   * POST /lead/{lead.id}/unassign
   */
  static async unassignLead(leadId: number): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        `/lead/${leadId}/unassign`,
        {
          method: 'POST',
        }
      );

      console.log('Lead unassignment response:', response);

      if (!response.ok) {
        throw new ApiError('Failed to unassign lead', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to unassign lead'
      );
    }
  }

  /**
   * Send manual notification to assignee
   * POST /lead/{lead.id}/notify_assignee
   */
  static async notifyAssignee(leadId: number): Promise<{ message: string }> {
    try {
      const response = await fetchApi<{ message: string }>(
        `/lead/${leadId}/notify_assignee`,
        {
          method: 'POST',
        }
      );

      console.log('Notify assignee response:', response);

      if (!response.ok) {
        throw new ApiError('Failed to notify assignee', response.statusCode);
      }

      return response.result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to notify assignee'
      );
    }
  }

  /**
   * Create a new lead
   */
  static async createLead(leadData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    type: string;
  }): Promise<Lead> {
    try {
      const response = await fetchApi<{ data: Lead; message: string }>(
        '/lead',
        {
          method: 'POST',
          body: JSON.stringify(leadData),
        }
      );

      if (!response.ok) {
        throw new ApiError('Failed to create lead', response.statusCode);
      }

      return response.result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to create lead'
      );
    }
  }

  /**
   * Delete a lead
   */
  static async deleteLead(leadId: number): Promise<void> {
    try {
      const response = await fetchApi(`/lead/${leadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new ApiError('Failed to delete lead', response.statusCode);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to delete lead'
      );
    }
  }

  /**
   * Search leads using advanced filters
   */
  static async searchLeads(
    query: string,
    status?: string,
    otherFilters: Omit<AdvancedLeadFilters, 'filters'> = {}
  ): Promise<LeadsResponse> {
    const filters = LeadsService.buildFilters(query, status);
    return LeadsService.getLeadsAdvanced({
      ...otherFilters,
      filters,
      search_term: query, // Add search_term here too
    });
  }

  /**
   * Get leads statistics
   */
  static async getLeadsStats(): Promise<{
    total: number;
    pending: number;
    finished: number;
    unassigned: number;
  }> {
    try {
      const response = await fetchApi<{
        total: number;
        pending: number;
        finished: number;
        unassigned: number;
      }>('/lead/stats', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new ApiError(
          'Failed to fetch leads statistics',
          response.statusCode
        );
      }

      return response.result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch leads statistics'
      );
    }
  }

  /**
   * Get lead counts by status
   */
  static async getLeadCounts(): Promise<{
    pending: number;
    lead_assigned: number;
    lead_not_reached: number;
    lead_not_relevant: number;
    meeting_arranged: number;
    job_shadowing_hiring: number;
    total: number;
  }> {
    try {
      const response = await fetchApi<{
        pending: number;
        lead_assigned: number;
        lead_not_reached: number;
        lead_not_relevant: number;
        meeting_arranged: number;
        job_shadowing_hiring: number;
        total: number;
      }>('/lead/counts', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch lead counts', response.statusCode);
      }

      return response.result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch lead counts'
      );
    }
  }

  /**
   * Helper function to get status label from number
   */
  static getStatusLabel(statusNumber: LeadStatusNumber | string): string {
    // Handle both number and string inputs
    if (typeof statusNumber === 'string') {
      // If it's already a string status, format it nicely
      return statusNumber
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return LEAD_STATUSES[statusNumber as LeadStatusNumber]?.label || 'Unknown';
  }

  /**
   * Helper function to get status API name from number
   */
  static getStatusApiName(statusNumber: LeadStatusNumber): LeadStatusApiName {
    return LEAD_STATUSES[statusNumber].apiName;
  }

  /**
   * Helper function to get status number from label
   */
  static getStatusNumber(label: LeadStatusLabel): LeadStatusNumber {
    const entry = Object.entries(LEAD_STATUSES).find(
      ([_, value]) => value.label === label
    );
    return entry ? (Number(entry[0]) as LeadStatusNumber) : 1;
  }

  /**
   * Helper function to get status number from API name
   */
  static getStatusNumberFromApiName(
    apiName: LeadStatusApiName
  ): LeadStatusNumber {
    const entry = Object.entries(LEAD_STATUSES).find(
      ([_, value]) => value.apiName === apiName
    );
    return entry ? (Number(entry[0]) as LeadStatusNumber) : 1;
  }

  /**
   * Get all available status options
   */
  static getAllStatuses(): Array<{
    number: LeadStatusNumber;
    label: LeadStatusLabel;
    apiName: LeadStatusApiName;
  }> {
    return Object.entries(LEAD_STATUSES).map(([number, status]) => ({
      number: Number(number) as LeadStatusNumber,
      label: status.label,
      apiName: status.apiName,
    }));
  }
}
