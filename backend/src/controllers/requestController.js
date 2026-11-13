
const { pool } = require("../config/database");

const VALID_URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const REQUEST_SELECT = `
    SELECT
        rr.*,
        c.camp_name,
        r.resource_name,
        r.category AS resource_category,
        r.unit AS resource_unit,
        requester.full_name AS requested_by_name,
        coordinator.full_name AS coordinator_name
    FROM resource_requests rr
    JOIN camps c ON rr.camp_id = c.camp_id
    JOIN resources r ON rr.resource_id = r.resource_id
    LEFT JOIN users requester ON rr.requested_by = requester.user_id
    LEFT JOIN users coordinator
        ON rr.assigned_coordinator = coordinator.user_id
`;

// GET all requests
async function getAllRequests(req, res) {
    try {
        let sql = REQUEST_SELECT;
        const params = [];

        // Volunteers can only see requests they created.
        if (req.user.role === "VOLUNTEER") {
            sql += " WHERE rr.requested_by = ?";
            params.push(req.user.user_id);
        }

        sql += " ORDER BY rr.priority_score DESC, rr.created_at DESC";

        const [requests] = await pool.execute(sql, params);

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error("Get requests error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve resource requests"
        });
    }
}

// GET request by ID
async function getRequestById(req, res) {
    try {
        const requestId = Number(req.params.id);

        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID"
            });
        }

        let sql = REQUEST_SELECT + " WHERE rr.request_id = ?";
        const params = [requestId];

        if (req.user.role === "VOLUNTEER") {
            sql += " AND rr.requested_by = ?";
            params.push(req.user.user_id);
        }

        const [requests] = await pool.execute(sql, params);

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        return res.status(200).json({
            success: true,
            request: requests[0]
        });

    } catch (error) {
        console.error("Get request error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve resource request"
        });
    }
}

// CREATE request
async function createRequest(req, res) {
    let connection;

    try {
        const {
            camp_id,
            resource_id,
            quantity_requested,
            affected_population = 0,
            urgency = "MEDIUM",
            request_description
        } = req.body;

        const campId = Number(camp_id);
        const resourceId = Number(resource_id);
        const quantity = Number(quantity_requested);
        const population = Number(affected_population);

        if (
            !Number.isInteger(campId) || campId <= 0 ||
            !Number.isInteger(resourceId) || resourceId <= 0 ||
            !Number.isInteger(quantity) || quantity <= 0 ||
            !Number.isInteger(population) || population < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide valid camp, resource, quantity and population values"
            });
        }

        const normalizedUrgency = String(urgency).toUpperCase();

        if (!VALID_URGENCIES.includes(normalizedUrgency)) {
            return res.status(400).json({
                success: false,
                message: "Invalid urgency level"
            });
        }

        if (
            request_description !== undefined &&
            request_description !== null &&
            typeof request_description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Request description must be text"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verify that the camp exists and is not closed.
        const [camps] = await connection.execute(
            "SELECT camp_id, status FROM camps WHERE camp_id = ?",
            [campId]
        );

        if (camps.length === 0 || camps[0].status === "CLOSED") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Camp does not exist or is closed"
            });
        }

        // Verify that the requested resource exists.
        const [resources] = await connection.execute(
            "SELECT resource_id FROM resources WHERE resource_id = ?",
            [resourceId]
        );

        if (resources.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Resource does not exist"
            });
        }

        const assignedCoordinator =
            req.user.role === "COORDINATOR"
                ? req.user.user_id
                : null;

        const [result] = await connection.execute(
            `INSERT INTO resource_requests (
                camp_id,
                resource_id,
                quantity_requested,
                affected_population,
                urgency,
                status,
                request_description,
                requested_by,
                assigned_coordinator
            ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [
                campId,
                resourceId,
                quantity,
                population,
                normalizedUrgency,
                request_description?.trim() || null,
                req.user.user_id,
                assignedCoordinator
            ]
        );

        const requestId = result.insertId;

        // Calculate initial priority using the existing procedure.
        await connection.query(
            "CALL sp_calculate_priority(?, ?)",
            [requestId, 0]
        );

        await connection.commit();

        const [requests] = await pool.execute(
            REQUEST_SELECT + " WHERE rr.request_id = ?",
            [requestId]
        );

        return res.status(201).json({
            success: true,
            message: "Resource request created successfully",
            request: requests[0]
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Create request error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create resource request"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// RECOMPUTE request priority
async function recalculatePriority(req, res) {
    let connection;

    try {
        const requestId = Number(req.params.id);

        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            "SELECT request_id FROM resource_requests WHERE request_id = ?",
            [requestId]
        );

        if (existing.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        // Bonus is zero here. Report-derived bonuses can be
        // integrated later with the field-report module.
        await connection.query(
            "CALL sp_calculate_priority(?, ?)",
            [requestId, 0]
        );

        await connection.commit();

        const [requests] = await pool.execute(
            REQUEST_SELECT + " WHERE rr.request_id = ?",
            [requestId]
        );

        return res.status(200).json({
            success: true,
            message: "Request priority recalculated successfully",
            request: requests[0]
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Priority calculation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to calculate request priority"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// GET priority ranking
async function getRequestRanking(req, res) {
    try {
        const [requests] = await pool.execute(
            `SELECT *
             FROM vw_request_priority_ranking
             ORDER BY priority_score DESC`
        );

        return res.status(200).json({
            success: true,
            count: requests.length,
            ranking: requests
        });

    } catch (error) {
        console.error("Request ranking error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve request ranking"
        });
    }
}

module.exports = {
    getAllRequests,
    getRequestById,
    createRequest,
    recalculatePriority,
    getRequestRanking
};
