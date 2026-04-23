import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../shared-data-services/role.service';
import { LicenseService } from '../../../shared-data-services/license.service';
import { TrialBannerComponent } from '../../../shared-data-services/trial-banner.component';
import jsPDF from 'jspdf';

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  customerStats: { totalCustomers: number; returningCustomers: number };
}

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [CommonModule, FormsModule, TrialBannerComponent],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent {
  private roleService = inject(RoleService);
  licenseService = inject(LicenseService);

  selectedPeriod = '30days';
  periods = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' }
  ];

  reportData: ReportData = {
    totalRevenue: 12450,
    totalOrders: 89,
    avgOrderValue: 139.89,
    topProducts: [
      { name: 'Wedding Cake', sales: 12, revenue: 4200 },
      { name: 'Sourdough Bread', sales: 45, revenue: 360 },
      { name: 'Birthday Cake', sales: 18, revenue: 1170 },
      { name: 'Croissants', sales: 32, revenue: 768 },
      { name: 'Chocolate Cookies', sales: 28, revenue: 504 }
    ],
    monthlyRevenue: [
      { month: 'Jan', revenue: 8500 },
      { month: 'Feb', revenue: 9200 },
      { month: 'Mar', revenue: 10100 },
      { month: 'Apr', revenue: 11300 },
      { month: 'May', revenue: 12450 },
      { month: 'Jun', revenue: 13800 }
    ],
    customerStats: {
      totalCustomers: 156,
      returningCustomers: 89
    }
  };

  get currentRole() {
    return this.roleService.getCurrentRole();
  }

  get canExportPDF(): boolean {
    return !this.licenseService.isFeatureGated('pdfExport');
  }

  getGrowthRate(currentRevenue: number, index: number): string {
    if (index === 0) return '0';
    const previousRevenue = this.reportData.monthlyRevenue[index - 1].revenue;
    const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return (growth >= 0 ? '+' : '') + growth.toFixed(1);
  }

  exportToPDF() {
    if (this.licenseService.isFeatureGated('pdfExport')) {
      alert('PDF export requires Standard license or higher. Upgrade to access this feature.');
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Artisan Food Order Management Report', 20, 30);
    
    // Period
    doc.setFontSize(12);
    const periodLabel = this.periods.find(p => p.value === this.selectedPeriod)?.label || '';
    doc.text(`Report Period: ${periodLabel}`, 20, 45);
    
    // Summary Stats
    doc.setFontSize(16);
    doc.text('Summary Statistics', 20, 65);
    
    doc.setFontSize(12);
    doc.text(`Total Revenue: $${this.reportData.totalRevenue.toLocaleString()}`, 20, 80);
    doc.text(`Total Orders: ${this.reportData.totalOrders}`, 20, 95);
    doc.text(`Average Order Value: $${this.reportData.avgOrderValue.toFixed(2)}`, 20, 110);
    doc.text(`Total Customers: ${this.reportData.customerStats.totalCustomers}`, 20, 125);
    doc.text(`Returning Customers: ${this.reportData.customerStats.returningCustomers}`, 20, 140);
    
    // Top Products
    doc.setFontSize(16);
    doc.text('Top Products', 20, 165);
    
    doc.setFontSize(12);
    let yPos = 180;
    this.reportData.topProducts.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.name}: ${product.sales} sales, $${product.revenue}`, 20, yPos);
      yPos += 15;
    });
    
    // Monthly Revenue
    doc.setFontSize(16);
    doc.text('Monthly Revenue Trend', 20, yPos + 20);
    
    doc.setFontSize(12);
    yPos += 35;
    this.reportData.monthlyRevenue.forEach(month => {
      doc.text(`${month.month}: $${month.revenue.toLocaleString()}`, 20, yPos);
      yPos += 15;
    });
    
    // Footer
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    
    // Save the PDF
    doc.save(`artisan-report-${this.selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  refreshData() {
    // Mock data refresh
    alert('Data refreshed for ' + this.periods.find(p => p.value === this.selectedPeriod)?.label);
  }
}