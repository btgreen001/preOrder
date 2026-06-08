import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatSnackBarModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  isLoading = signal(true);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  profileForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    userName: [{ value: '', disabled: true }],
    currentPassword: ['', Validators.required],
    newPassword: [''],
    reenterNewPassword: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.authService.getMyProfile().subscribe({
      next: profile => {
        this.profileForm.patchValue({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          userName: profile.userName,
          currentPassword: '',
          newPassword: '',
          reenterNewPassword: ''
        });
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || 'Unable to load your profile.');
        this.isLoading.set(false);
        this.snackBar.open(this.errorMessage(), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  save(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const newPassword = this.profileForm.value.newPassword || '';
    const reenterNewPassword = this.profileForm.value.reenterNewPassword || '';
    const wantsPasswordChange = !!newPassword || !!reenterNewPassword;
    if (wantsPasswordChange && newPassword !== reenterNewPassword) {
      this.errorMessage.set('New password and re-entered password must match.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.updateMyProfile({
      email: this.profileForm.value.email || '',
      firstName: this.profileForm.value.firstName || '',
      lastName: this.profileForm.value.lastName || '',
      currentPassword: this.profileForm.value.currentPassword || '',
      newPassword: wantsPasswordChange ? newPassword : undefined,
      reenterNewPassword: wantsPasswordChange ? reenterNewPassword : undefined
    }).subscribe({
      next: res => {
        this.successMessage.set(res.message || 'Profile updated.');
        this.profileForm.patchValue({ currentPassword: '', newPassword: '', reenterNewPassword: '' });
        this.isSaving.set(false);
        this.snackBar.open(this.successMessage(), 'Close', { duration: 5000, panelClass: ['success-snackbar'] });
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || 'Unable to save your profile.');
        this.isSaving.set(false);
        this.snackBar.open(this.errorMessage(), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  get showPasswordMismatchHint(): boolean {
    const newPassword = this.profileForm.value.newPassword || '';
    const reenterNewPassword = this.profileForm.value.reenterNewPassword || '';
    return !!newPassword && !!reenterNewPassword && newPassword !== reenterNewPassword;
  }
}
