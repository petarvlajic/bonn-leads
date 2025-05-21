// types/index.ts
// Type definitions for the application

// Auth types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

export interface Lead {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: LeadStatus;
  assignedTo: string | null; // userId or null if unassigned
  assignedToName?: string;
}

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
