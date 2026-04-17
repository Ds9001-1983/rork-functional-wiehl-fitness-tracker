import { Linking, Platform } from 'react-native';

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        window.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
