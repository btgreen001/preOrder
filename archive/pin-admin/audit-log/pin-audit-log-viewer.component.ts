import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PinAdminService } from '../services/pin-admin.service';

interface AdminAuditLog {
  auditLogId: string;
  action: string;
  details: string;
  performedBy: string;
  loggedAt: string;
}

interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  performedBy?: string;
  searchText?: string;
}

@Component({
  selector: 'app-pin-audit-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatPaginatorModule
  ],
  templateUrl: './pin-audit-log-viewer.component.html',
  styleUrls: ['./pin-audit-log-viewer.component.css']
})
export class PinAuditLogViewerComponent implements OnInit {
  auditLogs: AdminAuditLog[] = [];
  filteredLogs: AdminAuditLog[] = [];
  displayedColumns: string[] = ['timestamp', 'action', 'details', 'performedBy', 'actions'];
  filterForm: FormGroup;
  loading = false;
  error: string | null = null;
  
  // Pagination
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];
  currentPage = 0;
  totalLogs = 0;

  actionTypes = ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'RESET_PIN', 'UNLOCK_USER', 'LOCK_USER', 'LOGIN_ATTEMPT', 'LOGIN_FAILED'];
  
  constructor(
    private pinAdminService: PinAdminService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      action: [''],
      performedBy: [''],
      searchText: ['']
    });
  }

  ngOnInit(): void {
    this.loadAuditLogs();

    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadAuditLogs();
    }, 30000);
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.error = null;

    try {
      const filters = this.buildFilters();
      
      this.pinAdminService.getAuditLogs(
        filters.startDate || new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000), // Default: 90 days
        filters.endDate || new Date()
      ).subscribe({
        next: (response) => {
          this.auditLogs = response.map(log => ({
            ...log,
            loggedAt: typeof log.loggedAt === 'string' ? log.loggedAt : new Date(log.loggedAt).toISOString()
          }));
          this.applyClientSideFilters(filters);
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load audit logs';
          this.snackBar.open('Error loading audit logs: ' + (err.error?.message || err.message), 'Close', { duration: 5000 });
          this.loading = false;
        }
      });
    } catch (err: any) {
      this.error = 'Error loading audit logs';
      this.snackBar.open('Error: ' + err.message, 'Close', { duration: 5000 });
      this.loading = false;
    }
  }

  buildFilters(): AuditLogFilters {
    const formValue = this.filterForm.value;
    return {
      startDate: formValue.startDate || undefined,
      endDate: formValue.endDate || undefined,
      action: formValue.action || undefined,
      performedBy: formValue.performedBy || undefined,
      searchText: formValue.searchText || undefined
    };
  }

  applyClientSideFilters(filters: AuditLogFilters): void {
    this.filteredLogs = this.auditLogs.filter(log => {
      if (filters.action && log.action !== filters.action) return false;
      if (filters.performedBy && !log.performedBy.toLowerCase().includes(filters.performedBy.toLowerCase())) return false;
      if (filters.searchText && !log.details.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      return true;
    });

    this.totalLogs = this.filteredLogs.length;
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadAuditLogs();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAuditLogs();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 0;
    this.loadAuditLogs();
  }

  exportToCSV(): void {
    try {
      const headers = ['Timestamp', 'Action', 'Details', 'Performed By'];
      const rows = this.filteredLogs.map(log => [
        new Date(log.loggedAt).toLocaleString(),
        log.action,
        log.details,
        log.performedBy
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.snackBar.open('Audit log exported successfully', 'Close', { duration: 3000 });
    } catch (err: any) {
      this.snackBar.open('Failed to export audit log: ' + err.message, 'Close', { duration: 5000 });
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  getActionColor(action: string): string {
    const colorMap: { [key: string]: string } = {
      'CREATE_USER': 'green',
      'UPDATE_USER': 'blue',
      'DELETE_USER': 'red',
      'RESET_PIN': 'orange',
      'UNLOCK_USER': 'purple',
      'LOCK_USER': 'red',
      'LOGIN_ATTEMPT': 'gray',
      'LOGIN_FAILED': 'darkred'
    };
    return colorMap[action] || 'gray';
  }

  getDaysAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  }

  navigateToDashboard(): void {
    window.location.href = '/pin-admin/dashboard';
  }

  navigateToUserManagement(): void {
    window.location.href = '/pin-admin/users';
  }
}
