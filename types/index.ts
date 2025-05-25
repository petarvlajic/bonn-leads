// types/index.ts
// Type definitions for the application

// Auth types
export interface User {
  id: string;
  profileId?: string; // Add profile ID for API calls
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'Admin' | 'Agent' | 'User';
  profileImage?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Lead types
export type LeadStatus = 'Pending' | 'Finished';

// UI Component types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'link';
  icon?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: object;
}

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  rightIcon?: React.ReactNode;
}

export interface CardProps {
  children: React.ReactNode;
  style?: object;
}

export interface LeadCardProps {
  lead: Lead;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onStatusChange?: (status: LeadStatus) => void;
  onAssigneeChange?: (userId: string) => void;
  onNotify?: () => void;
  onCall?: () => void;
}

export interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'small' | 'medium';
}

export interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
}

// Updated Lead interface to match API response
export interface Lead {
  id: number;
  type: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  assigned_to: number | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  fb_lead_id: string | null;
  form_id: number;
  avatar_url: string | null;
  assignee: {
    id: number;
    name: string;
  } | null;
}

export interface LeadsApiResponse {
  current_page: number;
  data: Lead[];
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

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface LeadFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  assigned_to?: number | 'unassigned' | 'all';
  type?: string;
}
