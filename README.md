PROJECT SPECIFICATION: LBS MCA Entrance Exam Preparation Website

=============================================================================
OVERVIEW
=============================================================================
Build a comprehensive Learning Management System (LMS) for LBS MCA PG entrance exam preparation with separate Admin and Student portals. The system manages course packages, live/recorded classes, assessments, and manual payment verification workflow.

=============================================================================
TECHNOLOGY STACK
=============================================================================
- Frontend: React/HTML/CSS/JavaScript
- Database: Firebase Realtime Database
- Authentication: Firebase Auth
- Notifications: OneSignal
- File Storage: Google Drive (via Apps Script)
- Registration Data: Google Sheets (via Apps Script)
- Video Hosting: YouTube (unlisted videos)
- Live Classes: Google Meet

=============================================================================
PACKAGE STRUCTURE
=============================================================================
Three package options available:

1. Live Classes Only - ₹299
   - Access to live Google Meet classes
   - Weekly quizzes
   - Mock tests
   - Previous year question papers
   - Database field: is_live = true, is_recorded_class = false

2. Recorded Classes Only - ₹299
   - Access to recorded YouTube videos
   - Weekly quizzes
   - Mock tests
   - Previous year question papers
   - Database field: is_live = false, is_recorded_class = true

3. Both (Live + Recorded) - ₹499
   - Full access to both live and recorded classes
   - Weekly quizzes
   - Mock tests
   - Previous year question papers
   - Database field: is_live = true, is_recorded_class = true

Package Upgrade Feature:
- Users with "Live Only" or "Recorded Only" can upgrade to "Both"
- Upgrade process requires new transaction ID submission
- Admin verification required for upgrade activation

=============================================================================
SUBJECT CATEGORIES
=============================================================================
All content organized under these subjects:
1. Computer Science
2. Mathematics & Statistics
3. Quantitative Aptitude & Logical Ability
4. English
5. General Knowledge

=============================================================================
REGISTRATION WORKFLOW (NEW USERS)
=============================================================================

Registration Page Components:
- User input fields:
  * Full Name (required)
  * Email (required)
  * Mobile Number (required)
  * WhatsApp Number (required)
  * Date of Birth (required)
  * Graduation Year (required)
  * Package Selection (dropdown: Live Only / Recorded Only / Both)
  * Transaction Screenshot Upload (required)

- Payment Section:
  * Display QR code for payment
  * "Download QR Code" button
  * Upload transaction screenshot field
  * Display selected package price dynamically

- Register Button

Registration Process Flow:
1. User fills all registration details
2. User downloads QR code, makes payment
3. User uploads transaction screenshot
4. User clicks "Register" button
5. System triggers Google Apps Script:
   - Stores transaction screenshot in Google Drive
   - Saves all registration data to Google Sheets
6. Show success message: "Registration submitted. Wait for admin verification. You will receive login credentials via email."

Google Sheets Structure for New Registrations:
- Columns: Name, Email, Mobile, WhatsApp, DOB, Graduation Year, Package Type, Transaction Screenshot Link, Registration Date, Status (Pending/Approved/Rejected)

=============================================================================
ADMIN SIDE - NEW USER VERIFICATION
=============================================================================

New Users Section:
- Display all newly registered users in table/card view
- Each row shows: Name, Email, Package Type, Registration Date, Status
- Click on any row to open detailed view

User Detail Page (Modal/New Page):
- Display all user information
- Show transaction screenshot (embedded from Google Drive)
- Two action buttons:
  1. "Approve & Add User" button
  2. "Reject" button

Approve & Add User Flow:
1. Admin clicks "Approve & Add User"
2. Show confirmation overlay: "Confirm adding this user?"
3. On confirmation:
   - Generate credentials:
     * Login ID: auto-generated unique ID (e.g., LBS2025001)
     * Password: User's phone number
   - Create user in Firebase Authentication
   - Add user to Firebase Realtime Database with:
     * All registration details
     * is_live field (based on package)
     * is_recorded_class field (based on package)
     * account_status: "active"
     * created_date: timestamp
     * first_login: true
   - Send email to user with:
     * Subject: "LBS MCA Exam Prep - Account Activated"
     * Body: Login credentials + instruction to change password on first login
   - Update status in Google Sheets to "Approved"
   - Move user from "New Users" to "Active Users" section in admin panel

Reject Flow:
1. Admin clicks "Reject"
2. Show form/modal with:
   - Text field: "Reason for rejection" (required)
3. On submission:
   - Update status in Google Sheets to "Rejected"
   - Add rejection reason to Google Sheets
   - Move to "Rejected Users" section in admin panel
   - Send email to user:
     * Subject: "LBS MCA Exam Prep - Registration Rejected"
     * Body: Rejection reason with re-registration instructions

Rejected Users Section:
- Separate section showing all rejected registrations
- Display: Name, Email, Package, Rejection Reason, Date
- Option to review and reconsider if needed

=============================================================================
STUDENT SIDE - FIRST TIME LOGIN
=============================================================================

First Login Flow:
1. User receives email with Login ID and Password
2. User navigates to login page and enters credentials
3. System checks first_login flag in Firebase
4. If first_login = true:
   - Redirect to "Set New Password" page
   - Show form with:
     * Current Password (pre-filled, read-only)
     * New Password field
     * Confirm New Password field
     * Submit button
5. On password change:
   - Update Firebase Auth password
   - Set first_login = false in database
   - Redirect to student dashboard

=============================================================================
LOGIN & PASSWORD MANAGEMENT
=============================================================================

