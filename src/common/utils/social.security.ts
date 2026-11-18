import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cfg } from '../../config/runtime';

const scrypt=promisify(scryptCallback);

export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password:string) { const salt=randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64) as Buffer).toString('hex');return `scrypt:${salt}:${hash}`; }
export async function checkPassword(password:string,stored:string) {const [alg,salt,hash]=stored.split(':');if(alg!=='scrypt'||!salt||!hash)return false;const actual=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
type TokenData={sub:string;sid:string;ver:number;typ:'access'|'refresh';iat:number;exp:number;iss:string};
const b64=(v:string)=>Buffer.from(v).toString('base64url');


export function signToken(data:Omit<TokenData,'iat'|'exp'|'iss'>,seconds:number) {
    const now=Math.floor(Date.now()/1000);const body:TokenData={...data,iat:now,exp:now+seconds,iss:'social-app'};
    const base=`${b64(JSON.stringify({alg:'HS256',typ:'JWT'}))}.${b64(JSON.stringify(body))}`;
    const sig=createHmac('sha256',data.typ==='access'?cfg.accessSecret:cfg.refreshSecret).update(base).digest('base64url');return `${base}.${sig}`;
}


export function verifyToken(token:string,type:'access'|'refresh'):TokenData {
    const segments=token.split('.');if(segments.length!==3)throw Error('Invalid token');
    const [head,payload,signature]=segments;if(!head||!payload||!signature)throw Error('Invalid token');
    const header=JSON.parse(Buffer.from(head,'base64url').toString());if(header.alg!=='HS256'||header.typ!=='JWT')throw Error('Invalid algorithm');
    const signed=createHmac('sha256',type==='access'?cfg.accessSecret:cfg.refreshSecret).update(`${head}.${payload}`).digest();
    const received=Buffer.from(signature,'base64url');if(signed.length!==received.length||!timingSafeEqual(signed,received))throw Error('Invalid signature');
    const value=JSON.parse(Buffer.from(payload,'base64url').toString()) as TokenData;
    if(value.typ!==type||value.iss!=='social-app'||typeof value.sub!=='string'||typeof value.sid!=='string'||typeof value.ver!=='number'||typeof value.exp!=='number'||value.exp<=Math.floor(Date.now()/1000))throw Error('Expired or invalid token');
    return value;
}
export const newId=()=>randomBytes(32).toString('hex');
export const newOtp=()=>String(randomBytes(4).readUInt32BE(0)%1000000).padStart(6,'0');
