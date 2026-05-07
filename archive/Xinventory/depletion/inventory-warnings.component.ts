import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { InventoryDepletionService, InventoryAlertDto } from '../services/inventory-depletion.service';

@Component({
  selector: 'app-inventory-warnings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './inventory-warnings.component.html',
  styleUrls: ['./inventory-warnings.component.css']
})
export class InventoryWarningsComponent implements OnInit {
  lowStockAlerts: InventoryAlertDto[] = [];
  expiringAlerts: InventoryAlertDto[] = [];
  expiredAlerts: InventoryAlertDto[] = [];
  loading = false;

  constructor(
    private depletionService: InventoryDepletionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.depletionService.getInventoryAlerts().subscribe({
      next: (alerts) => {
        this.lowStockAlerts = alerts.filter(a => a.alertType === 'LOW_STOCK');
        this.expiringAlerts = alerts.filter(a => a.alertType === 'EXPIRING_SOON');
        this.expiredAlerts = alerts.filter(a => a.alertType === 'EXPIRED');
        this.loading = false;
        this.snackBar.open('Loaded ' + alerts.length + ' inventory alerts', 'Close', { duration: 3000 });
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error loading alerts: ' + (err?.message || 'Unknown error'), 'Close', { duration: 3000 });
      }
    });
  }

  refreshAlerts(): void {
    this.loadAlerts();
  }
}