Login Page:
- Fields: Login ID, Password
- "Login" button
- "Forgot Login ID or Password?" link

Forgot Credentials Flow:
1. User clicks "Forgot Login ID or Password?"
2. Opens new page with:
   - Email input field
   - "Request Reset" button
3. On submission:
   - Create password reset request in Firebase:
     * email, request_date, status: "pending"
   - Show message: "Request submitted. Admin will send your credentials via email."
4. Admin Side - Password Reset Requests:
   - Separate section showing all pending requests
   - Display: Email, Request Date, Status
   - Action button: "Send Credentials"
   - On clicking:
     * Fetch user credentials from Firebase
     * Send email with Login ID and temporary password
     * Update request status to "completed"

=============================================================================
DEVICE RESTRICTION - SINGLE SESSION ENFORCEMENT
=============================================================================

Implementation using OneSignal:
1. On successful login:
   - Generate unique session token
   - Store in Firebase: user_id/active_session = {device_id, session_token, login_time}
   - Store session token in local storage
2. On app/page load:
   - Check if session token matches Firebase
   - If mismatch detected:
     * Auto-logout current session
     * Clear local storage
     * Redirect to login with message: "Account logged in from another device"
3. OneSignal Integration:
   - Send push notification to previous device: "Your account has been logged in from another device"
   - Use OneSignal player ID as device identifier

No Simultaneous Login:
- Only one active session per account at any time
- New login automatically terminates previous session

=============================================================================
STUDENT DASHBOARD - MAIN FEATURES
=============================================================================

Navigation Menu:
- Dashboard/Home
- Live Classes (if is_live = true)
- Recorded Classes (if is_recorded_class = true)
- Weekly Quizzes
- Mock Tests
- Previous Year Papers
- My Profile
- Syllabus
- Announcements
- About/Creators
- Logout

Dashboard Overview:
- Welcome message with student name
- Package type display
- Quick stats: Quizzes attended, Mock tests completed, Video progress
- Recent announcements
- Upcoming live classes (if applicable)
- Continue watching (last video)

=============================================================================
PROFILE MANAGEMENT
=============================================================================

Profile Page Sections:

1. Personal Information:
   - Display: Name, Email, Mobile, DOB, Graduation Year
   - Edit button (for limited fields like WhatsApp number)

2. Package Information:
   - Current package type
   - Package features list
   - Package start date

3. Upgrade Package Section (if not on "Both" package):
   - Show available upgrade option
   - Display upgrade price
   - "Upgrade Now" button

Upgrade Flow:
1. User clicks "Upgrade Now"
2. Opens upgrade form:
   - Current package display
   - Upgrade to: "Both (Live + Recorded)"
   - Price to pay
   - QR code display with "Download QR" button
   - Transaction screenshot upload field
   - "Submit Upgrade Request" button
3. On submission:
   - Upload transaction screenshot to Google Drive
   - Create upgrade request in Firebase:
     * user_id, current_package, upgrade_to, transaction_screenshot, request_date, status: "pending"
   - Show message: "Upgrade request submitted. Wait for verification."

Admin Side - Upgrade Requests:
- Separate "Upgrade Requests" section
- Sub-sections:
  * "To Live Classes" - users upgrading to include live
  * "To Recorded Classes" - users upgrading to include recorded
  * "To Both" - any upgrade to full package
- Each request shows: User name, Current package, Upgrade to, Transaction screenshot, Request date
- Action buttons: "Approve" / "Reject"

Approve Upgrade:
1. Admin clicks "Approve"
2. System updates Firebase:
   - Update is_live and/or is_recorded_class fields
   - Update package_type
   - Add upgrade_date timestamp
3. Send email: "Package upgraded successfully. You now have access to [features]"
4. User immediately gets access to new features

Reject Upgrade:
1. Admin clicks "Reject"
2. Show form with "Rejection Reason" field
3. On submission:
   - Update upgrade request status to "rejected"
   - Send email with rejection reason: "Transaction ID is incorrect/invalid. [Custom message from admin]"
   - User can see rejection message in profile

=============================================================================
LIVE CLASSES FEATURE (for is_live = true users)
=============================================================================

Student Side - Live Classes Section:

Subject-wise Navigation:
- Tabs/Menu for each subject
- Each subject shows two subsections:
  1. Upcoming Live Classes
  2. Recorded Live Classes

Upcoming Live Classes Display:
- If no live classes scheduled: "Live class dates will be updated soon"
- If live classes scheduled: Show cards with:
  * Class title
  * Date and time
  * Subject
  * Status: "Coming Soon" (before date/time)
  * Meeting link (appears 10 minutes before scheduled time)
  * After scheduled time: Meeting link becomes active, "Join Now" button

Live Class Card States:
1. No Classes Yet: "Live dates will be updated soon"
2. Scheduled (Future): Show date/time, "Coming Soon" badge
3. Live Now: "Join Now" button with Google Meet link
4. Completed: Disabled link, "Class Completed" badge

Recorded Live Classes (Past Lives):
- List of all completed live classes for that subject
- Each card shows:
  * Class title
  * Original live date
  * Recording duration
  * Play button

YouTube Video Embedding:
- Embed YouTube videos within website player
- Disable controls:
  * No share button
  * No "Watch on YouTube" link
  * No download option
  * Only play/pause and seek controls visible
- Track video progress (timestamp of last watched position)
- Auto-resume from last position

Admin Side - Live Classes Management:

