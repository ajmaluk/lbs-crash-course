// Code.gs

function doPost(e) {
  try {
    const SHEET_ID = "1vg9K8CEr29DDzp_w4Wt9h03msm7-vY0T4KcY03O_7A4";
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0]; 
    const parameters = e.parameter;
    
    // Check if this is a Status Update request from the Admin Dashboard
    if (parameters.action === "updateStatus") {
      const emailToFind = parameters.email;
      const newStatus = parameters.status;
      
      if (!emailToFind || !newStatus) {
         throw new Error("Missing email or status for update.");
      }
      
      const data = sheet.getDataRange().getValues();
      // Assuming 'Email' is column C (index 2)
      // Assuming 'Status' is column J (index 9)
      let updated = false;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][2] === emailToFind) { // Found the matching email
          sheet.getRange(i + 1, 10).setValue(newStatus); // Update Status column (Row is i+1, Col is 10)
          updated = true;
          break;
        }
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ "status": "success", "message": updated ? "Status updated" : "Email not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Otherwise, this is a normal new registration
    const rowData = [
      new Date(),                      // Timestamp (A)
      parameters.name || "",           // Name (B)
      parameters.email || "",          // Email (C)
      parameters.phone || "",          // Phone (D)
      parameters.whatsapp || "",       // WhatsApp (E)
      parameters.graduationYear || "", // Graduation Year (F)
      parameters.selectedPackage || "",// Package (G)
      parameters.transactionId || "",  // Transaction ID (H)
      parameters.screenshotUrl || "",  // Cloudinary URL (I)
      parameters.status || "Pending"   // Status (J)
    ];
    
    // Check if the sheet is empty to add headers
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
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success", "message": "Record inserted" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handling CORS preflight requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
