import { Client } from '@elastic/elasticsearch';

export const createElasticClient = (url) =>
  new Client({ node: url, maxRetries: 1, requestTimeout: 3000 });
