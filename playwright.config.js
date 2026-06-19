var fs = require('fs');
var path = require('path');
var defineConfig = require('@playwright/test').defineConfig;

var baseURL = process.env.BASE_URL || 'http://127.0.0.1:3010';
var chromiumCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/snap/bin/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable'
].filter(Boolean);
var chromiumExecutable = chromiumCandidates.find(function (candidate) {
  return fs.existsSync(candidate);
});

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'ui'),
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chromiumExecutable
      ? {
          executablePath: chromiumExecutable
        }
      : {}
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm start',
        url: baseURL + '/bbs/list',
        reuseExistingServer: true,
        timeout: 30000,
        env: {
          PORT: '3010',
          HOST: '127.0.0.1',
          NODE_ENV: 'test'
        }
      },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1366, height: 768 }
      }
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true
      }
    }
  ]
});
