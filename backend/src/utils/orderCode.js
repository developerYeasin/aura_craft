export const generateOrderCode = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `AC-${stamp}${rand}`;
};
