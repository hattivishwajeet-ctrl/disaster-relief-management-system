
const { pool } = require("../config/database");

async function getProfile(req, res) {
    try {
        const [users] = await pool.execute(
            `SELECT user_id, full_name, email, role, phone,
                    is_active, created_at
             FROM users
             WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0 || !users[0].is_active) {
            return res.status(404).json({
                success: false,
                message: "User account not found or inactive"
            });
        }

        return res.status(200).json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error("Profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve profile"
        });
    }
}

module.exports = { getProfile };
