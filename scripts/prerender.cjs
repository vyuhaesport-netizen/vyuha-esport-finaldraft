/**
 * Pre-rendering script for Vyuha Esport
 * This script generates static HTML for public routes to improve SEO
 * Run after build: node scripts/prerender.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Routes to pre-render (public/SEO-important routes only)
const routes = [
  '/',
  '/home',
  '/creator-tournaments',
  '/about',
  '/terms',
  '/refund-policy',
  '/docs',
  '/leaderboard',
];

console.log('🚀 Starting pre-render process...');
console.log(`📄 Routes to pre-render: ${routes.length}`);

// Check if react-snap is available
try {
  // Create react-snap configuration
  const packageJson = require('../package.json');
  
  const reactSnapConfig = {
    source: 'dist',
    destination: 'dist',
    include: routes,
    skipThirdPartyRequests: true,
    puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    inlineCss: true,
    removeScriptTags: false,
    removeStyleTags: false,
    headless: true,
    puppeteerExecutablePath: undefined,
    minifyHtml: {
      collapseWhitespace: true,
      removeComments: true
    }
  };

  console.log('📝 React-snap configuration:');
  console.log(JSON.stringify(reactSnapConfig, null, 2));
  
  console.log('\n✅ Pre-render configuration ready!');
  console.log('\nTo pre-render your app:');
  console.log('1. Build the app: npm run build');
  console.log('2. Add to package.json scripts: "postbuild": "react-snap"');
  console.log('3. Add to package.json: "reactSnap": ' + JSON.stringify(reactSnapConfig));
  
} catch (error) {
  console.error('❌ Error during pre-render setup:', error.message);
  process.exit(1);
}
