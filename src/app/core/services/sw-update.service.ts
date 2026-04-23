import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';

export interface UpdateState {
  stable: string | null;
  available: string | null;
  pending: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SwUpdateService {
  private platformId = inject(PLATFORM_ID);
  private swUpdate = inject(SwUpdate);

  private updateState = signal<UpdateState>({
    stable: null,
    available: null,
    pending: null
  });

  readonly stable = computed(() => this.updateState().stable);
  readonly available = computed(() => this.updateState().available);
  readonly pending = computed(() => this.updateState().pending);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeUpdateListeners();
    }
  }

  private initializeUpdateListeners(): void {
    // Listen for version updates
    this.swUpdate.versionUpdates.subscribe(evt => {
      // Handle different event types using any to avoid typing issues
      const event: any = evt;
      if (event.type === 'VERSION_READY') {
        this.updateState.update(state => ({
          ...state,
          available: event.version?.hash || String(event.version),
          pending: event.version?.hash || String(event.version)
        }));
      } else if (event.type === 'VERSION_INSTALLED') {
        this.updateState.update(state => ({
          ...state,
          stable: event.version?.hash || String(event.version)
        }));
      }
    });
  }

  /**
   * Check for available updates
   */
  checkForUpdate(): Promise<void> {
    if (isPlatformBrowser(this.platformId) && this.swUpdate.isEnabled) {
      return this.swUpdate.checkForUpdate().then(() => {
        // Return void promise
      }) as Promise<void>;
    }
    return Promise.resolve();
  }

  /**
   * Activate available update
   */
  activateUpdate(): Promise<void> {
    if (isPlatformBrowser(this.platformId) && this.swUpdate.isEnabled) {
      return this.swUpdate.activateUpdate().then(() => {
        // Reload the page to apply the update
        window.location.reload();
      }) as Promise<void>;
    }
    return Promise.resolve();
  }

  /**
   * Returns true if an update is available
   */
  isUpdateAvailable(): boolean {
    return !!this.updateState().available;
  }

  /**
   * Returns true if an update is pending activation
   */
  isUpdatePending(): boolean {
    return !!this.updateState().pending;
  }

  /**
   * Returns the current stable version hash
   */
  getStableVersion(): string | null {
    return this.updateState().stable;
  }

  /**
   * Returns the available version hash
   */
  getAvailableVersion(): string | null {
    return this.updateState().available;
  }

  /**
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    // Angular service worker subscriptions are handled automatically
  }
}