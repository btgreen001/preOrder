import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-override-status-dialog',
  standalone: true,
  styleUrl: './preorder-orders-admin.component.scss',
  imports: [CommonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Override Status</h2>

    <mat-dialog-content>
    <p>Current status: <strong>{{ data.currentStatus }}</strong></p>

    <label>
        New Status
        <select
        [value]="newStatus()"
        (change)="newStatus.set($any($event.target).value)"
        >
        @for (s of allStatuses; track s) {
            <option [value]="s">{{ s }}</option>
        }
        </select>
    </label>

    <p>
        <label>
        Reason
        <textarea
            [value]="reason()"
            (input)="reason.set($any($event.target).value)"
        ></textarea>
        </label>
    </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
    <button
        type="button"
        (click)="dialogRef.close()"
    >
        Cancel
    </button>

    <button
        type="button"
        (click)="confirm()"
        [disabled]="!reason()"
    >
        Confirm Override
    </button>
    </mat-dialog-actions>

  `
})
export class OverrideStatusDialogComponent {
  dialogRef = inject(MatDialogRef<OverrideStatusDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  allStatuses = ['SUBMITTED', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

  // Signals instead of ngModel
  newStatus = signal(this.data.currentStatus);
  reason = signal('');

  confirm() {
    this.dialogRef.close({
      status: this.newStatus(),
      reason: this.reason()
    });
  }
}
