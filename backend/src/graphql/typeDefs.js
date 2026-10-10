export const typeDefs = `#graphql
  enum TaskPriority {
    HIGH
    MEDIUM
    LOW
  }

  enum NotificationType {
    DUE_SOON
    OVERDUE
  }

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String!
    completed: Boolean!
    priority: TaskPriority!
    dueDate: String
    userId: ID!
    createdAt: String!
    updatedAt: String!
  }

  type Notification {
    id: ID!
    taskId: ID!
    type: NotificationType!
    title: String!
    message: String!
    readAt: String
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: TaskPriority = MEDIUM
    dueDate: String
  }

  input UpdateTaskInput {
    title: String
    description: String
    completed: Boolean
    priority: TaskPriority
    dueDate: String
  }

  input UpdateProfileInput {
    name: String
    email: String
  }

  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type TaskCounts {
    all: Int!
    active: Int!
    completed: Int!
  }

  type TaskList {
    tasks: [Task!]!
    pagination: PaginationInfo!
    counts: TaskCounts!
  }

  type Query {
    "The logged-in user (used to restore a session)."
    me: User!

    "Paginated tasks of the logged-in user."
    getTasks(
      page: Int = 1
      limit: Int = 10
      status: String = "all"
      sort: String = "newest"
    ): TaskList!

    "Search the logged-in user's tasks."
    searchTasks(query: String!): [Task!]!

    "Notifications belonging to the logged-in user."
    notifications(unreadOnly: Boolean = false): [Notification!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    updateProfile(input: UpdateProfileInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!

    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Task!

    "Mark one of the logged-in user's notifications as read."
    markNotificationRead(id: ID!): Notification!
  }
`;