Add New Live Class:
- Form with fields:
  * Class Title
  * Subject (dropdown)
  * Date and Time
  * Google Meet Link (optional initially)
  * "Schedule Live" button

- Scheduled lives appear in admin's "Upcoming Lives" list
- Edit option to add/update Google Meet link
- When meet link added, OneSignal notification sent to eligible students

Mark Live as Completed:
- After live class ends, admin can "Mark as Completed"
- Opens form:
  * Upload Recording YouTube URL field
  * "Save Recording" button
- On save:
  * Live class moved to "Recorded Live Classes"
  * Meeting link disabled
  * Recording becomes accessible to all students (both live and recorded users)

=============================================================================
RECORDED CLASSES FEATURE (for is_recorded_class = true users)
=============================================================================

Student Side - Recorded Classes Section:

Subject-wise Navigation:
- Tabs/Menu for each subject
- Display all recorded class videos for selected subject

Video Cards Display:
- Each video shows:
  * Thumbnail (YouTube thumbnail)
  * Class title
  * Duration
  * Progress bar (if previously watched)
  * Play button

Video Player:
- Embedded YouTube player within website
- Disabled controls:
  * Share button hidden
  * Watch on YouTube hidden
  * Download disabled
  * Only play/pause, volume, seek controls enabled
- Track progress:
  * Save timestamp every 10 seconds to Firebase
  * Resume from last watched position on next visit
- Mark as completed when watched 90% or more

Progress Tracking:
- In profile: Show % of videos completed per subject
- Visual progress indicators on video cards

Admin Side - Recorded Classes Management:

Add New Recorded Class:
- Form with fields:
  * Class Title
  * Subject (dropdown)
  * YouTube Video URL (unlisted video)
  * Upload date (auto-filled)
  * "Add Video" button
- Video appears immediately for students with recorded class access

Edit/Delete Options:
- List of all recorded videos
- Edit: Update title, URL, subject
- Delete: Remove video (with confirmation)

Video Analytics (Optional):
- See how many students watched each video
- Average completion rate per video

=============================================================================
ACCESS CONTROL RULES
=============================================================================

Live Classes Only (is_live = true, is_recorded_class = false):
- CAN access: Live classes, recorded live classes, quizzes, mock tests, previous papers
- CANNOT access: Pre-recorded classes section

Recorded Classes Only (is_live = false, is_recorded_class = true):
- CAN access: Pre-recorded classes, recorded live classes, quizzes, mock tests, previous papers
- CANNOT access: Live classes, Google Meet links

Both (is_live = true, is_recorded_class = true):
- Full access to all features

Note: Recorded live classes (recordings of past live sessions) are accessible to ALL users regardless of package, as they're part of the course progression.

=============================================================================
WEEKLY QUIZ FEATURE
=============================================================================

Admin Side - Quiz Management:

Create Weekly Quiz:
- Form with:
  * Quiz Title (e.g., "Week 1 Quiz - Computer Science")
  * Subject (dropdown)
  * Week Number
  * Due Date/Time
  * "Add Questions" section:
    - Question Text
    - Option A
    - Option B
    - Option C
    - Option D
    - Correct Answer (dropdown: A/B/C/D)
    - "Add Another Question" button
  * "Publish Quiz" button

- Published quizzes appear in "Active Quizzes" section
- Status: "Open for Attempts"

Evaluate & Close Quiz:
- After due date/time or manually:
- Admin clicks "Evaluate Quiz" button
- Confirmation: "This will close the quiz and calculate rankings. Continue?"
- On confirmation:
  * Quiz status changes to "Closed"
  * Calculate scores for all students who attempted
  * Generate rank list based on scores (then time taken as tiebreaker)
  * Quiz no longer available for new attempts
  * Show "View Results" button

Quiz Results Page (Admin):
- Display:
  * Total students attempted
  * Average score
  * Top 10 leaderboard with: Rank, Name, Score, Time Taken
  * Full student list with scores and ranks
  * Export option (CSV/Excel)

Student Side - Weekly Quiz:

Quiz Listing:
- Show all available quizzes
- Each card shows:
  * Quiz title
  * Subject
  * Week number
  * Due date/time
  * Status: "Not Attempted" / "Completed" / "Closed"
  * "Start Quiz" button (if not attempted and still open)
  * "View Results" button (if attempted and quiz closed)

Taking Quiz:
- Click "Start Quiz" opens quiz page
- Display questions one by one or all at once (based on preference)
- Timer displayed (optional time limit)
- Radio buttons for options
- "Submit Quiz" button at end
- Confirmation before submission: "Are you sure? You cannot change answers after submission."

After Submission (Quiz still open):
- Show score immediately
- Show correct/incorrect answers
- Message: "Results and rankings will be available after quiz closes"

After Quiz Evaluation (Closed):
- View Results page shows:
  * Your Score
  * Your Rank
  * Time Taken
  * Top 10 Leaderboard
  * Correct answers for all questions
  * Your answers (correct/incorrect highlighted)

Profile Integration:
- Quiz Performance section:
  * List of all attempted quizzes
  * Each showing: Quiz name, Score, Rank, Date attempted
  * Overall quiz statistics
  * Subject-wise performance breakdown

=============================================================================
MOCK TEST FEATURE
=============================================================================

Admin Side - Mock Test Management:

Create Mock Test:
- Similar to quiz creation but larger scale
- Form with:
  * Test Title (e.g., "Mock Test 1 - Full Syllabus")
  * Test Type: Subject-specific / Full Syllabus
  * Duration (in minutes)
  * Total Marks
  * Sections (if multiple subjects):
    - Section Name (e.g., Computer Science)
    - Number of questions in section
  * "Add Questions" section:
    - Question Text
    - Option A, B, C, D
    - Correct Answer
    - Marks for this question
    - Subject/Section
    - "Add Another Question" button
  * "Publish Mock Test" button

