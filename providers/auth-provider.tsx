// providers/auth-provider.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { router, Unmatched } from 'expo-router';
import { AuthState, User } from '../types';
import {
  AuthService,
  LoginRequest,
  RegisterRequest,
} from '@/services/auth.service';
import { ApiError } from '@/utils/api';

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

// Create context
const AuthContext = createContext<{
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    rpassword: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  refreshUserProfile: () => Promise<User>;
  clearError: () => void;
}>({
  authState: defaultAuthState,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  refreshUserProfile: async () => ({} as User),
  clearError: () => {},
});

export function ruseAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true }));

        const { isAuthenticated, user } = await AuthService.restoreAuthState();

        setAuthState({
          isAuthenticated,
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'Failed to restore authentication state',
        });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const credentials: LoginRequest = { email, password };
      const response = await AuthService.login(credentials);

      setAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null,
      });

      // Navigate to main app
      router.replace('../(app)/home');
    } catch (error: any) {
      let errorMessage = 'Login failed';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('Login error:', error);

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      // Don't throw the error, let the component handle it via state
    }
  };

  // Register function
  const register = async (
    email: string,
    password: string,
    rpassword: string
  ) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const userData: RegisterRequest = { email, password, rpassword };
      const response = await AuthService.register(userData);

      setAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null,
      });

      // Navigate to main app
      router.replace('../(app)/home');
    } catch (error: any) {
      console.log(error);
      let errorMessage = 'Registration failed';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('Registration error:', error);

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      // Don't throw the error, let the component handle it via state
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));

      await AuthService.logout();

      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });

      // Navigate to welcome screen
      router.replace('../');
    } catch (error: any) {
      console.error('Logout error:', error);

      // Even if logout fails, clear local state
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });

      router.replace('../');
    }
  };

  // Update user profile
  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      if (!authState.user?.id) {
        throw new Error('User ID not found');
      }

      // Map the user data to API format
      const profileData: {
        first_name?: string;
        last_name?: string;
        phone?: string;
      } = {};

      if (userData.firstName !== undefined) {
        profileData.first_name = userData.firstName;
      }
      if (userData.lastName !== undefined) {
        profileData.last_name = userData.lastName;
      }
      if (userData.phoneNumber !== undefined) {
        profileData.phone = userData.phoneNumber;
      }

      // Get the profile ID from the current user (optional)
      const profileId = authState.user.profileId;

      const updatedUser = await AuthService.updateProfile('', profileData);

      // After successful update, refetch the profile to get the latest data from server
      try {
        const freshUserData = await AuthService.getUserProfile();

        setAuthState({
          isAuthenticated: true,
          user: freshUserData,
          loading: false,
          error: null,
        });
      } catch (fetchError) {
        // If refetch fails, use the updated data we got from the update call
        console.warn('Failed to refetch profile after update:', fetchError);
        setAuthState({
          isAuthenticated: true,
          user: updatedUser,
          loading: false,
          error: null,
        });
      }
    } catch (error: any) {
      let errorMessage = error.message;

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('Profile update error:', error);

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  // Clear error function
  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  // Refresh user profile from server
  const refreshUserProfile = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const freshUserData = await AuthService.getUserProfile();

      setAuthState({
        isAuthenticated: true,
        user: freshUserData,
        loading: false,
        error: null,
      });

      return freshUserData;
    } catch (error: any) {
      let errorMessage = 'Failed to refresh profile';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('Profile refresh error:', error);

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        register,
        logout,
        updateUserProfile,
        refreshUserProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
