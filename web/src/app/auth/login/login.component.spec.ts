import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { of, throwError, asyncScheduler } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../core/models/auth.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAuthResponse: AuthResponse = {
    userId: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    organizationId: 'org1',
    organizationName: 'Test Org',
    licenseTier: 'premium',
    registrationToken: 'token123'
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'isAuthenticated'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      queryParams: of({ returnUrl: '/dashboard' }),
      snapshot: {
        queryParams: { returnUrl: '/dashboard' }
      }
    });

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize form with default values', () => {
      component.ngOnInit();

      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('username')?.value).toBe('demo-pre-order');
      expect(component.loginForm.get('password')?.value).toBe('password');
      expect(component.loginForm.get('username')?.valid).toBeTruthy();
      expect(component.loginForm.get('password')?.valid).toBeTruthy();
    });

    // Note: Return URL testing requires RouterTestingModule setup
    // This test is skipped for now as it requires complex mock setup

    it('should redirect to return URL if already authenticated', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);

      component.ngOnInit();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should not redirect if not authenticated', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);

      component.ngOnInit();

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('form validation', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should validate required username', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('');

      expect(usernameControl?.valid).toBeFalsy();
      expect(usernameControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate required password', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('');

      expect(passwordControl?.valid).toBeFalsy();
      expect(passwordControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate form is valid with both fields', () => {
      component.loginForm.setValue({
        username: 'testuser',
        password: 'password123'
      });

      expect(component.loginForm.valid).toBeTruthy();
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should not submit if form is invalid', () => {
      component.loginForm.get('username')?.setValue('');

      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.isLoading).toBeFalsy();
    });

    it('should handle login successfully', fakeAsync(() => {
      const loginData = { username: 'testuser', password: 'password123' };
      component.loginForm.setValue(loginData);

      authServiceSpy.login.and.returnValue(of(mockAuthResponse).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      expect(component.isLoading).toBeTruthy();
      expect(authServiceSpy.login).toHaveBeenCalledWith(loginData);

      tick(); // Advance the virtual clock

      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBe('');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));

    it('should handle login error', fakeAsync(() => {
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      component.loginForm.setValue(loginData);

      const errorResponse = { error: { message: 'Invalid credentials' } };
      authServiceSpy.login.and.returnValue(throwError(() => errorResponse).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      expect(component.isLoading).toBeTruthy();
      expect(authServiceSpy.login).toHaveBeenCalledWith(loginData);

      tick(); // Advance the virtual clock

      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBe('Invalid credentials');
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));    it('should handle login error with default message', fakeAsync(() => {
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      component.loginForm.setValue(loginData);

      authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      tick(); // Advance the virtual clock

      expect(component.errorMessage).toBe('Login failed. Please check your credentials.');
    }));

    it('should reset loading state on error', fakeAsync(() => {
      component.loginForm.setValue({ username: 'testuser', password: 'password123' });

      authServiceSpy.login.and.returnValue(throwError(() => new Error('Network error')).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      expect(component.isLoading).toBeTruthy();

      tick(); // Advance the virtual clock

      expect(component.isLoading).toBeFalsy();
    }));

    it('should clear previous error messages on new submission', () => {
      component.errorMessage = 'Previous error';

      component.loginForm.setValue({ username: 'testuser', password: 'password123' });
      authServiceSpy.login.and.returnValue(of(mockAuthResponse).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('component state', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should initialize with correct default values', () => {
      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBe('');
      expect(component.returnUrl).toBe('/dashboard');
    });

    it('should have form controls properly configured', () => {
      const usernameControl = component.loginForm.get('username');
      const passwordControl = component.loginForm.get('password');

      expect(usernameControl).toBeTruthy();
      expect(passwordControl).toBeTruthy();
      expect(usernameControl?.validator).toBeTruthy();
      expect(passwordControl?.validator).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to dashboard on successful login', fakeAsync(() => {
      component.ngOnInit();
      component.loginForm.setValue({ username: 'testuser', password: 'password123' });

      authServiceSpy.login.and.returnValue(of(mockAuthResponse).pipe(delay(0, asyncScheduler)));

      component.onSubmit();

      tick(); // Advance the virtual clock

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));

    it('should navigate to custom return URL', fakeAsync(() => {
      // Modify the ActivatedRoute spy to return custom return URL
      const activatedRouteSpy = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
      Object.defineProperty(activatedRouteSpy, 'queryParams', {
        get: () => of({ returnUrl: '/custom-page' })
      });
      Object.defineProperty(activatedRouteSpy.snapshot, 'queryParams', {
        value: { returnUrl: '/custom-page' },
        writable: true
      });

      // Create new component instance to pick up the modified ActivatedRoute
      const customFixture = TestBed.createComponent(LoginComponent);
      const customComponent = customFixture.componentInstance;

      customComponent.ngOnInit();
      customComponent.loginForm.setValue({ username: 'testuser', password: 'password123' });

      authServiceSpy.login.and.returnValue(of(mockAuthResponse).pipe(delay(0, asyncScheduler)));

      customComponent.onSubmit();

      tick(); // Advance the virtual clock

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/custom-page']);
    }));
  });
});