const https = require('https');
const { URL } = require('url');
const querystring = require('querystring');

// Helper to make HTTPS requests
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Extract authenticity token from HTML
function extractAuthToken(html) {
  const match = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  return match ? match[1] : null;
}

// Extract gym_id from gym-data script tag
function extractGymId(html) {
  // Try to match the script tag with gym-data - use [\s\S] to match across newlines
  const match = html.match(/<script id="gym-data" type="application\/json">([\s\S]+?)<\/script>/);
  if (match) {
    try {
      const gymData = JSON.parse(match[1]);
      return gymData.id;
    } catch (e) {
      console.error('Failed to parse gym-data JSON:', e.message);
      return null;
    }
  }
  return null;
}

// Login function that creates a session
async function login(email, password) {
  // Step 1: GET the login page to extract authenticity_token
  const loginPageResponse = await request('https://app.clubworx.com/users/sign_in');
  const authToken = extractAuthToken(loginPageResponse.body);

  if (!authToken) {
    throw new Error('Failed to extract authenticity token from login page');
  }

  // Extract cookies from the initial GET request
  const initialCookies = loginPageResponse.headers['set-cookie'] || [];
  const initialCookieHeader = initialCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: POST credentials with the token and initial cookies
  const formData = querystring.stringify({
    'authenticity_token': authToken,
    'user[email]': email,
    'user[password]': password,
    'user[remember_me]': '0',
    'commit': 'Sign in'
  });

  const loginResponse = await request('https://app.clubworx.com/users/sign_in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
      'Cookie': initialCookieHeader
    },
    body: formData
  });

  // Step 3: Extract cookies from Set-Cookie headers
  let allCookies = loginResponse.headers['set-cookie'] || [];

  if (!allCookies.length || loginResponse.statusCode !== 302) {
    throw new Error('Login failed - invalid credentials or unexpected response');
  }

  // Step 4: Follow redirects to get the dashboard page with gym_id
  let currentUrl = loginResponse.headers['location'];
  let dashboardResponse;
  let redirectCount = 0;
  const maxRedirects = 5;

  // Follow redirects until we get a non-redirect response
  while (redirectCount < maxRedirects) {
    // Handle both relative and absolute redirect URLs
    const targetUrl = currentUrl.startsWith('http')
      ? currentUrl
      : `https://app.clubworx.com${currentUrl}`;

    // Build cookie header from all collected cookies
    const cookieHeader = allCookies.map(c => c.split(';')[0]).join('; ');

    dashboardResponse = await request(targetUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader
      }
    });

    // Collect any new cookies from this response
    if (dashboardResponse.headers['set-cookie']) {
      allCookies = allCookies.concat(dashboardResponse.headers['set-cookie']);
    }

    // If not a redirect, we're done
    if (dashboardResponse.statusCode !== 302 && dashboardResponse.statusCode !== 301) {
      break;
    }

    // Follow the next redirect
    currentUrl = dashboardResponse.headers['location'];
    redirectCount++;
  }

  if (redirectCount >= maxRedirects) {
    throw new Error('Too many redirects during login');
  }

  // Step 5: Extract gym_id from the dashboard HTML
  const gymId = extractGymId(dashboardResponse.body);

  if (!gymId) {
    throw new Error('Failed to extract gym_id from dashboard');
  }

  // Return a new Session instance with cookies and gym_id
  return new Session(allCookies, gymId);
}

// Session object with methods
class Session {
  constructor(cookies, gymId) {
    this.cookies = cookies;
    this.gymId = gymId;
  }

  // Helper to make authenticated requests
  async authenticatedRequest(url, options = {}) {
    const cookieHeader = Array.isArray(this.cookies)
      ? this.cookies.map(c => c.split(';')[0]).join('; ')
      : this.cookies;

    const headers = {
      'Accept': 'application/json',
      ...options.headers,
      'Cookie': cookieHeader
    };

    return request(url, { ...options, headers });
  }

  // Get summary of all reports (just ID and name)
  async allReports(options = {}) {
    const page = options.page || 1;
    const count = options.count || 100;
    const url = `https://app.clubworx.com/gyms/${this.gymId}/reports?paginate=1&page=${page}&count=${count}`;

    const response = await this.authenticatedRequest(url);

    // Parse JSON response and return simplified array
    const data = JSON.parse(response.body);
    return data.collection.map(report => ({
      id: report.id,
      name: report.name
    }));
  }

  // Get complete data for a specific report (array of objects)
  async reportById(id, options = {}) {
    const page = options.page || 1;
    const count = options.count || 100;
    const url = `https://app.clubworx.com/gyms/${this.gymId}/reports/${id}?count=${count}&page=${page}`;

    const response = await this.authenticatedRequest(url);
    const data = JSON.parse(response.body);

    // Extract column labels from report_columns_attributes
    const columns = data.report_columns_attributes || [];
    const columnLabels = columns.map(col => col.label);

    // Transform rows into array of objects with key/value pairs
    const rows = data.rows || [];
    return rows.map(row => {
      const obj = {};
      // Flatten the nested arrays - each row contains nested arrays of values
      const flatValues = row.flat();

      // Map each value to its corresponding column label
      columnLabels.forEach((label, index) => {
        obj[label] = flatValues[index] !== undefined ? flatValues[index] : null;
      });

      return obj;
    });
  }
}

module.exports = {
  login
};
