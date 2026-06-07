import { Component, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule
],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const newPassword = this.form.value.newPassword || '';
    const confirmPassword = this.form.value.confirmPassword || '';
    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Password and confirmation must match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPasswordWithCode({
      email: this.form.value.email || '',
      code: this.form.value.code || '',
      newPassword
    }).subscribe({
      next: res => {
        this.successMessage = res.message || 'Password reset successfully.';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to reset password with that code.';
        this.isSubmitting = false;
      }
    });
  }
}
