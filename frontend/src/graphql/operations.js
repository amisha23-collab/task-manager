
import { gql } from '@apollo/client';

const TASK_FIELDS = gql`
  fragment TaskFields on Task {
    id
    title
    description
    completed
    priority
    dueDate
    userId
    createdAt
    updatedAt
  }
`;

const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    createdAt
    updatedAt
  }
`;

const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    taskId
    type
    title
    message
    readAt
    createdAt
  }
`;

export const REGISTER = gql`
  ${USER_FIELDS}
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const LOGIN = gql`
  ${USER_FIELDS}
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const ME = gql`
  ${USER_FIELDS}
  query Me {
    me {
      ...UserFields
    }
  }
`;

export const UPDATE_PROFILE = gql`
  ${USER_FIELDS}
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ...UserFields
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword(
    $currentPassword: String!
    $newPassword: String!
  ) {
    changePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    )
  }
`;

export const GET_TASKS = gql`
  ${TASK_FIELDS}
  query GetTasks(
    $page: Int
    $limit: Int
    $status: String
    $sort: String
  ) {
    getTasks(
      page: $page
      limit: $limit
      status: $status
      sort: $sort
    ) {
      tasks {
        ...TaskFields
      }
      pagination {
        page
        limit
        total
        totalPages
        hasNextPage
        hasPreviousPage
      }
      counts {
        all
        active
        completed
      }
    }
  }
`;

export const SEARCH_TASKS = gql`
  ${TASK_FIELDS}
  query SearchTasks($query: String!) {
    searchTasks(query: $query) {
      ...TaskFields
    }
  }
`;

export const CREATE_TASK = gql`
  ${TASK_FIELDS}
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      ...TaskFields
    }
  }
`;

export const UPDATE_TASK = gql`
  ${TASK_FIELDS}
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      ...TaskFields
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      id
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  ${NOTIFICATION_FIELDS}
  query GetNotifications($unreadOnly: Boolean = false) {
    notifications(unreadOnly: $unreadOnly) {
      ...NotificationFields
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  ${NOTIFICATION_FIELDS}
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      ...NotificationFields
    }
  }
`;
