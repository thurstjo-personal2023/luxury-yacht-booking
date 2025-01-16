import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { auth as firebaseAuth } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// Initialize Firebase Admin with emulator configuration
if (!admin.apps.length) {
  // In development mode, use a properly formatted dummy certificate
  const dummyPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi6JgH6E3V6
TfXqNAZ7LXnK4RJYq9g7Ln2RX9RqGWZcg2rZK7kPUJvKOvUW1yZUHSpZSYidHjRl
RJpW6r4l2NXtXn+HqX8t0x4cvVvMhoY4OKUWk+n+0qJd5dKxV0GxBzFyqBxJAOZ/
Mw7v4L+ZkCOVo9FIhPJlJ8QgOz+NOaNJ0YTTdVGoF9H3y16lRXJ1mZQs4jrZz4Ay
qLxZ+x0B0GgqDIA3IuRqhc5N6mO9sRx5QsB1zRYXpZwRixXuRH2iP5A1pwqMGEnS
6OXaFfBNcpQhYn6N2vV2BVeQyJPlymPPsgBcQ0E1ZZxCMg1FG5v6oBUOmyzsIrT+
iF9G8ZQ7AgMBAAECggEABWzrqF0lI6xcz4yw9UoZ1qKS4PAcqrj7S2QR7UcV1qfB
hgDAi1sEhg+oF4qI8rlI5xwx4OM1k+yNlR0QjRgDTknq3kF6L2WRdVxEbPK6FVp4
HqeWPQF+mwOH7Rg6NdXKhxtk9HXhY3wUdlQoBXX4xGUNKe2TQEYXtqgJFYN2ZsWX
jJ8ChR1JWztrkJsQJlg/Kt5Y0XaCwOYSeHYgv/vy4hqHFZPtRWKVUQ7aC+ZQfxPM
GUX0dVp8Krsp5IxwtgTqQOY1GcdOoFX8WusB7OMoOHF9n2EUWp0wqGJvzXDx6RZW
axe25Z/44QZKRh3uSzrz3XDUy6TX6H6u0KqpJ7rHEQKBgQDXW6PU6V5mGPdG/H/y
Cv1MqbHetPhP2qn9iV7V4HE1r2RaRFuZs2vAMh6DJ0F1Q5mfHSlG8TDgpj6NZbwE
IiPzz3QxHlBuKB6ehRqF3TXYgT1R6YK0T8Y7LpPKGXAdPnHdE6G7igYYrvEcEbXl
YxOr2qqH0UnTpY8BbAMxjbZlLQKBgQDgxuJ3XE0zVDw9v9ij6k2HxQOcuXj4TDWW
U2UxO6YvzPQyvHrBbwQHfXHe92JOv7QBaMoHNjYg6X1rwlFAFHjGLkCO7gLKqGLd
0Wh3PbB9TfPrDlqBJIz6umFBvV4TKzmvxjJkLwBxEn1aHZs7F4B0UgGh6XQ6g5p3
LxgWUK3KxwKBgFIz4QxEzPGXAPqQz7HyZ5F+EjRJsVqPO4tL8JJgQNDq6vZZUWQj
Y4YHqMP8xLZrL5McgVaZQ5NzgkBZwn7XlE5PGF/4LwLl4vvA2yL9U5GFv/1u4E7/
dY1PiiU8yL/qJYe0yCLYWEZzXqwJp5JRy5QzvBs5aCJ4Z5ypZHxwIpUhAoGAQu6e
LKHNbdx1l1JNHQTNfypz8TwHhHdR0+jE5C+XnC0p9ZQwF0tX5l5Ql1N1U3GxfX9h
r3EBJxYx3JUXWr2uQqZeS7Bm5BXWQfvVkBVOJwKQsGprX+1P4/l5I4iVjUGxTQ7m
+1xCkPtbY0Uyj8cVpBgf5Xn0G8lGc1OYW9FiLY0CgYEApbUuZrWj3UvP9ZJfBR2E
8ZQlCnE0ZPi3TXp0p9LSUg8y/M6GWjUzxD5z8E9y/ofPZ0RZMx2mJ9LN6Q4qxvxO
ZZF5/Kt6NgRglZ5GYPWx7DW4G/p5jMtPqX5zqT6QNi8Y5U0MSvsV8M7Y5I5/KPtL
nZtFnBk3VTG4vJ5p1RqD+Uk=
-----END PRIVATE KEY-----`;

  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
      clientEmail: 'firebase-adminsdk-demo@demo-project.iam.gserviceaccount.com',
      privateKey: dummyPrivateKey,
    }),
  });

  // Connect to auth emulator in development
  if (process.env.NODE_ENV !== 'production') {
    const host = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : '0.0.0.0';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = `${host}:9099`;
    console.log('Firebase Admin initialized in emulator mode with host:', host);
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
      console.error('Auth middleware error:', error);
      // Don't throw error for authentication failures, just continue
      if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-token') {
        return next();
      }
      next(error);
    }
  });
};