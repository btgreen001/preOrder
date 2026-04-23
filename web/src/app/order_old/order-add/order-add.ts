import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './order-add.html',
  styleUrls: ['./order-add.scss']
})
export class OrderAddComponent {
  form: FormGroup;
  saving = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      customer: ['', Validators.required],
      items: this.fb.control<string>(''),
      total: [0, [Validators.required, Validators.min(0)]]
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    setTimeout(() => {
      alert('Order created (mock)!');
      this.router.navigate(['/orders']);
    }, 400);
  }
}
