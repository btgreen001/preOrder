import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pin-entry',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './pin-entry.component.html',
  styleUrls: ['./pin-entry.component.scss']
})
export class PinEntryComponent {
  @Input() userName = '';
  @Input() isUserAlreadyAuthenticated = false;
  @Output() pinComplete = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  pin: string[] = ['', '', '', ''];
  currentIndex = 0;
  showError = false;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Handle number keys (0-9)
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      this.onNumberClick(parseInt(event.key, 10));
    }
    // Handle Backspace
    else if (event.key === 'Backspace') {
      event.preventDefault();
      this.onBackspace();
    }
    // Handle Enter to submit
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.currentIndex === 4) {
        this.submitPin();
      }
    }
    // Handle Escape to cancel
    else if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  onNumberClick(num: number): void {
    if (this.currentIndex >= 4) return;

    this.pin[this.currentIndex] = num.toString();
    this.currentIndex++;
    this.showError = false;

    if (this.currentIndex === 4) {
      setTimeout(() => this.submitPin(), 300);
    }
  }

  onBackspace(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.pin[this.currentIndex] = '';
      this.showError = false;
    }
  }

  onClear(): void {
    this.pin = ['', '', '', ''];
    this.currentIndex = 0;
    this.showError = false;
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private submitPin(): void {
    const pinValue = this.pin.join('');
    if (pinValue.length === 4) {
      this.pinComplete.emit(pinValue);
    }
  }

  isPinDotFilled(index: number): boolean {
    return this.pin[index] !== '';
  }

  get numberPad(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  }
}
