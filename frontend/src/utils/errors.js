/** Turns an Apollo error into one message that is safe and useful to show the user. */
export const getErrorMessage = (error) => {
  if (!error) return '';
  if (error.networkError) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return error.graphQLErrors?.[0]?.message || error.message || 'Something went wrong.';
};