- Published tests appear in "Active Mock Tests"
- Status: "Open for Attempts"

Evaluate & Close Mock Test:
- Admin clicks "Evaluate Mock Test"
- Confirmation popup
- On confirmation:
  * Test status changes to "Closed"
  * Calculate scores for all attempts
  * Generate rank list
  * Test no longer available for new attempts

Mock Test Results Page (Admin):
- Similar to quiz results
- Additional analytics:
  * Section-wise performance
  * Question-wise accuracy
  * Difficulty analysis

Student Side - Mock Test:

Mock Test Listing:
- Show all available mock tests
- Each card shows:
  * Test title
  * Test type
  * Duration
  * Total marks
  * Status: "Not Attempted" / "Completed" / "Closed"
  * "Start Test" button

Taking Mock Test:
- Click "Start Test" opens test page
- Strict timer displayed (countdown)
- All questions displayed with section navigation
- Question palette showing: Answered / Not Answered / Marked for Review
- "Submit Test" button
- Auto-submit when time expires
- Confirmation before manual submission

After Submission (Test still open):
- Show total score
- Message: "Detailed results and rankings will be available after test evaluation"

After Test Evaluation (Closed):
- View Results page shows:
  * Your Total Score
  * Section-wise scores
  * Your Rank
  * Percentile
  * Time Taken
  * Top 10 Leaderboard
  * Detailed answer key with explanations
  * Your responses (correct/incorrect/unanswered)

Profile Integration:
- Mock Test Performance section:
  * List of all attempted mock tests
  * Each showing: Test name, Score, Rank, Percentile, Date
  * Performance graph over time
  * Subject-wise strength/weakness analysis

=============================================================================
PREVIOUS YEAR QUESTION PAPERS
=============================================================================

Admin Side - Question Paper Management:

Upload Question Paper:
- Form with:
  * Year (e.g., 2024, 2023)
  * Paper Title
  * Google Drive PDF Link (upload PDF to Drive first)
  * Exam Type (if multiple): Regular/Compartment
  * "Upload Paper" button

- Papers listed with: Year, Title, Upload Date
- Edit/Delete options available

Student Side - Previous Year Papers:

Paper Listing:
- Display all available papers
- Sorted by year (latest first)
- Each card shows:
  * Year
  * Paper title
  * Exam type
  * "View Paper" button

View Paper:
- Click "View Paper" opens embedded PDF viewer
- PDF displayed within website (using PDF.js or similar)
- Disabled features:
  * No download button
  * No print option
  * No right-click/save
  * No share options
- Only scroll and zoom controls available
- Add watermark with student name/ID for security

Security Measures:
- PDF URLs should be authenticated (Firebase security rules)
- Implement token-based access with expiry
- Log access attempts
- Prevent direct URL access to Drive files

=============================================================================
ANNOUNCEMENTS FEATURE
=============================================================================

Admin Side - Announcements:

Create Announcement:
- Form with:
  * Announcement Title
  * Message Body (rich text editor)
  * Priority: Normal / Important / Urgent
  * Target Audience: All Students / Live Only / Recorded Only / Specific Package
  * Expiry Date (optional)
  * "Publish Announcement" button

- On publish:
  * Announcement saved to Firebase
  * OneSignal push notification sent to target audience
  * Email notification (for important/urgent)

Manage Announcements:
- List of all announcements
- Edit/Delete options
- Mark as expired manually

Student Side - Announcements:

Announcements Page:
- List all announcements
- Priority-based highlighting:
  * Urgent: Red border/background
  * Important: Orange/yellow border
  * Normal: Standard styling
- Each shows: Title, Date, Priority badge, Message preview
- Click to expand/view full message

Dashboard Integration:
- Show latest 3-5 announcements on dashboard
- Unread badge/indicator
- Click to view all announcements

OneSignal Notification:
- Push notification when new announcement published
- Click notification opens announcement in app

=============================================================================
STATIC PAGES
=============================================================================

Syllabus Page:
- Complete exam syllabus organized by subject
- Downloadable PDF of syllabus
- Topic-wise breakdown
- Marking scheme information
- Exam pattern details

About/Creators Page:
- Information about the platform
- Mission and vision
- Team information
- Success stories
- Testimonials (optional)
- Contact information

FAQ Page (Optional):
- Common questions about:
  * Registration process
  * Package differences
  * Payment verification
  * Technical issues
  * Access problems

Contact/Support Page:
- Contact form
- Email address
- Phone number
- WhatsApp support link
- Response time expectations

=============================================================================
ADMIN DASHBOARD
=============================================================================

Dashboard Overview:
- Total registered users
- Active users (by package type)
- Pending verifications
- Pending upgrade requests
- Recent registrations
- Recent activities

Navigation Menu:
- Dashboard
- User Management:
  * New Registrations
  * Active Users
  * Rejected Users
  * Upgrade Requests (with subsections)
  * Password Reset Requests
- Content Management:
  * Live Classes
  * Recorded Classes
  * Weekly Quizzes
  * Mock Tests
  * Previous Year Papers
- Announcements
- Analytics/Reports
- Settings
- Logout

User Management Section:

Active Users:
- Search and filter options
- List showing: Name, Email, Package, Registration Date, Last Login
- Click to view full profile
- Actions: Edit, Deactivate, Send Notification

