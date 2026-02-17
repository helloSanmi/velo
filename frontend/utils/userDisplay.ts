export interface UserLike {
  displayName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export const getUserFullName = (user?: UserLike | null) => {
  if (!user) return 'Unknown user';
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const display = (user.displayName || '').trim();
  if (display) return display;
  const username = (user.username || '').trim();
  if (username) return username;
  return 'Unknown user';
};
