import { documents, event, reportCollections, rows, transaction } from './db.mjs';

export async function initializeReports() {
  for (const name of reportCollections) {
    const collection = documents.collection(name);
    await collection.createIndexes([
      { key: { disasterId: 1, timestamp: -1 } }, { key: { campId: 1, timestamp: -1 } },
      { key: { timestamp: -1 } }, { key: { reportType: 1, timestamp: -1 } },
      { key: { processed: 1, timestamp: 1, _id: 1 } },
      { key: { title: 'text', description: 'text' } }
    ]);
  }
}

export async function processReport(collection, report) {
  const reportId = report._id.toHexString();
  await transaction(async db => {
    const receipt = await rows(db, 'INSERT IGNORE INTO processed_reports(report_id) VALUES (?)', [reportId]);
    if (!receipt.affectedRows) return;
    if (report.affectedPopulation !== undefined) {
      await rows(db, 'SELECT id FROM locations WHERE id=? FOR UPDATE', [report.campId]);
      const [prior] = await rows(db, 'SELECT observed_at,report_id FROM camp_population_evidence WHERE camp_id=?', [report.campId]);
      if (!prior || report.timestamp > prior.observed_at ||
          (+report.timestamp === +prior.observed_at && reportId > prior.report_id)) {
        await rows(db, 'UPDATE locations SET population=? WHERE id=?', [report.affectedPopulation, report.campId]);
        await rows(db, `INSERT INTO camp_population_evidence(camp_id,observed_at,report_id) VALUES (?,?,?) AS evidence
          ON DUPLICATE KEY UPDATE observed_at=evidence.observed_at,report_id=evidence.report_id`,
        [report.campId, report.timestamp, reportId]);
        await rows(db, 'CALL recalculate_priority(NULL,?,NULL,NULL)', [report.campId]);
      }
    } else if (report.requestId) {
      await rows(db, 'CALL recalculate_priority(?,NULL,NULL,NULL)', [report.requestId]);
    } else {
      await rows(db, 'CALL recalculate_priority(NULL,?,NULL,NULL)', [report.campId]);
    }
    await event(db, 'report_received', { reportId, collection: collection.collectionName,
      disasterId: report.disasterId, campId: report.campId, requestId: report.requestId, title: report.title });
  });
  await collection.updateOne({ _id: report._id }, { $set: { processed: true } });
}

export function startReports(signal) {
  for (const name of reportCollections) {
    const collection = documents.collection(name);
    const sweep = async () => {
      if (signal.aborted) return;
      try {
        for await (const report of collection.find({ processed: false }).sort({ timestamp: 1, _id: 1 }).limit(100)) {
          await processReport(collection, report);
        }
      } catch (error) {
        console.error('Report reconciliation failed', name, error);
      } finally {
        if (!signal.aborted) setTimeout(sweep, 3000).unref();
      }
    };
    const watch = async () => {
      if (signal.aborted) return;
      const stream = collection.watch([{ $match: { operationType: 'insert' } }], { maxAwaitTimeMS: 1000 });
      const close = () => { stream.close().catch(console.error); };
      signal.addEventListener('abort', close, { once: true });
      try {
        for await (const change of stream) await processReport(collection, change.fullDocument);
      } catch (error) {
        if (!signal.aborted) console.error('Report stream interrupted', name, error);
      } finally {
        signal.removeEventListener('abort', close);
        await stream.close().catch(console.error);
        if (!signal.aborted) setTimeout(watch, 1000).unref();
      }
    };
    void watch();
    void sweep();
  }
}

export function fieldSummaries(disasterId) {
  return documents.collection(reportCollections[0]).aggregate([
    { $unionWith: reportCollections[1] },
    ...(disasterId ? [{ $match: { disasterId } }] : []),
    { $group: { _id: { disasterId: '$disasterId', reportType: '$reportType' },
      count: { $sum: 1 }, latest: { $max: '$timestamp' }, largestPopulation: { $max: '$affectedPopulation' } } },
    { $project: { _id: 0, disasterId: '$_id.disasterId', reportType: '$_id.reportType',
      count: 1, latest: 1, largestPopulation: 1 } },
    { $sort: { disasterId: 1, count: -1, reportType: 1 } }
  ]).toArray();
}
