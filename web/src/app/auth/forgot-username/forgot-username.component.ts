import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-username',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './forgot-username.component.html',
  styleUrls: ['./forgot-username.component.scss']
})
export class ForgotUsernameComponent {
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

    this.authService.requestUsernameReminder({
      email: this.form.value.email || ''
    }).subscribe({
      next: res => {
        this.successMessage = res.message || 'If the email is valid, your username has been sent.';
        this.isSubmitting = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Unable to request username reminder.';
        this.isSubmitting = false;
      }
    });
  }
}
