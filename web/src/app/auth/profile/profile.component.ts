import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  profileForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    userName: [{ value: '', disabled: true }]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.getMyProfile().subscribe({
      next: profile => {
        this.profileForm.patchValue({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          userName: profile.userName
        });
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to load your profile.';
        this.isLoading = false;
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar']  });
      }
    });
  }

  save(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.updateMyProfile({
      email: this.profileForm.value.email || '',
      firstName: this.profileForm.value.firstName || '',
      lastName: this.profileForm.value.lastName || ''
    }).subscribe({
      next: res => {
        this.successMessage = res.message || 'Profile updated.';
        this.isSaving = false;
        this.snackBar.open(this.successMessage, 'Close', { duration: 5000, panelClass: ['success-snackbar']  });
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to save your profile.';
        this.isSaving = false;
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar']  });
      }
    });
  }
}
