// Server-only classroom access password verifier. No password or verifier is
// published to student bundles, dashboard results, or public Supabase roles.
import {pbkdf2Sync,randomBytes,timingSafeEqual} from 'node:crypto';
export const QUICK_CLASSROOM_DEFAULT='PEK123';
const rounds=210000;
export function createQuickAccessVerifier(password=QUICK_CLASSROOM_DEFAULT){
 const salt=randomBytes(16).toString('hex');
 return {password_salt:salt,password_hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),rounds,32,'sha256').toString('hex')};
}
export function verifyQuickAccess(password,record){
 if(!record?.enabled||typeof password!=='string'||password.length<6||password.length>64||
  !/^[0-9a-f]{32}$/.test(String(record.password_salt))||
  !/^[0-9a-f]{64}$/.test(String(record.password_hash)))return false;
 const actual=pbkdf2Sync(password,Buffer.from(record.password_salt,'hex'),rounds,32,'sha256');
 return timingSafeEqual(actual,Buffer.from(record.password_hash,'hex'));
}
