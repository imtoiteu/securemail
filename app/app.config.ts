import type {ExpoConfig} from 'expo/config';

const config: ExpoConfig = {
  name: 'Secure Mail',
  slug: 'secure-mail',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'securemail',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.imtoiteu.securemail',
    versionCode: 1,
    // No cloud or adb backup: the encrypted key store must not leave the device.
    allowBackup: false,
    intentFilters: [
      {
        action: 'android.intent.action.SEND',
        category: ['android.intent.category.DEFAULT'],
        data: [{mimeType: 'text/plain'}]
      },
      {
        action: 'android.intent.action.SEND',
        category: ['android.intent.category.DEFAULT'],
        data: [{mimeType: 'application/pgp-encrypted'}, {mimeType: 'application/octet-stream'}]
      }
    ]
  },
  plugins: [
    ['expo-build-properties', {android: {minSdkVersion: 26}}],
    'expo-secure-store',
    'expo-local-authentication'
  ],
  extra: {
    // Phase 1 has no Gmail integration; the core host denies network entirely.
    gmailEnabled: false
  }
};

export default config;
