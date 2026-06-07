import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { InventoryService, InventorySettings } from '../inventory.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="settings-container">
      <header class="page-header">
        <h1>Inventory Settings</h1>
        <p>Configure system preferences, thresholds, and notifications</p>
      </header>
    
      @if (loading) {
        <div class="loading">
          <p>Loading settings...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadSettings()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <form (ngSubmit)="saveSettings()" #settingsForm="ngForm">
          <div class="settings-section">
            <h3>Inventory Thresholds</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="defaultReorderPoint">Default Reorder Point:</label>
                <input type="number" id="defaultReorderPoint" [(ngModel)]="settings.defaultReorderPoint" name="defaultReorderPoint" min="1" required>
                <small>Default reorder point for new items</small>
              </div>
              <div class="form-group">
                <label for="lowStockThreshold">Low Stock Alert Threshold (%):</label>
                <input type="number" id="lowStockThreshold" [(ngModel)]="settings.lowStockThreshold" name="lowStockThreshold" min="1" max="100" required>
                <small>Percentage of reorder point to trigger alerts</small>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="expiringSoonDays">Expiring Soon Alert (Days):</label>
                <input type="number" id="expiringSoonDays" [(ngModel)]="settings.expiringSoonDays" name="expiringSoonDays" min="1" required>
                <small>Days before expiration to show alerts</small>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>Automation</h3>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="settings.autoReorderEnabled" name="autoReorderEnabled">
                  <span class="checkmark"></span>
                  Enable Automatic Reordering
                </label>
                <small>Automatically create orders when items reach reorder point</small>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>Notifications</h3>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="settings.emailNotifications" name="emailNotifications">
                  <span class="checkmark"></span>
                  Email Notifications
                </label>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="settings.smsNotifications" name="smsNotifications">
                  <span class="checkmark"></span>
                  SMS Notifications
                </label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="notificationEmail">Notification Email:</label>
                <input type="email" id="notificationEmail" [(ngModel)]="settings.notificationEmail" name="notificationEmail" required>
                <small>Email address for notifications</small>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>System Preferences</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="currency">Currency:</label>
                <select id="currency" [(ngModel)]="settings.currency" name="currency" required>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="dateFormat">Date Format:</label>
                <select id="dateFormat" [(ngModel)]="settings.dateFormat" name="dateFormat" required>
                  <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                  <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                  <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                </select>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>Data Management</h3>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="settings.autoBackupEnabled" name="autoBackupEnabled">
                  <span class="checkmark"></span>
                  Enable Automatic Backups
                </label>
              </div>
              @if (settings.autoBackupEnabled) {
                <div class="form-group">
                  <label for="backupFrequency">Backup Frequency:</label>
                  <select id="backupFrequency" [(ngModel)]="settings.backupFrequency" name="backupFrequency" required>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              }
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="!settingsForm.valid || !hasChanges()">
              Save Settings
            </button>
            <button type="button" class="btn-secondary" (click)="resetSettings()">
              Reset to Defaults
            </button>
          </div>
        </form>
      }
    
      @if (saveSuccess) {
        <div class="success-message">
          <p>✅ Settings saved successfully!</p>
        </div>
      }
    </div>
    `,
  styles: [`
    .settings-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header {
      margin-bottom: 30px;
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 600;
    }
    .page-header p {
      color: var(--bakery-text-muted);
      margin: 0;
      font-size: 1.1rem;
    }
    .settings-section {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      margin-bottom: 20px;
      border: 1px solid var(--bakery-accent);
    }
    .settings-section h3 {
      margin: 0 0 20px;
      color: var(--bakery-text-emph);
      font-size: 1.25rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }
    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    .form-group {
      flex: 1;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
    }
    .form-group small {
      display: block;
      margin-top: 5px;
      color: var(--bakery-text-muted);
      font-size: 0.8rem;
    }
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-weight: normal;
    }
    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }
    .checkmark {
      width: 16px;
      height: 16px;
      border: 2px solid var(--bakery-accent);
      border-radius: 3px;
      background: var(--bakery-bg);
      position: relative;
    }
    .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: -2px;
      left: 1px;
      color: var(--bakery-accent);
      font-size: 12px;
      font-weight: bold;
    }
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--bakery-accent);
    }
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
    }
    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-primary:hover, .btn-secondary:hover {
      opacity: 0.9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      cursor: not-allowed;
    }
    .loading, .error {
      text-align: center;
      padding: 40px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .error p {
      color: var(--bakery-error);
      margin-bottom: 15px;
    }
    .success-message {
      text-align: center;
      padding: 20px;
      background: var(--bakery-success);
      color: white;
      border-radius: 8px;
      margin-top: 20px;
      font-weight: 600;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  saveSuccess = false;
  settings: InventorySettings = {
    defaultReorderPoint: 25,
    lowStockThreshold: 20,
    expiringSoonDays: 30,
    autoReorderEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    notificationEmail: 'inventory@bakery.com',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    autoBackupEnabled: true,
    backupFrequency: 'weekly'
  };

  originalSettings: InventorySettings = { ...this.settings };

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.error = '';
    this.saveSuccess = false;

    this.inventoryService.getSettings().subscribe({
      next: (settings) => {
        this.settings = { ...settings };
        this.originalSettings = { ...settings };
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load settings. Please try again.';
        this.loading = false;
        console.error('Error loading settings:', err);
      }
    });
  }

  saveSettings() {
    this.inventoryService.updateSettings(this.settings).subscribe({
      next: (updatedSettings) => {
        this.settings = { ...updatedSettings };
        this.originalSettings = { ...updatedSettings };
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        alert('Failed to save settings. Please try again.');
        console.error('Error saving settings:', err);
      }
    });
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = {
        defaultReorderPoint: 25,
        lowStockThreshold: 20,
        expiringSoonDays: 30,
        autoReorderEnabled: false,
        emailNotifications: true,
        smsNotifications: false,
        notificationEmail: 'inventory@bakery.com',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        autoBackupEnabled: true,
        backupFrequency: 'weekly'
      };
    }
  }

  hasChanges(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }
}