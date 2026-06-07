import { Component } from '@angular/core';
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
  loading = false;
  error: string | null = null;
  success: string | null = null;

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
    this.loading = true;
    this.error = null;
    this.success = null;
    const data: RegisterUserRequest = this.form.value;
    this.auth.registerUser(data).subscribe({
      next: (resp) => {
        this.success = 'Registration successful! You may now log in.';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Registration failed.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
