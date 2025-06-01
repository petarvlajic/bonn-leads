import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  shadows,
  borderRadius,
} from '../../../styles/theme';
import Card from '../../../components/ui/card';
import Input from '../../../components/ui/input';
import Button from '../../../components/ui/button';
import Header from '../../../components/ui/header';
import { useAuth } from '../../../providers/auth-provider';
import { AuthService } from '../../../services/auth.service';
import { ImagePickerService } from '@/services/image-picker.service';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    authState,
    updateUserProfile,
    logout,
    clearError,
    refreshUserProfile,
  } = useAuth();

  const user = authState.user;
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [role, setRole] = useState<'Admin' | 'Agent' | 'User'>(
    user?.role || 'User'
  );
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setRole(user.role || 'User');
    }
  }, [user]);

  // Clear errors when user starts editing
  useEffect(() => {
    if (authState.error && isEditing) {
      clearError();
    }
  }, [firstName, lastName, phoneNumber]);

  // Show success/error alerts
  useEffect(() => {
    if (
      authState.error &&
      !authState.loading &&
      !isSubmitting &&
      !isUploadingPhoto
    ) {
      Alert.alert('Update Failed', authState.error);
    }
  }, [authState.error, authState.loading, isSubmitting, isUploadingPhoto]);

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Last name is required');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare update data
      const updateData: {
        first_name: string;
        last_name: string;
        phone: string;
        avatar?: string;
      } = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phoneNumber.trim(),
      };

      // Add avatar if user selected a new one
      if (selectedAvatarUri) {
        updateData.avatar = selectedAvatarUri;
      }

      // Use the updated AuthService.updateProfile method
      await AuthService.updateProfile(user?.profileId, updateData);

      // Refresh user profile to get the latest data
      await refreshUserProfile();

      // If no error occurred, the update was successful
      setIsEditing(false);
      setSelectedAvatarUri(null); // Clear selected avatar

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Redirect to dashboard after user dismisses the alert
            router.push('/(app)/home');
          },
        },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Failed', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
    }
    setSelectedAvatarUri(null); // Clear selected avatar
    setIsEditing(false);
    clearError();
  };

  const handlePhotoSelect = async () => {
    try {
      setIsUploadingPhoto(true);

      // Show image picker and get selected image
      const imageUri = await ImagePickerService.showImagePicker();
      if (!imageUri) {
        return; // User cancelled
      }

      // Store the selected image URI for later upload
      setSelectedAvatarUri(imageUri);
    } catch (error) {
      console.error('Photo selection error:', error);
      Alert.alert(
        'Selection Failed',
        'Failed to select photo. Please try again.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleRoleChange = (text: string) => {
    // Role is read-only from the API
    console.log('Role cannot be changed');
  };

  const getInitials = () => {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  };

  // Get the image to display (selected new image or current profile image)
  const getDisplayImage = () => {
    if (selectedAvatarUri) {
      return selectedAvatarUri;
    }
    return user?.profileImage;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Profile" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Profile Information</Text>

          <View style={styles.profileImageContainer}>
            {getDisplayImage() ? (
              <Image
                source={{ uri: getDisplayImage() }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageInitials}>{getInitials()}</Text>
              </View>
            )}

            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.cameraButton,
                  isUploadingPhoto && styles.cameraButtonDisabled,
                ]}
                onPress={handlePhotoSelect}
                disabled={isUploadingPhoto || authState.loading}
              >
                {isUploadingPhoto ? (
                  <View style={styles.uploadingIndicator}>
                    <Ionicons name="hourglass" size={16} color={colors.text} />
                  </View>
                ) : (
                  <Ionicons name="camera" size={20} color={colors.text} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {isUploadingPhoto && (
            <Text style={styles.uploadingText}>Selecting photo...</Text>
          )}

          {selectedAvatarUri && isEditing && (
            <Text style={styles.selectedPhotoText}>
              New photo selected! Save changes to update.
            </Text>
          )}

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={isEditing}
                  placeholder="Enter first name"
                />
              </View>
              <View style={styles.nameField}>
                <Input
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  editable={isEditing}
                  placeholder="Enter last name"
                />
              </View>
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={() => {}} // Email is read-only
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
              rightIcon={
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={colors.textSecondary}
                />
              }
            />

            <Input
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={isEditing}
              placeholder="Enter phone number"
            />

            <Input
              label="Role"
              value={role}
              onChangeText={handleRoleChange}
              editable={false}
              rightIcon={
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={colors.textSecondary}
                />
              }
            />

            <View style={styles.actions}>
              {isEditing ? (
                <>
                  <Button
                    title="Save Changes"
                    onPress={handleSaveChanges}
                    isLoading={authState.loading || isSubmitting}
                    style={styles.saveButton}
                    disabled={
                      authState.loading || isSubmitting || isUploadingPhoto
                    }
                  />
                  <Button
                    title="Cancel"
                    onPress={handleCancelEdit}
                    variant="outline"
                    style={styles.cancelButton}
                    disabled={
                      authState.loading || isSubmitting || isUploadingPhoto
                    }
                  />
                </>
              ) : (
                <Button
                  title="Edit Profile"
                  onPress={() => setIsEditing(true)}
                  variant="outline"
                  style={styles.editButton}
                  disabled={isUploadingPhoto}
                />
              )}
              <Button
                title="Logout"
                onPress={handleLogout}
                variant={isEditing ? 'link' : 'outline'}
                style={styles.logoutButton}
                disabled={authState.loading || isSubmitting || isUploadingPhoto}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.card,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageInitials: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold as any,
    color: colors.card,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraButtonDisabled: {
    opacity: 0.6,
  },
  uploadingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  selectedPhotoText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  form: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameField: {
    width: '48%',
  },
  actions: {
    marginTop: spacing.lg,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginBottom: spacing.md,
  },
  editButton: {
    marginBottom: spacing.md,
  },
  logoutButton: {},
});
