import "dotenv/config";
import { auth } from "./src/config/auth.js";
import { client } from "./src/config/db.js";

async function createAdmin() {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "Please configure ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD.",
      );
    }

    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    const users = client.db(process.env.DB_NAME).collection("user");

    await users.updateOne(
      { email },
      {
        $set: {
          role: "admin",
        },
      },
    );

    console.log("Admin account created successfully!");
    console.log("Admin Email:", email);
  } catch (error) {
    console.error("Admin Creation Failed:", error.message);
  } finally {
    await client.close();
  }
}

createAdmin();
