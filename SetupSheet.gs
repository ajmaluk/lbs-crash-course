// SetupSheet.gs

function setupSheet() {
  const SHEET_ID = "1vg9K8CEr29DDzp_w4Wt9h03msm7-vY0T4KcY03O_7A4";
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Gets the first visible sheet
  const sheet = ss.getSheets()[0]; 
  
  // Only add headers if the sheet is completely empty
  if (sheet.getLastRow() === 0) {
    const headers = [
      "Timestamp",
      "Name",
      "Email",
      "Phone Number",
      "WhatsApp Number",
      "Graduation Year",
      "Selected Package",
      "Transaction ID",
      "Screenshot URL",
      "Status"
    ];
    
    // 1. Append the headers to the first row
    sheet.appendRow(headers);
    
    // 2. Make the header row bold
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    
    // 3. Freeze the top row so it stays visible when scrolling
    sheet.setFrozenRows(1);
    
    SpreadsheetApp.getUi().alert("✅ Success! Your sheet headers have been created.");
  } else {
    SpreadsheetApp.getUi().alert("⚠️ Your sheet already has data in it. Setup skipped so nothing gets overwritten.");
  }
}
