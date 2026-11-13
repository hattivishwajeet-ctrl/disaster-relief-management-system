
const { pool } = require("../config/database");

const ALLOWED_TRANSITIONS = {
    REQUESTED: "APPROVED",
    APPROVED: "ALLOCATED",
    ALLOCATED: "DISPATCHED",
    DISPATCHED: "IN_TRANSIT",
    IN_TRANSIT: "DELIVERED",
    DELIVERED: "CONFIRMED"
};

// UPDATE DELIVERY STATUS
async function updateDeliveryStatus(req, res) {
    let connection;

    try {
        const deliveryId = Number(req.params.id);
        const { delivery_status, delivery_notes } = req.body;

        if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery ID"
            });
        }

        if (
                typeof delivery_status !== "string" ||
                !Object.values(ALLOWED_TRANSITIONS).includes(delivery_status)
            ) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery status"
            });
        }

        if (
            delivery_notes !== undefined &&
            delivery_notes !== null &&
            typeof delivery_notes !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Delivery notes must be a string"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT
                d.delivery_id,
                d.allocation_id,
                d.delivery_status,
                a.status AS allocation_status
             FROM deliveries d
             JOIN allocations a
                ON d.allocation_id = a.allocation_id
             WHERE d.delivery_id = ?
             FOR UPDATE`,
            [deliveryId]
        );

        if (rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Delivery not found"
            });
        }

        const delivery = rows[0];

        const expectedNextStatus =
            ALLOWED_TRANSITIONS[delivery.delivery_status];

        if (expectedNextStatus !== delivery_status) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Invalid delivery status transition",
                current_status: delivery.delivery_status,
                expected_next_status: expectedNextStatus || null
            });
        }

        await connection.execute(
            `UPDATE deliveries
             SET
                delivery_status = ?,
                dispatched_at = CASE
                    WHEN ? = 'DISPATCHED' THEN CURRENT_TIMESTAMP
                    ELSE dispatched_at
                END,
                delivered_at = CASE
                    WHEN ? = 'DELIVERED' THEN CURRENT_TIMESTAMP
                    ELSE delivered_at
                END,
                confirmed_at = CASE
                    WHEN ? = 'CONFIRMED' THEN CURRENT_TIMESTAMP
                    ELSE confirmed_at
                END,
                delivery_notes = COALESCE(?, delivery_notes)
             WHERE delivery_id = ?`,
            [
                delivery_status,
                delivery_status,
                delivery_status,
                delivery_status,
                delivery_notes ?? null,
                deliveryId
            ]
        );

        if (delivery_status === "DISPATCHED") {
            await connection.execute(
                `UPDATE allocations
                 SET status = 'DISPATCHED'
                 WHERE allocation_id = ?`,
                [delivery.allocation_id]
            );
        } else if (
            delivery_status === "DELIVERED" ||
            delivery_status === "CONFIRMED"
        ) {
            await connection.execute(
                `UPDATE allocations
                 SET status = 'DELIVERED'
                 WHERE allocation_id = ?`,
                [delivery.allocation_id]
            );
        }

        await connection.commit();

        const [updatedRows] = await connection.execute(
            `SELECT
                d.*,
                a.status AS allocation_status
             FROM deliveries d
             JOIN allocations a
                ON d.allocation_id = a.allocation_id
             WHERE d.delivery_id = ?`,
            [deliveryId]
        );

        return res.status(200).json({
            success: true,
            message: "Delivery status updated successfully",
            delivery: updatedRows[0]
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Delivery status update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update delivery status"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
}


// GET ALL DELIVERIES
async function getAllDeliveries(req, res) {
    try {
        let query = `
            SELECT
                d.*,
                a.request_id,
                a.inventory_id,
                a.allocated_quantity,
                a.status AS allocation_status,
                rr.urgency,
                rr.priority_score,
                c.camp_name,
                r.resource_name,
                u.full_name AS allocated_by_name
            FROM deliveries d
            JOIN allocations a
                ON d.allocation_id = a.allocation_id
            JOIN resource_requests rr
                ON a.request_id = rr.request_id
            JOIN camps c
                ON rr.camp_id = c.camp_id
            JOIN resources r
                ON rr.resource_id = r.resource_id
            LEFT JOIN users u
                ON a.allocated_by = u.user_id
        `;

        const params = [];

        if (req.user.role === "VOLUNTEER") {
            query += " WHERE rr.requested_by = ?";
            params.push(req.user.user_id);
        }

        query += " ORDER BY d.updated_at DESC";

        const [deliveries] = await pool.execute(query, params);

        return res.status(200).json({
            success: true,
            count: deliveries.length,
            deliveries
        });

    } catch (error) {
        console.error("Get deliveries error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve deliveries"
        });
    }
}


// GET DELIVERY BY ID
async function getDeliveryById(req, res) {
    try {
        const deliveryId = Number(req.params.id);

        if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery ID"
            });
        }

        let query = `
            SELECT
                d.*,
                a.request_id,
                a.inventory_id,
                a.allocated_quantity,
                a.status AS allocation_status,
                rr.urgency,
                rr.priority_score,
                c.camp_name,
                r.resource_name,
                u.full_name AS allocated_by_name
            FROM deliveries d
            JOIN allocations a
                ON d.allocation_id = a.allocation_id
            JOIN resource_requests rr
                ON a.request_id = rr.request_id
            JOIN camps c
                ON rr.camp_id = c.camp_id
            JOIN resources r
                ON rr.resource_id = r.resource_id
            LEFT JOIN users u
                ON a.allocated_by = u.user_id
            WHERE d.delivery_id = ?
        `;

        const params = [deliveryId];

        if (req.user.role === "VOLUNTEER") {
            query += " AND rr.requested_by = ?";
            params.push(req.user.user_id);
        }

        const [deliveries] = await pool.execute(query, params);

        if (deliveries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Delivery not found"
            });
        }

        return res.status(200).json({
            success: true,
            delivery: deliveries[0]
        });

    } catch (error) {
        console.error("Get delivery error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve delivery"
        });
    }
}


module.exports = {
    updateDeliveryStatus,
    getAllDeliveries,
    getDeliveryById
};
