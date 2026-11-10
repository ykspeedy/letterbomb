const sessionCookie="__Host-lb-session", nonceCookie="__Host-lb-nonce";
const sessionAge=30*86400;
const cookie=(name,value,seconds)=>name+"="+value+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age="+seconds;
function readCookie(req,name){
 return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||""
}
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
async function sessionKey(token){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 return "account-session/"+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")
}
let googleKeys,refreshAfter=0;
function decode64(s){return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),ch=>ch.charCodeAt(0))}
async function googleIdentity(jwt,clientId,nonce){
 insist(typeof jwt==="string"&&jwt.length<16384,"Invalid credential.");
 const [header,body,signature,...extra]=jwt.split(".");
 insist(signature&&!extra.length,"Invalid credential.");
 const parse=s=>JSON.parse(new TextDecoder().decode(decode64(s)));
 const alg=parse(header),claims=parse(body),now=Date.now()/1000;
 insist(alg.alg==="RS256"&&typeof alg.kid==="string"&&["accounts.google.com","https://accounts.google.com"].includes(claims.iss)&&claims.aud===clientId&&Number.isFinite(claims.exp)&&claims.exp>now&&Number.isFinite(claims.iat)&&claims.iat<=now+60&&claims.nonce===nonce&&typeof claims.sub==="string"&&/^[\w-]{1,255}$/.test(claims.sub),"Invalid Google sign-in.");
 if(!googleKeys||Date.now()>=refreshAfter){
  const res=await fetch("https://www.googleapis.com/oauth2/v3/certs");insist(res.ok,"Google keys unavailable.");
  googleKeys=(await res.json()).keys;refreshAfter=Date.now()+1000*Math.min(3600,Number(/max-age=(\d+)/.exec(res.headers.get("cache-control")||"")?.[1]||300));
 }
 const jwk=googleKeys.find(k=>k.kid===alg.kid&&k.kty==="RSA");insist(jwk,"Unknown Google sign-in key.");
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 insist(await crypto.subtle.verify(key.algorithm.name,key,decode64(signature),new TextEncoder().encode(header+"."+body)),"Invalid Google signature.");
 return claims
}
async function currentAccount(req,bucket){
 const token=readCookie(req,sessionCookie);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const record=await bucket.get(await sessionKey(token));if(!record)return null;
 const session=await record.json();if(session.expires<=Date.now())return null;
 return (await bucket.get("account/"+session.sub))?.json()
}
async function accountRoute(req,env,path){
 const bucket=env.BUCKET,id=env.GOOGLE_CLIENT_ID||"",headers=new Headers({"Cache-Control":"no-store"});
 const reply=(body,status=200)=>Response.json(body,{headers,status});
 if(path==="/api/account"&&req.method==="GET"){
  const user=await currentAccount(req,bucket);return reply({name:user?.name||null,clientId:id})
 }
 if(req.method!=="POST"||(req.headers.get("origin")!==new URL(req.url).origin&&!lobbyOrigins.has(req.headers.get("origin"))))return reply({error:"Invalid account request."},403);
 if(path==="/api/account/logout"){
  const token=readCookie(req,sessionCookie);if(/^[a-f0-9]{64}$/.test(token))await bucket.delete(await sessionKey(token));
  headers.append("Set-Cookie",cookie(sessionCookie,"",0));return reply({ok:true})
 }
 if(path==="/api/account/profile"){
  const user=await currentAccount(req,bucket);if(!user)return reply({error:"Please sign in again."},401);
  const data=await req.json(),name=String(data.name||"").trim().slice(0,17);insist(name,"Enter a player name.");
  await bucket.put("account/"+user.sub,JSON.stringify({...user,name}));return reply({name})
 }
 if(!id)return reply({error:"Google sign-in is awaiting configuration."},503);
 if(path==="/api/account/challenge"){
  const nonce=randomToken();headers.append("Set-Cookie",cookie(nonceCookie,nonce,600));return reply({nonce,clientId:id})
 }
 if(path!=="/api/account/google")return reply({error:"Unknown account action."},404);
 const nonce=readCookie(req,nonceCookie);insist(/^[a-f0-9]{64}$/.test(nonce),"Reopen the profile to sign in.");
 const {credential}=await req.json(),claims=await googleIdentity(credential,id,nonce);
 const pathKey="account/"+claims.sub;let record=await bucket.get(pathKey);
 if(!record){
  const newUser={sub:claims.sub,name:String(claims.given_name||"Player").slice(0,17),created:Date.now()};
  await bucket.put(pathKey,JSON.stringify(newUser),{onlyIf:{etagDoesNotMatch:"*"}});record=await bucket.get(pathKey)
 }
 const user=await record.json(),token=randomToken();await bucket.put(await sessionKey(token),JSON.stringify({sub:user.sub,expires:Date.now()+sessionAge*1000}));
 headers.append("Set-Cookie",cookie(sessionCookie,token,sessionAge));headers.append("Set-Cookie",cookie(nonceCookie,"",0));return reply({name:user.name})
}
