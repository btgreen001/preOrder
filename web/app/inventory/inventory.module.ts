import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';

@NgModule({
  // If InventoryDashboardComponent is standalone, import it here; otherwise
  // Angular will pick it up via declarations. Using imports allows both modes.
  imports: [CommonModule, FormsModule, InventoryRoutingModule, RouterModule, InventoryDashboardComponent],
})
export class InventoryModule {}
