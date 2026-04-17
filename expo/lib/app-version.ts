import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getAppVersion(): string {
  const cfg: any = Constants.expoConfig ?? {};
  const version: string = cfg.version ?? '?.?.?';
  const build =
    Platform.OS === 'ios'
      ? cfg.ios?.buildNumber
      : Platform.OS === 'android'
        ? cfg.android?.versionCode
        : undefined;
  return build ? `${version} (${build})` : version;
}
