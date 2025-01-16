import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { auth as firebaseAuth } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// Initialize Firebase Admin with credential from environment
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    // In development, we don't need real credentials as we're using emulators
    ...(process.env.NODE_ENV !== 'production' && {
      credential: admin.credential.applicationDefault()
    })
  });

  // Connect to auth emulator in development
  if (process.env.NODE_ENV !== 'production') {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  }
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const userResult = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    done(null, userResult);
  } catch (err) {
    done(err);
  }
});

export const configureAuth = (app: any) => {
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware to verify Firebase token
  app.use(async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const { uid, email } = decodedToken;

      // Find or create user in our database
      let [user] = await db.select().from(users).where(eq(users.uid, uid));

      if (!user) {
        // Create new user if doesn't exist
        const [newUser] = await db.insert(users).values({
          uid,
          email: email || '',
          role: 'consumer', // Default role
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
        }).returning();
        user = newUser;
      }

      req.user = user;
      next();
    } catch (error: any) {
      // Don't throw error for authentication failures, just continue
      if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-token') {
        return next();
      }
      next(error);
    }
  });
};