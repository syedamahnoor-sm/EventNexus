
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

module.exports = { registerSchema };
