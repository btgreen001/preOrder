import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrdersService } from '../services/orders.service';

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './order-edit.html',
  styleUrls: ['./order-edit.css']
})
export class OrderEditComponent implements OnInit {
  form: FormGroup;
  saving = false;
  errorMessage: string | null = null;
  loading = true;
  
  // Display properties for showing order details
  orderData: any = null;
  customerName: string = '';
  orderDate: string = '';
  totalAmount: number = 0;
  
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orders = inject(OrdersService);

  constructor() {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      status: ['PENDING', Validators.required],
      specialInstructionTxt: ['']
    });
  }

  ngOnInit() {
    const externalId = this.route.snapshot.params['externalId'];
    if (!externalId) {
      this.errorMessage = 'Order ID not found';
      this.loading = false;
      return;
    }

    // Load order from database via API
    this.orders.getOrderById(externalId).subscribe({
      next: (order: any) => {
        if (order) {
          // Store full order data for reference
          this.orderData = order;
          
          // Extract and display key order information
          this.customerName = order.customerName || 'Unknown Customer';
          this.orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A';
          this.totalAmount = order.totalAmount || 0;
          
          // Populate form with database values
          this.form.patchValue({
            customerId: order.customerId || '',
            status: order.orderStatus || 'PENDING',
            specialInstructionTxt: order.specialInstructionTxt || ''
          });
          
          console.log('Order loaded successfully:', order);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading order:', error);
        this.errorMessage = 'Failed to load order. Please try again.';
        this.loading = false;
      }
    });
  }

  save() {
    if (!this.form.valid) {
      return;
    }

    const newStatus = this.form.get('status')?.value;
    const externalId = this.route.snapshot.params['externalId'];

    this.saving = true;
    this.orders.updateOrderStatus(externalId, { newStatus: newStatus }).subscribe({
      next: () => {
        console.log('Order status updated successfully');
        this.saving = false;
        // Use setTimeout to ensure navigation completes after component state updates
        setTimeout(() => {
          this.router.navigate(['/orders/list']).catch(err => 
            console.error('Navigation error:', err)
          );
        }, 500);
      },
      error: (error: any) => {
        console.error('Error updating order status:', error);
        this.errorMessage = 'Failed to update order. Please try again.';
        this.saving = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/orders/list']);
  }
}

