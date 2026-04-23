import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getStartOfWeek, getDatesForWeek, getDatesForMonth } from './calendar-utils';

type CalendarView = 'day' | 'week' | 'month';
type TaskStatus = 'Scheduled' | 'In Production' | 'Ready' | 'Completed';

interface ProductionTask {
  id: string;
  product: string;
  quantity: number;
  staff: string;
  equipment: string;
  status: TaskStatus;
  start: string; // ISO date string
  end: string;   // ISO date string
  orderNo?: string;
  due?: string;  // ISO date string (due date/time)
  category?: string; // e.g., breads, cakes
  // transient flags
  late?: boolean;
  urgent?: boolean;
  conflict?: boolean;
}

@Component({
  selector: 'app-production-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-calendar.component.html',
  styleUrls: ['./production-calendar.component.scss']
})
export class ProductionCalendarComponent {
  printSchedule() {
    window.print();
  }
  view: CalendarView = 'week';
  today = new Date();
  currentDate = new Date();
  planningMode = false; // toggle planning vs execution
  showAddTaskForm = false;

  // Filters
  filter = {
    product: '',
    staff: '',
    equipment: '',
    status: '' as '' | TaskStatus
  };

  // New task form data
  newTask = {
    product: '',
    quantity: 1,
    staff: '',
    equipment: '',
    startDateTime: '',
    endDateTime: '',
    orderNo: '',
    category: ''
  };

  get statuses(): TaskStatus[] {
    return ['Scheduled', 'In Production', 'Ready', 'Completed'];
  }

  // Mock production tasks
  tasks: ProductionTask[] = [
    {
      id: 'T001',
      product: 'Wedding Cake',
      quantity: 1,
      staff: 'Sarah',
      equipment: 'Oven 1',
      status: 'Scheduled',
      start: this.getDateStringOffset(0, 8),
      end: this.getDateStringOffset(0, 12),
      orderNo: 'ORD-1001',
      due: this.getDateStringOffset(0, 17),
      category: 'cakes'
    },
    {
      id: 'T002',
      product: 'Sourdough Bread',
      quantity: 8,
      staff: 'Mike',
      equipment: 'Oven 2',
      status: 'In Production',
      start: this.getDateStringOffset(1, 5),
      end: this.getDateStringOffset(1, 13),
      orderNo: 'ORD-1002',
      due: this.getDateStringOffset(1, 12),
      category: 'breads'
    },
    {
      id: 'T003',
      product: 'Cupcake Batter',
      quantity: 24,
      staff: 'Emma',
      equipment: 'Mixer',
      status: 'Ready',
      start: this.getDateStringOffset(2, 9),
      end: this.getDateStringOffset(2, 11),
      orderNo: 'ORD-1003',
      due: this.getDateStringOffset(3, 9),
      category: 'pastries'
    },
    {
      id: 'T004',
      product: 'Strawberry Jam',
      quantity: 12,
      staff: 'Tom',
      equipment: 'Stove',
      status: 'Completed',
      start: this.getDateStringOffset(3, 7),
      end: this.getDateStringOffset(3, 10),
      orderNo: 'ORD-1004',
      due: this.getDateStringOffset(3, 11),
      category: 'preserves'
    }
  ];

