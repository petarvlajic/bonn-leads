// services/leads-service.ts
import { fetchApi, ApiError } from '@/utils/api';
import { Lead, LeadsApiResponse, LeadsResponse, LeadFilters } from '@/types';

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

export interface Assignee {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
}

// Lead status options with labels
export const LEAD_STATUSES = {
  1: 'Pending',
  2: 'Finished',
  3: 'Contacted',
  4: 'Waiting for Recall',
  5: 'Interview Arranged',
  6: 'Not Interested',
} as const;

export type LeadStatusNumber = keyof typeof LEAD_STATUSES;
export type LeadStatusLabel = (typeof LEAD_STATUSES)[LeadStatusNumber];

export class LeadsService {
  /**
   * Fetch leads with optional filters and pagination
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
   * Update lead status (using status number)
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

      const profiles = response.result.data;

      // Map profiles to assignees
      const assignees: Assignee[] = profiles.map((profile) => ({
        id: profile.user.id,
        name:
          profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : profile.user.email, // Fallback to email if no name
        email: profile.user.email,
        avatar_url: profile.avatar_url,
      }));

      return assignees;
    } catch (error) {
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
   * Send manual notification to assignee
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
   * Search leads
   */
  static async searchLeads(
    query: string,
    filters: Omit<LeadFilters, 'search'> = {}
  ): Promise<LeadsResponse> {
    return LeadsService.getLeads({ ...filters, search: query });
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
   * Helper function to get status label from number
   */
  static getStatusLabel(statusNumber: LeadStatusNumber): LeadStatusLabel {
    return LEAD_STATUSES[statusNumber];
  }

  /**
   * Helper function to get status number from label
   */
  static getStatusNumber(label: LeadStatusLabel): LeadStatusNumber {
    const entry = Object.entries(LEAD_STATUSES).find(
      ([_, value]) => value === label
    );
    return entry ? (Number(entry[0]) as LeadStatusNumber) : 1;
  }

  /**
   * Get all available status options
   */
  static getAllStatuses(): Array<{
    number: LeadStatusNumber;
    label: LeadStatusLabel;
  }> {
    return Object.entries(LEAD_STATUSES).map(([number, label]) => ({
      number: Number(number) as LeadStatusNumber,
      label: label as LeadStatusLabel,
    }));
  }
}
