import { Component, inject, signal } from '@angular/core';
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

  // 🔥 Signals replacing component state
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

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

    const { newPassword, confirmPassword, email, code } = this.form.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Password and confirmation must match.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.resetPasswordWithCode({
      email: email || '',
      code: code || '',
      newPassword: newPassword || ''
    }).subscribe({
      next: res => {
        this.successMessage.set(res.message || 'Password reset successfully.');

        setTimeout(() => {
          this.isSubmitting.set(false);
          this.router.navigate(['/login']);
        }, 4500);
      },
      error: err => {
        this.errorMessage.set(
          err?.error?.message || 'Unable to reset password with that code.'
        );
        this.isSubmitting.set(false);
      }
    });
  }
}
