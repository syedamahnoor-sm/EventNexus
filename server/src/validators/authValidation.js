
const { z } = require("zod");

const registerSchema = z.object({
    name: z.string()
        .trim()
        .min(2, "Name must contain at least 2 characters")
        .max(100, "Name cannot exceed 100 characters"),

    email: z.email("Invalid email address")
        .trim()
        .toLowerCase()
        .max(254, "Email address is too long"),

    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .refine(
            (password) => Buffer.byteLength(password, "utf8") <= 72,
            "Password cannot exceed 72 UTF-8 bytes"
        )
}).strict();

const loginSchema = z.object({
    email: z.email("Invalid email address")
        .trim()
        .toLowerCase(),

    password: z.string()
        .min(1, "Password is required"),
    // Optional for existing API clients. The login UI always submits its choice.
    // This is an assertion about an existing account, never a requested privilege.
    role: z.enum(['student', 'organizer']).optional()
}).strict();

module.exports = { registerSchema, loginSchema };
