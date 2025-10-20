const clubworx = require('./index.js');

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
    console.log('Session created with cookies:', session.cookies);

    console.log('\nFetching all reports...');
    const reports = await session.allReports();
    console.log('Reports:', JSON.stringify(reports, null, 2));

    if (reports.length > 0) {
      console.log('\nFetching first report by ID...');
      const firstReport = await session.reportById(reports[0].id);
      console.log('First report data:', JSON.stringify(firstReport, null, 2));
    }

    console.log('\nFetching members...');
    const members = await session.members({ page: 1, count: 10 });
    console.log('Members:', JSON.stringify(members, null, 2));

    if (members.length > 0) {
      console.log('\nFetching first member by ID...');
      const firstMember = await session.memberById(members[0].id);
      console.log('First member data:', JSON.stringify(firstMember, null, 2));
    }

    console.log('\nFetching financials data...');
    const financials = await session.financials();
    console.log('Financials:', JSON.stringify(financials, null, 2));

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  }
}

test();
