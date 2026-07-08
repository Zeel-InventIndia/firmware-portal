/**
 * Run this ONCE to authorize your personal Google account for Drive uploads.
 *
 * Prerequisites (see README):
 *   1. In Google Cloud Console, create an OAuth Client ID of type "Desktop app".
 *   2. Put its Client ID / Client Secret into backend/.env as
 *      GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET.
 *
 * Usage:
 *   cd backend
 *   npm run get-refresh-token
 *
 * It prints a URL — open it, sign in with the Google account you want
 * firmware files stored in, approve access. This script then prints a
 * GOOGLE_OAUTH_REFRESH_TOKEN line to paste into backend/.env. You only
 * need to do this once; the refresh token doesn't expire until revoked.
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in backend/.env first (see README).');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\n1. Open this URL in your browser and sign in with the Google account you want firmware files stored in:\n');
console.log(authUrl);
console.log('\n2. Click Allow. You will be redirected to localhost and this script will pick it up automatically.\n');
console.log('Waiting for you to complete sign-in...\n');

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, REDIRECT_URI);
    const code = reqUrl.searchParams.get('code');
    if (!code) {
      res.end('No authorization code received. You can close this tab and check the terminal.');
      return;
    }
    res.end('Success! You can close this tab and return to your terminal.');
    server.close();

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        '\nNo refresh token was returned. This usually means this account already granted access before.\n' +
          'Go to https://myaccount.google.com/permissions, remove access for this app, then run this script again.'
      );
      process.exit(1);
    }

    console.log('\nSuccess. Add this line to backend/.env:\n');
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nDone — you only need to do this once.');
    process.exit(0);
  } catch (err) {
    console.error('\nFailed to exchange authorization code for tokens:', err.message);
    process.exit(1);
  }
});

server.listen(PORT);
