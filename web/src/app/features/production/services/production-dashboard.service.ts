import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardMetrics {
  pendingTasksCount: number;
  inProgressCount: number;
  completedTodayCount: number;
  atRiskCount: number;
  healthStatus: string;
}

export interface DashboardTaskCard {
  taskId: string;
  recipeName: string;
  productName: string;
  quantityToProduce: number;
  expectedCompletion: string;
  daysUntilDeadline: number;
  priority: string;
  status: string;
}

export interface ProductivityMetrics {
  completionRate: number;
  onTimeRate: number;
  averageDurationMinutes: number;
  totalTasksCompleted: number;
  totalTasksScheduled: number;
  peakProductionHour: string;
}

export interface BatchTrend {
  date: string;
  batchesProduced: number;
  totalQuantity: number;
  averageCostPerUnit: number;
  totalProductionCost: number;
}

export interface DashboardAlertsSummary {
  lowStockItems: number;
  expiringBatches: number;
  expiredBatches: number;
  overdueTasks: number;
  totalAlerts: number;
}

@Injectable({providedIn: 'root'})
export class ProductionDashboardService {
  private apiUrl = 'https://localhost:5124/api/production-dashboard';

  constructor(private http: HttpClient) { }

  getTodayMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/today`);
  }

  getUpcomingTasks(days: number = 7): Observable<DashboardTaskCard[]> {
    return this.http.get<DashboardTaskCard[]>(`${this.apiUrl}/upcoming-tasks?days=${days}`);
  }

  getProductivityMetrics(startDate?: string, endDate?: string): Observable<ProductivityMetrics> {
    let url = `${this.apiUrl}/productivity`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<ProductivityMetrics>(url);
  }

  getBatchTrends(days: number = 30): Observable<BatchTrend[]> {
    return this.http.get<BatchTrend[]>(`${this.apiUrl}/batch-trends?days=${days}`);
  }

  getAlerts(): Observable<DashboardAlertsSummary> {
    return this.http.get<DashboardAlertsSummary>(`${this.apiUrl}/alerts`);
  }
}
