const apiBaseUrl = '/api';

export const environment = {
  production: true,
  apiUrl: `${apiBaseUrl}`, // Always use HTTPS in production
  httpsApiUrl: `${apiBaseUrl}`,
  enforceHttps: true // Enforce HTTPS in production
};