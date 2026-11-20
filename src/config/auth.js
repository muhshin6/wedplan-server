import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";

export const auth = betterAuth({
  database: mongodbAdapter(client.db(process.env.DB_NAME), {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  user: {
    additionalFields: {
      role: {
        type: ["customer", "vendor"],
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const requestedRole = ctx?.body?.role;

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
