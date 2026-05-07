import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { BatchService } from '../services/batch.service';

@Component({
  selector: 'app-batch-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './batch-editor.component.html',
  styleUrls: ['./batch-editor.component.css']
})
export class BatchEditorComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  batchId: string | null = null;
  isEditing = false;
  statuses = ['Active', 'Completed', 'Cancelled'];

  constructor(
    private formBuilder: FormBuilder,
    private batchService: BatchService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.formBuilder.group({
      recipeId: ['', Validators.required],
      productId: ['', Validators.required],
      quantityProduced: [0, [Validators.required, Validators.min(1)]],
      productionDate: [new Date(), Validators.required],
      expirationDate: [new Date(), Validators.required],
      costPerUnit: [0, [Validators.required, Validators.min(0)]],
      status: ['Active', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.batchId = params.get('id');
      
      if (this.batchId) {
        this.isEditing = true;
        this.loadBatch(this.batchId);
      } else {
        this.loading = false;
      }
    });
  }

  loadBatch(batchId: string): void {
    this.batchService.getBatchById(batchId).subscribe({
      next: (batch) => {
        this.form.patchValue({
          ...batch,
          productionDate: new Date(batch.productionDate),
          expirationDate: batch.expirationDate ? new Date(batch.expirationDate) : new Date()
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading batch:', err);
        this.error = err.error?.message || 'Failed to load batch';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.saving = true;
    this.error = '';

    const request = {
      ...this.form.value,
      productionDate: this.form.get('productionDate')?.value?.toISOString(),
      expirationDate: this.form.get('expirationDate')?.value?.toISOString()
    };

    const operation = this.isEditing && this.batchId
      ? this.batchService.createBatch(request)
      : this.batchService.createBatch(request);

    operation.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/batches']);
      },
      error: (err) => {
        console.error('Error saving batch:', err);
        this.error = err.error?.message || 'Failed to save batch';
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/batches']);
  }

  get quantityError(): string {
    const control = this.form.get('quantityProduced');
    if (control?.hasError('required')) return 'Quantity is required';
    if (control?.hasError('min')) return 'Quantity must be at least 1';
    return '';
  }

  get costError(): string {
    const control = this.form.get('costPerUnit');
    if (control?.hasError('required')) return 'Cost is required';
    if (control?.hasError('min')) return 'Cost cannot be negative';
    return '';
  }
}
