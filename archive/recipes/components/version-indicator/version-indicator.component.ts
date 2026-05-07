import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-version-indicator',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="version-indicator">
      <span class="version-label">Version</span>
      
      <span *ngIf="activeVersion" class="badge badge-active" matTooltip="Active Published Version">
        <mat-icon>check_circle</mat-icon>
        {{ activeVersion }}
      </span>
      
      <span *ngIf="pendingVersion && pendingVersion !== activeVersion" 
            class="badge badge-pending" 
            matTooltip="Pending Changes (Unsaved)">
        <mat-icon>edit</mat-icon>
        {{ pendingVersion }}
      </span>
      
      <button *ngIf="pendingVersion && pendingVersion !== activeVersion"
              mat-icon-button 
              (click)="onSwitchVersion()"
              matTooltip="Switch to Active Version"
              class="switch-btn">
        <mat-icon>swap_horiz</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .version-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .version-label {
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .badge-active {
      background-color: #4caf50;
      color: white;
    }

    .badge-pending {
      background-color: #ff9800;
      color: white;
    }

    .switch-btn {
      margin-left: 8px;
    }
  `]
})
export class VersionIndicatorComponent implements OnInit {
  @Input() activeVersion: string | null = null;
  @Input() pendingVersion: string | null = null;
  @Input() isEditable: boolean = true;

  @Output() switchVersion = new EventEmitter<string>();

  ngOnInit(): void {
    if (!this.pendingVersion) {
      this.pendingVersion = this.activeVersion;
    }
  }

  onSwitchVersion(): void {
    if (this.activeVersion) {
      this.switchVersion.emit(this.activeVersion);
    }
  }
}
