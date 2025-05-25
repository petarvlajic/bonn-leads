import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  API_URL: string;
}

const ENV: Record<Environment, EnvironmentConfig> = {
  development: {
    API_URL: 'https://ukb-lead-zentrale-main-cfppsh.laravel.cloud/api/v1',
  },
  staging: {
    API_URL: 'https://cb-api.medialabs-co.com/api/v1',
  },
  production: {
    API_URL: 'https://api.getpayper.app/api/v1',
  },
};

// Get the current environment from Expo Constants
const getEnvironment = (): Environment => {
  // You can set this in app.json or app.config.js as extra.currentEnv
  const currentEnv = Constants.expoConfig?.extra?.currentEnv || 'production';
  return currentEnv as Environment;
};

// Export the configuration for the current environment
export const getEnvVars = (): EnvironmentConfig => {
  const env = getEnvironment();
  return ENV[env];
};

// Use this in your app to access environment variables
export default getEnvVars();
