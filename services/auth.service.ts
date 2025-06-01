// services/auth-service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi, ApiError } from '@/utils/api';
import { User } from '@/types';

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  rpassword: string;
}

export interface LoginApiResponse {
  token: string;
  user?: User; // User data might be included or we might need to fetch it separately
}

export interface RegisterApiResponse {
  token: string;
  user?: User; // User data might be included or we might need to fetch it separately
}

export interface ProfileApiResponse {
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

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface LoginResponse extends AuthResponse {}
export interface RegisterResponse extends AuthResponse {}

export class AuthService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly USER_KEY = 'auth_user';

  /**
   * Get user profile data
   */
  static async getUserProfile(): Promise<User> {
    try {
      // Get the current token to ensure it's available
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      console.log(
        'Fetching profile with token:',
        token ? 'Token exists' : 'No token found'
      );

      if (!token) {
        throw new ApiError('No authentication token found', 401);
      }

      const response = await fetchApi<ProfileApiResponse>('/profile/me', {
        method: 'GET',
      });

      console.log('Profile API response:', response);

      if (!response.ok) {
        throw new ApiError('Failed to fetch user profile', response.statusCode);
      }

      const profileData = response.result;

      // Map the API response to our User interface
      const user: User = {
        id: profileData.user?.id.toString(),
        profileId: profileData?.id.toString(), // Store the profile ID separately
        email: profileData.user.email,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        phoneNumber: profileData.phone || '',
        role: mapRole(profileData.user.role),
        profileImage: profileData.avatar_url || undefined,
      };

      return user;
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch user profile'
      );
    }
  }

  /**
   * Update user profile - now supports both regular data and avatar upload
   */
  static async updateProfile(
    profileId: string | undefined,
    profileData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      avatar?: string; // Image URI for avatar upload
    }
  ): Promise<User> {
    try {
      // Determine the endpoint - use profileId if available, otherwise use a generic endpoint
      const endpoint = profileId ? `/profile/${profileId}` : '/profile';

      let requestBody: FormData | string;
      let headers: Record<string, string> = {};

      // If avatar is included, use FormData
      if (profileData.avatar) {
        const formData = new FormData();

        // Add profile data
        if (profileData.first_name !== undefined) {
          formData.append('first_name', profileData.first_name);
        }
        if (profileData.last_name !== undefined) {
          formData.append('last_name', profileData.last_name);
        }
        if (profileData.phone !== undefined) {
          formData.append('phone', profileData.phone);
        }

        // Add avatar file
        const fileExtension = profileData.avatar.split('.').pop() || 'jpg';
        const fileName = `profile_${Date.now()}.${fileExtension}`;

        formData.append('avatar', {
          uri: profileData.avatar,
          type: `image/${fileExtension}`,
          name: fileName,
        } as any);

        // Add _method for Laravel
        formData.append('_method', 'PUT');

        requestBody = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Regular JSON update without avatar
        const updateData = {
          ...profileData,
          _method: 'PUT', // Required by your API
        };
        requestBody = JSON.stringify(updateData);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetchApi<ProfileApiResponse>(endpoint, {
        method: 'POST', // Using POST with _method: PUT as per your API requirement
        body: requestBody,
        headers,
      });

      console.log('Profile update API response:', response.result);

      if (!response.ok) {
        throw new ApiError('Failed to update profile', response.statusCode);
      }

      const updatedProfileData = response.result;

      // Map the updated API response to our User interface
      const updatedUser: User = {
        id: updatedProfileData.user?.id.toString(),
        profileId: updatedProfileData?.id.toString(), // Store the profile ID separately
        email: updatedProfileData.user?.email,
        firstName: updatedProfileData?.first_name || '',
        lastName: updatedProfileData?.last_name || '',
        phoneNumber: updatedProfileData?.phone || '',
        role: mapRole(updatedProfileData?.user?.role),
        profileImage: updatedProfileData?.avatar_url || undefined,
      };

      // Update stored user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message);
    }
  }

  /**
   * Update profile photo only (using the same profile endpoint)
   */
  static async updateProfilePhoto(imageUri: string): Promise<User> {
    try {
      // Get current user to get profileId
      const currentUser = await this.getUser();

      // Use the main updateProfile method with only avatar
      return await this.updateProfile(currentUser?.profileId, {
        avatar: imageUri,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error
          ? error.message
          : 'Failed to upload profile photo'
      );
    }
  }

  /**
   * Login user with email and password
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetchApi<LoginApiResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new ApiError('Login failed', response.statusCode);
      }

      const { token } = response.result;

      if (!token) {
        throw new ApiError('No token received from server', 500);
      }

      console.log('Login successful, received token:', token);

      // Store token first so we can make authenticated requests
      await AsyncStorage.setItem(this.TOKEN_KEY, token);

      // Add a small delay to ensure token is properly stored
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to fetch user profile data
      let user: User;
      try {
        console.log('Attempting to fetch user profile...');
        user = await this.getUserProfile();
        console.log('Profile fetched successfully:', user);
      } catch (profileError) {
        // If profile fetch fails, create a basic user object
        console.warn('Failed to fetch user profile:', profileError);
        user = {
          id: '', // Will be extracted from token or set by backend
          email: credentials.email,
          firstName: '',
          lastName: '',
          phoneNumber: '',
          role: 'User',
        };
      }

      // Store user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

      return {
        user,
        token,
        message: 'Login successful',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Login failed'
      );
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Validate passwords match
      if (userData.password !== userData.rpassword) {
        throw new ApiError('Passwords do not match', 400);
      }

      const response = await fetchApi<RegisterApiResponse>('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new ApiError('Registration failed', response.statusCode);
      }

      const { token } = response.result;

      if (!token) {
        throw new ApiError('No token received from server', 500);
      }

      // Store token first so we can make authenticated requests
      await AsyncStorage.setItem(this.TOKEN_KEY, token);

      // Try to fetch user profile data
      let user: User;
      try {
        user = await this.getUserProfile();
      } catch (profileError) {
        // If profile fetch fails, create a basic user object
        console.warn('Failed to fetch user profile:', profileError);
        user = {
          id: '', // Will be extracted from token or set by backend
          email: userData.email,
          firstName: '',
          lastName: '',
          phoneNumber: '',
          role: 'User',
        };
      }

      // Store user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

      return {
        user,
        token,
        message: 'Registration successful',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Registration failed'
      );
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await fetchApi('/logout', {
        method: 'GET',
      });
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      await this.clearAuthData();
    }
  }

  /**
   * Get stored auth token
   */
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Clear all authentication data from storage
   */
  static async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.TOKEN_KEY),
        AsyncStorage.removeItem(this.USER_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Refresh auth state from storage
   */
  static async restoreAuthState(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
  }> {
    try {
      const [token, user] = await Promise.all([
        this.getToken(),
        this.getUser(),
      ]);

      return {
        isAuthenticated: !!token,
        user,
        token,
      };
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null,
      };
    }
  }
}

/**
 * Map API role to our role type
 */
export const mapRole = (apiRole: string): 'Admin' | 'Agent' | 'User' => {
  switch (apiRole?.toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'agent':
      return 'Agent';
    case 'regular':
    case 'user':
    default:
      return 'User';
  }
};
