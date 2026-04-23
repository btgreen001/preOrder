import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

import { WasteService } from '../services/waste.service';

interface WasteAnalyticsData {
  totalWasteCost: number;
  totalWasteEvents: number;
  averageCostPerEvent: number;
  reasonBreakdown: Array<{
    reason: string;
    count: number;
    totalCost: number;
  }>;
}

@Component({
  selector: 'app-waste-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './waste-analytics.component.html',
  styleUrls: ['./waste-analytics.component.css']
})
export class WasteAnalyticsComponent implements OnInit {
  analytics: WasteAnalyticsData | null = null;
  loading = true;
  error = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  displayedColumns: string[] = ['reason', 'count', 'totalCost'];

  constructor(private wasteService: WasteService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.error = '';

    this.wasteService.getWasteAnalytics(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (data) => {
        this.analytics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.error = err.error?.message || 'Failed to load analytics';
        this.loading = false;
      }
    });
  }

  onDateRangeChange(): void {
    this.loadAnalytics();
  }

  clearDateRange(): void {
    this.startDate = null;
    this.endDate = null;
    this.loadAnalytics();
  }

  getMostCommonReason(): string {
    if (!this.analytics || this.analytics.reasonBreakdown.length === 0) return '-';
    const sorted = [...this.analytics.reasonBreakdown].sort((a, b) => b.count - a.count);
    return sorted[0].reason;
  }

  getHighestCostReason(): string {
    if (!this.analytics || this.analytics.reasonBreakdown.length === 0) return '-';
    const sorted = [...this.analytics.reasonBreakdown].sort((a, b) => b.totalCost - a.totalCost);
    return sorted[0].reason;
  }

  getReasonColor(reason: string): string {
    switch (reason) {
      case 'Spoilage':
        return 'reason-spoilage';
      case 'Quality':
        return 'reason-quality';
      case 'Discrepancy':
        return 'reason-discrepancy';
      default:
        return 'reason-other';
    }
  }
}
