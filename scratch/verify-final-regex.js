
const html = `
<form id="download-form" action="https://drive.usercontent.google.com/download" method="get">
<input type="hidden" name="id" value="1afTvCtPGTpm4JEVNUovjCx80BAUXH9qP">
<input type="hidden" name="export" value="download">
<input type="hidden" name="confirm" value="t">
<input type="hidden" name="uuid" value="69e59062-5fb1-4c9b-85cb-94c83652a140">
</form>
`;

const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/) || 
                    html.match(/name="confirm"\s+value="([a-zA-Z0-9_-]+)"/);

const uuidMatch = html.match(/name="uuid"\s+value="([a-zA-Z0-9_-]+)"/);

console.log("Confirm Token:", confirmMatch?.[1]);
console.log("UUID Token:", uuidMatch?.[1]);
