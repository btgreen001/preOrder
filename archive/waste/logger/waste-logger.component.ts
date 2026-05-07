import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

import { WasteService } from '../services/waste.service';

@Component({
  selector: 'app-waste-logger',
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
    MatIconModule,
    RouterModule
  ],
  templateUrl: './waste-logger.component.html',
  styleUrls: ['./waste-logger.component.css']
})
export class WasteLoggerComponent {
  form!: FormGroup;
  saving = false;
  error = '';
  success = '';
  wasteReasons = ['Spoilage', 'Quality', 'Discrepancy', 'Other'];

  constructor(
    private formBuilder: FormBuilder,
    private wasteService: WasteService
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.formBuilder.group({
      batchId: [''],
      inventoryItemId: [''],
      quantityWasted: [0, [Validators.required, Validators.min(0.01)]],
      unit: ['pieces', Validators.required],
      wasteReason: ['Quality', Validators.required],
      wasteCost: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const request = this.form.value;

    this.wasteService.logWasteEvent(request).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Waste event logged successfully!';
        this.form.reset();
        this.initializeForm();
        setTimeout(() => {
          this.success = '';
        }, 5000);
      },
      error: (err) => {
        console.error('Error logging waste:', err);
        this.error = err.error?.message || 'Failed to log waste event';
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.form.reset();
    this.error = '';
    this.success = '';
    this.initializeForm();
  }

  get quantityError(): string {
    const control = this.form.get('quantityWasted');
    if (control?.hasError('required')) return 'Quantity is required';
    if (control?.hasError('min')) return 'Quantity must be greater than 0';
    return '';
  }

  get costError(): string {
    const control = this.form.get('wasteCost');
    if (control?.hasError('required')) return 'Cost is required';
    if (control?.hasError('min')) return 'Cost cannot be negative';
    return '';
  }
}
