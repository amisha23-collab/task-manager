/**
 * Elasticsearch gateway for tasks.
 * The Elasticsearch document _id is always the MongoDB task id, so the two stores line up 1:1.
 */
export const createTaskSearch = ({ client, index }) => {
  let indexReady = false;

  const ensureIndex = async () => {
    const exists = await client.indices.exists({ index });
    if (!exists) {
      await client.indices.create({
        index,
        mappings: {
          properties: {
            title: { type: 'text' },
            description: { type: 'text' },
            completed: { type: 'boolean' },
            userId: { type: 'keyword' }, // exact match, used to scope search to one user
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      });
    }
    indexReady = true;
  };

  // Creates the index with the right mapping the first time it is needed,
  // even if Elasticsearch was down when the server started.
  const ready = async () => {
    if (!indexReady) await ensureIndex();
  };

  return {
    ensureIndex,

    async index(task) {
      await ready();
      const { id, ...document } = task;
      await client.index({ index, id, document, refresh: 'wait_for' });
    },

    async remove(id) {
      try {
        await client.delete({ index, id, refresh: 'wait_for' });
      } catch (err) {
        if (err.meta?.statusCode !== 404) throw err; // already gone is fine
      }
    },

    /** Used by the reindex script to (re)build the index from MongoDB. */
    async bulkIndex(tasks) {
      if (tasks.length === 0) return;
      await ready();
      const operations = tasks.flatMap(({ id, ...document }) => [
        { index: { _index: index, _id: id } },
        document,
      ]);
      const result = await client.bulk({ operations, refresh: true });
      if (result.errors) throw new Error('Some documents failed to index.');
    },

    /** Full-text search over title and description, limited to one user's tasks. */
    async search(userId, query, size = 50) {
      await ready();
      const fields = ['title^2', 'description'];
      const result = await client.search({
        index,
        size,
        query: {
          bool: {
            filter: [{ term: { userId } }],
            must: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    // whole words, tolerant of small typos
                    { multi_match: { query, fields, fuzziness: 'AUTO' } },
                    // partial words while typing ("meet" finds "meeting")
                    { multi_match: { query, fields, type: 'phrase_prefix' } },
                  ],
                },
              },
            ],
          },
        },
      });
      return result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source }));
    },
  };
};
