import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { InventoryDepletionService, DepletionHistoryDto } from '../services/inventory-depletion.service';

@Component({
  selector: 'app-depletion-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule
  ],
  templateUrl: './depletion-history.component.html',
  styleUrls: ['./depletion-history.component.css']
})
export class DepletionHistoryComponent implements OnInit {
  depletionHistory: DepletionHistoryDto[] = [];
  selectedProductId: string = '';
  loading = false;

  constructor(
    private depletionService: InventoryDepletionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Initialize
  }

  formatCost(cost: number): string {
    return cost.toFixed(2);
  }

  loadDepletionHistory(): void {
    if (!this.selectedProductId) {
      this.snackBar.open('Please select a product', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.depletionService.getDepletionHistory(this.selectedProductId).subscribe({
      next: (data) => {
        this.depletionHistory = data;
        this.loading = false;
        this.snackBar.open('Loaded ' + data.length + ' depletion records', 'Close', { duration: 3000 });
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error loading history: ' + (err?.message || 'Unknown error'), 'Close', { duration: 3000 });
      }
    });
  }
}
