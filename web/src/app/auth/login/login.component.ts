import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TerminalContextService } from '../../core/services/terminal-context.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { extractErrorMessage } from '../../shared/utils/error-extractor';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private terminalContext = inject(TerminalContextService);

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  ngOnInit(): void {
    // Initialize the login form with default values for testing
    this.loginForm = this.formBuilder.group({
      username: ['demo-pre-order', Validators.required],
      password: ['password', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/events';

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }

  }

  onSubmit(): void {
    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Get terminal context and add to login request if available
    const terminalId = this.terminalContext.getTerminalId();
    const credentials = {
      ...this.loginForm.value,
      terminalId: terminalId || undefined
    };

    this.authService.login(credentials)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate([this.returnUrl]);

        },
        error: error => {
          this.isLoading = false;

          const errorMsg = extractErrorMessage(error, 'Login failed. Please check your credentials.');
          console.error('[LoginComponent] Login error:', { status: error.status, message: errorMsg });

          // Check if error mentions terminal or organization (case-insensitive)
          if (errorMsg.toLowerCase().includes('terminal') || errorMsg.toLowerCase().includes('organization')) {
            // Pass through backend message directly (it's already user-friendly)
            this.errorMessage = errorMsg;
          } else {
            this.errorMessage = errorMsg;
          }
        }
      });
  }
}
