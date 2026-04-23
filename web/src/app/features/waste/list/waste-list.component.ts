import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { WasteService, WasteEvent } from '../services/waste.service';

@Component({
  selector: 'app-waste-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './waste-list.component.html',
  styleUrls: ['./waste-list.component.css']
})
export class WasteListComponent implements OnInit {
  wasteEvents: WasteEvent[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = ['recordedAt', 'wasteReason', 'quantityWasted', 'wasteCost', 'recordedBy', 'notes'];
  pageSize = 10;
  pageIndex = 0;
  totalEvents = 0;
  reasonFilter = '';
  availableReasons = ['Spoilage', 'Quality', 'Discrepancy', 'Other'];

  constructor(private wasteService: WasteService) {}

  ngOnInit(): void {
    this.loadWasteEvents();
  }

  loadWasteEvents(): void {
    this.loading = true;
    this.error = '';
    
    this.wasteService.getWasteEvents(
      this.reasonFilter || undefined,
      this.pageIndex + 1,
      this.pageSize
    ).subscribe({
      next: (data) => {
        this.wasteEvents = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading waste events:', err);
        this.error = err.error?.message || 'Failed to load waste events';
        this.loading = false;
      }
    });
  }

  onReasonFilterChange(): void {
    this.pageIndex = 0;
    this.loadWasteEvents();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadWasteEvents();
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
