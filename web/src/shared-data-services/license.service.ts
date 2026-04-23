import { Injectable, inject } from '@angular/core';
import { AuthService } from '../app/core/services/auth.service';

export type LicenseTier = 'trial' | 'basic' | 'standard' | 'pro' | 'enterprise' | 'expired';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private authService = inject(AuthService);

  getCurrentTier(): string {
    const user = this.authService.currentUserValue;
    return user?.licenseTier || 'trial';
  }

  setTier(tier: LicenseTier) {
    // This method is kept for backward compatibility but doesn't do much now
    // since license tiers come from the authenticated user
    console.warn('LicenseService.setTier() is deprecated. License tiers are managed by authentication.');
  }

  isFeatureGated(feature: string): boolean {
    // Example: restrict advanced features to pro/enterprise
    const tier = this.getCurrentTier();
    const gatedFeatures: Record<string, string[]> = {
      'analytics': ['pro', 'enterprise'],
      'dataExport': ['enterprise'],
      'pdfExport': ['standard', 'pro', 'enterprise'],
      'communicationHub': ['standard', 'pro', 'enterprise']
    };
    return gatedFeatures[feature]?.includes(tier) === false;
  }

  isTrial(): boolean {
    const currentRole = this.authService.currentUserValue?.role;
    // Customers are never in trial
    if (currentRole === 'customer' || currentRole === 'admin') return false;
    return this.getCurrentTier() === 'trial';
  }

  isExpired(): boolean {
    return this.getCurrentTier() === 'expired';
  }
}
