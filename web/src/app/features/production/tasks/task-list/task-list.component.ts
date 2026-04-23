import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductionTaskService } from '../../services/production-task.service';
import { ProductionTaskDto } from '../../models/production-task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  tasks: ProductionTaskDto[] = [];
  filteredTasks: ProductionTaskDto[] = [];
  loading = false;
  selectedStatus = 'Pending';
  displayedColumns: string[] = ['taskNumber', 'product', 'quantity', 'assignedStaff', 'status', 'deadline', 'actions'];

  statusTabs = [
    { label: 'Pending', value: 'Pending', color: '#e53935' },
    { label: 'In Progress', value: 'In Progress', color: '#fb8c00' },
    { label: 'Completed', value: 'Completed', color: '#43a047' },
    { label: 'Cancelled', value: 'Cancelled', color: '#757575' }
  ];

  constructor(
    private taskService: ProductionTaskService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(status?: string): void {
    this.loading = true;
    const searchStatus = status || this.selectedStatus;

    this.taskService.getTasks(searchStatus).subscribe({
      next: (tasks: ProductionTaskDto[]) => {
        this.tasks = tasks;
        this.filteredTasks = tasks.filter(t => t.TaskStatus === searchStatus);
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open('Error loading tasks', 'Close', { duration: 3000 });
        console.error('Error loading tasks:', err);
      }
    });
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.loadTasks(status);
  }

  completeTask(task: ProductionTaskDto): void {
    const confirmed = confirm(`Mark task "${task.ExternalId}" as completed?`);
    if (!confirmed) return;

    this.taskService.updateTaskStatus(task.ExternalId, 'Completed', new Date()).subscribe({
      next: () => {
        this.snackBar.open('Task marked as completed', 'Close', { duration: 3000 });
        this.loadTasks();
      },
      error: (err: any) => {
        this.snackBar.open('Error completing task', 'Close', { duration: 3000 });
        console.error('Error:', err);
      }
    });
  }

  cancelTask(task: ProductionTaskDto): void {
    const confirmed = confirm(`Cancel task "${task.ExternalId}"?`);
    if (!confirmed) return;

    this.taskService.updateTaskStatus(task.ExternalId, 'Cancelled', undefined).subscribe({
      next: () => {
        this.snackBar.open('Task cancelled', 'Close', { duration: 3000 });
        this.loadTasks();
      },
      error: (err: any) => {
        this.snackBar.open('Error cancelling task', 'Close', { duration: 3000 });
        console.error('Error:', err);
      }
    });
  }

  getStatusColor(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending': '#e53935',
      'In Progress': '#fb8c00',
      'Completed': '#43a047',
      'Cancelled': '#757575'
    };
    return statusMap[status] || '#999';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
