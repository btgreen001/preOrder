import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { PinEntryComponent } from './pin-entry/pin-entry.component';
import { PinService } from './services/pin.service';
import { AuthService } from '../../core/services/auth.service';
import { TerminalContextService } from '../../core/services/terminal-context.service';

export interface UserTile {
  userId: string;
  displayName: string;
  initials: string;
  avatarColor: string;
}

@Component({
  selector: 'app-pin-signin',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    PinEntryComponent
  ],
  templateUrl: './pin-signin.component.html',
  styleUrls: ['./pin-signin.component.scss']
})
export class PinSigninComponent implements OnInit {
  users: UserTile[] = [];
  selectedUser: UserTile | null = null;
  showPinEntry = false;
  pinError: string | null = null;
  isUserAlreadyAuthenticated = false;
  isLoading = true;
  isIdleTimeout = false;
  @ViewChild(PinEntryComponent) pinEntryComponent!: PinEntryComponent;

  constructor(
    private pinService: PinService,
    private authService: AuthService,
    private terminalContextService: TerminalContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if this is an idle timeout redirect (for UI display purposes only)
    this.isIdleTimeout = this.route.snapshot.queryParams['idleTimeout'] === 'true';
    
    // Check if user is already authenticated
    this.isUserAlreadyAuthenticated = this.authService.isAuthenticated();
    
    // SECURITY: Allow access ONLY if terminal context exists (Layer 1) OR already authenticated
    // This prevents unauthorized access via query parameter manipulation
    const hasTerminalContext = this.terminalContextService.hasTerminalContext();
    
    // Allow access if: (1) already authenticated OR (2) terminal context exists
    if (!this.isUserAlreadyAuthenticated && !hasTerminalContext) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Load users for authenticated user or terminal session scenario
    // If user is authenticated, refresh token first to ensure it's valid (especially after idle timeout)
    if (this.isUserAlreadyAuthenticated) {
      this.authService.refreshAccessToken().subscribe({
        next: () => this.loadUsers(), // Token refreshed, now load users
        error: (err) => {
          // Refresh failed - token expired, redirect to login
          console.warn('[PinSignin] Token refresh failed during idle timeout recovery:', err);
          this.router.navigate(['/login']);
        }
      });
    } else {
      // Not authenticated - just load users (org ID in request body)
      this.loadUsers();
    }
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.pinService.getAvailableUsers().subscribe({
      next: (users) => {
        this.isLoading = false;
        this.users = users.map(user => ({
          userId: user.userId,
          displayName: `${user.firstName} ${user.lastName}`,
          initials: this.getInitials(user.firstName, user.lastName),
          avatarColor: this.getAvatarColor(user.userId)
        }));
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Failed to load users:', error);
        
        // If 401 (Unauthorized)
        if (error.status === 401) {
          // If this is an idle timeout, show timeout message instead of redirecting to login
          if (this.isIdleTimeout) {
            this.pinError = 'Your session expired due to inactivity. Please enter your PIN to continue.';
          } else {
            // User wasn't authenticated and not from idle timeout - redirect to login
            this.pinError = 'Your session has expired. Please log in again.';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }
        } else {
          this.pinError = 'Failed to load available users. Please try again.';
        }
      }
    });
  }

  selectUser(user: UserTile): void {
    this.selectedUser = user;
    this.showPinEntry = true;
    this.pinError = null;
  }

  onPinComplete(pin: string): void {
    if (!this.selectedUser) return;
    
    this.pinService.authenticateWithPin(this.selectedUser.userId, pin).subscribe({
      next: (response) => {
        // Navigate to dashboard instead of /home
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        // Show error message on the PIN entry screen without logging out
        let errorMessage = 'Incorrect PIN. Please try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        // Show error in the pin entry component and clear it for retry
        if (this.pinEntryComponent) {
          this.pinEntryComponent.showError = true;
          this.pinEntryComponent.onClear();
        }
        
        this.pinError = errorMessage;
      }
    });
  }

  onPinCancel(): void {
    // Cancel PIN entry and go back to user list
    this.showPinEntry = false;
    this.selectedUser = null;
    this.pinError = null;
  }

  goBackToDashboard(): void {
    // Go back to dashboard from user list (only if already authenticated)
    if (this.isUserAlreadyAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private getAvatarColor(userId: string): string {
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#0097a7'];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
