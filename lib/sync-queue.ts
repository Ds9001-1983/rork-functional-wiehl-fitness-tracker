import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';

const QUEUE_KEY = 'syncQueue';
const LAST_SYNC_KEY = 'lastSyncTime';

export interface SyncQueueItem {
  id: string;
  route: string;
  input: any;
  createdAt: string;
  retries: number;
  maxRetries: number;
}

export interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastError: string | null;
}

type StatusListener = (status: SyncStatus) => void;

class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<StatusListener> = new Set();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const [stored, lastSync] = await Promise.all([
        AsyncStorage.getItem(QUEUE_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);
      if (stored) this.queue = JSON.parse(stored);
      if (lastSync) this.lastSyncTime = lastSync;
      this.initialized = true;
    } catch {
      this.queue = [];
      this.initialized = true;
    }
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  getStatus(): SyncStatus {
    return {
      pendingCount: this.queue.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  async enqueue(route: string, input: any, maxRetries = 5): Promise<void> {
    await this.init();

    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      route,
      input,
      createdAt: new Date().toISOString(),
      retries: 0,
      maxRetries,
    };

    this.queue.push(item);
    await this.persist();
    this.notify();
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    await this.init();

    if (this.isSyncing || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let processed = 0;
    let failed = 0;
    const remaining: SyncQueueItem[] = [];

    for (const item of this.queue) {
      try {
        await this.executeRoute(item.route, item.input);
        processed++;
      } catch (error: any) {
        item.retries++;

        if (item.retries >= item.maxRetries) {
          // Drop permanently failed items
          failed++;
          console.warn(`[SyncQueue] Dropped after ${item.maxRetries} retries: ${item.route}`, error?.message);
        } else if (this.isNetworkError(error)) {
          // Network error - stop processing, keep remaining items
          remaining.push(item, ...this.queue.slice(this.queue.indexOf(item) + 1).filter(i => !remaining.includes(i)));
          this.lastError = 'Keine Verbindung';
          break;
        } else {
          // Server error but reachable - keep for retry
          remaining.push(item);
          failed++;
        }
      }
    }

    this.queue = remaining;
    this.isSyncing = false;

    if (processed > 0) {
      this.lastSyncTime = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime);
    }

    await this.persist();
    this.notify();

    return { processed, failed };
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
    this.notify();
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Silent fail
    }
  }

  private isNetworkError(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('fetch') || msg.includes('network') || msg.includes('Network') || msg.includes('ECONNREFUSED');
  }

  private async executeRoute(route: string, input: any): Promise<any> {
    const parts = route.split('.');
    if (parts.length !== 2) throw new Error(`Invalid route: ${route}`);

    const [router, procedure] = parts;
    const routerObj = (trpcClient as any)[router];
    if (!routerObj) throw new Error(`Unknown router: ${router}`);

    const procedureObj = routerObj[procedure];
    if (!procedureObj) throw new Error(`Unknown procedure: ${procedure}`);

    // All sync queue items are mutations
    return procedureObj.mutate(input);
  }
}

// Singleton
export const syncQueue = new SyncQueue();
