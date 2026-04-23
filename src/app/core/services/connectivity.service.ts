import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ConnectivityState {
  online: boolean;
  lastChange: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private platformId = inject(PLATFORM_ID);
  
  private connectivityState = signal<ConnectivityState>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChange: new Date()
  });

  readonly online = computed(() => this.connectivityState().online);
  readonly offline = computed(() => !this.connectivityState().online);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeListeners();
    }
  }

  private initializeListeners(): void {
    // Set initial state
    this.connectivityState.update(state => ({
      ...state,
      online: navigator.onLine,
      lastChange: new Date()
    }));

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline(): void {
    this.connectivityState.update(state => ({
      ...state,
      online: true,
      lastChange: new Date()
    }));
    
    // Trigger sync when coming back online
    this.triggerSync();
  }

  private handleOffline(): void {
    this.connectivityState.update(state => ({
      ...state,
      online: false,
      lastChange: new Date()
    }));
  }

  private triggerSync(): void {
    // Dispatch a custom event that other services can listen for
    // to synchronize data when coming back online
    window.dispatchEvent(new CustomEvent('freskoexpress:sync'));
  }

  /**
   * Returns true if the browser is currently online
   */
  isOnline(): boolean {
    return this.connectivityState().online;
  }

  /**
   * Returns true if the browser is currently offline
   */
  isOffline(): boolean {
    return !this.connectivityState().online;
  }

  /**
   * Returns the timestamp of the last connectivity change
   */
  getLastChange(): Date {
    return this.connectivityState().lastChange;
  }

  /**
   * Clean up event listeners
   */
  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('online', () => this.handleOnline());
      window.removeEventListener('offline', () => this.handleOffline());
    }
  }
}