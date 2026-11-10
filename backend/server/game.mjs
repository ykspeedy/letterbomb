const leaseMs=120000;
function newCode(){return Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>String.fromCharCode(65+n%26)).join("")}
function closed(r){return r.phase==="Closed"||Date.now()-(r.hostSeen||r.created||Date.now())>=leaseMs}
function publicView(room,key){
 const {solution,triviaDeck,spokenHistory,seedWord,roles,questions,votes,hostSeen,...safe}=room;
 const index=room.players.findIndex(p=>p.key===key);
 const players=room.players.map(({key:token,rack,...p},i)=>({...p,you:token===key,rack:i===index?rack:null}));
 return {...safe,players,used:room.used.slice(-12),roles:roles?.map((v,i)=>(index>=0&&index<2)||room.revealed.includes(i)?v:null),brush:room.mode==="Sketch"&&index===room.active?solution:null}
}
function insist(ok,msg){if(!ok)throw Error(msg)}
function player(key,name){return {key,name:String(name||"Guest").trim().slice(0,17)||"Guest",hp:2,score:0,letters:""}}
async function api(req,bucket,path){
 const key=req.headers.get("X-Player")||"";
 const data=req.method==="POST"?await req.json():{};
 if(req.method==="POST"&&(path==="/rooms"||path==="/ranked"||data.action==="join")){
  const account=await currentAccount(req,bucket);if(account)data.name=account.name
 }
 if(path==="/rooms"&&req.method==="GET"){
  const rooms=[];let cursor;
  do{const page=await bucket.list({prefix:"room/",include:["customMetadata"],limit:1000,cursor});
   for(const x of page.objects)if(x.customMetadata?.public==="true"&&Date.now()-Number(x.customMetadata.hostSeen||x.uploaded.getTime())<leaseMs)rooms.push({...x.customMetadata,id:x.key.slice(5)});
   cursor=page.truncated?page.cursor:undefined
  }while(cursor);
  return rooms
 }
 insist(/^[a-f0-9-]{36}$/.test(key),"Missing player session.");
 if(path==="/ranked"){
  insist(req.method==="POST","Use ranked matchmaking.");
  // All contenders first agree on one waiting room. The room CAS admits one opponent.
  for(let attempt=0;attempt<8;attempt++){
   const queue=await bucket.get("match/queue");
   let queueId=queue&&(await queue.json()).id;
   const current=queueId&&await bucket.get("room/"+queueId);
   if(current){
    const r=await current.json(),host=r.players[0];
    if(!closed(r)&&r.phase==="Waiting"&&host&&Date.now()-r.created<120000){
     if(host.key===key)return publicView(r,key);
     r.players.push(player(key,data.name));startRound(r);r.note="Ranked duel started";
     if(await write(r,{etagMatches:current.etag}))return publicView(r,key);
     continue
    }
   }
   const id=newCode(),r={id,ranked:true,created:Date.now(),mode:"Original",public:false,phase:"Waiting",players:[player(key,data.name)],chat:[],used:[],turn:0,active:0,note:"Looking for an opponent…"};
   if(!await write(r,{etagDoesNotMatch:"*"}))continue;
   if(await bucket.put("match/queue",JSON.stringify({id}),{onlyIf:queue?{etagMatches:queue.etag}:{etagDoesNotMatch:"*"}}))return publicView(r,key);
  }
  throw Error("Matchmaking busy. Try again.")
 }
 if(path==="/rooms"){
  insist(modeNames.includes(data.mode),"Choose a room mode.");
  for(let attempt=0;attempt<12;attempt++){const id=newCode();const room={id,hostSeen:Date.now(),hearts:[1,2,3].includes(+data.hearts)?+data.hearts:2,difficulty:["Very easy","Easy","Medium","Hard","Very hard"].includes(data.difficulty)?data.difficulty:"Very easy",tests:skillTests.filter(t=>Array.isArray(data.tests)&&data.tests.includes(t)),wordLength:[3,4,5,6].includes(+data.wordLength)?+data.wordLength:4,minutes:[1,3,5,10,15].includes(+data.minutes)?+data.minutes:1,raceSeconds:[15,30,60,120].includes(+data.seconds)?+data.seconds:30,mapType:["Capitals","Flag & Country"].includes(data.mapType)?data.mapType:"Only Country",rounds:Math.min(15,Math.max(3,Number(data.rounds)||5)),mode:data.mode,public:data.public===true,phase:"Waiting",players:[player(key,data.name)],chat:[],used:[],turn:0,active:0,note:"Waiting for players"};
  if(await write(room,{etagDoesNotMatch:"*"}))return publicView(room,key);const old=await bucket.get("room/"+id);if(old&&closed(await old.json())&&await write(room,{etagMatches:old.etag}))return publicView(room,key)}throw Error("Please retry room creation.")
 }
 async function write(r,onlyIf){
  return bucket.put("room/"+r.id,JSON.stringify(r),{onlyIf,customMetadata:{hostSeen:String(r.hostSeen||r.created||Date.now()),public:String(r.public),name:r.players[0]?.name||"Closed",mode:r.mode,phase:r.phase,count:String(r.players.length)}})
 }
 const raw=path.slice(7);const id=raw.length===4?raw.toUpperCase():raw.toLowerCase();insist(/^(?:[A-Z]{4}|[0-9a-f]{8})$/.test(id),"Invalid room code.");
 for(let retry=0;retry<6;retry++){
  const obj=await bucket.get("room/"+id);insist(obj,"Room not found.");let r=await obj.json();r.revision??=0;r.hostSeen??=obj.uploaded?.getTime()||r.created||Date.now();insist(!closed(r),"Room closed.");
  if(r.ranked&&r.phase==="Waiting"&&Date.now()-r.created>=120000){r.phase="Finished";r.note="No opponent found. Queue again.";if(!await write(r,{etagMatches:obj.etag}))continue}
  const expired=expire(r),p=r.players.find(x=>x.key===key);let changed=expired;if(p&&p===r.players[0]&&Date.now()-r.hostSeen>25000){r.hostSeen=Date.now();changed=true}
  if(expired&&req.method==="POST"){
   if(!await write(r,{etagMatches:obj.etag}))continue;
   if(data.action==="word")throw Error("Time is up.");
   continue
  }
  if(req.method==="POST"){
   changed=true;
   switch(data.action){
    case "join": if(!p){insist(!r.ranked,"Use the ranked queue to join a duel.");insist(r.phase!=="Started"&&r.players.length<(r.mode==="Chess"||r.mode==="Dead or Alive"?2:32),"This game is underway or full. You can spectate.");r.players.push(player(key,data.name))}break;
    case "start": insist(!r.ranked,"Queue again to begin another duel.");insist(p===r.players[0]&&r.phase!=="Started"&&r.players.length>=2,"Two players and the host are needed.");insist(r.mode!=="Paw Finders"||r.players.length>=4,"Paw Finders needs four players.");insist(r.mode!=="Chess"||r.players.length===2,"Chess needs two players.");startRound(r);break;
    case "word":insist(p&&data.turn===r.turn,"Round changed.");play(r,p,String(data.word).slice(0,128),serverDictionary);break;
    case "draw":{
     insist(r.mode==="Sketch"&&r.phase==="Started"&&p&&p===r.players[r.active]&&data.turn===r.turn,"Drawing turn changed.");
     const pts=data.points;insist(Array.isArray(pts)&&pts.length<=128&&pts.length>0&&pts.every(v=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=1000)),"Invalid stroke.");insist(r.drawing.length<250,"Canvas is full.");r.drawing.push(pts);break}
    case "heartbeat":insist(p&&p===r.players[0],"Host only.");r.hostSeen=Date.now();break;
    case "question":{insist(p&&p===r.players[0]&&r.mode==="Trivia"&&r.phase!=="Started","Host only.");const q=String(data.question||"").trim().slice(0,160),a=String(data.answer||"").trim().toLowerCase().slice(0,64);insist(q&&a,"Enter a question and answer.");r.questions??=[];insist(r.questions.length<30,"Question bank full.");r.questions.push([q,a]);break}
    case "chat":insist(p,"Join to chat.");roomChat(r,p,data.message,serverDictionary);break;
    case "leave":{
     if(!p)break;
     if(r.players[0]===p){r.phase="Closed";r.public=false;r.note="Host left.";break}
     if(r.phase==="Started"){p.hp=0;if(r.mode==="Chess"||r.mode==="Paw Finders"||r.players.filter(x=>x.hp).length<2){winner(r,"Round ended · player left")}else if(r.players[r.active]===p){if(shared.has(r.mode))nextWave(r);else nextPlayer(r)}}
     const active=r.players[r.active];r.players=r.players.filter(x=>x!==p);r.active=Math.max(0,r.players.indexOf(active));break}
    default:throw new Error("Unknown room action.")
   }
  }
  if(!changed){if(req.headers.get("X-Room-Revision")===String(r.revision))return null;return publicView(r,key)}
  r.revision++;if(await write(r,{etagMatches:obj.etag}))return publicView(r,key)
 }
 throw new Error("Room busy. Try again.")
}
let words;
function serverDictionary(){return words??=new Set(wordText.split(" "))}
async function serveGame(req,env){
 const path=new URL(req.url).pathname;if(path==="/api/account"||path.startsWith("/api/account/")){try{return await accountRoute(req,env,path)}catch{return Response.json({error:"Account request failed. Reopen your profile and try again."},{status:400,headers:{"Cache-Control":"no-store"}})}}if(path.startsWith("/api/")){try{const result=await api(req,env.BUCKET,path.slice(4));return result===null?new Response(null,{status:204,headers:{"Cache-Control":"no-store"}}):Response.json(result,{headers:{"Cache-Control":"no-store"}})}catch(e){return Response.json({error:e.message},{status:400})}}
 if(path==="/lexicon.js")return new Response("const lexicon=new Set("+JSON.stringify(wordText)+".split(' '));",{headers:{"content-type":"text/javascript","Cache-Control":"public,max-age=86400"}});
 const file=assets[path==="/"?"index.html":path.slice(1)];if(file&&req.headers.get("If-None-Match")===version)return new Response(null,{status:304,headers:{ETag:version}});return file?new Response(path.endsWith(".webp")?Uint8Array.from(atob(file[1]),c=>c.charCodeAt(0)):file[1],{headers:{"content-type":file[0].split(path.endsWith(".webp")?";":"!")[0],"Cache-Control":path.endsWith(".html")||path==="/"? "no-cache":new URL(req.url).searchParams.has("v")?"public,max-age=31536000,immutable":"public,max-age=300","ETag":version}}):new Response("Not found",{status:404})
}

const lobbyOrigins=new Set(["https://letterbomb.site","https://www.letterbomb.site"]);
export default {async fetch(req,env){
 const url=new URL(req.url),origin=req.headers.get("Origin");
 if(!url.pathname.startsWith("/api/")||!origin||origin===url.origin)return serveGame(req,env);
 if(!lobbyOrigins.has(origin))return new Response("Origin unavailable",{status:403});
 const response=req.method==="OPTIONS"?new Response(null,{status:204}):await serveGame(req,env);
 const result=new Response(response.body,response);
 result.headers.set("Access-Control-Allow-Origin",origin);
 result.headers.set("Access-Control-Allow-Credentials","true");
 result.headers.append("Vary","Origin");
 if(req.method==="OPTIONS"){
  result.headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  result.headers.set("Access-Control-Allow-Headers","Content-Type, X-Player, X-Room-Revision");
  result.headers.set("Access-Control-Max-Age","600");
 }
 return result
}};
