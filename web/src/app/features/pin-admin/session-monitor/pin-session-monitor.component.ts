import { Component, OnInit, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { PinAdminService } from '../services/pin-admin.service';
import { NgClass, NgStyle, UpperCasePipe } from '@angular/common';
import { CommonModule } from '@angular/common';



interface ActiveSession {
  sessionId: string;
  userId: string;
  userName: string;
  loginTime: string;
  lastActivityTime: string;
  deviceInfo: string;
  ipAddress: string;
  status: 'active' | 'idle' | 'expired';
}

interface SessionMetrics {
  totalActiveSessions: number;
  sessionsLastHour: number;
  sessionsLast24Hours: number;
  averageSessionDuration: number;
}

@Component({
  selector: 'app-pin-session-monitor',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    NgStyle,
    UpperCasePipe,
    MatChipsModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatChipsModule
],
  templateUrl: './pin-session-monitor.component.html',
  styleUrls: ['./pin-session-monitor.component.css']
})
export class PinSessionMonitorComponent implements OnInit {
  sessions: ActiveSession[] = [];
  sessionMetrics: SessionMetrics = {
    totalActiveSessions: 0,
    sessionsLastHour: 0,
    sessionsLast24Hours: 0,
    averageSessionDuration: 0
  };
  displayedColumns: string[] = ['userName', 'loginTime', 'lastActivity', 'device', 'ipAddress', 'status', 'actions'];
  loading = false;
  error: string | null = null;
  autoRefreshEnabled = true;
  refreshInterval = 10000; // 10 seconds

  constructor(
    private pinAdminService: PinAdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.startAutoRefresh();
  }

  startAutoRefresh(): void {
    setInterval(() => {
      if (this.autoRefreshEnabled) {
        this.loadSessions();
      }
    }, this.refreshInterval);
  }

  loadSessions(): void {
    this.loading = true;
    this.error = null;

    try {
      this.generateMockSessions();
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load active sessions';
      this.snackBar.open('Error loading sessions: ' + err.message, 'Close', { duration: 5000 });
      this.loading = false;
    }
  }

  generateMockSessions(): void {
    const now = new Date();
    const mockSessions: ActiveSession[] = [
      {
        sessionId: 'sess-001',
        userId: 'user-1',
        userName: 'John Doe',
        loginTime: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        lastActivityTime: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        deviceInfo: 'Chrome on Windows 10',
        ipAddress: '192.168.1.100',
        status: 'active'
      },
      {
        sessionId: 'sess-002',
        userId: 'user-2',
        userName: 'Jane Smith',
        loginTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        lastActivityTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        deviceInfo: 'Safari on iPad',
        ipAddress: '192.168.1.101',
        status: 'idle'
      }
    ];

    this.sessions = mockSessions;
    this.calculateMetrics();
  }

  calculateMetrics(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.sessionMetrics.totalActiveSessions = this.sessions.filter(s => s.status === 'active').length;
    this.sessionMetrics.sessionsLastHour = this.sessions.filter(s => new Date(s.loginTime) > oneHourAgo).length;
    this.sessionMetrics.sessionsLast24Hours = this.sessions.filter(s => new Date(s.loginTime) > oneDayAgo).length;

    const activeSessions = this.sessions.filter(s => s.status !== 'expired');
    if (activeSessions.length > 0) {
      const totalDuration = activeSessions.reduce((sum, s) => {
        const duration = now.getTime() - new Date(s.loginTime).getTime();
        return sum + duration;
      }, 0);
      this.sessionMetrics.averageSessionDuration = Math.floor(totalDuration / activeSessions.length / (60 * 1000));
    }
  }

  forceLogout(session: ActiveSession): void {
    const confirmDialog = this.dialog.open(ConfirmForceLogoutDialogComponent, {
      width: '400px',
      data: { userName: session.userName }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.performForceLogout(session);
      }
    });
  }

  performForceLogout(session: ActiveSession): void {
    try {
      this.sessions = this.sessions.filter(s => s.sessionId !== session.sessionId);
      this.calculateMetrics();
      this.snackBar.open(`User ${session.userName} logged out successfully`, 'Close', { duration: 3000 });
    } catch (err: any) {
      this.snackBar.open('Failed to force logout: ' + err.message, 'Close', { duration: 5000 });
    }
  }

  formatTime(isoTime: string): string {
    const date = new Date(isoTime);
    return date.toLocaleString();
  }

  getSessionDuration(loginTime: string): string {
    const now = new Date();
    const start = new Date(loginTime);
    const durationMs = now.getTime() - start.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }

  getLastActivityDuration(lastActivityTime: string): string {
    const now = new Date();
    const last = new Date(lastActivityTime);
    const durationMs = now.getTime() - last.getTime();
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return 'Offline';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': 'green',
      'idle': 'orange',
      'expired': 'red'
    };
    return colorMap[status] || 'gray';
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    this.snackBar.open(`Auto-refresh ${this.autoRefreshEnabled ? 'enabled' : 'disabled'}`, 'Close', { duration: 2000 });
  }

  navigateToDashboard(): void {
    window.location.href = '/pin-admin/dashboard';
  }

  navigateToUserManagement(): void {
    window.location.href = '/pin-admin/users';
  }

  navigateToAuditLog(): void {
    window.location.href = '/pin-admin/audit-logs';
  }
}

// Confirm Force Logout Dialog Component
@Component({
  selector: 'app-confirm-force-logout-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Confirm Force Logout</h2>
    <mat-dialog-content>
      Are you sure you want to force logout user <strong>{{ data.userName }}</strong>? 
      They will need to log in again.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Force Logout</button>
    </mat-dialog-actions>
  `
})
export class ConfirmForceLogoutDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmForceLogoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
