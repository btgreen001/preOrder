import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-username',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-username.component.html',
  styleUrls: ['./forgot-username.component.scss']
})
export class ForgotUsernameComponent {
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

    this.authService.requestUsernameReminder({
      email: this.form.value.email || ''
    }).subscribe({
      next: res => {
        this.successMessage.set(
          res.message || 'If the email is valid, your username has been sent.'
        );
        this.isSubmitting.set(false);
      },
      error: err => {
        this.errorMessage.set(
          err?.error?.message || 'Unable to request username reminder.'
        );
        this.isSubmitting.set(false);
      }
    });
  }
}
