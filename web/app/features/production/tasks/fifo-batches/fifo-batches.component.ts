
import { Component, OnInit } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { FIFOBatchService, FIFOBatchDto, FIFOBatchSelectionDto } from '../../services/fifo-batch.service';
import { ProductsService } from '../../../products/services/products.service';

interface Product {
  ExternalId: string;
  Name: string;
}

@Component({
  selector: 'app-fifo-batches',
  standalone: true,
  imports: [
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
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule
],
  templateUrl: './fifo-batches.component.html',
  styleUrls: ['./fifo-batches.component.css']
})
export class FIFOBatchesComponent implements OnInit {
  form: FormGroup;
  loading = false;
  fifoLoading = false;
  batches: FIFOBatchDto[] = [];
  selectedBatches: FIFOBatchSelectionDto[] = [];
  products: Product[] = [];
  selectedBatchIds: Set<string> = new Set();

  displayedColumns: string[] = [
    'batchNumber',
    'quantityAvailable',
    'productionDate',
    'expirationDate',
    'daysUntilExpiration',
    'status',
    'costPerUnit',
    'totalCost',
    'actions'
  ];

  constructor(
    private fifoService: FIFOBatchService,
    private productsService: ProductsService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      productExternalId: ['', Validators.required],
      quantityNeeded: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.getAllProducts().subscribe({
      next: (products: any[]) => {
        this.products = products.map(p => ({
          ExternalId: p.ExternalId || p.id,
          Name: p.Name || p.name
        }));
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error loading products', 'Close', { duration: 3000 });
        console.error('Error loading products:', err);
      }
    });
  }

  queryFIFOBatches(): void {
    if (!this.form.valid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.fifoLoading = true;
    const productId = this.form.get('productExternalId')?.value;
    const quantityNeeded = this.form.get('quantityNeeded')?.value;

    this.fifoService.getFIFOBatches(productId, quantityNeeded).subscribe({
      next: (batches: FIFOBatchDto[]) => {
        this.batches = batches;
        this.selectedBatchIds.clear();
        this.selectedBatches = [];
        this.fifoLoading = false;

        if (batches.length === 0) {
          this.snackBar.open('No available batches for this product', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(`Found ${batches.length} available batches`, 'Close', { duration: 2000 });
        }
      },
      error: (err: any) => {
        this.fifoLoading = false;
        this.snackBar.open('Error loading FIFO batches', 'Close', { duration: 3000 });
        console.error('Error:', err);
      }
    });
  }

  toggleBatchSelection(batch: FIFOBatchDto): void {
    if (this.selectedBatchIds.has(batch.ExternalId)) {
      this.selectedBatchIds.delete(batch.ExternalId);
      this.selectedBatches = this.selectedBatches.filter(b => b.BatchExternalId !== batch.ExternalId);
    } else {
      this.selectedBatchIds.add(batch.ExternalId);
      this.selectedBatches.push({
        BatchExternalId: batch.ExternalId,
        QuantitySelected: Math.min(batch.QuantityAvailable, this.form.get('quantityNeeded')?.value || 0),
        ExpirationDate: batch.ExpirationDate,
        DaysUntilExpiration: batch.DaysUntilExpiration,
        TotalCost: batch.TotalCost
      });
    }
  }

  applyFIFORotation(): void {
    if (this.selectedBatches.length === 0) {
      this.snackBar.open('Please select at least one batch', 'Close', { duration: 3000 });
      return;
    }

    this.fifoLoading = true;
    const productId = this.form.get('productExternalId')?.value;
    const quantityNeeded = this.form.get('quantityNeeded')?.value;

    this.fifoService.rotateBatchesForProduction({
      ProductExternalId: productId,
      QuantityNeeded: quantityNeeded
    }).subscribe({
      next: (selectedBatches: FIFOBatchSelectionDto[]) => {
        this.selectedBatches = selectedBatches;
        this.fifoLoading = false;
        this.snackBar.open('FIFO rotation applied successfully', 'Close', { duration: 3000 });
      },
      error: (err: any) => {
        this.fifoLoading = false;
        this.snackBar.open('Error applying FIFO rotation', 'Close', { duration: 3000 });
        console.error('Error:', err);
      }
    });
  }

  getStatusColor(status: string): string {
    const statusMap: { [key: string]: string } = {
      'EXPIRED': '#d32f2f',
      'CRITICAL': '#f57c00',
      'WARNING': '#fbc02d',
      'GOOD': '#388e3c'
    };
    return statusMap[status] || '#999';
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'EXPIRED': 'error',
      'CRITICAL': 'warning',
      'WARNING': 'schedule',
      'GOOD': 'check_circle'
    };
    return iconMap[status] || 'info';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  isBatchSelected(batchId: string): boolean {
    return this.selectedBatchIds.has(batchId);
  }

  clearSelection(): void {
    this.selectedBatchIds.clear();
    this.selectedBatches = [];
    this.batches = [];
    this.form.reset();
  }
}
