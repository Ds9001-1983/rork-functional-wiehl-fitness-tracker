// Sentry Error Monitoring Configuration
// Uses @sentry/react-native on native, custom fetch on web

import { Platform } from 'react-native';

let SentryNative: typeof import('@sentry/react-native') | null = null;

// Initialize native Sentry SDK (called once at app startup)
async function initNativeSentry(dsn: string) {
  if (Platform.OS === 'web') return;
  try {
    SentryNative = await import('@sentry/react-native');
    SentryNative.init({
      dsn,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch {
    // @sentry/react-native not available
  }
}

// --- Web fallback (original implementation) ---

const SENTRY_DSN = typeof process !== 'undefined' ? process.env.SENTRY_DSN : undefined;

interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

const breadcrumbs: SentryBreadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

function addBreadcrumb(crumb: SentryBreadcrumb) {
  if (SentryNative) {
    SentryNative.addBreadcrumb({
      category: crumb.category,
      message: crumb.message,
      level: crumb.level as any,
      data: crumb.data,
    });
    return;
  }
  breadcrumbs.push(crumb);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

function captureException(error: Error, context?: Record<string, any>) {
  if (SentryNative) {
    SentryNative.captureException(error, { extra: context });
    return;
  }

  const payload = {
    exception: {
      type: error.name,
      value: error.message,
      stacktrace: error.stack,
    },
    breadcrumbs: [...breadcrumbs],
    contexts: context,
    timestamp: new Date().toISOString(),
    platform: 'javascript',
  };

  console.error('[Sentry]', error.message, context);

  if (SENTRY_DSN) {
    try {
      const dsn = parseDSN(SENTRY_DSN);
      if (dsn) {
        const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=fitness-app/1.0`,
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    } catch {}
  }
}

function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (SentryNative) {
    SentryNative.captureMessage(message, level as any);
    return;
  }

  console.log(`[Sentry][${level}]`, message);

  if (SENTRY_DSN) {
    try {
      const dsn = parseDSN(SENTRY_DSN);
      if (dsn) {
        const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=fitness-app/1.0`,
          },
          body: JSON.stringify({
            message,
            level,
            breadcrumbs: [...breadcrumbs],
            timestamp: new Date().toISOString(),
            platform: 'javascript',
          }),
        }).catch(() => {});
      }
    } catch {}
  }
}

interface ParsedDSN {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDSN(dsn: string): ParsedDSN | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    return {
      protocol: url.protocol.replace(':', ''),
      publicKey: url.username,
      host: url.host,
      projectId,
    };
  } catch {
    return null;
  }
}

// Navigation breadcrumb helper
function trackNavigation(routeName: string) {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${routeName}`,
    level: 'info',
  });
}

// API breadcrumb helper
function trackApiCall(procedure: string, success: boolean) {
  addBreadcrumb({
    category: 'api',
    message: `${procedure}: ${success ? 'success' : 'failed'}`,
    level: success ? 'info' : 'error',
  });
}

// Initialize on import
if (SENTRY_DSN && Platform.OS !== 'web') {
  initNativeSentry(SENTRY_DSN);
}

export const Sentry = {
  captureException,
  captureMessage,
  addBreadcrumb,
  trackNavigation,
  trackApiCall,
  isEnabled: () => !!SENTRY_DSN || !!SentryNative,
};
