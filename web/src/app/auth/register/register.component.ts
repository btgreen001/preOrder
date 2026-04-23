import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RegisterUserRequest } from '../../core/models/auth.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    // Use a valid test registration code from insert-test-data.sql
    const testRegistrationCode = 'INVITE-ENT-001';
    // Generate a random unique email for x.com
    const randomEmail = `user${Math.floor(Math.random() * 1000000)}@x.com`;
    this.form = this.fb.group({
      companyRegistrationCode: [testRegistrationCode, Validators.required],
      email: [randomEmail, [Validators.required, Validators.email]],
  userName: ['testuser', Validators.required],
      password: ['password', Validators.required],
      firstName: ['Test', Validators.required],
      lastName: ['User', Validators.required]
    });
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
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
