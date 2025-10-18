# Clubworx

A package for fetching your own data from Clubworx. This package has a strict requirement for authentication (described below), and is in no way officially affiliated with Clubworx.

## Install

`npm install clubworx`

## Usage

```js
const clubworx = require('clubworx');

// Creates a session with your login details, ideally from ENV
const session = await clubworx.login('my@email.com', 'secret')

// Get array of all your reports (just ID and name)
const reports = await session.allReports();
// Returns: [{ id: 123, name: "My Report" }, ...]

// Get the complete data for a specific report (array of row objects)
const report = await session.reportById(123);
// Returns: [{ "First Name": "John", "Last Name": "Doe", ... }, ...]

// Optional pagination parameters (default: page=1, count=100)
const reportPage2 = await session.reportById(123, { page: 2, count: 50 });
```