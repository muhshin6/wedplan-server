import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins/jwt";

export const auth = betterAuth({
  plugins: [jwt()],

  database: mongodbAdapter(client.db(process.env.DB_NAME), {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5000",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],

  user: {
    additionalFields: {
      role: {
        type: ["customer", "vendor", "admin"],
        required: false,
        defaultValue: "customer",
        input: false,
      },
      businessName: {
        type: "string",
        required: false,
        input: true,
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
      isBlocked: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Blocked users cannot sign in at all
      if (ctx.path === "/sign-in/email") {
        const email = ctx.body?.email;

        if (typeof email === "string") {
          const users = client.db(process.env.DB_NAME).collection("user");
          const user = await users.findOne({ email });

          if (user?.isBlocked === true) {
            throw new APIError("FORBIDDEN", {
              message: "Your account has been blocked. Please contact support.",
            });
          }
        }

        return;
      }

      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const password = ctx.body?.password;

      if (
        typeof password !== "string" ||
        password.length < 6 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password)
      ) {
        throw new APIError("BAD_REQUEST", {
          message:
            "Password must contain at least 6 characters, one uppercase and one lowercase letter.",
        });
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          console.log("DATABASE HOOK CONTEXT:", context);
          const requestedRole = context?.request?.headers?.get("x-role");

          const role = requestedRole === "vendor" ? "vendor" : "customer";

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  // Enabled only when Google OAuth credentials are configured.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
});
