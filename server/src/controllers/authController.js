const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const publicUser = require('../utils/publicUser');

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validate required fields
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // 2. Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        // 3. Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // 4. Check if user already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // 5. Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 6. Create user in MongoDB
        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student"
        });

        // 7. Return success response
        return res.status(201).json({
            message: "User registered successfully",
            user: publicUser(newUser)
        });

    } catch (error) {
        // Handle duplicate email errors from MongoDB
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};



const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Compare password with stored hash
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Regenerate session to prevent session fixation
        req.session.regenerate((error) => {
            if (error) {
                console.error("Session regeneration failed:", error);

                return res.status(500).json({
                    message: "Unable to complete login"
                });
            }

            // Store authenticated user ID
            req.session.userId = user._id.toString();

            // Generate a fresh CSRF token for the new session
            req.session.csrfToken = crypto
                .randomBytes(32)
                .toString("hex");

            // Save the new session in MongoDB
            req.session.save((error) => {
                if (error) {
                    console.error("Session save failed:", error);

                    return res.status(500).json({
                        message: "Unable to complete login"
                    });
                }

                return res.status(200).json({
                    message: "Login successful",
                    user: publicUser(user),
                    csrfToken: req.session.csrfToken
                });
            });
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};



const logoutUser = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                message: "Unable to logout"
            });
        }

        res.clearCookie("eventnexus.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        return res.status(200).json({
            message: "Logout successful"
        });
    });
};


const getCurrentUser = (req, res) => {
    const user = req.user;

    return res.status(200).json({
        user: publicUser(user)
    });
};

module.exports = { registerUser, loginUser, logoutUser, getCurrentUser };
