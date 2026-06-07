import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<LoadingState>({ isLoading: false });
  private requestCount = 0;
  private loadingTimeout: any;

  public loading$: Observable<LoadingState> = this.loadingSubject.asObservable();

  /**
   * Show global loading indicator
   */
  show(message?: string): void {
    this.requestCount++;
    
    // Only show loading indicator if it takes longer than 300ms
    if (!this.loadingTimeout) {
      this.loadingTimeout = setTimeout(() => {
        this.loadingSubject.next({ isLoading: true, message });
      }, 300);
    }
  }

  /**
   * Hide global loading indicator
   */
  hide(): void {
    this.requestCount = Math.max(0, this.requestCount - 1);
    
    if (this.requestCount === 0) {
      // Clear timeout if loading never actually started
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
      
      this.loadingSubject.next({ isLoading: false });
    }
  }

  /**
   * Force hide loading indicator (clear all pending requests)
   */
  forceHide(): void {
    this.requestCount = 0;
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
    
    this.loadingSubject.next({ isLoading: false });
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value.isLoading;
  }

  /**
   * Show loading indicator for token refresh (shorter delay)
   */
  showTokenRefresh(): void {
    this.requestCount++;
    
    // Show immediately for token refresh (critical operation)
    if (!this.loadingTimeout) {
      this.loadingSubject.next({ 
        isLoading: true, 
        message: 'Refreshing session...' 
      });
    }
  }
}
