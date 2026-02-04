export const toTitleCase = (value: string) =>
  (value || '')
    .toLowerCase()
    .replace(/(^|[^a-zA-Z'])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
