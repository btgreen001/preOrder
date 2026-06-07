import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../shared-data-services/role.service';
import { LicenseService } from '../../../shared-data-services/license.service';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  adminOnly: boolean;
  recordCount: number;
}

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-export.component.html',
  styleUrls: ['./data-export.component.scss']
})
export class DataExportComponent {
  private roleService = inject(RoleService);
  licenseService = inject(LicenseService);

  selectedExports: string[] = [];
  exportFormat = 'csv';
  dateRange = '30days';

  exportOptions: ExportOption[] = [
    {
      id: 'reports',
      name: 'Reports & Analytics',
      description: 'Sales reports, revenue data, and analytics',
      adminOnly: false,
      recordCount: 45
    },
    {
      id: 'orders',
      name: 'Order Data',
      description: 'Complete order history and details',
      adminOnly: true,
      recordCount: 1247
    },
    {
      id: 'customers',
      name: 'Customer Information',
      description: 'Customer profiles, contact info, and preferences',
      adminOnly: true,
      recordCount: 856
    },
    {
      id: 'products',
      name: 'Product Catalog',
      description: 'Product details, pricing, and inventory',
      adminOnly: true,
      recordCount: 234
    },
    {
      id: 'inventory',
      name: 'Inventory Data',
      description: 'Stock levels, ingredient usage, and costs',
      adminOnly: false,
      recordCount: 167
    },
    {
      id: 'deliveries',
      name: 'Delivery Records',
      description: 'Delivery schedules, routes, and completion status',
      adminOnly: false,
      recordCount: 689
    }
  ];

  formats = [
    { value: 'csv', label: 'CSV (Excel Compatible)' },
    { value: 'json', label: 'JSON' },
    { value: 'pdf', label: 'PDF Report' }
  ];

  dateRanges = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  get currentRole() {
    return this.roleService.getCurrentRole();
  }

  get isSystemAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  get availableExports(): ExportOption[] {
    return this.exportOptions.filter(option => 
      !option.adminOnly || this.isSystemAdmin
    );
  }

  get restrictedExports(): ExportOption[] {
    return this.exportOptions.filter(option => 
      option.adminOnly && !this.isSystemAdmin
    );
  }

  toggleExport(exportId: string) {
    const index = this.selectedExports.indexOf(exportId);
    if (index > -1) {
      this.selectedExports.splice(index, 1);
    } else {
      this.selectedExports.push(exportId);
    }
  }

  isSelected(exportId: string): boolean {
    return this.selectedExports.includes(exportId);
  }

  selectAll() {
    this.selectedExports = this.availableExports.map(option => option.id);
  }

  clearAll() {
    this.selectedExports = [];
  }

  canExport(): boolean {
    return this.selectedExports.length > 0;
  }

  startExport() {
    if (!this.canExport()) {
      alert('Please select at least one data type to export.');
      return;
    }

    if (this.licenseService.isExpired()) {
      alert('Cannot export data with an expired license. Please renew your license.');
      return;
    }

    const selectedOptions = this.availableExports.filter(option => 
      this.selectedExports.includes(option.id)
    );

    const totalRecords = selectedOptions.reduce((sum, option) => sum + option.recordCount, 0);
    
    const exportSummary = {
      format: this.exportFormat,
      dateRange: this.dateRanges.find(r => r.value === this.dateRange)?.label,
      dataTypes: selectedOptions.map(option => option.name),
      totalRecords: totalRecords,
      estimatedSize: this.estimateFileSize(totalRecords, this.exportFormat)
    };

    const confirmMessage = `
Export Summary:
- Format: ${exportSummary.format.toUpperCase()}
- Date Range: ${exportSummary.dateRange}
- Data Types: ${exportSummary.dataTypes.join(', ')}
- Total Records: ${exportSummary.totalRecords.toLocaleString()}
- Estimated Size: ${exportSummary.estimatedSize}

This export will be generated and downloaded. Continue?
    `.trim();

    if (confirm(confirmMessage)) {
      // Mock export process
      alert('Export started! You will receive a download link via email when complete.');
    }
  }

  get selectedExportNames(): string {
    return this.availableExports
      .filter(opt => this.selectedExports.includes(opt.id))
      .map(opt => opt.name)
      .join(', ');
  }

  get selectedExportRecordCount(): number {
    return this.availableExports
      .filter(opt => this.selectedExports.includes(opt.id))
      .reduce((sum, opt) => sum + opt.recordCount, 0);
  }

  get exportFormatLabel(): string {
    return this.formats.find(f => f.value === this.exportFormat)?.label || '';
  }

  get dateRangeLabel(): string {
    return this.dateRanges.find(r => r.value === this.dateRange)?.label || '';
  }

  private estimateFileSize(records: number, format: string): string {
    const bytesPerRecord = format === 'json' ? 500 : format === 'csv' ? 200 : 1000;
    const totalBytes = records * bytesPerRecord;
    
    if (totalBytes < 1024) return `${totalBytes} bytes`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}