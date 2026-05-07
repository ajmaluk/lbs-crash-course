export const LBS_MCA_INFO = `
# LBS MCA ENTRANCE EXAMINATION INFO
The LBS MCA Entrance Examination is conducted by the Lal Bahadur Shastri Centre for Science and Technology (LBS Centre), Thiruvananthapuram, for admission to the Master of Computer Applications (MCA) course in various Engineering Colleges and other institutions in Kerala.

## EXAM PATTERN:
- **Total Questions:** 120
- **Duration:** 120 Minutes (2 Hours)
- **Marking Scheme:** Standard marking (usually +1 for correct, no negative marking in most sessions, but check official prospectus).
- **Subjects:**
  - Computer Science (50 Questions)
  - Mathematics & Statistics (25 Questions)
  - Quantitative Aptitude & Logical Reasoning (25 Questions)
  - English Language & Comprehension (15 Questions)
  - General Knowledge & Current Affairs (5 Questions)
`;

export const STATIC_SYLLABUS_CONTEXT = `
# LBS MCA ENTRANCE SYLLABUS

## 1. COMPUTER SCIENCE (50 Questions)
- **Problem Solving & Programming:** C Programming, logic building.
- **Digital Fundamentals:** Boolean algebra, truth tables, Venn diagrams, number systems (Binary, Hexadecimal, 2's complement).
- **Computer Organization:** CPU structure, memory organization, I/O devices, interrupts.
- **Database Fundamentals:** Basic concepts, ER models, SQL.

## 2. MATHEMATICS & STATISTICS (25 Questions)
- **Set Theory & Logic:** Sets, relations, functions, logical operators.
- **Calculus:** Differential and Integral calculus, ordinary differential equations.
- **Algebra:** Matrices, determinants, vector algebra.
- **Trigonometry & Geometry:** Coordinate geometry, trigonometric ratios.
- **Probability & Statistics:** Basic probability, mean, median, mode, standard deviation.

## 3. QUANTITATIVE APTITUDE & LOGICAL REASONING (25 Questions)
- **Arithmetic:** Percentages, profit/loss, interest, ratio/proportion, averages.
- **Time & Work:** Pipes/cisterns, time/speed/distance.
- **Algebra:** Linear/quadratic equations, progressions (AP/GP).
- **Logical Reasoning:** Series, analogies, direction sense, seating arrangement, blood relations, puzzles.

## 4. ENGLISH LANGUAGE & COMPREHENSION (15 Questions)
- **Grammar:** Sentence correction, fill in the blanks, error spotting.
- **Vocabulary:** Synonyms, antonyms, idioms, phrases, one-word substitution.
- **Comprehension:** Reading comprehension, jumbled sentences.

## 5. GENERAL KNOWLEDGE & CURRENT AFFAIRS (5 Questions)
- **General Awareness:** Indian history, geography, constitution, economy.
- **Current Affairs:** National/International news, sports, awards, tech trends.
`;

export const STATIC_INTELLIGENCE_REPORT = `
${LBS_MCA_INFO}
${STATIC_SYLLABUS_CONTEXT}

---
*Note: This context contains official examination details and syllabus info. You should use this to guide students on what to study and how the exam is structured.*
`;

export const STATIC_PRACTICE_QUESTIONS = [
    {
        id: "static-1",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "C Programming Basics",
        subject: "Computer Science",
        question: "What is the size of an int data type in C (typically on a 32-bit system)?",
        options: ["1 byte", "2 bytes", "4 bytes", "8 bytes"],
        correctAnswer: 2,
        explanation: "On most modern 32-bit and 64-bit systems, an integer occupies 4 bytes (32 bits)."
    },
    {
        id: "static-2",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "C Programming Basics",
        subject: "Computer Science",
        question: "Which of the following is a correct way to declare a pointer in C?",
        options: ["int p*;", "int *p;", "ptr p;", "int &p;"],
        correctAnswer: 1,
        explanation: "The asterisk (*) is used to declare a pointer variable in C."
    },
    {
        id: "static-3",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "Data Structures",
        subject: "Computer Science",
        question: "Which data structure works on the LIFO (Last-In-First-Out) principle?",
        options: ["Queue", "Linked List", "Stack", "Tree"],
        correctAnswer: 2,
        explanation: "A Stack follows LIFO, where the last element added is the first one to be removed."
    },
    {
        id: "static-4",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "Operating Systems",
        subject: "Computer Science",
        question: "What is a 'deadlock' in operating systems?",
        options: ["A process that is running too fast", "A situation where processes are waiting for each other to release resources", "A hardware failure", "A type of virus"],
        correctAnswer: 1,
        explanation: "A deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process."
    },
    {
        id: "static-5",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "Mathematics",
        subject: "Mathematics",
        question: "What is the derivative of sin(x)?",
        options: ["cos(x)", "-cos(x)", "tan(x)", "sec^2(x)"],
        correctAnswer: 0,
        explanation: "The derivative of the sine function is the cosine function."
    },
    {
        id: "static-6",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "Mathematics",
        subject: "Mathematics",
        question: "If f(x) = x^2 + 2x + 1, what is f'(1)?",
        options: ["2", "3", "4", "5"],
        correctAnswer: 2,
        explanation: "f'(x) = 2x + 2. Substituting x=1 gives 2(1) + 2 = 4."
    },
    {
        id: "static-7",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "General Aptitude",
        subject: "Aptitude",
        question: "If 5 workers can build a wall in 12 days, how many days will it take 10 workers to build the same wall?",
        options: ["24 days", "6 days", "10 days", "15 days"],
        correctAnswer: 1,
        explanation: "Doubling the workers halves the time: 12 / 2 = 6 days."
    },
    {
        id: "static-8",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "General Aptitude",
        subject: "Aptitude",
        question: "What is the next number in the series: 2, 4, 8, 16, ...?",
        options: ["20", "24", "32", "64"],
        correctAnswer: 2,
        explanation: "Each number is multiplied by 2: 16 * 2 = 32."
    },
    {
        id: "static-9",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "English",
        subject: "English",
        question: "Choose the synonym for 'Eloquent'.",
        options: ["Silent", "Fluent", "Rude", "Confused"],
        correctAnswer: 1,
        explanation: "Eloquent means fluent or persuasive in speaking or writing."
    },
    {
        id: "static-10",
        sourceId: "static-pool",
        sourceType: "quiz" as const,
        sourceTitle: "Computer Networks",
        subject: "Computer Science",
        question: "Which layer of the OSI model is responsible for routing?",
        options: ["Physical Layer", "Data Link Layer", "Network Layer", "Transport Layer"],
        correctAnswer: 2,
        explanation: "The Network Layer handles routing and logical addressing (IP)."
    }
];


