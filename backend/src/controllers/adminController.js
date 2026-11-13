
const { pool } = require("../config/database");

async function getAllUsers(req, res) {
    try {
        const [users] = await pool.query(`
            SELECT
                user_id,
                full_name,
                email,
                phone,
                role,
                is_active,
                created_at
            FROM users
            ORDER BY created_at DESC
        `);

        return res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve users."
        });
    }
}

async function updateUserStatus(req, res) {
    try {
        const userId = Number(req.params.id);
        const { is_active } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "is_active must be true or false."
            });
        }

        if (userId === req.user.user_id && !is_active) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account."
            });
        }

        const [result] = await pool.query(
            "UPDATE users SET is_active = ? WHERE user_id = ?",
            [is_active ? 1 : 0, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "User status updated successfully."
        });
    } catch (error) {
        console.error("Update user status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user status."
        });
    }
}

async function updateUserRole(req, res) {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;

        const allowedRoles = ["ADMIN", "COORDINATOR", "VOLUNTEER"];

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role."
            });
        }

        if (userId === req.user.user_id && role !== "ADMIN") {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own admin role."
            });
        }

        const [result] = await pool.query(
            "UPDATE users SET role = ? WHERE user_id = ?",
            [role, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "User role updated successfully."
        });
    } catch (error) {
        console.error("Update user role error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user role."
        });
    }
}

module.exports = {
    getAllUsers,
    updateUserStatus,
    updateUserRole
};
