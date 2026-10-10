const toIso = (value) => new Date(value).toISOString();

/** Converts a Mongo task document into the plain shape used by GraphQL, Redis and Elasticsearch. */
export const toTaskDTO = (doc) => ({
  id: String(doc._id),
  title: doc.title,
  description: doc.description ?? '',
  completed: Boolean(doc.completed),
  priority: doc.priority || 'MEDIUM',
  dueDate: doc.dueDate ? toIso(doc.dueDate) : null,
  userId: String(doc.userId),
  createdAt: toIso(doc.createdAt),
  updatedAt: toIso(doc.updatedAt),
});

export const toUserDTO = (doc) => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  createdAt: toIso(doc.createdAt),
  updatedAt: toIso(doc.updatedAt),
});
