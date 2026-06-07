import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TerminalContextService, TerminalContext } from '../../core/services/terminal-context.service';
import { AuthService } from '../../core/services/auth.service';
import { TerminalService } from '../../features/terminals/services/terminal.service';

export interface TerminalDto {
  terminalUid: string;
  terminalCode: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * TerminalSelectionComponent
 * 
 * Displayed after successful login when no terminal context is set (first login on device).
 * Allows user to select a terminal bound to their organization.
 * Once selected, terminal context is stored and user is redirected to /dashboard.
 * 
 * User flow:
 * 1. Login successful, JWT token received
 * 2. If terminal context NOT set, redirect to /terminal-selection
 * 3. Load available terminals for user's org
 * 4. User clicks terminal
 * 5. Store in TerminalContextService
 * 6. Redirect to /dashboard
 */
@Component({
  selector: 'app-terminal-selection',
  standalone: true,
  imports: [],
  templateUrl: './terminal-selection.component.html',
  styleUrls: ['./terminal-selection.component.scss']
})
export class TerminalSelectionComponent implements OnInit {
  availableTerminals: TerminalDto[] = [];
  isLoading = true;
  error: string | null = null;
  private apiUrl = `${environment.apiUrl}/terminal`;

  constructor(
    private http: HttpClient,
    private terminalContext: TerminalContextService,
    private authService: AuthService,
    private terminalService: TerminalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // APP_INITIALIZER already rehydrated TerminalContextService from the device_token cookie.
    // If context exists, the device is already bound — skip selection.
    if (this.terminalContext.hasTerminalContext()) {
      console.debug('[TerminalSelectionComponent] Terminal context already set, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }

    // No context: this is a new device or the binding was released — show terminal selection.
    this.loadAvailableTerminals();
  }

  /**
   * Load list of available terminals for user's organization
   */
  loadAvailableTerminals(): void {
    this.isLoading = true;
    this.error = null;

    // Call backend API to get available terminals
    this.http.get<TerminalDto[]>(`${this.apiUrl}/available`, {
      withCredentials: true
    }).subscribe({
      next: (terminals) => {
        console.debug('[TerminalSelectionComponent] Loaded terminals:', terminals.length);
        this.availableTerminals = terminals;
        this.isLoading = false;

        // If no terminals available, show error
        if (terminals.length === 0) {
          this.error = 'No terminals available for your organization. Contact your administrator.';
        }
      },
      error: (err) => {
        console.error('[TerminalSelectionComponent] Error loading terminals:', err);
        this.error = 'Failed to load available terminals. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * User clicks on a terminal
   * Store terminal context and redirect to dashboard
   */
  selectTerminal(terminal: TerminalDto): void {
    this.error = null;
    this.isLoading = true;

    this.terminalService.bindDevice({ terminalUid: terminal.terminalUid }).subscribe({
      next: () => {
        const currentUser = this.authService.currentUserValue;
        const context: TerminalContext = {
          terminalId: terminal.terminalUid,
          organizationId: currentUser?.organizationId || '',
          terminalCode: terminal.terminalCode,
          location: terminal.location
        };

        console.debug('[TerminalSelectionComponent] Device bound and terminal context stored:', context);
        this.terminalContext.setTerminalContext(context);
        this.isLoading = false;

        // Redirect to dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        console.error('[TerminalSelectionComponent] Error binding device to terminal:', err);
        this.error = err?.error?.message || 'Failed to bind this device to the selected terminal. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Get terminal display name for UI
   */
  getTerminalDisplayName(terminal: TerminalDto): string {
    return `${terminal.terminalCode} - ${terminal.location}`;
  }
}