  getDateStringOffset(dayOffset: number, hour: number): string {
    const d = new Date(this.today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  setView(view: CalendarView) {
    this.view = view;
  }

  setPlanningMode(on: boolean) {
    this.planningMode = on;
  }

  prev() {
    if (this.view === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    } else if (this.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }
    this.currentDate = new Date(this.currentDate);
  }

  next() {
    if (this.view === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    } else if (this.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }
    this.currentDate = new Date(this.currentDate);
  }

  resetToday() {
    this.currentDate = new Date(this.today);
  }

  get weekDates(): Date[] {
    return getDatesForWeek(getStartOfWeek(this.currentDate));
  }

  get monthDates(): Date[] {
    return getDatesForMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  private applyFilters(list: ProductionTask[]): ProductionTask[] {
    return list.filter(t =>
      (!this.filter.product || t.product.toLowerCase().includes(this.filter.product.toLowerCase())) &&
      (!this.filter.staff || t.staff === this.filter.staff) &&
      (!this.filter.equipment || t.equipment === this.filter.equipment) &&
      (!this.filter.status || t.status === this.filter.status)
    );
  }

  private annotateTaskFlags(list: ProductionTask[]): ProductionTask[] {
    const now = new Date();
    return list.map(t => {
      const due = t.due ? new Date(t.due) : undefined;
      const start = new Date(t.start);
      const urgent = !!(due && due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 && t.status !== 'Completed');
      const late = !!(due && start.getTime() > due.getTime());
      return { ...t, urgent, late };
    });
  }

  private detectConflicts(list: ProductionTask[]): ProductionTask[] {
    return list.map(t => {
      const tStart = new Date(t.start).getTime();
      const tEnd = new Date(t.end).getTime();
      const conflict = this.tasks.some(o => {
        if (o.id === t.id) return false;
        const sameStaff = o.staff === t.staff;
        const sameEquip = o.equipment === t.equipment;
        if (!(sameStaff || sameEquip)) return false;
        const oStart = new Date(o.start).getTime();
        const oEnd = new Date(o.end).getTime();
        // overlap
        return (tStart < oEnd && tEnd > oStart);
      });
      return { ...t, conflict };
    });
  }

  private prepare(list: ProductionTask[]): ProductionTask[] {
    return this.detectConflicts(this.annotateTaskFlags(this.applyFilters(list)));
  }

  get dayTasks(): ProductionTask[] {
    const dayStr = this.currentDate.toISOString().slice(0, 10);
    return this.prepare(this.tasks.filter(t => t.start.slice(0, 10) === dayStr));
  }

  get weekTasks(): Record<string, ProductionTask[]> {
    const map: Record<string, ProductionTask[]> = {};
    for (const d of this.weekDates) {
      const dayStr = d.toISOString().slice(0, 10);
      map[dayStr] = this.prepare(this.tasks.filter(t => t.start.slice(0, 10) === dayStr));
    }
    return map;
  }

  get monthTasks(): Record<string, ProductionTask[]> {
    const map: Record<string, ProductionTask[]> = {};
    for (const d of this.monthDates) {
      const dayStr = d.toISOString().slice(0, 10);
      map[dayStr] = this.prepare(this.tasks.filter(t => t.start.slice(0, 10) === dayStr));
    }
    return map;
  }

  // Drag & drop rescheduling (date-only move)
  draggedTaskId: string | null = null;

  onDragStart(task: ProductionTask) {
    if (!this.planningMode) return; // restrict to planning mode
    this.draggedTaskId = task.id;
  }

  allowDrop(ev: DragEvent) { ev.preventDefault(); }

  dropOnDay(date: Date) {
    if (!this.planningMode || !this.draggedTaskId) return;
    const task = this.tasks.find(t => t.id === this.draggedTaskId);
    if (!task) return;
    const oldStart = new Date(task.start);
    const oldEnd = new Date(task.end);
    const newStart = new Date(date);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    task.start = newStart.toISOString();
    task.end = newEnd.toISOString();
    this.draggedTaskId = null;
  }

  // Gantt helpers (week-view)
  getHour(date: string): number { return new Date(date).getHours(); }
  getDurationHours(t: ProductionTask): number {
    return (new Date(t.end).getTime() - new Date(t.start).getTime()) / (1000 * 60 * 60);
  }
  getLeftPercent(t: ProductionTask): string { return (this.getHour(t.start) / 24 * 100).toFixed(2) + '%'; }
  getWidthPercent(t: ProductionTask): string { return (this.getDurationHours(t) / 24 * 100).toFixed(2) + '%'; }

  // Hourly grid helpers
  get hours(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  getTasksByHour(tasks: ProductionTask[]): Record<number, ProductionTask[]> {
    const map: Record<number, ProductionTask[]> = {};
    for (let h = 0; h < 24; h++) {
      map[h] = tasks.filter(t => {
        const startHour = this.getHour(t.start);
        const endHour = this.getHour(t.end);
        return startHour <= h && h < endHour;
      });
    }
    return map;
  }

  getTaskPosition(task: ProductionTask): { top: string; height: string } {
    const startHour = this.getHour(task.start);
    const durationHours = this.getDurationHours(task);
    const cellHeight = 60; // pixels per hour
    return {
      top: (startHour * cellHeight) + 'px',
      height: (durationHours * cellHeight) + 'px'
    };
  }

  // Attention panel
  get criticalTasks() {
    const list = this.prepare(this.tasks);
    return {
      late: list.filter(t => t.late),
      urgent: list.filter(t => t.urgent),
      conflicts: list.filter(t => t.conflict)
    };
  }

  // Add new task functionality
  addTask() {
    if (!this.newTask.product || !this.newTask.staff || !this.newTask.equipment || 
        !this.newTask.startDateTime || !this.newTask.endDateTime) {
      alert('Please fill in all required fields');
      return;
    }

    const newTask: ProductionTask = {
      id: 'T' + Date.now(), // Simple ID generation
      product: this.newTask.product,
      quantity: this.newTask.quantity,
      staff: this.newTask.staff,
      equipment: this.newTask.equipment,
      status: 'Scheduled',
      start: new Date(this.newTask.startDateTime).toISOString(),
      end: new Date(this.newTask.endDateTime).toISOString(),
      orderNo: this.newTask.orderNo || undefined,
      category: this.newTask.category || undefined
    };

    this.tasks.push(newTask);
    this.resetNewTaskForm();
    this.showAddTaskForm = false;
  }

  cancelAddTask() {
    this.resetNewTaskForm();
    this.showAddTaskForm = false;
  }

  private resetNewTaskForm() {
    this.newTask = {
      product: '',
      quantity: 1,
      staff: '',
      equipment: '',
      startDateTime: '',
      endDateTime: '',
      orderNo: '',
      category: ''
    };
  }
}
