import {FIREBASE_CONFIG} from '../firebase-config.mjs';
import {answerPartner} from './partner-guide.mjs';

// accounts:lookup authenticates the ID token with Firebase. Only forward the
// verified localId to the quota ledger; the token never goes to the AI service.
export async function answerAccountQuestion(body,authorization,env,send=fetch){
 const denied={status:401,reason:'sign-in'};
 const token=/^Bearer ([^\s]+)$/.exec(authorization??'')?.[1];
 if(!token||token.length>12000)return denied;
 let claims;
 try{
  claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
  if(claims.aud!==FIREBASE_CONFIG.projectId||claims.iss!=='https://securetoken.google.com/'+FIREBASE_CONFIG.projectId||
     !claims.sub||claims.firebase?.sign_in_provider==='anonymous')return denied;
 }catch{return denied;}
 try{
  const lookup=await send('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_CONFIG.apiKey,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
   headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})
  });
  if(!lookup.ok){
   const code=(await lookup.json()).error?.message;
   if(['INVALID_ID_TOKEN','TOKEN_EXPIRED','USER_DISABLED','USER_NOT_FOUND','INVALID_USER_TOKEN','CREDENTIAL_TOO_OLD_LOGIN_AGAIN'].includes(code))return denied;
   return {status:503,reason:'auth-unavailable'};
  }
  const {users}=await lookup.json();
  const account=users?.[0];
  if(users?.length!==1||account?.localId!==claims.sub||account.disabled||
     !Number.isFinite(claims.auth_time)||claims.auth_time<Number(account.validSince??0))return denied;
  return answerPartner(body,env,send,'firebase:'+account.localId);
 }catch{return {status:503,reason:'auth-unavailable'};}
}
