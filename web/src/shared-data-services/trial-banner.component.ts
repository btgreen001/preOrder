import { Component, Input, inject } from '@angular/core';

import { LicenseService } from './license.service';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [],
  template: `
    @if (shouldShow) {
      <div class="trial-banner" [class.expired]="isExpired">
        <div class="banner-content">
          <div class="banner-icon">⚠️</div>
          <div class="banner-text">
            @if (!isExpired) {
              <strong>Trial Version</strong>
            }
            @if (isExpired) {
              <strong>License Expired</strong>
            }
            @if (!isExpired) {
              <span>{{ daysLeft }} days remaining in your trial.</span>
            }
            @if (isExpired) {
              <span>Your license has expired. Some features are now restricted.</span>
            }
          </div>
          <div class="banner-actions">
            @if (!isExpired) {
              <button class="btn btn-trial" (click)="tryNow()">Try Now</button>
            }
            <button class="btn btn-upgrade" (click)="upgrade()">
              {{ isExpired ? 'Renew License' : 'Upgrade' }}
            </button>
            @if (!dismissed) {
              <button class="btn btn-close" (click)="dismiss()">×</button>
            }
          </div>
        </div>
      </div>
    }
    `,
  styles: [`
    .trial-banner {
      background: linear-gradient(135deg, #fff3cd, #ffeeba);
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      margin-bottom: 1rem;
      animation: fadeIn 0.3s ease-in;
    }

    .trial-banner.expired {
      background: linear-gradient(135deg, #f8d7da, #f5c6cb);
      border-color: #f1aeb5;
    }

    .banner-content {
      display: flex;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }

    .banner-icon {
      font-size: 1.5rem;
    }

    .banner-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .banner-text strong {
      color: #856404;
      font-weight: 600;
    }

    .trial-banner.expired .banner-text strong {
      color: #721c24;
    }

    .banner-text span {
      color: #856404;
      font-size: 0.875rem;
    }

    .trial-banner.expired .banner-text span {
      color: #721c24;
    }

    .banner-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-trial {
      background: #28a745;
      color: white;
    }

    .btn-trial:hover {
      background: #218838;
    }

    .btn-upgrade {
      background: #007bff;
      color: white;
    }

    .btn-upgrade:hover {
      background: #0056b3;
    }

    .btn-close {
      background: transparent;
      color: #856404;
      border: 1px solid #856404;
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      line-height: 1;
    }

    .trial-banner.expired .btn-close {
      color: #721c24;
      border-color: #721c24;
    }

    .btn-close:hover {
      background: rgba(0,0,0,0.1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class TrialBannerComponent {
  private licenseService = inject(LicenseService);

  @Input() feature?: string;
  @Input() alwaysShow = false;
  
  dismissed = false;
  daysLeft = 14;

  get shouldShow(): boolean {
    if (this.dismissed) return false;
    if (this.alwaysShow) return true;
    
    const tier = this.licenseService.getCurrentTier();
    return tier === 'trial' || tier === 'expired';
  }

  get isExpired(): boolean {
    return this.licenseService.isExpired();
  }

  dismiss() {
    this.dismissed = true;
    // Store dismissal in sessionStorage so it reappears on page refresh
    if (this.feature) {
      sessionStorage.setItem(`banner-dismissed-${this.feature}`, 'true');
    }
  }

  tryNow() {
    if (this.feature) {
      // Mock "try now" functionality - enable feature for 30 days
      alert(`${this.feature} trial activated for 30 days!`);
    }
  }

  upgrade() {
    // Mock upgrade functionality
    alert('Redirecting to upgrade page...');
  }
}