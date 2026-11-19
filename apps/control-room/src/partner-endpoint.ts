// Only the project build can specify the remote backend that receives an ID token.
export function partnerEndpoint(page:Pick<Location,'hostname'|'pathname'>,configured?:string){
 if(['localhost','127.0.0.1'].includes(page.hostname)&&page.pathname.startsWith('/apps/control-room/dist/'))return '/api/partner-guide';
 if(!configured)return null;
 try{
  const origin=new URL(configured);
  if(origin.protocol==='https:'&&origin.origin===configured.replace(/\/$/,''))return origin.origin+'/api/partner-guide';
 }catch{}
 return null;
}