User Profile View (Admin):
- All user details
- Package information
- Activity history
- Quiz/test performance
- Video watch history
- Actions: Edit details, Change package, Reset password

Deactivated Users:
- Separate section for deactivated accounts
- Reason for deactivation
- Option to reactivate

Analytics/Reports Section:
- User statistics:
  * Total users by package
  * Registration trends (graph)
  * Active vs inactive users
- Content statistics:
  * Most watched videos
  * Quiz participation rates
  * Mock test statistics
- Revenue tracking:
  * Package-wise revenue
  * Monthly revenue trends
- Engagement metrics:
  * Daily active users
  * Average session duration
  * Feature usage statistics

Settings Section:
- Admin profile management
- Add/remove admin users (multi-admin support)
- System settings:
  * Enable/disable registrations
  * Set quiz/test time limits
  * Configure email templates
  * Update payment QR code
  * Manage pricing
- Notification settings:
  * OneSignal configuration
  * Email templates
  * Notification triggers

=============================================================================
FIREBASE DATABASE STRUCTURE
=============================================================================

Collections/Nodes:

users/
  {user_id}/
    - name: string
    - email: string
    - mobile: string
    - whatsapp: string
    - dob: string
    - graduation_year: string
    - login_id: string
    - package_type: string (live_only / recorded_only / both)
    - is_live: boolean
    - is_recorded_class: boolean
    - account_status: string (active / inactive / suspended)
    - registration_date: timestamp
    - first_login: boolean
    - created_by_admin: timestamp
    - active_session:
        - device_id: string
        - session_token: string
        - login_time: timestamp
    - video_progress:
        {video_id}: {timestamp, completed: boolean}

registration_requests/
  {request_id}/
    - name: string
    - email: string
    - mobile: string
    - whatsapp: string
    - dob: string
    - graduation_year: string
    - package_type: string
    - transaction_screenshot_url: string
    - request_date: timestamp
    - status: string (pending / approved / rejected)
    - rejection_reason: string (if rejected)
    - processed_by: string (admin_id)
    - processed_date: timestamp

upgrade_requests/
  {request_id}/
    - user_id: string
    - current_package: string
    - upgrade_to: string
    - transaction_screenshot_url: string
    - request_date: timestamp
    - status: string (pending / approved / rejected)
    - rejection_reason: string
    - processed_by: string
    - processed_date: timestamp

password_reset_requests/
  {request_id}/
    - email: string
    - request_date: timestamp
    - status: string (pending / completed)
    - processed_by: string
    - processed_date: timestamp

live_classes/
  {class_id}/
    - title: string
    - subject: string
    - date_time: timestamp
    - meet_link: string
    - status: string (scheduled / live / completed)
    - recording_url: string (after completion)
    - created_by: string (admin_id)
    - created_date: timestamp

recorded_classes/
  {video_id}/
    - title: string
    - subject: string
    - youtube_url: string
    - duration: string
    - upload_date: timestamp
    - uploaded_by: string (admin_id)

weekly_quizzes/
  {quiz_id}/
    - title: string
    - subject: string
    - week_number: integer
    - due_date: timestamp
    - status: string (open / closed)
    - questions:
        {question_id}/
          - question_text: string
          - option_a: string
          - option_b: string
          - option_c: string
          - option_d: string
          - correct_answer: string
    - created_by: string
    - created_date: timestamp

quiz_attempts/
  {attempt_id}/
    - quiz_id: string
    - user_id: string
    - answers:
        {question_id}: string
    - score: integer
    - time_taken: integer (seconds)
    - rank: integer (calculated after evaluation)
    - attempt_date: timestamp

mock_tests/
  {test_id}/
    - title: string
    - test_type: string
    - duration: integer (minutes)
    - total_marks: integer
    - status: string (open / closed)
    - sections:
        {section_id}/
          - section_name: string
          - questions:
              {question_id}/
                - question_text: string
                - option_a: string
                - option_b: string
                - option_c: string
                - option_d: string
                - correct_answer: string
                - marks: integer
    - created_by: string
    - created_date: timestamp

mock_test_attempts/
  {attempt_id}/
    - test_id: string
    - user_id: string
    - answers:
        {question_id}: string
    - score: integer
    - section_scores:
        {section_id}: integer
    - time_taken: integer
    - rank: integer
    - percentile: float
    - attempt_date: timestamp

previous_year_papers/
  {paper_id}/
    - year: integer
    - title: string
    - exam_type: string
    - pdf_drive_url: string
    - upload_date: timestamp
    - uploaded_by: string

announcements/
  {announcement_id}/
    - title: string
    - message: string
    - priority: string (normal / important / urgent)
    - target_audience: string (all / live_only / recorded_only)
    - expiry_date: timestamp
    - created_by: string
    - created_date: timestamp

admin_users/
  {admin_id}/
    - name: string
    - email: string
    - role: string (super_admin / admin)
    - created_date: timestamp

system_settings/
  - registration_enabled: boolean
  - current_qr_code_url: string
  - package_prices:
      - live_only: integer
      - recorded_only: integer
      - both: integer
  - email_templates:
      - registration_approved: string
      - registration_rejected: string
      - upgrade_approved: string
      - password_reset: string

=============================================================================
FIREBASE SECURITY RULES
=============================================================================

Key Security Principles:
1. Students can only read/write their own data
2. Only authenticated users can access content
3. Admins have full access
4. Single active session enforcement
5. Video URLs and PDF URLs should be token-protected

