import { useMutation } from '@apollo/client';
import { CREATE_TASK, DELETE_TASK, UPDATE_TASK } from '../graphql/operations';

/**
 * Create / update / delete mutations. After each one the active task queries are
 * refetched, so the list always matches the server (and the Redis cache was already invalidated there).
 */
export const useTaskActions = ({ isSearching }) => {
  const options = {
    refetchQueries: isSearching ? ['GetTasks', 'SearchTasks'] : ['GetTasks'],
    awaitRefetchQueries: true,
  };

  const [createMutation, createState] = useMutation(CREATE_TASK, options);
  const [updateMutation, updateState] = useMutation(UPDATE_TASK, options);
  const [deleteMutation, deleteState] = useMutation(DELETE_TASK, options);

  return {
    createTask: (input) => createMutation({ variables: { input } }),
    updateTask: (id, input) => updateMutation({ variables: { id, input } }),
    deleteTask: (id) => deleteMutation({ variables: { id } }),
    busy: createState.loading || updateState.loading || deleteState.loading,
  };
};
