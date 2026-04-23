import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Handle HTTP errors and display user-friendly messages
   */
  handleError(error: HttpErrorResponse): ErrorMessage {
    let errorMessage: ErrorMessage;

    switch (error.status) {
      case 400:
        errorMessage = {
          title: 'Invalid Request',
          message: this.extractErrorMessage(error) || 'Please check your input and try again.',
          action: 'OK'
        };
        break;

      case 401:
        errorMessage = {
          title: 'Authentication Required',
          message: 'Your session has expired. Please log in again.',
          action: 'Login'
        };
        break;

      case 403:
        errorMessage = {
          title: 'Access Denied',
          message: 'You do not have permission to access this resource.',
          action: 'OK'
        };
        break;

      case 404:
        errorMessage = {
          title: 'Not Found',
          message: 'The requested resource could not be found.',
          action: 'OK'
        };
        break;

      case 429:
        errorMessage = {
          title: 'Too Many Requests',
          message: 'You have made too many requests. Please try again later.',
          action: 'Retry'
        };
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = {
          title: 'Server Error',
          message: 'An error occurred on the server. Please try again later.',
          action: 'Retry'
        };
        break;

      case 0:
        errorMessage = {
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
          action: 'Retry'
        };
        break;

      default:
        errorMessage = {
          title: 'Error',
          message: this.extractErrorMessage(error) || 'An unexpected error occurred. Please try again.',
          action: 'OK'
        };
    }

    return errorMessage;
  }

  /**
   * Display error message as toast notification
   */
  showError(error: HttpErrorResponse, duration: number = 5000): void {
    const errorMessage = this.handleError(error);
    this.snackBar.open(
      `${errorMessage.title}: ${errorMessage.message}`,
      errorMessage.action,
      {
        duration,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      }
    );
  }

  /**
   * Display success message as toast notification
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Display info message as toast notification
   */
  showInfo(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Display warning message as toast notification
   */
  showWarning(message: string, duration: number = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Extract error message from HTTP error response
   */
  private extractErrorMessage(error: HttpErrorResponse): string | null {
    if (error.error) {
      // Check for common error response formats
      if (typeof error.error === 'string') {
        return error.error;
      }
      if (error.error.message) {
        return error.error.message;
      }
      if (error.error.error) {
        return error.error.error;
      }
      if (error.error.title) {
        return error.error.title;
      }
    }
    
    if (error.message) {
      return error.message;
    }

    return null;
  }

  /**
   * Log error to console (can be extended to send to backend logging service)
   */
  logError(error: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const errorContext = context ? `[${context}]` : '';
    
    console.error(`${timestamp} ${errorContext} Error:`, error);
    
    // TODO: Send to backend logging service in production
    // if (environment.production) {
    //   this.sendToBackendLogger(error, context);
    // }
  }
}
