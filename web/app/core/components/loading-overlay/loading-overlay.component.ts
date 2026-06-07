import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if ((loadingService.loading$ | async)?.isLoading) {
      <div class="loading-overlay">
        <div class="loading-content">
          <mat-spinner diameter="60"></mat-spinner>
          @if ((loadingService.loading$ | async)?.message) {
            <p class="loading-message">
              {{ (loadingService.loading$ | async)?.message }}
            </p>
          }
        </div>
      </div>
    }
    `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: white;
      padding: 32px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .loading-message {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    ::ng-deep .loading-overlay mat-spinner circle {
      stroke: var(--bakery-primary, #8B4513);
    }
  `]
})
export class LoadingOverlayComponent {
  constructor(public loadingService: LoadingService) {}
}