Example Rules:
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "live_classes": {
      ".read": "auth != null && root.child('users/' + auth.uid + '/is_live').val() == true"
    },
    "recorded_classes": {
      ".read": "auth != null && root.child('users/' + auth.uid + '/is_recorded_class').val() == true"
    }
  }
}

=============================================================================
ONESIGNAL INTEGRATION
=============================================================================

Setup:
1. Create OneSignal app
2. Add OneSignal SDK to website
3. Implement player ID storage in Firebase

Notification Triggers:
- New announcement published
- Live class scheduled
- Live class starting in 10 minutes
- Quiz deadline approaching
- Mock test available
- Registration approved
- Upgrade approved
- Account logged in from another device (logout notification)

Implementation:
- On user login, get OneSignal player ID
- Store player ID in Firebase user profile
- Send targeted notifications based on:
  * Player ID (individual)
  * Tags (package type, subjects)
  * Segments (all users, live users, recorded users)

Session Management with OneSignal:
- On login, send silent notification to previous device
- Previous device receives notification and logs out
- Current device continues with new session

=============================================================================
GOOGLE APPS SCRIPT INTEGRATION
=============================================================================

Script Functions:

1. uploadTransactionScreenshot():
   - Receives base64 image from registration form
   - Uploads to specific Google Drive folder
   - Returns Drive file URL
   - Appends data to Google Sheets

2. Google Sheets Structure:
   - Sheet Name: "New Registrations"
   - Columns: Timestamp, Name, Email, Mobile, WhatsApp, DOB, Graduation Year, Package, Transaction Screenshot URL, Status
   - Each form submission creates new row

3. Apps Script Endpoint:
   - Deploy as web app
   - Accept POST requests from website
   - Return JSON response with Drive URL and status

Implementation in Website:
- On form submit, send data to Apps Script endpoint
- Receive Drive URL
- Store URL in Firebase
- Show success message to user

=============================================================================
EMAIL NOTIFICATIONS
=============================================================================

Email Service Setup:
- Use Firebase Cloud Functions with Nodemailer or SendGrid
- Templates for each email type

Email Types:

1. Registration Approved:
   Subject: "Welcome to LBS MCA Exam Prep - Account Activated"
   Body:
   - Congratulations message
   - Login ID: [generated_id]
   - Temporary Password: [phone_number]
   - Instruction to change password on first login
   - Link to login page
   - Support contact info

2. Registration Rejected:
   Subject: "LBS MCA Exam Prep - Registration Update"
   Body:
   - Polite rejection message
   - Reason: [admin_reason]
   - Instructions to register again with correct details
   - Support contact info

3. Upgrade Approved:
   Subject: "Package Upgrade Successful"
   Body:
   - Confirmation of upgrade
   - New package features
   - Access instructions
   - Thank you message

4. Upgrade Rejected:
   Subject: "Package Upgrade - Verification Failed"
   Body:
   - Rejection message
   - Reason: [admin_reason]
   - Instructions to resubmit with correct transaction ID
   - Support contact info

5. Password Reset:
   Subject: "Login Credentials - LBS MCA Exam Prep"
   Body:
   - Login ID: [user_login_id]
   - Temporary Password: [new_password]
   - Instruction to change password after login
   - Link to login page

6. Live Class Reminder:
   Subject: "Upcoming Live Class - [Subject]"
   Body:
   - Class details
   - Date and time
   - Google Meet link (if available)
   - Preparation instructions

=============================================================================
VIDEO EMBEDDING BEST PRACTICES
=============================================================================

YouTube Player Configuration:
```javascript
<iframe 
  src="https://www.youtube.com/embed/VIDEO_ID?controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
  frameborder="0"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
  style="pointer-events: auto;"
></iframe>
```

Disabled Features:
- rel=0: Don't show related videos
- showinfo=0: Hide video title
- modestbranding=1: Minimal YouTube branding
- Remove share button via CSS overlay
- Remove YouTube logo click via CSS overlay

Progress Tracking:
- Use YouTube IFrame API
- Listen to onStateChange events
- Save current time every 10 seconds to Firebase
- On video load, seek to saved timestamp
- Mark complete when 90% watched

Security:
- Only allow embedded playback
- Validate user authentication before loading video
- Log video access for analytics

PDF Viewer Configuration:
- Use PDF.js library
- Disable toolbar buttons except zoom and navigation
- Add custom controls if needed
- Disable right-click
- Add CSS to hide download/print buttons
- Implement keyboard shortcut blocking (Ctrl+S, Ctrl+P)

=============================================================================
NON-FUNCTIONAL REQUIREMENTS
=============================================================================

Performance:
- Page load time < 3 seconds
- Video streaming without buffering
- Efficient Firebase queries with indexing
- Image optimization (compress transaction screenshots)
- Lazy loading for video lists

Security:
- HTTPS only
- Firebase Authentication for all routes
- Input validation and sanitization
- SQL injection prevention (use Firebase, not SQL)
- XSS prevention
- CSRF protection
- Session timeout after 30 minutes inactivity
- Token-based access for files
- Rate limiting on API endpoints

Scalability:
- Firebase Realtime Database scales automatically
- Optimize queries with proper indexing
- Use Firebase Cloud Functions for heavy operations
- CDN for static assets
- Image compression for uploaded files

Reliability:
- 99.9% uptime target
- Automated backups of Firebase data
- Error logging and monitoring
- Graceful error handling
- Offline mode indicators

