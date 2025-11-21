# Clubworx

A package for fetching your own data from Clubworx. This package is in no way officially affiliated with Clubworx.

## Install

`npm install clubworx`

## Usage

```js
import clubworx from 'clubworx';

// Creates a session with your login details, ideally from ENV
const session = await clubworx.login('my@email.com', 'secret');

// Get array of all your reports (just ID and name)
const reports = await session.allReports();
// Returns: [{ id: 123, name: "My Report" }, ...]

// Get the complete data for a specific report (array of row objects)
const report = await session.reportById(reports[0].id);
// Returns: [{ "First Name": "John", "Last Name": "Doe", ... }, ...]

// Optional pagination parameters (default: page=1, count=100)
const reportPage2 = await session.reportById(reports[0].id, { page: 2, count: 50 });

// Get members with optional pagination and search
const members = await session.members();
// Returns: [{ id: 12345, name: "Jane Doe", firstName: "Jane", lastName: "Doe", ... }, ...]

// With pagination and search
const searchResults = await session.members({ page: 1, count: 50, search: 'Smith' });

// Get a single member by ID
const member = await session.memberById(members[0].id);
// Returns: { id: 12345, name: "Jane Doe", firstName: "Jane", lastName: "Doe", ... }

console.log({ reports, report, members, member });
```

For CommonJS, use `const clubworx = require('clubworx')` and wrap in an async function.

## Serverless Usage

For serverless environments, you can serialize and restore sessions to avoid re-authenticating on every invocation:

```js
const { login, Session, SessionExpiredError } = require('clubworx');

// First invocation - login and save session
const session = await login('my@email.com', 'secret');
const sessionData = session.toJSON();
// Store sessionData in your preferred storage (Redis, DynamoDB, S3, etc.)
await saveToStorage('session-key', JSON.stringify(sessionData));

// Subsequent invocations - restore session from storage
try {
  const storedData = JSON.parse(await getFromStorage('session-key'));
  const session = Session.fromJSON(storedData);
  const reports = await session.allReports();
} catch (error) {
  if (error instanceof SessionExpiredError) {
    // Session expired - login again and update storage
    const session = await login('my@email.com', 'secret');
    await saveToStorage('session-key', JSON.stringify(session.toJSON()));
    const reports = await session.allReports();
  } else {
    throw error;
  }
}
```