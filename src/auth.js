const ITERATIONS=210000;
const ALGORITHM='PBKDF2-SHA256';
const HEX=/^[0-9a-f]+$/;
export function isValidPin(pin){return typeof pin==='string'&&/^\d{6,12}$/.test(pin);}
function bytesToHex(bytes){return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');}
function hexToBytes(value){if(typeof value!=='string'||value.length%2||!HEX.test(value))throw new Error('Malformed hex');return new Uint8Array(value.match(/.{2}/g).map(pair=>parseInt(pair,16)));}
async function derive(pin,salt,iterations=ITERATIONS){
  if(!globalThis.crypto?.subtle)throw new Error('Web Crypto is unavailable');
  const key=await globalThis.crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  const bits=await globalThis.crypto.subtle.deriveBits({name:'PBKDF2',salt:hexToBytes(salt),iterations,hash:'SHA-256'},key,256);
  return bytesToHex(new Uint8Array(bits));
}
export async function createPinCredential(pin){
  if(!isValidPin(pin))throw new Error('رمز باید ۶ تا ۱۲ رقم باشد.');
  if(!globalThis.crypto?.getRandomValues)throw new Error('مولد امن رمز در دسترس نیست.');
  const salt=new Uint8Array(16);globalThis.crypto.getRandomValues(salt);
  return {version:1,algorithm:ALGORITHM,iterations:ITERATIONS,salt:bytesToHex(salt),hash:await derive(pin,bytesToHex(salt))};
}
export async function verifyPinCredential(pin,credential){
  if(!isValidPin(pin)||!credential||credential.version!==1||credential.algorithm!==ALGORITHM||credential.iterations!==ITERATIONS||
    typeof credential.salt!=='string'||credential.salt.length!==32||!HEX.test(credential.salt)||
    typeof credential.hash!=='string'||credential.hash.length!==64||!HEX.test(credential.hash))return false;
  try{
    const actual=await derive(pin,credential.salt);
    let difference=0;
    for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^credential.hash.charCodeAt(i);
    return difference===0;
  }catch{return false;}
}
