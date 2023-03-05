const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    keyFile: 'botData.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
})

const sheets = google.sheets({
    version: 'v4',
    auth
});

async function postToSheet(range, values) {
    const res = await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: values
        }
    })
    return res.data;
}

async function getRows() {
    const rows = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "Sheet1"
    })
    console.log(rows.data.values);
}

module.exports = {
    postToSheet,
    getRows,
}