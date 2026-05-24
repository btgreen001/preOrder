import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminOrganizationMember,
  AdminRegistrationCode,
  PreorderAdminService
} from '../services/preorder-admin.service';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';

@Component({
  selector: 'app-admin-invites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-invites.component.html',
  styleUrl: './admin-invites.component.scss'
})
export class AdminInvitesComponent implements OnInit, OnDestroy {
  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly authService = inject(AuthService);

  codes: AdminRegistrationCode[] = [];
  members: AdminOrganizationMember[] = [];
  isLoading = false;
  isMembersLoading = false;
  isSaving = false;
  isResending = false;
  isConfirmingAction = false;
  errorMessage = '';
  successMessage = '';

  newCodeEmail = '';
  newCodeExpiryDays = 7;
  copiedCodeId: string | null = null;

  passwordPromptOpen = false;
  confirmPassword = '';
  confirmCompanyName = '';
  requiredCompanyName = '';
  requiresCompanyNameConfirmation = false;
  pendingActionDescription = '';
  private pendingAction: (() => void) | null = null;
  private refreshTimerId: ReturnType<typeof setInterval> | null = null;

  private get orgId(): string {
    return this.authService.getOrganizationId() ?? '';
  }

  ngOnInit(): void {
    this.loadCodes();
    this.loadMembers();

    // Keep status/used-on fresh while admin stays on this screen.
    this.refreshTimerId = setInterval(() => {
      this.loadCodes(true);
      this.loadMembers(true);
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  loadCodes(silent = false): void {
    if (!this.orgId) return;
    this.isLoading = !silent;
    if (!silent) {
      this.errorMessage = '';
    }

    this.preorderAdminService.getRegistrationCodes(this.orgId).subscribe({
      next: (codes: AdminRegistrationCode[]) => {
        this.codes = codes;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        if (!silent) {
          this.errorMessage = extractErrorMessage(err, 'Could not load invite codes.');
        }
        this.isLoading = false;
      }
    });
  }

  loadMembers(silent = false): void {
    if (!this.orgId) return;
    this.isMembersLoading = !silent;
    if (!silent) {
      this.errorMessage = '';
    }

    this.preorderAdminService.getOrganizationMembers(this.orgId).subscribe({
      next: (members: AdminOrganizationMember[]) => {
        this.members = members;
        this.isMembersLoading = false;
      },
      error: (err: unknown) => {
        if (!silent) {
          this.errorMessage = extractErrorMessage(err, 'Could not load organization members.');
        }
        this.isMembersLoading = false;
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
        this.newCodeEmail = '';
        this.newCodeExpiryDays = 7;
        this.successMessage = newCode.emailSent
          ? `Invite code created and email sent: ${newCode.code}`
          : `Invite code created: ${newCode.code}`;
        this.loadCodes(true);
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
    this.openPasswordPrompt(
      `Confirm your password to revoke invite code ${code.code}.`,
      () => this.runDeleteCode(code)
    );
  }

  deactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId || !member.isEnabled) {
      return;
    }

    const requiresCompanyNameConfirmation = this.isLastActiveCompanyAdminSelfDeactivation(member);
    const requiredCompanyName = requiresCompanyNameConfirmation
      ? (this.authService.currentUserValue?.organizationName ?? '')
      : '';

    this.openPasswordPrompt(
      this.getDeactivatePrompt(member),
      () => this.runDeactivateMember(member),
      requiresCompanyNameConfirmation,
      requiredCompanyName
    );
  }

  reactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId || member.isEnabled) {
      return;
    }

    this.openPasswordPrompt(
      `Confirm your password to reactivate ${member.firstName} ${member.lastName} (${member.userName}).`,
      () => this.runReactivateMember(member)
    );
  }

  cancelPasswordPrompt(): void {
    this.passwordPromptOpen = false;
    this.pendingAction = null;
    this.pendingActionDescription = '';
    this.confirmPassword = '';
    this.confirmCompanyName = '';
    this.requiredCompanyName = '';
    this.requiresCompanyNameConfirmation = false;
    this.isConfirmingAction = false;
  }

  confirmSensitiveAction(): void {
    if (!this.pendingAction || !this.confirmPassword || this.isConfirmingAction) {
      return;
    }

    if (this.requiresCompanyNameConfirmation && !this.isCompanyNameConfirmationValid) {
      return;
    }

    this.pendingAction();
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

  memberStatus(member: AdminOrganizationMember): string {
    return member.isEnabled ? 'Active' : 'Deactivated';
  }

  get pendingActionMainText(): string {
    const warningMarker = 'WARNING:';
    const warningIndex = this.pendingActionDescription.indexOf(warningMarker);
    if (warningIndex < 0) {
      return this.pendingActionDescription;
    }

    return this.pendingActionDescription.slice(0, warningIndex).trim();
  }

  get pendingActionWarningText(): string {
    const warningMarker = 'WARNING:';
    const warningIndex = this.pendingActionDescription.indexOf(warningMarker);
    if (warningIndex < 0) {
      return '';
    }

    return this.pendingActionDescription.slice(warningIndex + warningMarker.length).trim();
  }

  get isCompanyNameConfirmationValid(): boolean {
    if (!this.requiresCompanyNameConfirmation) {
      return true;
    }

    return this.confirmCompanyName === this.requiredCompanyName;
  }

  private getDeactivatePrompt(member: AdminOrganizationMember): string {
    const isSelf = member.userId === this.authService.currentUserValue?.userId;
    if (!isSelf) {
      return `Confirm your password to deactivate ${member.firstName} ${member.lastName} (${member.userName}).`;
    }

    const isLastActiveCompanyAdmin = this.isLastActiveCompanyAdminSelfDeactivation(member);

    if (isLastActiveCompanyAdmin) {
      return 'Confirm your password to deactivate your own account. WARNING: You are the last active Company Administrator, so this will also deactivate the organization.';
    }

    return 'Confirm your password to deactivate your own account.';
  }

  private isLastActiveCompanyAdminSelfDeactivation(member: AdminOrganizationMember): boolean {
    const isSelf = member.userId === this.authService.currentUserValue?.userId;
    if (!isSelf || member.userRole !== 'CompanyAdmin') {
      return false;
    }

    return this.members.filter(m => m.isEnabled && m.userRole === 'CompanyAdmin').length <= 1;
  }

  private openPasswordPrompt(
    description: string,
    action: () => void,
    requiresCompanyNameConfirmation = false,
    requiredCompanyName = ''
  ): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.pendingActionDescription = description;
    this.pendingAction = action;
    this.confirmPassword = '';
    this.confirmCompanyName = '';
    this.requiresCompanyNameConfirmation = requiresCompanyNameConfirmation && !!requiredCompanyName;
    this.requiredCompanyName = this.requiresCompanyNameConfirmation ? requiredCompanyName : '';
    this.passwordPromptOpen = true;
  }

  private runDeleteCode(code: AdminRegistrationCode): void {
    if (!this.orgId) return;

    this.isConfirmingAction = true;
    this.preorderAdminService.deleteRegistrationCode(this.orgId, code.codeId).subscribe({
      next: () => {
        this.successMessage = 'Invite code revoked.';
        this.loadCodes(true);
        this.cancelPasswordPrompt();
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not revoke invite code.');
        this.isConfirmingAction = false;
      }
    });
  }

  private runDeactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId) return;

    this.isConfirmingAction = true;
    this.preorderAdminService.deactivateOrganizationMember(this.orgId, member.userId, { password: this.confirmPassword }).subscribe({
      next: (response: { message: string }) => {
        this.successMessage = response.message || 'Member deactivated.';
        this.loadMembers(true);
        this.cancelPasswordPrompt();
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not deactivate member.');
        this.isConfirmingAction = false;
      }
    });
  }

  private runReactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId) return;

    this.isConfirmingAction = true;
    this.preorderAdminService.reactivateOrganizationMember(this.orgId, member.userId, { password: this.confirmPassword }).subscribe({
      next: (response: { message: string }) => {
        this.successMessage = response.message || 'Member reactivated.';
        this.loadMembers(true);
        this.cancelPasswordPrompt();
      },
      error: (err: unknown) => {
        this.errorMessage = extractErrorMessage(err, 'Could not reactivate member.');
        this.isConfirmingAction = false;
      }
    });
  }
}
