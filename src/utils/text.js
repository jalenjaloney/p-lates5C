const ACRONYMS = new Set(['CMC', 'HMC']);

export function formatTitle(value) {
  return (value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      const lower = part.toLowerCase();
      if (lower.startsWith('mc') && lower.length > 2) {
        return `Mc${lower.charAt(2).toUpperCase()}${lower.slice(3)}`;
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}
