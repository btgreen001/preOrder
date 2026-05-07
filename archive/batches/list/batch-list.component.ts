import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { BatchService, BatchDetail } from '../services/batch.service';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './batch-list.component.html',
  styleUrls: ['./batch-list.component.css']
})
export class BatchListComponent implements OnInit {
  batches: BatchDetail[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = ['batchNumber', 'quantityProduced', 'productionDate', 'expirationDate', 'status', 'costPerUnit', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalBatches = 0;
  statusFilter = '';
  availableStatuses = ['Active', 'Completed', 'Cancelled'];

  constructor(
    private batchService: BatchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading = true;
    this.error = '';
    
    this.batchService.getBatches(
      this.statusFilter || undefined,
      this.pageIndex + 1,
      this.pageSize
    ).subscribe({
      next: (data) => {
        this.batches = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading batches:', err);
        this.error = err.error?.message || 'Failed to load batches';
        this.loading = false;
      }
    });
  }

  onStatusFilterChange(): void {
    this.pageIndex = 0;
    this.loadBatches();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadBatches();
  }

  viewBatch(batchId: string): void {
    this.router.navigate(['/batches/detail', batchId]);
  }

  completeBatch(batchId: string): void {
    if (confirm('Mark this batch as completed?')) {
      this.batchService.completeBatch(batchId).subscribe({
        next: () => {
          this.loadBatches();
        },
        error: (err) => {
          console.error('Error completing batch:', err);
          this.error = err.error?.message || 'Failed to complete batch';
        }
      });
    }
  }

  cancelBatch(batchId: string): void {
    if (confirm('Cancel this batch?')) {
      this.batchService.cancelBatch(batchId).subscribe({
        next: () => {
          this.loadBatches();
        },
        error: (err) => {
          console.error('Error cancelling batch:', err);
          this.error = err.error?.message || 'Failed to cancel batch';
        }
      });
    }
  }

  addNewBatch(): void {
    this.router.navigate(['/batches/add']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'active-badge';
      case 'Completed':
        return 'completed-badge';
      case 'Cancelled':
        return 'cancelled-badge';
      default:
        return 'default-badge';
    }
  }
}
