// Explicit allowlist: never serialize a User document (or its password) directly.
function publicUser(user) {
    const result = { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
    if (user.role === 'student') {
        result.studentProfile = Object.fromEntries(['studentId', 'department', 'studyStage', 'contactNumber'].map(key => [key, user.studentProfile?.[key] || '']));
        result.profileVersion = user.profileVersion || 0;
        result.photoUrl = user.profilePhoto?.url || null;
    }
    return result;
}
module.exports = publicUser;
