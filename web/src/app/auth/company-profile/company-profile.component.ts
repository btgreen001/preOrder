import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CompanyProfile, UpdateCompanyProfileRequest } from '../../core/models/auth.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss']
})
export class CompanyProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(true);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

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
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.getMyCompanyProfile().pipe(take(1)).subscribe({
      next: data => {
        const profile = data as CompanyProfile;
        this.form.patchValue({
          organizationName: profile.organizationName ?? '',
          primaryEmail: profile.primaryEmail ?? '',
          contactPhone: profile.contactPhone ?? '',
          addressLine1: profile.addressLine1 ?? '',
          addressLine2: profile.addressLine2 ?? '',
          addressLine3: profile.addressLine3 ?? '',
          locality: profile.locality ?? '',
          region: profile.region ?? '',
          postalCode: profile.postalCode ?? '',
          countryCode: profile.countryCode ?? '',
          currentPassword: ''
        });
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || 'Unable to load company profile.');
        this.isLoading.set(false);
        this.snackBar.open(this.errorMessage(), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.updateMyCompanyProfile(this.form.getRawValue() as UpdateCompanyProfileRequest).subscribe({
      next: res => {
        this.successMessage.set(res.message || 'Company profile updated.');
        this.form.patchValue({ currentPassword: '' });
        this.isSaving.set(false);
        this.snackBar.open(this.successMessage(), 'Close', { duration: 5000, panelClass: ['success-snackbar'] });
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || 'Unable to update company profile.');
        this.isSaving.set(false);
        this.snackBar.open(this.errorMessage(), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }
}
