import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';

import { FIFOBatchDto, FIFOBatchSelectionDto, FIFORotationRequest, BatchExpirationInfoDto } from '../../../core/models/fifo.models';
import { BatchService } from '../services/batch.service';
import { ProductsService } from '../../products/services/products.service';

interface SellableProduct {
  externalId: string;
  name: string;
}

@Component({
  selector: 'app-fifo-batches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './fifo-batches.component.html',
  styleUrls: ['./fifo-batches.component.css']
})
export class FIFOBatchesComponent implements OnInit {
  form!: FormGroup;
  batches: FIFOBatchDto[] = [];
  selectedBatches: FIFOBatchSelectionDto[] = [];
  products: SellableProduct[] = [];
  loading = false;
  selectedProduct: string = '';
  
  displayedColumns: string[] = ['batchNumber', 'quantityAvailable', 'productionDate', 'expirationDate', 'daysUntilExpiration', 'costPerUnit', 'status', 'select'];
  selectionColumns: string[] = ['batchNumber', 'quantitySelected', 'expirationDate', 'daysUntilExpiration', 'costPerUnit', 'totalCost'];

  criticalCount = 0;
  warningCount = 0;
  totalBatches = 0;

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    private productsService: ProductsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      productId: ['', Validators.required],
      quantityNeeded: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsService.getAllProducts().subscribe({
      next: (products: any[]) => {
        this.products = products.map(p => ({
          externalId: p.id || p.externalId,
          name: p.name
        }));
      },
      error: (err: any) => {
        this.snackBar.open('Error loading products', 'Close', { duration: 5000 });
        console.error('Error loading products:', err);
      }
    });
  }

  getFIFOBatches(): void {
    if (this.form.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 5000 });
      return;
    }

    this.loading = true;
    const { productId, quantityNeeded } = this.form.value;
    this.selectedProduct = productId;

    this.batchService.getFIFOBatches(productId, quantityNeeded).subscribe({
      next: (data: FIFOBatchDto[]) => {
        this.batches = data;
        this.calculateMetrics();
        this.loading = false;
        this.snackBar.open(`Loaded ${data.length} FIFO batches`, 'Close', { duration: 3000 });
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error loading FIFO batches', 'Close', { duration: 5000 });
        console.error('Error:', err);
      }
    });
  }

  rotateFIFO(): void {
    if (!this.selectedProduct || this.form.get('quantityNeeded')?.invalid) {
      this.snackBar.open('Please load FIFO batches first', 'Close', { duration: 5000 });
      return;
    }

    this.loading = true;
    const quantityNeeded = this.form.get('quantityNeeded')?.value;

    this.batchService.rotateBatchesFIFO(this.selectedProduct, quantityNeeded).subscribe({
      next: (data: FIFOBatchSelectionDto[]) => {
        this.selectedBatches = data;
        this.loading = false;
        this.snackBar.open(`Selected ${data.length} batches for production`, 'Close', { duration: 3000 });
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error applying FIFO rotation', 'Close', { duration: 5000 });
        console.error('Error:', err);
      }
    });
  }

  getExpirationInfo(batch: FIFOBatchDto): void {
    this.batchService.getExpirationInfo(batch.externalId).subscribe({
      next: (info: BatchExpirationInfoDto) => {
        const message = `${batch.batchNumber}: ${info.daysUntilExpiration} days remaining (${info.percentageTimeRemaining.toFixed(1)}% shelf life used)`;
        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
      error: (err: any) => {
        this.snackBar.open('Error loading expiration info', 'Close', { duration: 5000 });
        console.error('Error:', err);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EXPIRED':
        return '#d32f2f'; // Red
      case 'CRITICAL':
        return '#f57c00'; // Orange
      case 'WARNING':
        return '#fbc02d'; // Yellow
      case 'GOOD':
        return '#388e3c'; // Green
      default:
        return '#9e9e9e'; // Grey
    }
  }

  private calculateMetrics(): void {
    this.totalBatches = this.batches.length;
    this.criticalCount = this.batches.filter(b => b.expirationStatus === 'CRITICAL' || b.expirationStatus === 'EXPIRED').length;
    this.warningCount = this.batches.filter(b => b.expirationStatus === 'WARNING').length;
  }

  clearForm(): void {
    this.form.reset();
    this.batches = [];
    this.selectedBatches = [];
    this.selectedProduct = '';
  }

  getTotalSelectedQuantity(): number {
    return this.selectedBatches.reduce((sum, b) => sum + b.quantitySelected, 0);
  }

  getTotalSelectedCost(): number {
    return this.selectedBatches.reduce((sum, b) => sum + b.totalCost, 0);
  }
}
