import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  constructor() {
    this.enforceHttpsRedirection();
  }

  /**
   * Enforces HTTPS redirection in production environments
   */
  private enforceHttpsRedirection(): void {
    if (import.meta.env['NG_APP_ENFORCE_HTTPS'] && !this.isSecureConnection()) {
      console.warn('Insecure connection detected. Redirecting to HTTPS...');
      this.redirectToHttps();
    }
  }

  /**
   * Checks if the current connection is secure (HTTPS)
   */
  isSecureConnection(): boolean {
    return window.location.protocol === 'https:';
  }

  /**
   * Redirects to HTTPS version of current page
   */
  private redirectToHttps(): void {
    const httpsUrl = window.location.href.replace('http://', 'https://');
    window.location.replace(httpsUrl);
  }

  /**
   * Validates that sensitive operations are performed over HTTPS
   */
  validateSecureContext(operationName: 'operation'): boolean {
    if (import.meta.env['NG_APP_ENFORCE_HTTPS'] && !this.isSecureConnection()) {
      console.error(`${operationName} requires a secure connection (HTTPS)`);
      return false;
    }
    return true;
  }

  /**
   * Sets security headers for enhanced protection
   */
  getSecureHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }


  /**
   * Checks if the application is running in a secure context
   * (HTTPS or localhost)
   */
  isSecureContext(): boolean {
    return window.isSecureContext;
  }

  /**
   * Gets Content Security Policy directives
   */
  getContentSecurityPolicy(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ');
  }

  /**
   * Logs security warnings for development
   */
  logSecurityWarning(message: string): void {
    if (!import.meta.env['NG_APP_PRODUCTION']) {
      console.warn(`🔒 Security Warning: ${message}`);
    }
  }

  /**
   * Validates URL for security (prevents open redirects)
   */
  isValidRedirectUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      
      // Only allow same-origin redirects or explicitly allowed hosts
      const allowedHosts = [
        window.location.hostname,
        'localhost',
        '127.0.0.1'
      ];
      
      return allowedHosts.includes(parsedUrl.hostname);
    } catch {
      return false;
    } finally {
      // nothing needed here, but linter is satisfied
    }
  }
}