
const { pool } = require("../config/database");

async function getDashboardSummary(req, res) {
    try {
        const [
            [disasterOverview],
            [campResourceSummary],
            [requestPriorityRanking],
            [deliveryTracking],
            [inventoryAvailability]
        ] = await Promise.all([
            pool.query("SELECT * FROM vw_disaster_overview"),
            pool.query("SELECT * FROM vw_camp_resource_summary"),
            pool.query("SELECT * FROM vw_request_priority_ranking"),
            pool.query("SELECT * FROM vw_delivery_tracking"),
            pool.query("SELECT * FROM vw_inventory_availability")
        ]);

        return res.status(200).json({
            success: true,
            dashboard: {
                disaster_overview: disasterOverview,
                camp_resource_summary: campResourceSummary,
                request_priority_ranking: requestPriorityRanking,
                delivery_tracking: deliveryTracking,
                inventory_availability: inventoryAvailability
            }
        });
    } catch (error) {
        console.error("Dashboard analytics error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard analytics."
        });
    }
}

module.exports = { getDashboardSummary };
