// Server-only AES-256-GCM envelope for a Creator Pass private passcode.
// HKDF provides domain separation from the existing HMAC hash pepper.
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from 'node:crypto';
import {fail} from './_galleryCreator.js';

function encryptionKey(){
 const pepper=String(process.env.GCP_HASH_PEPPER||'');
 if(pepper.length<48)throw fail(503,'Private passcode encryption is not configured.');
 return Buffer.from(hkdfSync('sha256',Buffer.from(pepper,'utf8'),
  Buffer.from('BRIAN Museum Lab vault 2026','utf8'),
  Buffer.from('private-group-passcode aes-256-gcm v1','utf8'),32));
}
export function encryptGroupPasscode(secret,handle){
 if(!/^[A-Za-z0-9_-]{24,128}$/.test(String(secret))||
    !/^[A-Za-z0-9_-]{16,80}$/.test(String(handle)))
  throw fail(400,'Invalid group access code.');
 const nonce=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',encryptionKey(),nonce);
 cipher.setAAD(Buffer.from('gcp-invite:'+handle));
 const payload=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return ['v1',nonce.toString('base64url'),cipher.getAuthTag().toString('base64url'),
         payload.toString('base64url')].join('.');
}
export function decryptGroupPasscode(envelope,handle){
 if(!envelope)return null; // Legacy one-way hashes cannot be recovered.
 const parts=String(envelope).split('.');
 if(parts.length!==4||parts[0]!=='v1')throw fail(503,'Passcode vault format is unavailable.');
 try{
  const nonce=Buffer.from(parts[1],'base64url');
  const tag=Buffer.from(parts[2],'base64url');
  const payload=Buffer.from(parts[3],'base64url');
  if(nonce.length!==12||tag.length!==16||payload.length<16||payload.length>128)
   throw new Error('Invalid envelope');
  const dec=createDecipheriv('aes-256-gcm',encryptionKey(),nonce);
  dec.setAAD(Buffer.from('gcp-invite:'+handle));
  dec.setAuthTag(tag);
  const text=Buffer.concat([dec.update(payload),dec.final()]).toString('utf8');
  if(!/^[A-Za-z0-9_-]{24,128}$/.test(text))throw new Error('Invalid code');
  return text;
 }catch{throw fail(503,'Unable to decrypt the private passcode. Regenerate it if the encryption key has changed.');}
}
