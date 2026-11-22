import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";
import { createAuthMiddleware, APIError } from "better-auth/api";

export const auth = betterAuth({
  database: mongodbAdapter(client.db(process.env.DB_NAME), {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: ["http://localhost:3000", "http://localhost:5000"],

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
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
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
});
