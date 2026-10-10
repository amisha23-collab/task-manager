/**
 * Rebuilds the Elasticsearch index from MongoDB.
 * Run this if Elasticsearch was down while tasks were changed:  npm run reindex
 */
import { connectMongo, disconnectMongo } from '../src/config/db.js';
import { loadConfig } from '../src/config/env.js';
import { createElasticClient } from '../src/elasticsearch/client.js';
import { createTaskSearch } from '../src/elasticsearch/taskSearch.js';
import { Task } from '../src/models/Task.js';
import { toTaskDTO } from '../src/utils/mappers.js';

const BATCH_SIZE = 500;

const run = async () => {
  const config = loadConfig();
  await connectMongo(config.mongoUri);

  const client = createElasticClient(config.elasticsearch.url);
  const search = createTaskSearch({ client, index: config.elasticsearch.tasksIndex });
  await search.ensureIndex();

  let batch = [];
  let total = 0;
  for await (const doc of Task.find().lean().cursor()) {
    batch.push(toTaskDTO(doc));
    if (batch.length === BATCH_SIZE) {
      await search.bulkIndex(batch);
      total += batch.length;
      batch = [];
    }
  }
  await search.bulkIndex(batch);
  total += batch.length;

  console.log(`Reindexed ${total} task(s).`);
  await client.close();
  await disconnectMongo();
};

run().catch((err) => {
  console.error('Reindex failed:', err.message);
  process.exit(1);
});
