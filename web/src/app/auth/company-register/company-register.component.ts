import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RegisterCompanyRequest } from '../../core/models/auth.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface LicenseTier {
  value: string;
  name: string;
  description: string;
  features: string[];
  isRecommended: boolean;
}

@Component({
  selector: 'app-company-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './company-register.component.html',
  styleUrls: ['./company-register.component.scss']
})
export class CompanyRegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  companyRegisterForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  licenseTiers: LicenseTier[] = [
    {
      value: 'Basic',
      name: 'Basic',
      description: 'For small teams with basic needs',
      features: [
        '1 user',
        'Basic order management',
        'Email support'
      ],
      isRecommended: false
    },
    {
      value: 'Standard',
      name: 'Standard',
      description: 'For growing businesses',
      features: [
        'Up to 5 users',
        'Advanced order management',
        'Basic reporting',
        'Priority email support'
      ],
      isRecommended: false
    },
    {
      value: 'Professional',
      name: 'Professional',
      description: 'For established businesses with complex needs',
      features: [
        'Up to 25 users',
        'Advanced reporting',
        'API access',
        'Phone support',
        'Custom fields'
      ],
      isRecommended: true
    },
    {
      value: 'Enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      features: [
        'Unlimited users',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantees',
        'White labeling',
        'Advanced security features'
      ],
      isRecommended: false
    }
  ];

  constructor() {
    this.companyRegisterForm = this.fb.group({
      // Company information
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      addressLine3: [''],
      locality: ['', Validators.required], // City
      region: ['', Validators.required], // State/Province
      postalCode: ['', Validators.required],
      countryCode: ['', Validators.required],
      
      // License tier
      licenseTier: ['Professional', Validators.required], // Default to recommended tier
      
      // Admin account
      adminFirstName: ['', Validators.required],
      adminLastName: ['', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminUsername: ['', Validators.required],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.companyRegisterForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.companyRegisterForm.value;
    // Convert licenseTier string to enum index
    const licenseTierEnumMap: Record<string, number> = {
      'Basic': 0,
      'Standard': 1,
      'Professional': 2,
      'Enterprise': 3
    };
    // Prepare company registration request that matches the RegisterCompanyRequest interface
    const companyRegistration: RegisterCompanyRequest = {
      companyName: formValue.companyName,
      email: formValue.email,
      addressLine1: formValue.addressLine1,
      addressLine2: formValue.addressLine2,
      addressLine3: formValue.addressLine3,
      locality: formValue.locality,
      region: formValue.region,
      postalCode: formValue.postalCode,
      countryCode: formValue.countryCode,
      licenseTier: licenseTierEnumMap[formValue.licenseTier],
      adminEmail: formValue.adminEmail,
      adminUsername: formValue.adminUsername,
      adminPassword: formValue.adminPassword,
      adminFirstName: formValue.adminFirstName,
      adminLastName: formValue.adminLastName
    };

    this.authService.registerCompany(companyRegistration).subscribe({
      next: () => {
        this.isLoading = false;
        // Navigate to dashboard or confirmation page
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error && error.error.errors) {
          // Collect all validation errors into a single string
          const errorsObj = error.error.errors;
          this.errorMessage = Object.keys(errorsObj)
            .map(key => Array.isArray(errorsObj[key]) ? errorsObj[key].join(' ') : errorsObj[key])
            .join(' ');
        } else if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to the server. Please check if the API is running.';
        } else {
          this.errorMessage = `Error (${error.status}): ${error.statusText || 'An error occurred during registration. Please try again.'}`;
        }
        console.error('Registration error:', error);
      }
    });
  }
}
