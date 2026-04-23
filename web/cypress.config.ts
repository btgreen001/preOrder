import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    chromeWebSecurity: false,
    experimentalSessionAndOrigin: true,
    setupNodeEvents(on, config) {
      // Clear browser state before tests
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Force Chrome to use UNIQUE isolated temporary profile directory per test run
          // This prevents reading crash state from previous tests
          const uniqueProfile = `/tmp/cypress-chrome-${Date.now()}`;
          launchOptions.args.push(`--user-data-dir=${uniqueProfile}`);
          // Disable Chrome restore session and crash dialogs
          launchOptions.args.push('--disable-restore-session-state');
          launchOptions.args.push('--disable-session-crashed-bubble');
          launchOptions.args.push('--disable-infobars');
          launchOptions.args.push('--no-first-run');
          launchOptions.args.push('--disable-crash-reporter');
          launchOptions.args.push('--disable-backgrounding-occluded-windows');
          launchOptions.args.push('--disable-renderer-backgrounding');
          launchOptions.args.push('--disable-background-timer-throttling');
          // Force a clean profile
          launchOptions.preferences.default['profile.exit_type'] = 'Normal';
          launchOptions.preferences.default['profile.exited_cleanly'] = true;
        }
        return launchOptions;
      });
    },
  },
  env: {
    apiUrl: 'https://localhost:5124',
  },
});
