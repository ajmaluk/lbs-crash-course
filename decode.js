const str = "eyJpZCI6Imh0dHBzOi8vZHJpdmUuZ29vZ2xlLmNvbS9maWxlL2QvMWFmVHZDdFBHVHBtTmVhSEd1bUN0eGNTRVlTSldOOFpHL3ZpZXc_dXNwP";
// Fix padding
let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
while (b64.length % 4 !== 0) b64 += '=';
console.log(Buffer.from(b64, 'base64').toString('utf8'));
