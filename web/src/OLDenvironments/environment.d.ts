export interface Environment {
  production: boolean;
  apiUrl: string;
  httpsApiUrl: string;
  enforceHttps: boolean;
  stripePublishableKey: string;
}

export const environment: Environment;
