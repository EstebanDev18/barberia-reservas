import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// scrypt de la librería estándar: sal aleatoria por contraseña, guardado como "sal:hash".
export const hashPassword = (password: string) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
export const checkPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(':');
  return !!salt && !!hash && timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
};
