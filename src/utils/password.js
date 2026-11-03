const MIN_PASSWORD_LENGTH = 8;

// 0 (empty) to 4 (strong)
export const passwordScore = (pwd) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.max(1, Math.min(4, score));
};
