import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface OfflineQueueItem {
  id: string;
  type: string; // 'POST', 'PUT', 'DELETE', etc.
  url: string;
  data: any;
  timestamp: Date;
  retries: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflinePersistenceService {
  private platformId = inject(PLATFORM_ID);
  
  private queue = signal<OfflineQueueItem[]>([]);
  private syncInProgress = signal(false);

  readonly queueLength = computed(() => this.queue().length);
  readonly isQueueEmpty = computed(() => this.queue().length === 0);
  readonly isSyncing = this.syncInProgress.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadQueue();
      this.setupSyncListener();
    }
  }

  private setupSyncListener(): void {
    // Listen for sync events from connectivity service
    window.addEventListener('freskoexpress:sync', () => {
      this.processQueue();
    });
  }

  /**
   * Add an item to the offline queue
   */
  addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const queueItem: OfflineQueueItem = {
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: item.type,
      url: item.url,
      data: item.data,
      timestamp: new Date(),
      retries: 0
    };

    this.queue.update(items => [...items, queueItem]);
    this.saveQueue();
  }

  /**
   * Process the offline queue when online
   */
  async processQueue(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.syncInProgress()) {
      return;
    }

    const queueItems = this.queue();
    if (queueItems.length === 0) {
      return;
    }

    this.syncInProgress.set(true);

    try {
      // Process each item in the queue
      for (const item of queueItems) {
        try {
          // Here you would make the actual HTTP request
          // For now, we'll simulate success and remove the item
          console.log('Processing queued item:', item);
          
          // Remove successfully processed item
          this.queue.update(items => items.filter(i => i.id !== item.id));
          
          // Wait a bit between requests to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Failed to process queued item:', item, error);
          
          // Increment retry count and keep in queue if under max retries
          if (item.retries < 3) {
            this.queue.update(items => 
              items.map(i => 
                i.id === item.id 
                  ? { ...i, retries: i.retries + 1 } 
                  : i
              )
            );
          } else {
            // Remove item after max retries
            this.queue.update(items => items.filter(i => i.id !== item.id));
            console.error('Max retries exceeded for item:', item);
          }
        }
      }
    } finally {
      this.syncInProgress.set(false);
      this.saveQueue();
    }
  }

  /**
   * Get all queued items
   */
  getQueue(): OfflineQueueItem[] {
    return this.queue();
  }

  /**
   * Clear the queue (for testing or emergency situations)
   */
  clearQueue(): void {
    this.queue.set([]);
    this.saveQueue();
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const queueJson = JSON.stringify(this.queue(), (key, value) => 
        key === 'timestamp' ? value instanceof Date ? value.toISOString() : value : value
      );
      localStorage.setItem('freskoexpress-offline-queue', queueJson);
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const queueJson = localStorage.getItem('freskoexpress-offline-queue');
      if (queueJson) {
        const parsed = JSON.parse(queueJson);
        // Convert timestamp strings back to Date objects
        const queueWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        this.queue.set(queueWithDates);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue.set([]); // Reset queue on error
    }
  }

  /**
   * Clean up event listeners
   */
  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('freskoexpress:sync', () => this.processQueue());
    }
  }
}