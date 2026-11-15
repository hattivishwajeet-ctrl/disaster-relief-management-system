import { documents, reportCollections } from './db.mjs';

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
