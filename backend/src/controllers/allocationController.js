
const { pool } = require("../config/database");

// POST: Allocate resources to a request
async function createAllocation(req, res) {
    let connection;

    try {
        const {
            request_id,
            inventory_id,
            quantity
        } = req.body;

        const requestId = Number(request_id);
        const inventoryId = Number(inventory_id);
        const allocationQuantity = Number(quantity);

        // Validate input
        if (
            !Number.isInteger(requestId) || requestId <= 0 ||
            !Number.isInteger(inventoryId) || inventoryId <= 0 ||
            !Number.isInteger(allocationQuantity) || allocationQuantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide valid request ID, inventory ID and quantity"
            });
        }

        connection = await pool.getConnection();

        // Call the existing transactional stored procedure.
        // It handles inventory locking, quantity validation,
        // allocation creation and delivery creation.
        await connection.query(
            "CALL sp_allocate_resource(?, ?, ?, ?)",
            [
                requestId,
                inventoryId,
                allocationQuantity,
                req.user.user_id
            ]
        );

        // Retrieve the latest allocation created for this request.
        const [allocations] = await connection.execute(
            `SELECT *
             FROM allocations
             WHERE request_id = ?
               AND inventory_id = ?
               AND allocated_by = ?
             ORDER BY allocation_id DESC
             LIMIT 1`,
            [requestId, inventoryId, req.user.user_id]
        );

        if (allocations.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Allocation completed but its record could not be retrieved"
            });
        }

        const allocation = allocations[0];

        const [deliveries] = await connection.execute(
            `SELECT *
             FROM deliveries
             WHERE allocation_id = ?
             ORDER BY delivery_id DESC
             LIMIT 1`,
            [allocation.allocation_id]
        );

        return res.status(201).json({
            success: true,
            message: "Resource allocated successfully",
            allocation,
            delivery: deliveries[0] || null
        });

    } catch (error) {
        console.error("Resource allocation error:", error);

        // The stored procedure manages its own transaction
        // and rollback on failure.
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || "Unable to allocate resources"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = { createAllocation };
