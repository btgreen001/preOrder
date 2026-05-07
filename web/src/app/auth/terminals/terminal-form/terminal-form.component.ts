import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TerminalService, Terminal, CreateTerminalRequest, UpdateTerminalRequest } from '../services/terminal.service';

@Component({
  selector: 'app-terminal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule
  ],
  templateUrl: './terminal-form.component.html',
  styleUrls: ['./terminal-form.component.scss']
})
export class TerminalFormComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isEditMode = false;
  terminalUid: string | null = null;
  terminal: Terminal | null = null;

  private fb = inject(FormBuilder);
  private terminalService = inject(TerminalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.form = this.fb.group({
      terminalCode: ['', [Validators.required, Validators.minLength(3)]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      isActive: [true]
    });

    // Check if editing
    this.terminalUid = this.route.snapshot.paramMap.get('id');
    if (this.terminalUid) {
      this.isEditMode = true;
      this.loadTerminal();
    }
  }

  private loadTerminal(): void {
    if (!this.terminalUid) return;
    
    this.isLoading = true;
    this.terminalService.getTerminal(this.terminalUid).subscribe({
      next: (terminal) => {
        this.isLoading = false;
        this.terminal = terminal;
        console.log('Loaded terminal:', terminal);
        
        // Set form values
        this.form.get('terminalCode')?.setValue(terminal.terminalCode);
        this.form.get('location')?.setValue(terminal.location);
        this.form.get('isActive')?.setValue(terminal.isActive);
        
        console.log('Form after setValue:', this.form.value);
        
        // Force change detection
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load terminal.';
        console.error('Error loading terminal:', error);
      }
    });
  }

  submit(): void {
    if (!this.form.valid) return;

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.isEditMode && this.terminalUid) {
      const request: UpdateTerminalRequest = this.form.value;
      this.terminalService.updateTerminal(this.terminalUid, request).subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Terminal updated successfully!';
          setTimeout(() => this.router.navigate(['/terminals']), 1500);
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = 'Failed to update terminal.';
          console.error('Error updating terminal:', error);
        }
      });
    } else {
      const request: CreateTerminalRequest = this.form.value;
      this.terminalService.createTerminal(request).subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Terminal created successfully!';
          setTimeout(() => this.router.navigate(['/terminals']), 1500);
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = 'Failed to create terminal.';
          console.error('Error creating terminal:', error);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/terminals']);
  }
}
