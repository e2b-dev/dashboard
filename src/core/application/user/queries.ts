// Mirrors DASHBOARD_TEAMS_LIST_QUERY_OPTIONS: the profile is prefetched once in
// the dashboard layout and treated as fresh on the client, so it isn't refetched
// on every mount/focus. Cache updates after account mutations come from explicit
// setQueryData calls in the account-settings forms.
export const DASHBOARD_USER_PROFILE_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const
