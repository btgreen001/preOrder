import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PinAdminService, PinUserDto, AdminAuditLogDto } from '../services/pin-admin.service';

@Component({
  selector: 'app-pin-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './pin-admin-dashboard.component.html',
  styleUrls: ['./pin-admin-dashboard.component.css']
})
export class PinAdminDashboardComponent implements OnInit {
  totalUsers = 0;
  lockedUsers = 0;
  failedAttempts = 0;
  recentAuditLogs: AdminAuditLogDto[] = [];
  lockedUsersList: PinUserDto[] = [];

  loading = false;
  error: string | null = null;

  constructor(
    private pinAdminService: PinAdminService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    this.pinAdminService.getAllUsers().subscribe({
      next: (users) => {
        this.totalUsers = users.length;
        this.lockedUsers = users.filter(u => u.isLocked).length;
        this.failedAttempts = users.reduce((sum, u) => sum + u.pinAttempts, 0);
        this.lockedUsersList = users.filter(u => u.isLocked);

        this.loadAuditLogs();
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        console.error(err);
        this.loading = false;
        this.snackBar.open('Error loading dashboard', 'Close', { duration: 5000 });
      }
    });
  }

  loadAuditLogs(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.pinAdminService.getAuditLogs(thirtyDaysAgo).subscribe({
      next: (logs) => {
        this.recentAuditLogs = logs.slice(0, 5);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  unlockUser(userId: string, userName: string): void {
    this.pinAdminService.unlockUser(userId).subscribe({
      next: () => {
        this.snackBar.open(`User ${userName} unlocked successfully`, 'Close', { duration: 3000 });
        this.loadDashboard();
      },
      error: (err) => {
        this.snackBar.open('Failed to unlock user', 'Close', { duration: 5000 });
        console.error(err);
      }
    });
  }

  goToUserManagement(): void {
    this.router.navigate(['/pin-admin/users']);
  }

  goToAuditLog(): void {
    this.router.navigate(['/pin-admin/audit-log']);
  }

  goToSessionMonitor(): void {
    this.router.navigate(['/pin-admin/sessions']);
  }
}
