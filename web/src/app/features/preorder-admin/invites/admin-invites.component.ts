import {
  Component,
  effect,
  signal,
  inject,
  OnInit,
  OnDestroy,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminOrganizationMember,
  AdminRegistrationCode,
  PreorderAdminService
} from '../services/preorder-admin.service';
import { AuthService } from '../../../core/services/auth.service';
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

  // --- Signals replacing component state ---
  codes = signal<AdminRegistrationCode[]>([]);
  members = signal<AdminOrganizationMember[]>([]);

  isLoading = signal(false);
  isMembersLoading = signal(false);
  isSaving = signal(false);
  isResending = signal(false);
  isConfirmingAction = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  newCodeEmail = signal('');
  newCodeExpiryDays = signal(7);
  copiedCodeId = signal<string | null>(null);

  passwordPromptOpen = signal(false);
  confirmPassword = signal('');
  confirmCompanyName = signal('');
  requiredCompanyName = signal('');
  requiresCompanyNameConfirmation = signal(false);

  pendingActionDescription = signal('');
  pendingAction = signal<(() => void) | null>(null);

  private refreshTimerId: ReturnType<typeof setInterval> | null = null;

  private get orgId(): string {
    return this.authService.getOrganizationId() ?? '';
  }

  ngOnInit(): void {
    this.loadCodes();
    this.loadMembers();

    // Auto-refresh using signals cleanup
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

  // --- Methods updated to use signals ---

  loadMembers(isRefresh = false): void {
    if (!isRefresh) this.isMembersLoading.set(true);

    this.preorderAdminService.getOrganizationMembers(this.orgId).subscribe({
      next: members => {
        this.members.set(members);
        this.isMembersLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(extractErrorMessage(err));
        this.isMembersLoading.set(false);
      }
    });
  }


  loadCodes(silent = false): void {
    if (!this.orgId) return;

    this.isLoading.set(!silent);
    if (!silent) {
      this.errorMessage.set('');
    }

    this.preorderAdminService.getRegistrationCodes(this.orgId).subscribe({
      next: (codes: AdminRegistrationCode[]) => {
        this.codes.set(codes);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        if (!silent) {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not load invite codes.')
          );
        }
        this.isLoading.set(false);
      }
    });
  }
  resendCode(code: AdminRegistrationCode): void {
    if (!this.orgId || !this.canResend(code) || this.isResending()) return;

    this.isResending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.preorderAdminService
      .resendRegistrationCode(this.orgId, code.codeId)
      .subscribe({
        next: () => {
          this.successMessage.set(`Invite email resent to ${code.email}.`);
          this.isResending.set(false);
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not resend invite email.')
          );
          this.isResending.set(false);
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
    if (!this.orgId || !member.isEnabled) return;

    const requiresCompanyNameConfirmation =
      this.isLastActiveCompanyAdminSelfDeactivation(member);

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
    if (!this.orgId || member.isEnabled) return;

    this.openPasswordPrompt(
      `Confirm your password to reactivate ${member.firstName} ${member.lastName} (${member.userName}).`,
      () => this.runReactivateMember(member)
    );
  }


  cancelPasswordPrompt(): void {
    this.passwordPromptOpen.set(false);
    this.pendingAction.set(null);
    this.pendingActionDescription.set('');
    this.confirmPassword.set('');
    this.confirmCompanyName.set('');
    this.requiredCompanyName.set('');
    this.requiresCompanyNameConfirmation.set(false);
    this.isConfirmingAction.set(false);
  }

  confirmSensitiveAction(): void {
    const action = this.pendingAction();
    const password = this.confirmPassword();
    const isConfirming = this.isConfirmingAction();

    if (!action || !password || isConfirming) return;

    if (this.requiresCompanyNameConfirmation() && !this.isCompanyNameConfirmationValid) {
      return;
    }

    action();
  }


  copyCode(code: AdminRegistrationCode): void {
    navigator.clipboard.writeText(code.code).then(() => {
      this.copiedCodeId.set(code.codeId);

      setTimeout(() => {
        this.copiedCodeId.set(null);
      }, 2000);
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

  pendingActionMainText = computed(() => {
    const text = this.pendingActionDescription();
    const warningMarker = 'WARNING:';
    const warningIndex = text.indexOf(warningMarker);

    if (warningIndex < 0) return text.trim();

    return text.slice(0, warningIndex).trim();
  });


  pendingActionWarningText = computed(() => {
    const text = this.pendingActionDescription();
    const warningMarker = 'WARNING:';
    const warningIndex = text.indexOf(warningMarker);

    if (warningIndex < 0) return '';

    return text.slice(warningIndex + warningMarker.length).trim();
  });

  isCompanyNameConfirmationValid = computed(() => {
    if (!this.requiresCompanyNameConfirmation()) {
      return true;
    }

    return this.confirmCompanyName() === this.requiredCompanyName();
  });


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

    return this.members()
      .filter(m => m.isEnabled && m.userRole === 'CompanyAdmin')
      .length <= 1;
  }

  private openPasswordPrompt(
    description: string,
    action: () => void,
    requiresCompanyNameConfirmation = false,
    requiredCompanyName = ''
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.pendingActionDescription.set(description);
    this.pendingAction.set(action);

    this.confirmPassword.set('');
    this.confirmCompanyName.set('');

    const needsCompanyName = requiresCompanyNameConfirmation && !!requiredCompanyName;
    this.requiresCompanyNameConfirmation.set(needsCompanyName);
    this.requiredCompanyName.set(needsCompanyName ? requiredCompanyName : '');

    this.passwordPromptOpen.set(true);
  }

  private runDeleteCode(code: AdminRegistrationCode): void {
    if (!this.orgId) return;

    this.isConfirmingAction.set(true);

    this.preorderAdminService
      .deleteRegistrationCode(this.orgId, code.codeId)
      .subscribe({
        next: () => {
          this.successMessage.set('Invite code revoked.');
          this.loadCodes(true);
          this.cancelPasswordPrompt();
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not revoke invite code.')
          );
          this.isConfirmingAction.set(false);
        }
      });
  }


  private runDeactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId) return;

    this.isConfirmingAction.set(true);

    this.preorderAdminService
      .deactivateOrganizationMember(this.orgId, member.userId, {
        password: this.confirmPassword()
      })
      .subscribe({
        next: (response: { message: string }) => {
          this.successMessage.set(response.message || 'Member deactivated.');
          this.loadMembers(true);
          this.cancelPasswordPrompt();
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not deactivate member.')
          );
          this.isConfirmingAction.set(false);
        }
      });
  }


  private runReactivateMember(member: AdminOrganizationMember): void {
    if (!this.orgId) return;

    this.isConfirmingAction.set(true);

    this.preorderAdminService
      .reactivateOrganizationMember(this.orgId, member.userId, {
        password: this.confirmPassword()
      })
      .subscribe({
        next: (response: { message: string }) => {
          this.successMessage.set(response.message || 'Member reactivated.');
          this.loadMembers(true);
          this.cancelPasswordPrompt();
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not reactivate member.')
          );
          this.isConfirmingAction.set(false);
        }
      });
  }

}