Usability:
- Responsive design (mobile, tablet, desktop)
- Intuitive navigation
- Clear error messages
- Loading indicators
- Confirmation dialogs for important actions
- Breadcrumb navigation
- Search functionality

Accessibility:
- Keyboard navigation support
- Alt text for images
- ARIA labels for screen readers
- Sufficient color contrast
- Readable fonts

Browser Compatibility:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers: Chrome, Safari

=============================================================================
ADMIN CAPABILITIES SUMMARY
=============================================================================

User Management:
- View all new registrations with details
- Approve/reject registrations with reasons
- Manage active users (edit, deactivate)
- View user activity and performance
- Handle upgrade requests
- Resolve password reset requests
- Send individual notifications to users

Content Management:
- Schedule and manage live classes
- Upload and organize recorded classes
- Create and publish weekly quizzes
- Evaluate quizzes and generate rankings
- Create and publish mock tests
- Evaluate mock tests and generate rankings
- Upload previous year question papers
- Create and publish announcements

Analytics:
- View user statistics and trends
- Monitor content engagement
- Track revenue by package
- Analyze quiz/test performance
- Export reports

System Administration:
- Add/remove admin users
- Configure system settings
- Update pricing
- Manage payment QR code
- Configure email templates
- Manage OneSignal notifications

=============================================================================
STUDENT CAPABILITIES SUMMARY
=============================================================================

Account Management:
- Register with payment verification
- Login with credentials
- Change password on first login
- Request password reset
- Update profile information
- Upgrade package with payment

Learning Features:
- Access live classes (if eligible)
- Watch recorded classes with progress tracking
- View recorded live sessions
- Attempt weekly quizzes
- Attempt mock tests
- View previous year papers (read-only)
- Track quiz/test performance
- View rankings and leaderboard

Dashboard Features:
- View personalized dashboard
- Access announcements
- Track learning progress
- View upcoming live classes
- Resume watching videos
- View quiz/test history

Information Access:
- View syllabus
- Read about platform and creators
- Access FAQ and support
- Contact support team

=============================================================================
DEVELOPMENT PHASES (SUGGESTED)
=============================================================================

Phase 1 - Foundation (Weeks 1-2):
- Setup Firebase project
- Design database structure
- Implement authentication
- Create admin and student layouts
- Build registration form with Apps Script integration
- Google Sheets integration

Phase 2 - User Management (Weeks 3-4):
- Admin registration approval/rejection workflow
- Email notifications setup
- First-time login password change
- Password reset functionality
- Profile management
- Single session enforcement with OneSignal

Phase 3 - Content Management (Weeks 5-7):
- Live classes scheduling and management
- Recorded classes upload and display
- Video player integration with tracking
- PDF viewer for question papers
- Subject-wise organization

Phase 4 - Assessments (Weeks 8-10):
- Weekly quiz creation and management
- Quiz attempt and evaluation
- Mock test creation and management
- Mock test attempt and evaluation
- Ranking and leaderboard system

Phase 5 - Package Management (Weeks 11-12):
- Package upgrade functionality
- Access control based on package
- Admin upgrade approval workflow
- Payment verification for upgrades

Phase 6 - Engagement Features (Weeks 13-14):
- Announcements system
- OneSignal push notifications
- Email notifications for all triggers
- Dashboard with statistics
- Progress tracking

Phase 7 - Static Pages & Polish (Week 15):
- Syllabus page
- About/Creators page
- FAQ page
- Contact page
- UI/UX refinements
- Mobile responsiveness

Phase 8 - Testing & Launch (Weeks 16-17):
- Functional testing
- Security testing
- Performance optimization
- Bug fixes
- User acceptance testing
- Production deployment

Phase 9 - Post-Launch (Ongoing):
- Monitor performance
- Fix bugs
- Add analytics
- Gather user feedback
- Iterative improvements

=============================================================================
TESTING CHECKLIST
=============================================================================

Registration Flow:
- [ ] User can fill registration form completely
- [ ] Transaction screenshot uploads to Drive
- [ ] Data saves to Google Sheets correctly
- [ ] Admin receives new registration notification
- [ ] Admin can view registration details
- [ ] Admin can approve registration
- [ ] User receives email with credentials
- [ ] User can login with received credentials
- [ ] First login forces password change
- [ ] Admin can reject registration with reason
- [ ] User receives rejection email with reason

Authentication:
- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Password reset request creates record
- [ ] Admin can send reset credentials
- [ ] Changed password works for login
- [ ] Session persists on page refresh
- [ ] Logout works correctly
- [ ] Single session enforcement works
- [ ] Second login logs out first session

Package Access:
- [ ] Live-only users see live classes only
- [ ] Recorded-only users see recorded classes only
- [ ] Both-package users see all content
- [ ] Access restrictions enforced properly
- [ ] Upgrade request submission works
- [ ] Admin can approve/reject upgrades
- [ ] Approved upgrade gives immediate access
- [ ] Rejected upgrade sends notification

Live Classes:
- [ ] Admin can schedule live class
- [ ] Students see upcoming live classes
- [ ] Meet link appears at correct time
- [ ] Completed classes move to recordings
- [ ] Recording URL added by admin works
- [ ] Video player embeds correctly
- [ ] Share/external links disabled

Recorded Classes:
- [ ] Admin can upload new videos
- [ ] Videos appear for eligible students
- [ ] Video player works without YouTube branding
- [ ] Progress tracking saves correctly
- [ ] Resume from saved position works
- [ ] Completed videos marked correctly

