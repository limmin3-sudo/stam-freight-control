// Development only: expose three read endpoints to the same local Vite origin.
// Never proxy caller URLs, mutations, cookies or arbitrary headers to the companion.
export function companionProxy(){
 return {name:'stam-local-companion',configureServer:install,configurePreviewServer:install};
}
function install(server){server.middlewares.use(async(req,res,next)=>{
 if(!req.url?.startsWith('/__stam_bridge/'))return next();
 const host=req.headers.host||'',origin='http://'+host;
 const allowedHost=/^(?:127\.0\.0\.1|localhost):(?:5173|5174)$/.test(host);
 const site=req.headers['sec-fetch-site'];
 const endpoint=req.url.slice('/__stam_bridge'.length);
 if(!allowedHost||req.method!=='GET'||req.headers.origin&&req.headers.origin!==origin||site&&site!=='same-origin'||
   !['/api/pair','/api/status','/api/snapshot'].includes(endpoint)||req.headers['x-stam-preview']!=='1'){
  res.writeHead(403);res.end();return;
 }
 const headers={Origin:'https://limmin3-sudo.github.io'};
 if(endpoint==='/api/pair')headers['X-STAM-Client']='flight-deck';
 else if(/^Bearer [a-f\d]{64}$/.test(req.headers.authorization||''))headers.Authorization=req.headers.authorization;
 else{res.writeHead(401);res.end();return;}
 try{
  const response=await fetch('http://127.0.0.1:23458'+endpoint,{headers,redirect:'error',signal:AbortSignal.timeout(4500)});
  res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store','Cross-Origin-Resource-Policy':'same-origin'});
  res.end(await response.text());
 }catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"companion-offline"}');}
});}
