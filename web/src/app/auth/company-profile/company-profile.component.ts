import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UpdateCompanyProfileRequest } from '../../core/models/auth.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss']
})
export class CompanyProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    organizationName: ['', Validators.required],
    primaryEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
    contactPhone: [''],
    addressLine1: [''],
    addressLine2: [''],
    addressLine3: [''],
    locality: [''],
    region: [''],
    postalCode: [''],
    countryCode: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.getMyCompanyProfile().subscribe({
      next: data => {
        this.form.patchValue({
          ...data,
          currentPassword: ''
        });
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to load company profile.';
        this.isLoading = false;
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar']  });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.updateMyCompanyProfile(this.form.getRawValue() as UpdateCompanyProfileRequest).subscribe({
      next: res => {
        this.successMessage = res.message || 'Company profile updated.';
        this.form.patchValue({ currentPassword: '' });
        this.isSaving = false;
        this.snackBar.open(this.successMessage, 'Close', { duration: 5000, panelClass: ['success-snackbar']  });
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to update company profile.';
        this.isSaving = false;
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar']  });
      }
    });
  }
}
