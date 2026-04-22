const admin = require("firebase-admin");
const fs = require('fs');

// Simple dot-env parser
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  return acc;
}, {});

const firebaseAdminConfig = {
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY,
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseAdminConfig),
  databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

async function fix() {
  const db = admin.database();
  const usersRef = db.ref('users');
  const snapshot = await usersRef.once('value');
  const users = snapshot.val();
  
  for (const uid in users) {
      const user = users[uid];
      if (user.email === 'support@lbscrashcourse.com' || user.email === 'admin@lbscrashcourse.com' || user.email === 'lbscrashcourse@gmail.com') {
          console.log(`Found possible admin user: ${user.email} with uid: ${uid}, role: ${user.role}, firstLogin: ${user.firstLogin}`);
          // Restore admin
          await db.ref(`users/${uid}`).update({
              role: 'admin',
              firstLogin: false
          });
          console.log(`Restored admin role for ${user.email}`);
      } else if (user.email === 'abhijithxdeveloper@gmail.com' || user.email === 'uk74704@gmail.com') {
          console.log(`Found developer user: ${user.email} with uid: ${uid}, role: ${user.role}`);
          await db.ref(`users/${uid}`).update({
              role: 'admin',
              firstLogin: false
          });
          console.log(`Restored admin role for ${user.email}`);
      }
      
      // I see in the screenshot there is a profile picture for the admin.
      // But maybe the admin is just the user we are using right now.
      if (user.firstLogin === true && user.role === 'student' && user.createdAt > Date.now() - 3600 * 1000) {
          console.log(`Recently changed student: ${user.email} (maybe this is the admin?)`);
      }
  }
  
  process.exit(0);
}
fix().catch(console.error);
