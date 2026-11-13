
const { pool } = require("../config/database");

// GET: Retrieve all inventory records
async function getAllInventory(req, res) {
    try {
        const [inventory] = await pool.query(`
            SELECT *
            FROM vw_inventory_availability
            ORDER BY available_quantity ASC
        `);

        return res.status(200).json({
            success: true,
            count: inventory.length,
            inventory
        });
    } catch (error) {
        console.error("Get inventory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory."
        });
    }
}

// GET: Retrieve inventory by ID
async function getInventoryById(req, res) {
    try {
        const inventoryId = Number(req.params.id);

        if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory ID."
            });
        }

        const [inventory] = await pool.query(
            `SELECT *
             FROM vw_inventory_availability
             WHERE inventory_id = ?`,
            [inventoryId]
        );

        if (inventory.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found."
            });
        }

        return res.status(200).json({
            success: true,
            inventory: inventory[0]
        });
    } catch (error) {
        console.error("Get inventory item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory record."
        });
    }
}

// PATCH: Update inventory stock and minimum threshold
async function updateInventory(req, res) {
    let connection;

    try {
        const inventoryId = Number(req.params.id);
        const { quantity, minimum_threshold } = req.body;

        if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory ID."
            });
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            !Number.isInteger(minimum_threshold) ||
            minimum_threshold < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity and minimum_threshold must be non-negative integers."
            });
        }

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Lock inventory row to prevent concurrent stock updates
        const [rows] = await connection.query(
            `SELECT reserved_quantity
             FROM inventory
             WHERE inventory_id = ?
             FOR UPDATE`,
            [inventoryId]
        );

        if (rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Inventory record not found."
            });
        }

        // Prevent stock from going below already reserved quantity
        if (quantity < rows[0].reserved_quantity) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Quantity cannot be less than reserved stock.",
                reserved_quantity: rows[0].reserved_quantity
            });
        }

        await connection.query(
            `UPDATE inventory
             SET quantity = ?,
                 minimum_threshold = ?
             WHERE inventory_id = ?`,
            [quantity, minimum_threshold, inventoryId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully.",
            inventory_id: inventoryId,
            quantity,
            reserved_quantity: rows[0].reserved_quantity,
            available_quantity: quantity - rows[0].reserved_quantity,
            minimum_threshold
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Update inventory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update inventory."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    getAllInventory,
    getInventoryById,
    updateInventory
};
