import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductionDashboardService, DashboardMetrics, DashboardAlertsSummary, DashboardTaskCard, ProductivityMetrics } from '../services/production-dashboard.service';

@Component({
  selector: 'app-production-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './production-dashboard.component.html',
  styleUrls: ['./production-dashboard.component.css']
})
export class ProductionDashboardComponent implements OnInit {
  metrics: DashboardMetrics | null = null;
  alerts: DashboardAlertsSummary | null = null;
  upcomingTasks: DashboardTaskCard[] = [];
  productivity: ProductivityMetrics | null = null;
  isLoading = false;

  constructor(
    private dashboardService: ProductionDashboardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  private loadDashboard() {
    this.isLoading = true;
    
    this.dashboardService.getTodayMetrics().subscribe({
      next: (metrics) => this.metrics = metrics,
      error: (err) => this.handleError('Failed to load metrics', err)
    });

    this.dashboardService.getAlerts().subscribe({
      next: (alerts) => this.alerts = alerts,
      error: (err) => this.handleError('Failed to load alerts', err)
    });

    this.dashboardService.getUpcomingTasks(7).subscribe({
      next: (tasks) => this.upcomingTasks = tasks,
      error: (err) => this.handleError('Failed to load tasks', err)
    });

    this.dashboardService.getProductivityMetrics().subscribe({
      next: (metrics) => this.productivity = metrics,
      error: (err) => this.handleError('Failed to load productivity metrics', err)
    });

    this.isLoading = false;
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}
