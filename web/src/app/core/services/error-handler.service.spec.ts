import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: MatSnackBar, useValue: spy }
      ]
    });

    service = TestBed.inject(ErrorHandlerService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle 400 Bad Request errors', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
      const result = service.handleError(error);

      expect(result.title).toBe('Invalid Request');
      expect(result.message).toContain('check your input');
      expect(result.action).toBe('OK');
    });

    it('should handle 401 Unauthorized errors', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      const result = service.handleError(error);

      expect(result.title).toBe('Authentication Required');
      expect(result.message).toContain('session has expired');
      expect(result.action).toBe('Login');
    });

    it('should handle 403 Forbidden errors', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      const result = service.handleError(error);

      expect(result.title).toBe('Access Denied');
      expect(result.message).toContain('permission');
      expect(result.action).toBe('OK');
    });

    it('should handle 404 Not Found errors', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      const result = service.handleError(error);

      expect(result.title).toBe('Not Found');
      expect(result.message).toContain('could not be found');
      expect(result.action).toBe('OK');
    });

    it('should handle 429 Too Many Requests errors', () => {
      const error = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
      const result = service.handleError(error);

      expect(result.title).toBe('Too Many Requests');
      expect(result.message).toContain('too many requests');
      expect(result.action).toBe('Retry');
    });

    it('should handle 500 Server Error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      const result = service.handleError(error);

      expect(result.title).toBe('Server Error');
      expect(result.message).toContain('server');
      expect(result.action).toBe('Retry');
    });

    it('should handle network errors (status 0)', () => {
      const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
      const result = service.handleError(error);

      expect(result.title).toBe('Network Error');
      expect(result.message).toContain('connect to the server');
      expect(result.action).toBe('Retry');
    });
  });

  describe('showError', () => {
    it('should display error message as snackbar', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
      service.showError(error);

      expect(snackBarSpy.open).toHaveBeenCalled();
      const callArgs = snackBarSpy.open.calls.mostRecent().args;
      expect(callArgs[0]).toContain('Invalid Request');
      expect(callArgs[2]?.panelClass).toContain('error-snackbar');
    });
  });

  describe('showSuccess', () => {
    it('should display success message', () => {
      service.showSuccess('Operation successful');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Operation successful',
        'Close',
        jasmine.objectContaining({
          panelClass: ['success-snackbar']
        })
      );
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract error message from string error', () => {
      const error = new HttpErrorResponse({ 
        status: 400, 
        error: 'Custom error message' 
      });
      const result = service.handleError(error);

      expect(result.message).toBe('Custom error message');
    });

    it('should extract error message from error object with message property', () => {
      const error = new HttpErrorResponse({ 
        status: 400, 
        error: { message: 'Custom error from object' } 
      });
      const result = service.handleError(error);

      expect(result.message).toBe('Custom error from object');
    });
  });
});
