// app/(app)/profile/index.tsx
import React, { useState } from 'react';
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

export default function ProfileScreen() {
  const { authState, updateUserProfile, logout } = useAuth();
  const user = authState.user;

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [role, setRole] = useState(user?.role || 'User');
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveChanges = async () => {
    if (!firstName || !lastName || !email || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    await updateUserProfile({
      firstName,
      lastName,
      email,
      phoneNumber,
      role,
    });

    if (authState.error) {
      Alert.alert('Error', authState.error);
    } else {
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
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
        onPress: () => logout(),
        style: 'destructive',
      },
    ]);
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
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageInitials}>
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={isEditing}
                />
              </View>
              <View style={styles.nameField}>
                <Input
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  editable={isEditing}
                />
              </View>
            </View>

            <Input
              label="Role"
              value={role}
              onChangeText={setRole}
              editable={false}
              rightIcon={
                isEditing ? (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={colors.textSecondary}
                  />
                ) : undefined
              }
            />

            <Input
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={isEditing}
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditing}
            />

            <View style={styles.actions}>
              {isEditing ? (
                <Button
                  title="Save Changes"
                  onPress={handleSaveChanges}
                  isLoading={authState.loading}
                  style={styles.saveButton}
                />
              ) : (
                <Button
                  title="Edit Profile"
                  onPress={() => setIsEditing(true)}
                  variant="outline"
                  style={styles.editButton}
                />
              )}

              <Button
                title="Logout"
                onPress={handleLogout}
                variant={isEditing ? 'link' : 'outline'}
                style={styles.logoutButton}
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
    fontWeight: fontWeights.bold,
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
    fontWeight: fontWeights.bold,
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
  editButton: {
    marginBottom: spacing.md,
  },
  logoutButton: {},
});
