
const html = `<!DOCTYPE html><html>...<form id="download-form" action="https://drive.usercontent.google.com/download" method="get">...<input type="hidden" name="confirm" value="t">...</html>`;

const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
console.log("Original Regex Match:", confirmMatch?.[1]);

const betterRegex = /confirm=([a-zA-Z0-9_-]+)|name="confirm"\s+value="([a-zA-Z0-9_-]+)"/;
const betterMatch = html.match(betterRegex);
console.log("Better Regex Match:", betterMatch?.[1] || betterMatch?.[2]);
