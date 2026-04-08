# Quiz & Mock Test Architecture

## File Structure Overview

### 1. TYPE DEFINITIONS
- **[src/lib/types.ts](src/lib/types.ts)** — Core data types for quizzes and mock tests
  - `QuizStatus` — Type: "draft" | "published" | "closed"
  - `QuizQuestion` — Single question with id, question text, options array, correctAnswer index, optional explanation
  - `Quiz` — Quiz object with id, title, subject, questions[], status, duration (in minutes), createdAt, createdBy
  - `QuizAttempt` — User's quiz attempt with id, userId, userName, quizId, answers[], score, totalQuestions, submittedAt
  - `MockTest extends Quiz` — Extends Quiz with type: "mock"
  - `MockAttempt extends QuizAttempt` — Extends QuizAttempt with mockTestId field
  - `RankData` — Leaderboard data with quizId/mockTestId, quizTitle, entries[], generatedAt

### 2. UTILITY FILES
- **[src/lib/question-json.ts](src/lib/question-json.ts)** — JSON import utilities for bulk question import
  - `QUESTION_JSON_TEMPLATE` — Template JSON format for importing questions
  - `parseQuestionsFromJson(rawText)` — Parse and validate JSON questions
  - `appendQuestionsWithoutDuplicates()` — Append questions while deduping by title
  - `dedupeQuestions()` — Remove duplicate questions from a list

### 3. ADMIN PAGES (Quiz Management)

#### Quiz Administration
- **[src/app/(admin)/admin/quizzes/page.tsx](src/app/(admin)/admin/quizzes/page.tsx)**
  - Create/edit/delete quizzes with title, subject, duration (default 30 min), status
  - Add/edit/remove questions inline or bulk import via JSON
  - Firebase CRUD: reads from `db:quizzes`, writes attempts to `db:quizAttempts`
  - **Status transitions**: "draft" → "published" → "closed"
  - **When closing a quiz** (status changes to "closed"):
    - Fetches all attempts for that quiz from `db:quizAttempts`
    - Ranks participants by best score (ties broken by submission time)
    - Generates leaderboard snapshot → saved to `db:rankings/{quizId}`
  - View leaderboard rankings in modal dialog
  - Export quiz as JSON file

#### Mock Test Administration
- **[src/app/(admin)/admin/mock-tests/page.tsx](src/app/(admin)/admin/mock-tests/page.tsx)**
  - Identical UI to quizzes but for mock tests
  - Default duration: 60 minutes (vs 30 for quizzes)
  - Firebase CRUD: reads from `db:mockTests`, writes attempts to `db:mockAttempts`
  - **When closing a mock test** (status changes to "closed"):
    - Fetches all attempts from `db:mockAttempts` matching testId
    - Ranks participants by best score (ties broken by submission time)
    - Generates leaderboard snapshot → saved to `db:mockRankings/{testId}`
  - View leaderboard rankings in modal dialog
  - Export mock test as JSON file

### 4. STUDENT PAGES (Quiz/Test Taking)

