// services/image-picker-service.ts
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { fetchApi, ApiError } from '@/utils/api';

export interface ImageUploadResponse {
  avatar_url: string;
  message: string;
}

export class ImagePickerService {
  /**
   * Request camera permissions with explanation
   */
  static async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'We need access to your camera to take profile photos. This helps personalize your account and makes it easier for colleagues to identify you.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  ImagePicker.requestCameraPermissionsAsync();
                }
              },
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Request media library permissions with explanation
   */
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'We need access to your photo library to let you choose profile photos from your existing pictures. This helps you set up your profile with your preferred photo.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  ImagePicker.requestMediaLibraryPermissionsAsync();
                }
              },
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Show image picker options
   */
  static async showImagePicker(): Promise<string | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Update Profile Photo',
        'Choose how you would like to update your profile photo',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await this.takePhoto();
              resolve(result);
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await this.pickImage();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<string | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  /**
   * Pick image from library
   */
  static async pickImage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestMediaLibraryPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      return null;
    }
  }

  /**
   * Upload image to backend
   */
  static async uploadProfileImage(imageUri: string): Promise<string | null> {
    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Get file extension from URI
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `profile_${Date.now()}.${fileExtension}`;

      // Add the image file to FormData
      formData.append('avatar', {
        uri: imageUri,
        type: `image/${fileExtension}`,
        name: fileName,
      } as any);

      // Add _method for Laravel
      formData.append('_method', 'PUT');

      const response = await fetchApi<ImageUploadResponse>('/profile/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new ApiError('Failed to upload image', response.statusCode);
      }

      return response.result.avatar_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to upload image'
      );
    }
  }

  /**
   * Complete flow: pick image and upload
   */
  static async updateProfilePhoto(): Promise<string | null> {
    try {
      // Show picker options
      const imageUri = await this.showImagePicker();
      if (!imageUri) {
        return null;
      }

      // Upload the selected image
      const avatarUrl = await this.uploadProfileImage(imageUri);
      return avatarUrl;
    } catch (error) {
      console.error('Error updating profile photo:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof ApiError
          ? error.message
          : 'Failed to update profile photo. Please try again.'
      );
      return null;
    }
  }
}
