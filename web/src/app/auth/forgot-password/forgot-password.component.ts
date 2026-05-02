import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,

  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.requestPasswordResetCode({
      email: this.form.value.email || ''
    }).subscribe({
      next: res => {
        this.successMessage = res.message || 'If the email is valid, a reset code has been sent.';
        this.isSubmitting = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to request password reset code.';
        this.isSubmitting = false;
      }
    });
  }
}
