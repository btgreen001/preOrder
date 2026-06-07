import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { TerminalContextService } from './terminal-context.service';
import { IDLE_CONFIG, IdleConfig } from '../../app.config';

/**
 * Proactive Idle Detection Service
 * 
 * Purpose: Detect when user is approaching idle timeout and proactively navigate
 * to PIN signin page BEFORE session expires, ensuring loadUsers() succeeds.
 * 
 * Configuration:
 * - Idle timeout: 60 seconds (testing) / 30 minutes (production)
 * - Grace period: 10 seconds (navigate to PIN signin 10 seconds before expiration)
 * - Check interval: 1 second (continuously monitor time remaining)
 * 
 * Flow:
 * 1. Track user activity (mousemove, keypress, click, scroll)
 * 2. Calculate time since last activity
 * 3. When time remaining < grace period (10 seconds), trigger proactive navigation
 * 4. Navigate to PIN signin while session still active
 * 5. User sees PIN list and can authenticate before expiration
 */
@Injectable({
  providedIn: 'root'
})
export class IdleDetectionService {
  private lastActivity: Date = new Date();
  private destroy$ = new Subject<void>();
  private idleCheckInterval: any;
  private monitoringActive = false;

  // Configuration (injected from app.config.ts)
  private config: IdleConfig = inject(IDLE_CONFIG);

  private proactiveRedirectInProgress = false;
  private router = inject(Router);
  private terminalContext = inject(TerminalContextService);
  private ngZone = inject(NgZone);
  constructor(
  ) {
    console.debug('[IdleDetectionService] Initialized');
  }

  /**
   * Start monitoring user activity and idle timeout
   */
  startMonitoring(): void {
    if (this.monitoringActive) {
      this.resetActivity();
      return;
    }

    // Recreate lifecycle subject so repeated start/stop cycles reattach listeners correctly.
    this.destroy$ = new Subject<void>();

    console.debug('[IdleDetectionService] Starting idle monitoring');

    // Reset last activity
    this.lastActivity = new Date();
    this.proactiveRedirectInProgress = false;
    this.monitoringActive = true;

    // Track user activity events
    this.setupActivityListeners();

    // Start periodic idle check
    this.startIdleCheck();
  }

  /**
   * Stop monitoring (cleanup)
   */
  stopMonitoring(): void {
    if (!this.destroy$.isStopped) {
      this.destroy$.next();
      this.destroy$.complete();
    }

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    this.monitoringActive = false;
    this.proactiveRedirectInProgress = false;
  }

  /**
   * Reset activity timestamp (called when user interacts with app)
   */
  resetActivity(): void {
    this.lastActivity = new Date();
    this.proactiveRedirectInProgress = false;
  }

  /**
   * Setup listeners for user activity events
   */
  private setupActivityListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      // Listen to mouse, keyboard, touch, and scroll events
      const activityEvents$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'keypress'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'click')
      ).pipe(
        debounceTime(500), // Debounce to avoid excessive updates
        takeUntil(this.destroy$)
      );

      activityEvents$.subscribe(() => {
        this.ngZone.run(() => this.resetActivity());
      });
    });
  }

  /**
   * Periodically check if user is approaching idle timeout
   */
  private startIdleCheck(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStatus();
    }, this.config.checkIntervalMs);
  }

  /**
   * Check if user is idle and trigger proactive navigation if needed
   */
  private checkIdleStatus(): void {
    const now = new Date();
    const idleDuration = now.getTime() - this.lastActivity.getTime();
    const timeRemaining = this.config.timeoutMs - idleDuration;

    // Log status every 5 seconds (for debugging)
    if (Math.floor(idleDuration / 1000) % 5 === 0) {
      console.debug('[IdleDetectionService] Idle for:', Math.floor(idleDuration / 1000), 'seconds | Time remaining:', Math.floor(timeRemaining / 1000), 'seconds');
    }

    // Check if we're approaching timeout and need proactive navigation
    if (timeRemaining <= this.config.gracePeriodMs && timeRemaining > 0 && !this.proactiveRedirectInProgress) {
      this.triggerProactiveNavigation();
    }
  }

  /**
   * Trigger proactive navigation to PIN signin before session expires
   * NOTE: Terminal context is OPTIONAL - we navigate regardless of terminal binding
   */
  private triggerProactiveNavigation(): void {
    // Check current route - don't redirect if already on PIN signin
    const currentUrl = this.router.url;
    if (currentUrl.includes('/pin-signin')) {
      console.debug('[IdleDetectionService] Already on PIN signin - skipping proactive navigation');
      return;
    }

    // Terminal context is optional - we navigate regardless of terminal binding
    const hasTerminalContext = this.terminalContext.hasTerminalContext();
    const terminalInfo = hasTerminalContext ? 
      `with terminal: ${this.terminalContext.getTerminalContext()?.terminalCode}` : 
      'without terminal context';

    console.log('[IdleDetectionService] ⚠️ APPROACHING IDLE TIMEOUT - Proactively navigating to PIN signin', terminalInfo);
    console.log('[IdleDetectionService] Current page:', currentUrl);

    this.proactiveRedirectInProgress = true;

    // Navigate to PIN signin with proactive flag
    this.ngZone.run(() => {
      this.router.navigate(['/pin-signin'], {
        queryParams: {
          proactive: 'true', // Indicates this is proactive navigation
          fromPage: currentUrl // Track where user came from
        }
      });
    });
  }

  /**
   * Check if currently in proactive redirect state
   */
  isProactiveRedirect(): boolean {
    return this.proactiveRedirectInProgress;
  }
}
