import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  // 🔥 Signals instead of component properties
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.requestPasswordResetCode({
      email: this.form.value.email || ''
    }).subscribe({
      next: res => {
        this.successMessage.set(
          res.message || 'If the email is valid, a reset code has been sent.'
        );
        this.isSubmitting.set(false);
      },
      error: err => {
        this.errorMessage.set(
          err?.error?.message || 'Unable to request password reset code.'
        );
        this.isSubmitting.set(false);
      }
    });
  }
}
