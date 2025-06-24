import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { fetchApi, ApiError } from '@/utils/api';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  /**
   * Register for push notifications and get Expo push token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    console.debug('Registering for push notifications...');
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.debug(
        'Existing notification permissions status:',
        existingStatus
      );

      let finalStatus = existingStatus;

      // Ask for permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.debug('Updated notification permissions status:', finalStatus);
      }

      // If permission not granted, return null
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get the Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'bc10a2e3-a404-4a22-9b52-4bfe1619a96c', // Replace with your actual project ID
      });
      console.debug('Expo push token received:', token.data);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        console.debug('Configuring Android notification channel...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send Expo push token to the backend
   */
  static async sendTokenToBackend(token: string): Promise<boolean> {
    console.debug('Sending Expo push token to backend:', token);
    try {
      const response = await fetchApi('/profile/add_expo_token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      console.debug('Backend response status:', response.statusCode);

      if (!response.ok) {
        throw new ApiError(
          'Failed to send token to backend',
          response.statusCode
        );
      }

      console.log('Successfully sent Expo token to backend');
      return true;
    } catch (error) {
      console.error('Error sending token to backend:', error);
      return false;
    }
  }

  /**
   * Initialize notifications - register and send token to backend
   */
  static async initializeNotifications(): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.debug('Initializing notifications...');
    try {
      // Register for push notifications
      const token = await this.registerForPushNotifications();

      if (!token) {
        console.warn('No Expo push token received');
        return { success: false, error: 'No Expo push token received' };
      }

      console.debug('Expo push token to be sent to backend:', token);

      // Send token to backend
      const success = await this.sendTokenToBackend(token);

      console.debug('Notification initialization success:', success);
      return {
        success,
        error: success ? undefined : 'Failed to send token to backend',
      };
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    console.debug('Adding notification received listener...');
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Handle notification response (when user taps notification)
   */
  static addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    console.debug('Adding notification response received listener...');
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Remove notification listeners
   */
  static removeNotificationSubscription(
    subscription: Notifications.Subscription
  ) {
    console.debug('Removing notification subscription...');
    subscription.remove();
  }
}