#### Quiz Attempt Page
- **[src/app/(student)/dashboard/quizzes/page.tsx](src/app/(student)/dashboard/quizzes/page.tsx)**
  
  **Initial List View:**
  - Displays all published/closed quizzes sorted by newest first
  - Shows user's previous attempt status for each quiz (attempted/pending/score)
  - Fetch locations: `db:quizzes` (published/closed only), `db:quizAttempts` (current user's attempts)
  
  **Start Flow:**
  1. User clicks "Start Quiz" → shows `showStartScreen` confirmation dialog
  2. Dialog displays rules, time limit, number of questions, previous score (if attempted)
  3. User clicks "Start" button → `startQuiz()` initializes state
  
  **Quiz State Initialization:**
  - `activeQuiz` = selected quiz object
  - `answers` = array of -1 (unanswered) for each question
  - `currentQ` = 0 (first question)
  - `timeLeft` = `quiz.duration * 60` (convert minutes to seconds)
  - `result` = null (no submission yet)
  - `reviewMode` = false
  
  **Quiz Taking Screen:**
  - Question display with progress bar (`currentQ + 1 / totalQuestions`)
  - Timer display with formatting: `MM:SS` (turns red/pulsing when < 60 seconds)
  - Options shown as buttons (A, B, C, D)
  - Selected answer visual feedback (border highlight, color change)
  - Previous/Next navigation buttons
  - "Submit quiz" button (bottom right when on last question)
  - Unanswered question counter
  
  **Timer Implementation:**
  - `useEffect` hook decrements `timeLeft` by 1 every second
  - If `timeLeft <= 0` before user submits → auto-submit via `submitQuiz()`
  - Cleanup clears interval on unmount or when result is submitted
  
  **Submission:**
  - User clicks submit OR timer expires → `submitQuiz()` callback
  - Calculates score by comparing answers[] to correctAnswer for each question
  - Saves to Firebase: `db:quizAttempts/{autoId}` with:
    - userId, userName, quizId, answers[], score, totalQuestions, submittedAt
  - Updates `result = { score, total }` to show results screen
  - Shows toast: "Quiz submitted! Score: X/Y"
  
  **Results Screen:**
  - Shows score card: "You scored X out of Y"
  - Percentage calculation and grade badge
  - "View Leaderboard" button → links to `/dashboard/rankings`
  - "Review Answers" button → enters `reviewMode = true`
  
  **Review Mode:**
  - Navigate through all questions again (read-only)
  - Correct answer highlighted in green with checkmark
  - User's wrong answer highlighted in red with X
  - Unanswered questions shown in gray
  - Explanation box (if available) shown at bottom
  - "Back" button returns to results screen

#### Mock Test Attempt Page
- **[src/app/(student)/dashboard/mock-tests/page.tsx](src/app/(student)/dashboard/mock-tests/page.tsx)**
  - Nearly identical to quiz page, but:
    - Fetches from `db:mockTests` instead of `db:quizzes`
    - Fetches attempts from `db:mockAttempts` instead of `db:quizAttempts`
    - Default duration: 60 minutes (vs 30 for quizzes)
    - Timer threshold for red alert: `timeLeft < 300` (5 min) vs 60 sec for quizzes
    - Color scheme: amber/orange (vs primary blue) for mock tests
    - Saves attempt to `db:mockAttempts/{autoId}` with both `mockTestId` and `quizId` fields
    - Toast message: "Mock test submitted! Score: X/Y"

### 5. RANKINGS & LEADERBOARD

#### Student Rankings Page
- **[src/app/(student)/dashboard/rankings/page.tsx](src/app/(student)/dashboard/rankings/page.tsx)**
  - Two tabs: "Quizzes" and "Mock Tests"
  - **Quiz Leaderboards:**
    - Fetches from `db:rankings/{quizId}` (only exists when quiz is closed)
    - Displays all leaderboards in dropdown (most recent first)
    - Shows rank with icons: 🏆 (#1), 🥈 (#2), 🥉 (#3), 🏅 (#4-5), # (6+)
  - **Mock Test Leaderboards:**
    - Fetches from `db:mockRankings/{testId}` (only exists when test is closed)
    - Same UI as quizzes but separate leaderboards
  - Highlight current user's rank with different styling
  - Show total questions and score for each participant

#### Admin Rankings View
- Admin can view leaderboards directly within quiz/mock test pages as modal dialogs
- Shows same information as student rankings page
- Accessible by clicking trophy icon on quiz/test card

### 6. COMPONENT LIBRARY

- **[src/components/admin/QuestionJsonImport.tsx](src/components/admin/QuestionJsonImport.tsx)**
  - Reusable component for bulk importing quiz questions from JSON
  - Features:
    - File picker UI
    - JSON template copy button
    - Validation and error reporting
    - Append or replace existing questions
    - Export current questions as JSON file
  - Used in both admin quiz and admin mock test pages

---

## Data Flow Diagram

### Quiz/Mock Test Creation (Admin)
```
Admin Page (Create/Edit Form)
  ↓ Adds Questions (manual or JSON import)
  ↓ Sets: title, subject, duration, status
  ↓ Saves to Firebase:
    - db:quizzes/{quizId} OR db:mockTests/{testId}
    - Contains: title, subject, questions[], duration, status, createdAt, createdBy
```

### Quiz/Mock Test Taking (Student)
```
Student List View
  ↓ Selects quiz/test → shows start confirmation screen
  ↓ Clicks "Start" → initializes quiz state
  ↓ Viewing Questions Screen (with timer)
    - Timer decrements every second
    - User selects answers
    - User navigates with Previous/Next
  ↓ User submits OR timer expires → submitQuiz()
  ↓ Saves attempt to Firebase:
    - db:quizAttempts/{id} OR db:mockAttempts/{id}
    - Contains: userId, userName, quizId, answers[], score, totalQuestions, submittedAt
  ↓ Shows Results Screen
  ↓ Optional: Review Mode (navigate read-only)
  ↓ Optional: View Leaderboard (if quiz is closed)
```

### Leaderboard Generation (Admin)
```
Admin closes quiz/test (status: "draft" → "closed")
  ↓ Queries all attempts matching quiz/test ID
  ↓ Groups by userId, takes best score per user
  ↓ Sorts by: score DESC, then submittedAt ASC
  ↓ Generates RankEntry[] with rank numbers
  ↓ Saves snapshot to:
    - db:rankings/{quizId} OR db:mockRankings/{testId}
    - RankData: { quizTitle, entries[], generatedAt }
  ↓ Students can now view leaderboard in Rankings page
```

---

## Timer Implementation Details

### Quiz Timer
```javascript
// Initialization
setTimeLeft((quiz.duration || 30) * 60)  // Convert minutes to seconds

// Countdown effect
useEffect(() => {
  if (!activeQuiz || result) return;  // Stop if quiz not active or already submitted
  if (timeLeft <= 0) {
    submitQuiz();  // Auto-submit when time expires
    return;
  }
  const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
  return () => clearInterval(timer);
}, [timeLeft, activeQuiz, result, submitQuiz]);

// Display formatting
formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Visual alert (quiz)
timeLeft < 60 ? "text-red-500 animate-pulse" : "text-primary"

// Visual alert (mock test)
timeLeft < 300 ? "text-red-500 animate-pulse" : "text-amber-600"
```

### Key Timer Behavior
- Starts at `duration * 60` seconds
- Decrements every second via `setInterval`
- Auto-submits quiz when reaching 0
- Cannot be paused or extended
- Continues across question navigation
- Timer persists across page interactions (state maintained in React)
- **Note:** Timer does NOT persist across page refresh (would need sessionStorage for that)

---

## Firebase Database Structure

```
Root
├── quizzes/
│   └── {quizId}
│       ├── title: string
│       ├── subject: string
│       ├── questions: QuizQuestion[]
│       ├── duration: number (minutes)
│       ├── status: "draft" | "published" | "closed"
│       ├── createdAt: timestamp
│       ├── createdBy: userId
│       └── closedAt: timestamp (optional)
│
├── mockTests/
│   └── {testId} (same structure as quizzes)
│
├── quizAttempts/
│   └── {attemptId}
│       ├── userId: string
│       ├── userName: string
│       ├── quizId: string
│       ├── answers: number[]
│       ├── score: number
│       ├── totalQuestions: number
│       └── submittedAt: timestamp
│
├── mockAttempts/
│   └── {attemptId}
│       ├── userId: string
│       ├── userName: string
│       ├── mockTestId: string
│       ├── quizId: string (also stored for compatibility)
│       ├── answers: number[]
│       ├── score: number
│       ├── totalQuestions: number
│       └── submittedAt: timestamp
│
├── rankings/
│   └── {quizId}
│       ├── quizTitle: string
│       ├── generatedAt: timestamp
│       └── entries: RankEntry[]
│           └── {index}
│               ├── userId: string
│               ├── userName: string
│               ├── rank: number
│               ├── score: number
│               ├── totalQuestions: number
│               └── submittedAt: timestamp
│
└── mockRankings/
    └── {testId} (same structure as rankings)
```

---

## Start Flow Summary

### Quiz Start Flow
1. User sees list of published/closed quizzes
2. Clicks "Start Quiz" → `handleStartClick(quiz)` sets `pendingQuiz` and shows start screen
3. Start dialog shows:
   - Quiz title and subject
   - Number of questions
   - Duration (MM minutes)
   - User's previous best score (if attempted)
   - "Start" button
4. User clicks "Start" → `startQuiz()` called
5. State initialization:
   - `activeQuiz = quiz`
   - `answers = [-1, -1, ..., -1]`
   - `currentQ = 0`
   - `timeLeft = duration * 60`
   - `result = null`
   - `reviewMode = false`
   - Close start dialog
6. Quiz taking page renders with first question and timer

### Mock Test Start Flow
- Identical to quiz flow, but:
  - Default duration: 60 min (vs 30 min quizzes)
  - Timer alert threshold: 5 min (vs 1 min quizzes)
  - Color scheme: amber/orange branding
  - Stores to `db:mockAttempts` and `db:mockRankings` instead of `db:quizAttempts` and `db:rankings`

---

## Current Limitations & Notes

1. **Timer Persistence**: Timer state is lost on page refresh. Consider sessionStorage for recovery.
2. **Concurrent Attempts**: Students can have multiple attempts stored. No validation prevents simultaneous quiz attempts.
3. **Attempt Conflicts**: If a student navigates away and starts the same quiz twice, both attempts are saved.
4. **Answer Validation**: No server-side validation; could be tampered with via browser console.
5. **Leaderboard Snapshots**: Generated only when admin closes quiz. Cannot update without recalculating.
6. **Mobile UX**: Quiz interface is responsive but small screens may feel cramped with question text.
7. **Accessibility**: Timer component could benefit from ARIA labels for screen readers.

