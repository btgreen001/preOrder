import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminRegistrationCode, PreorderAdminService } from '../services/preorder-admin.service';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';

@Component({
  selector: 'app-admin-invites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-invites.component.html',
  styleUrl: './admin-invites.component.scss'
})
export class AdminInvitesComponent implements OnInit {
  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly authService = inject(AuthService);

  codes: AdminRegistrationCode[] = [];
  isLoading = false;
  isSaving = false;
  isResending = false;
  errorMessage = '';
  successMessage = '';

  newCodeEmail = '';
  newCodeExpiryDays = 7;
  copiedCodeId: string | null = null;

  private get orgId(): string {
    return this.authService.getOrganizationId() ?? '';
  }

  ngOnInit(): void {
    this.loadCodes();
  }

  loadCodes(): void {
    if (!this.orgId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.preorderAdminService.getRegistrationCodes(this.orgId).subscribe({
      next: (codes: AdminRegistrationCode[]) => {
        this.codes = codes;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not load invite codes.');
        this.isLoading = false;
      }
    });
  }

  generateCode(): void {
    if (!this.orgId) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.preorderAdminService.createRegistrationCode(this.orgId, {
      email: this.newCodeEmail || undefined,
      expiryDays: this.newCodeExpiryDays
    }).subscribe({
      next: (newCode: AdminRegistrationCode) => {
        this.codes = [newCode, ...this.codes];
        this.newCodeEmail = '';
        this.newCodeExpiryDays = 7;
        this.successMessage = newCode.emailSent
          ? `Invite code created and email sent: ${newCode.code}`
          : `Invite code created: ${newCode.code}`;
        this.isSaving = false;
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not create invite code.');
        this.isSaving = false;
      }
    });
  }

  resendCode(code: AdminRegistrationCode): void {
    if (!this.orgId || !this.canResend(code) || this.isResending) return;

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.preorderAdminService.resendRegistrationCode(this.orgId, code.codeId).subscribe({
      next: () => {
        this.successMessage = `Invite email resent to ${code.email}.`;
        this.isResending = false;
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not resend invite email.');
        this.isResending = false;
      }
    });
  }

  deleteCode(code: AdminRegistrationCode): void {
    if (!this.orgId || code.isUsed) return;
    if (!confirm(`Revoke invite code ${code.code}? This cannot be undone.`)) return;

    this.preorderAdminService.deleteRegistrationCode(this.orgId, code.codeId).subscribe({
      next: () => {
        this.codes = this.codes.filter(c => c.codeId !== code.codeId);
        this.successMessage = 'Invite code revoked.';
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not revoke invite code.');
      }
    });
  }

  copyCode(code: AdminRegistrationCode): void {
    navigator.clipboard.writeText(code.code).then(() => {
      this.copiedCodeId = code.codeId;
      setTimeout(() => { this.copiedCodeId = null; }, 2000);
    });
  }

  canResend(code: AdminRegistrationCode): boolean {
    return !code.isUsed && !code.isExpired && !!code.email;
  }

  codeStatus(code: AdminRegistrationCode): string {
    if (code.isUsed) return 'Used';
    if (code.isExpired) return 'Expired';
    return 'Active';
  }
}
