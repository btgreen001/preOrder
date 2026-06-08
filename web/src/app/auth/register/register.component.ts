import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RegisterUserRequest } from '../../core/models/auth.model';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  redirectCountdown = signal(8);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    // Use a valid test registration code from insert-test-data.sql
    const testRegistrationCode = '';
    // Generate a random unique email for x.com
    const randomEmail = '';
    this.form = this.fb.group({
      companyRegistrationCode: [testRegistrationCode, Validators.required],
      email: [randomEmail, [Validators.required, Validators.email]],
  userName: ['', Validators.required],
      password: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required]
    });

    const inviteCode = this.route.snapshot.queryParamMap.get('code');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (inviteCode) {
      this.form.patchValue({ companyRegistrationCode: inviteCode });
    }

    if (email) {
      this.form.patchValue({ email: email });
    }
  }
  submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const data: RegisterUserRequest = this.form.value;

    this.auth.registerUser(data).subscribe({
      next: () => {
        const countdownStart = 8;
        this.redirectCountdown.set(countdownStart);

        this.success.set(
          `Registration successful! Redirecting to login in ${this.redirectCountdown()}…`
        );

        const interval = setInterval(() => {
          const nextValue = this.redirectCountdown() - 1;
          this.redirectCountdown.set(nextValue);

          if (nextValue > 0) {
            this.success.set(
              `Registration successful! Redirecting to login in ${nextValue}…`
            );
          } else {
            clearInterval(interval);
            this.router.navigate(['/login']);
          }
        }, 1000);
      },

      error: (err) => {
        this.error.set(err?.error?.message || 'Registration failed.');
        this.loading.set(false);
      },

      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
