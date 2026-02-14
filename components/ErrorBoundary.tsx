import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface ErrorBoundaryState { hasError: boolean; error?: Error | null }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary">
          <Text style={styles.title}>Etwas ist schiefgelaufen</Text>
          <Text style={styles.message}>Bitte versuche es erneut oder gehe zur Startseite.</Text>
          {this.state.error?.message ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error?.message}</Text>
            </View>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.retryButtonText}>Nochmal versuchen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                } else {
                  this.setState({ hasError: false, error: null });
                }
              }}
            >
              <Text style={styles.homeButtonText}>Zur Startseite</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderColor: Colors.border,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    maxWidth: 520,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  homeButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  homeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