Weekly Quizzes:
- [ ] Admin can create quiz with questions
- [ ] Students can attempt open quizzes
- [ ] Answer submission works correctly
- [ ] Score calculated accurately
- [ ] Quiz closes after evaluation
- [ ] Rankings generated correctly
- [ ] Top 10 leaderboard displays correctly
- [ ] Student can view own rank

Mock Tests:
- [ ] Admin can create test with sections
- [ ] Timer countdown works correctly
- [ ] Auto-submit on time expiry works
- [ ] Score calculation accurate
- [ ] Section-wise scores correct
- [ ] Rankings and percentile calculated
- [ ] Results page displays correctly

Previous Year Papers:
- [ ] Admin can upload PDF links
- [ ] PDF displays in viewer
- [ ] Download button disabled
- [ ] Share options disabled
- [ ] Right-click disabled
- [ ] Watermark visible

Announcements:
- [ ] Admin can create announcement
- [ ] Target audience filtering works
- [ ] OneSignal notification sent
- [ ] Email notification sent (if configured)
- [ ] Students see announcements
- [ ] Priority highlighting works

Profile:
- [ ] Student can view profile
- [ ] Student can edit allowed fields
- [ ] Package information displays correctly
- [ ] Quiz/test history shows correctly
- [ ] Video progress displays correctly

Admin Dashboard:
- [ ] Statistics display correctly
- [ ] All management sections accessible
- [ ] Search and filters work
- [ ] Export functionality works
- [ ] Analytics display correctly

Notifications:
- [ ] OneSignal push notifications work
- [ ] Email notifications send correctly
- [ ] Notification content accurate
- [ ] Targeting works correctly

Mobile Responsiveness:
- [ ] All pages responsive on mobile
- [ ] Forms usable on mobile
- [ ] Videos play on mobile
- [ ] PDF viewer works on mobile
- [ ] Navigation works on mobile

Security:
- [ ] Unauthenticated users redirected
- [ ] Users cannot access unauthorized content
- [ ] Session tokens validated
- [ ] File access requires authentication
- [ ] SQL injection prevention tested
- [ ] XSS prevention tested

Performance:
- [ ] Page load times acceptable
- [ ] Video streaming smooth
- [ ] Large lists paginated
- [ ] Images optimized
- [ ] Database queries efficient

=============================================================================
DEPLOYMENT CHECKLIST
=============================================================================

Pre-Deployment:
- [ ] Firebase project created and configured
- [ ] OneSignal app created and integrated
- [ ] Google Drive folder for screenshots created
- [ ] Google Sheets for registrations created
- [ ] Apps Script deployed as web app
- [ ] Email service configured
- [ ] Payment QR code generated
- [ ] All environment variables set
- [ ] Firebase security rules configured
- [ ] Database indexes created

Domain & Hosting:
- [ ] Domain purchased (if custom)
- [ ] SSL certificate configured
- [ ] Firebase Hosting configured
- [ ] DNS records updated
- [ ] CDN configured (if using)

Testing:
- [ ] All features tested
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Mobile testing completed
- [ ] Browser compatibility verified
- [ ] Load testing performed

Documentation:
- [ ] Admin user manual created
- [ ] Student user manual created
- [ ] API documentation prepared
- [ ] Database schema documented
- [ ] Backup procedures documented

Launch:
- [ ] Initial admin account created
- [ ] Test data cleared
- [ ] Monitoring tools enabled
- [ ] Error logging configured
- [ ] Backup scheduled
- [ ] Launch announcement prepared

Post-Launch:
- [ ] Monitor error logs
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Prepare bug fix process
- [ ] Plan regular backups
- [ ] Schedule maintenance windows

=============================================================================
SUPPORT & MAINTENANCE
=============================================================================

Regular Maintenance:
- Weekly: Check error logs, user feedback
- Monthly: Review analytics, performance metrics
- Quarterly: Security audit, dependency updates
- Annually: Major feature updates, platform review

User Support:
- Email support: response within 24 hours
- FAQ updates based on common questions
- Video tutorials for common tasks
- Dedicated support during live classes

System Monitoring:
- Uptime monitoring (99.9% target)
- Error rate tracking
- Performance metrics
- Usage analytics
- Cost monitoring (Firebase, OneSignal)

Backup Strategy:
- Daily automated Firebase backups
- Weekly full database exports
- Monthly archive of user data
- Disaster recovery plan documented

=============================================================================
COST CONSIDERATIONS
=============================================================================

Firebase:
- Realtime Database: Based on data transferred
- Authentication: Free up to 10K users
- Hosting: Free tier available
- Cloud Functions: Pay per execution
- Storage: Based on data stored

OneSignal:
- Free for standard features
- Paid plans for advanced targeting

Google Drive:
- Free 15GB (may need upgrade)
- Unlimited with Google Workspace

Domain & SSL:
- Domain: ₹500-1000/year
- SSL: Free with Let's Encrypt or Firebase

Development:
- Initial development cost
- Ongoing maintenance cost
- Feature updates cost

Total Estimated Monthly Cost (for 500 users):
- Firebase: ₹2000-5000
- OneSignal: Free-₹2000
- Google Workspace (optional): ₹125/user/month
- Domain: ₹100/month
- Miscellaneous: ₹1000
Total: ₹5000-10,000/month (approximately)

=============================================================================
END OF SPECIFICATION
=============================================================================

This comprehensive specification covers all aspects of the LBS MCA Entrance Exam Preparation website. Implementation should follow the suggested phases and ensure all testing is completed before launch. Regular monitoring and maintenance will ensure smooth operation and user satisfaction.