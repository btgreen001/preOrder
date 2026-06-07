import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="scan-container">
      <header class="page-header">
        <h1>Inventory Scanning</h1>
        <p class="subtitle">Use barcode/QR scanning for fast inventory operations</p>
      </header>
    
      <div class="scan-modes">
        <div class="mode-card" [class.active]="activeMode === 'receive'" (click)="setMode('receive')">
          <div class="icon">📦</div>
          <h3>Receive Items</h3>
          <p>Scan items being delivered</p>
        </div>
        <div class="mode-card" [class.active]="activeMode === 'count'" (click)="setMode('count')">
          <div class="icon">📋</div>
          <h3>Physical Count</h3>
          <p>Update inventory counts</p>
        </div>
        <div class="mode-card" [class.active]="activeMode === 'waste'" (click)="setMode('waste')">
          <div class="icon">🗑️</div>
          <h3>Record Waste</h3>
          <p>Track spoiled/damaged items</p>
        </div>
      </div>
    
      @if (activeMode) {
        <div class="scan-area">
          <div class="scanner-view">
            <div class="camera-frame">
              <div class="scan-line"></div>
              <p>Position barcode/QR code in frame</p>
            </div>
            <button class="scan-btn" (click)="startScan()">
              {{ isScanning ? 'Stop Scanning' : 'Start Camera' }}
            </button>
          </div>
          <div class="manual-entry">
            <h3>Manual Entry</h3>
            <input type="text" placeholder="Enter barcode manually" [(ngModel)]="manualBarcode">
            <button (click)="processBarcode(manualBarcode)">Process</button>
          </div>
        </div>
      }
    
      @if (recentScans.length) {
        <div class="recent-scans">
          <h3>Recent Scans</h3>
          @for (scan of recentScans; track scan) {
            <div class="scan-item">
              <span class="item-name">{{ scan.itemName }}</span>
              <span class="quantity">{{ scan.quantity }} {{ scan.unit }}</span>
              <span class="timestamp">{{ scan.timestamp }}</span>
              <button (click)="undoScan(scan.id)">Undo</button>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .scan-container { 
      padding: 20px; 
      max-width: 800px; 
      margin: 0 auto; 
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header { 
      text-align: center; 
      margin-bottom: 30px; 
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      font-size: 2rem;
      margin: 0 0 0.5rem;
    }
    .page-header p {
      color: var(--bakery-text-muted);
      margin: 0;
    }
    .scan-modes { display: flex; gap: 20px; margin-bottom: 30px; }
    .mode-card { 
      flex: 1; 
      padding: 20px; 
      border: 2px solid var(--bakery-accent); 
      border-radius: 12px; 
      text-align: center; 
      cursor: pointer; 
      transition: all 0.3s;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    .mode-card.active { 
      border-color: var(--bakery-text-emph); 
      background: var(--bakery-accent-2); 
    }
    .mode-card .icon { font-size: 2em; margin-bottom: 10px; }
    .mode-card h3 { color: var(--bakery-text-emph); margin: 10px 0 5px; }
    .mode-card p { color: var(--bakery-text-muted); margin: 0; }
    .scan-area { display: flex; gap: 30px; margin-bottom: 30px; }
    .scanner-view { flex: 2; }
    .camera-frame { 
      width: 300px; 
      height: 200px; 
      border: 3px dashed var(--bakery-accent); 
      border-radius: 12px; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      position: relative; 
      margin-bottom: 15px;
      background: var(--bakery-surface);
      color: var(--bakery-text-muted);
    }
    .scan-line { 
      position: absolute; 
      width: 80%; 
      height: 2px; 
      background: var(--bakery-accent);
      animation: scan 2s linear infinite;
    }
    @keyframes scan { 0%, 100% { top: 20%; } 50% { top: 80%; } }
    .manual-entry { flex: 1; }
    .manual-entry h3 { 
      color: var(--bakery-text-emph); 
      margin: 0 0 15px; 
    }
    .manual-entry input { 
      width: 100%; 
      padding: 10px; 
      margin-bottom: 10px; 
      border: 1px solid var(--bakery-accent); 
      border-radius: 4px; 
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    .scan-btn, button { 
      padding: 10px 20px; 
      background: var(--bakery-accent); 
      color: var(--bakery-text-emph); 
      border: 1px solid var(--bakery-text-muted); 
      border-radius: 4px; 
      cursor: pointer; 
      font-weight: 500;
    }
    .scan-btn:hover, button:hover {
      background: var(--bakery-accent-2);
    }
    .recent-scans { 
      background: var(--bakery-surface); 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: var(--bakery-shadow-soft);
    }
    .recent-scans h3 {
      color: var(--bakery-text-emph);
      margin: 0 0 15px;
    }
    .scan-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 10px; 
      border-bottom: 1px solid var(--bakery-accent); 
      color: var(--bakery-text-emph);
    }
    .scan-item:last-child {
      border-bottom: none;
    }
    .item-name { font-weight: 600; }
    .quantity { color: var(--bakery-text-muted); }
    .timestamp { color: var(--bakery-text-muted); font-size: 0.875rem; }
  `]
})
export class ScanComponent {
  activeMode: 'receive' | 'count' | 'waste' | null = null;
  isScanning = false;
  manualBarcode = '';
  recentScans = [
    { id: '1', itemName: 'All-Purpose Flour', quantity: 5, unit: 'lbs', timestamp: '10:30 AM' },
    { id: '2', itemName: 'Sugar', quantity: 2, unit: 'lbs', timestamp: '10:25 AM' }
  ];

  setMode(mode: 'receive' | 'count' | 'waste') {
    this.activeMode = mode;
  }

  startScan() {
    this.isScanning = !this.isScanning;
    // TODO: Integrate with camera/barcode scanner
  }

  processBarcode(barcode: string) {
    if (barcode.trim()) {
      // TODO: Process scanned barcode
      console.log('Processing barcode:', barcode);
      this.manualBarcode = '';
    }
  }

  undoScan(scanId: string) {
    this.recentScans = this.recentScans.filter(scan => scan.id !== scanId);
  }
}