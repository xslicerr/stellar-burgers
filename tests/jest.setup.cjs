process.env.BURGER_API_URL = 'https://norma.ffapi.ru/api';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
globalThis.sessionStorage = {
  ...globalThis.localStorage,
};
const cookies = new Map();
globalThis.document = {};
Object.defineProperty(globalThis.document, 'cookie', {
  get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
  set: (value) => {
    const [entry] = value.split(';');
    const split = entry.indexOf('=');
    cookies.set(entry.slice(0, split), entry.slice(split + 1));
  },
});
