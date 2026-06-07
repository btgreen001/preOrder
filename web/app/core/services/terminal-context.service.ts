import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * TerminalContext represents the persistent Layer 1 context
 * Survives logout, lock, and application navigation
 * Only cleared on browser close/session clear
 */
export interface TerminalContext {
  terminalId: string; // UUID - Guid from backend Terminal.TerminalUid
  organizationId: string; // UUID - Organization this terminal is bound to
  terminalCode: string; // e.g., "kitchen-1", "counter-2"
  location: string; // e.g., "Main Kitchen", "Front Counter"
}

/**
 * TerminalContextService manages the persistent terminal context (Layer 1)
 * 
 * Architecture:
 * - Layer 1 (Persistent): Terminal context - stored in memory, survives logout/lock
 * - Layer 2 (Ephemeral): User/token context - cleared on logout
 * 
 * Use Case:
 * 1. User logs in with terminalId → TerminalContextService stores context
 * 2. User performs work
 * 3. User logs out → Auth clears tokens, TerminalContextService preserves context
 * 4. User logs in again (PIN or password) → Auto-fills terminalId, validates org match
 * 5. User closes browser → Context is lost (no persistence across sessions)
 */
@Injectable({
  providedIn: 'root'
})
export class TerminalContextService {
  private terminalContextSubject: BehaviorSubject<TerminalContext | null> = new BehaviorSubject<TerminalContext | null>(null);
  public terminalContext$: Observable<TerminalContext | null> = this.terminalContextSubject.asObservable();

  constructor() {
    // Initialize with null - no persistence across browser sessions
  }

  /**
   * Set terminal context when available (e.g., from login response)
   * @param context Terminal context to store
   */
  setTerminalContext(context: TerminalContext): void {
    this.terminalContextSubject.next(context);
    console.debug('[TerminalContext] Context set:', { terminalCode: context.terminalCode, organizationId: context.organizationId });
  }

  /**
   * Get current terminal context (synchronously)
   * @returns Terminal context or null if not set
   */
  getTerminalContext(): TerminalContext | null {
    return this.terminalContextSubject.value;
  }

  /**
   * Get terminal ID (UUID) for passing to login/auth endpoints
   * @returns Terminal ID or null if no context
   */
  getTerminalId(): string | null {
    return this.terminalContextSubject.value?.terminalId || null;
  }

  /**
   * Get organization ID bound to this terminal
   * @returns Organization ID or null if no context
   */
  getOrganizationId(): string | null {
    return this.terminalContextSubject.value?.organizationId || null;
  }

  /**
   * Check if terminal context exists
   * @returns true if context is set, false otherwise
   */
  hasTerminalContext(): boolean {
    return !!this.terminalContextSubject.value;
  }

  /**
   * Clear terminal context (e.g., when user explicitly wants to use different terminal)
   * Typically called from a terminal selection screen, not logout
   */
  clearTerminalContext(): void {
    this.terminalContextSubject.next(null);
    console.debug('[TerminalContext] Context cleared');
  }

  /**
   * Validate org match - used when login response comes back
   * Ensures frontend and backend agree on organization binding
   * @param organizationIdFromResponse Organization ID from login response
   * @returns true if org matches context, false if mismatch
   */
  validateOrgMatch(organizationIdFromResponse: string): boolean {
    const context = this.terminalContextSubject.value;
    if (!context) {
      // No terminal context set - allow any org (first login or new terminal)
      return true;
    }
    
    const matches = context.organizationId === organizationIdFromResponse;
    if (!matches) {
      console.warn('[TerminalContext] Organization mismatch detected:', {
        expected: context.organizationId,
        received: organizationIdFromResponse
      });
    }
    return matches;
  }
}
