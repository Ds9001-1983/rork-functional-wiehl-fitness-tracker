import { Alert, Platform } from 'react-native';

interface ConfirmOpts {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  opts: ConfirmOpts = {}
): void {
  const { confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', destructive } = opts;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      Promise.resolve(onConfirm()).catch(() => {});
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => { Promise.resolve(onConfirm()).catch(() => {}); } },
  ]);
}

export function infoAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
