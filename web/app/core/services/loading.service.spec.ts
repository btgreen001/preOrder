import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingService]
    });
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    service.forceHide(); // Clean up after each test
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show/hide', () => {
    it('should show loading indicator after delay', fakeAsync(() => {
      service.show();
      
      // Should not be loading immediately
      expect(service.isLoading()).toBe(false);
      
      // Should be loading after 300ms delay
      tick(300);
      expect(service.isLoading()).toBe(true);
      
      service.hide();
      expect(service.isLoading()).toBe(false);
    }));

    it('should not show loading for quick operations', fakeAsync(() => {
      service.show();
      tick(100); // Less than 300ms
      service.hide();
      tick(300);
      
      // Should never have shown loading
      expect(service.isLoading()).toBe(false);
    }));

    it('should handle multiple concurrent requests', fakeAsync(() => {
      service.show();
      service.show();
      service.show();
      
      tick(300);
      expect(service.isLoading()).toBe(true);
      
      // Hide one request
      service.hide();
      expect(service.isLoading()).toBe(true);
      
      // Hide second request
      service.hide();
      expect(service.isLoading()).toBe(true);
      
      // Hide last request
      service.hide();
      expect(service.isLoading()).toBe(false);
    }));

    it('should handle show with custom message', fakeAsync(() => {
      let loadingState: any;
      service.loading$.subscribe(state => loadingState = state);
      
      service.show('Processing...');
      tick(300);
      
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.message).toBe('Processing...');
    }));
  });

  describe('forceHide', () => {
    it('should force hide regardless of request count', fakeAsync(() => {
      service.show();
      service.show();
      service.show();
      
      tick(300);
      expect(service.isLoading()).toBe(true);
      
      service.forceHide();
      expect(service.isLoading()).toBe(false);
    }));

    it('should clear pending timeout', fakeAsync(() => {
      service.show();
      service.forceHide();
      
      tick(300);
      expect(service.isLoading()).toBe(false);
    }));
  });

  describe('showTokenRefresh', () => {
    it('should show loading immediately without delay', fakeAsync(() => {
      let loadingState: any;
      service.loading$.subscribe(state => loadingState = state);
      
      service.showTokenRefresh();
      
      // Should be loading immediately (no delay)
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.message).toBe('Refreshing session...');
      
      service.hide();
      expect(service.isLoading()).toBe(false);
    }));
  });

  describe('loading$ observable', () => {
    it('should emit loading state changes', fakeAsync(() => {
      const states: boolean[] = [];
      service.loading$.subscribe(state => states.push(state.isLoading));
      
      service.show();
      tick(300);
      service.hide();
      
      expect(states).toEqual([false, true, false]);
    }));
  });
});
