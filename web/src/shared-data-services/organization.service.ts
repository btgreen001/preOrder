
// shared-data-services/organization.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private organizationId: string | null = null;

  constructor() {
    this.initializeFromToken();
  }

  /**
   * Extract and cache organization ID from JWT token
   */
  private initializeFromToken(): void {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found');
        return;
      }

      // Decode JWT (third part: payload)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT format');
        return;
      }

      const decoded = JSON.parse(atob(parts[1]));
      this.organizationId = decoded['organization_id'] || null;

      if (!this.organizationId) {
        console.error('No organization_id claim in JWT token');
      }
    } catch (error) {
      console.error('Failed to decode JWT:', error);
    }
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string {
    if (!this.organizationId) {
      console.error('Organization ID not available');
      // Fallback: try to re-extract from token
      this.initializeFromToken();
    }
    return this.organizationId || '';
  }

  /**
   * Validate that a resource belongs to current organization
   */
  validateOwnership(resourceOrgId: string): boolean {
    const currentOrgId = this.getOrganizationId();
    return currentOrgId === resourceOrgId;
  }

  /**
   * Clear on logout
   */
  clearOrganizationId(): void {
    this.organizationId = null;
  }
}