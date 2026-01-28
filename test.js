const clubworx = require('./index.js');

// Helper to log arrays with a limit
function logPreview(label, data, limit = 3) {
  if (Array.isArray(data)) {
    const preview = data.slice(0, limit);
    console.log(`${label} (${data.length} total, showing first ${Math.min(limit, data.length)}):`);
    console.log(JSON.stringify(preview, null, 2));
  } else {
    console.log(`${label}:`, JSON.stringify(data, null, 2));
  }
}

async function test() {
  try {
    const email = process.env.CLUBWORX_EMAIL;
    const password = process.env.CLUBWORX_PASSWORD;

    if (!email || !password) {
      console.error('Please set CLUBWORX_EMAIL and CLUBWORX_PASSWORD environment variables');
      process.exit(1);
    }

    console.log('Attempting to log in...');
    const session = await clubworx.login(email, password);

    console.log('Login successful!');
    console.log('Gym ID:', session.gymId);
    logPreview('Cookies', session.cookies);

    console.log('\nFetching all reports...');
    const reports = await session.allReports();
    logPreview('Reports', reports);

    if (reports.length > 0) {
      console.log('\nFetching first report by ID...');
      const firstReport = await session.reportById(reports[0].id);
      logPreview('First report data', firstReport);
    }

    console.log('\nFetching members...');
    const members = await session.members({ page: 1, count: 10 });
    logPreview('Members', members);

    if (members.length > 0) {
      console.log('\nFetching first member by ID...');
      const firstMember = await session.memberById(members[0].id);
      logPreview('First member data', firstMember);

      console.log('\nAdding a note to first member...');
      const note = await session.addMemberNote(
        members[0].id,
        'Test Note',
        'This is a test note created by the API client.'
      );
      logPreview('Note created', note);
    }

    console.log('\nFetching financials data...');
    const financials = await session.financials();
    logPreview('Financials', financials);

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  }
}

test();
