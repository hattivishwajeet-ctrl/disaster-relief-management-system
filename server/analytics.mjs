export const distribution = `
  SELECT d.id AS disaster_id,d.name AS disaster,r.name AS resource,r.unit,
    COUNT(*) AS requests,SUM(q.quantity) AS requested,
    SUM(CASE WHEN al.id IS NOT NULL THEN q.quantity ELSE 0 END) AS allocated,
    SUM(CASE WHEN q.status='Confirmed' THEN q.quantity ELSE 0 END) AS confirmed
  FROM requests q JOIN camp_directory c ON c.id=q.camp_id
  JOIN disasters d ON d.id=c.disaster_id JOIN resources r ON r.id=q.resource_id
  LEFT JOIN allocations al ON al.request_id=q.id
  WHERE (? IS NULL OR d.id=?)
  GROUP BY d.id,d.name,r.id,r.name,r.unit HAVING SUM(q.quantity)>0
  ORDER BY requested DESC,d.name,r.name`;

export const shortages = `
  SELECT resource,unit,COUNT(*) AS locations_below_threshold,SUM(threshold-quantity) AS deficit
  FROM stock_by_location WHERE quantity<threshold
  GROUP BY resource,unit HAVING SUM(threshold-quantity)>0 ORDER BY deficit DESC,resource`;

export const unattended = `
  SELECT q.id,q.camp,q.resource,q.priority FROM request_details q
  WHERE q.priority>=80 AND q.status IN ('Requested','Approved')
    AND q.created_at<=CURRENT_TIMESTAMP(3)-INTERVAL 15 MINUTE
    AND NOT EXISTS (SELECT 1 FROM allocations a WHERE a.request_id=q.id)
    AND (? IS NULL OR q.disaster_id=?)
  ORDER BY q.priority DESC,q.created_at,q.id`;
