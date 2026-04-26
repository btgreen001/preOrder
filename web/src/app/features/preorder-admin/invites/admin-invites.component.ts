import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { InviteCodesService, RegistrationCode } from './invite-codes.service';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';

@Component({
  selector: 'app-admin-invites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-invites.component.html',
  styleUrl: './admin-invites.component.scss'
})
export class AdminInvitesComponent implements OnInit {
  private readonly inviteCodesService = inject(InviteCodesService);
  private readonly authService = inject(AuthService);

  codes: RegistrationCode[] = [];
  isLoading = false;
  isSaving = false;
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
    this.inviteCodesService.getCodes(this.orgId).subscribe({
      next: codes => {
        this.codes = codes;
        this.isLoading = false;
      },
      error: err => {
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

    this.inviteCodesService.createCode(this.orgId, {
      email: this.newCodeEmail || undefined,
      expiryDays: this.newCodeExpiryDays
    }).subscribe({
      next: newCode => {
        this.codes = [newCode, ...this.codes];
        this.newCodeEmail = '';
        this.newCodeExpiryDays = 7;
        this.successMessage = `Invite code created: ${newCode.code}`;
        this.isSaving = false;
      },
      error: err => {
        this.errorMessage = extractErrorMessage(err, 'Could not create invite code.');
        this.isSaving = false;
      }
    });
  }

  deleteCode(code: RegistrationCode): void {
    if (!this.orgId || code.isUsed) return;
    if (!confirm(`Revoke invite code ${code.code}? This cannot be undone.`)) return;

    this.inviteCodesService.deleteCode(this.orgId, code.codeId).subscribe({
      next: () => {
        this.codes = this.codes.filter(c => c.codeId !== code.codeId);
        this.successMessage = 'Invite code revoked.';
      },
      error: err => {
        this.errorMessage = extractErrorMessage(err, 'Could not revoke invite code.');
      }
    });
  }

  copyCode(code: RegistrationCode): void {
    navigator.clipboard.writeText(code.code).then(() => {
      this.copiedCodeId = code.codeId;
      setTimeout(() => { this.copiedCodeId = null; }, 2000);
    });
  }

  codeStatus(code: RegistrationCode): string {
    if (code.isUsed) return 'Used';
    if (code.isExpired) return 'Expired';
    return 'Active';
  }
}
