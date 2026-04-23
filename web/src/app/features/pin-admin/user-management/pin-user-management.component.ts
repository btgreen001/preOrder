import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PinAdminService, PinUserDto, CreatePinUserRequest, UpdatePinUserRequest } from '../services/pin-admin.service';

@Component({
  selector: 'app-pin-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './pin-user-management.component.html',
  styleUrls: ['./pin-user-management.component.css']
})
export class PinUserManagementComponent implements OnInit {
  users: PinUserDto[] = [];
  loading = false;
  error: string | null = null;

  showAddForm = false;
  addForm!: FormGroup;
  editForm!: FormGroup;
  editingUserId: string | null = null;

  constructor(
    private pinAdminService: PinAdminService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  initializeForms(): void {
    this.addForm = this.fb.group({
      userId: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]]
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;

    this.pinAdminService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users';
        console.error(err);
        this.loading = false;
        this.snackBar.open('Error loading users', 'Close', { duration: 5000 });
      }
    });
  }

  onAddUser(): void {
    if (this.addForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const request: CreatePinUserRequest = this.addForm.value;

    this.pinAdminService.createUser(request).subscribe({
      next: () => {
        this.snackBar.open('User created successfully', 'Close', { duration: 3000 });
        this.addForm.reset();
        this.showAddForm = false;
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open('Failed to create user', 'Close', { duration: 5000 });
        console.error(err);
        this.loading = false;
      }
    });
  }

  onEditUser(user: PinUserDto): void {
    this.editingUserId = user.userId;
    this.editForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.email
    });
  }

  onSaveEdit(): void {
    if (this.editForm.invalid || !this.editingUserId) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const request: UpdatePinUserRequest = this.editForm.value;

    this.pinAdminService.updateUser(this.editingUserId, request).subscribe({
      next: () => {
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        this.editingUserId = null;
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open('Failed to update user', 'Close', { duration: 5000 });
        console.error(err);
        this.loading = false;
      }
    });
  }

  onResetPin(userId: string, userName: string): void {
    const confirmed = confirm(`Reset PIN for ${userName}?`);
    if (!confirmed) return;

    this.loading = true;
    this.pinAdminService.resetPin(userId).subscribe({
      next: () => {
        this.snackBar.open(`PIN reset for ${userName}`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open('Failed to reset PIN', 'Close', { duration: 5000 });
        console.error(err);
        this.loading = false;
      }
    });
  }

  onCancelEdit(): void {
    this.editingUserId = null;
    this.editForm.reset();
  }

  onCancelAdd(): void {
    this.showAddForm = false;
    this.addForm.reset();
  }

  getStatusBadgeClass(user: PinUserDto): string {
    if (user.isLocked) return 'status-locked';
    if (!user.hasPinEnabled) return 'status-inactive';
    return 'status-active';
  }

  getStatusText(user: PinUserDto): string {
    if (user.isLocked) return 'LOCKED';
    if (!user.hasPinEnabled) return 'INACTIVE';
    return 'ACTIVE';
  }
}
