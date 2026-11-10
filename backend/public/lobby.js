const el=id=>document.getElementById(id);
const modes=modeNames;
const icons=["💣","🔗","🔠","⏱️","❓","🏁","🐝","🧨","🎨","🌍","♞","👻","🐾","🀄","🤠","🌋","🏎️","🎨"];
const colors=["#398a78","#7c925a","#286788","#8968a2","#b45c85","#575e87","#b08432","#b85846","#b44582","#2090a1","#835ec3","#7050bd","#429387","#648542","#bc8d48","#d55232","#537cc4","#be528f"];
const details=["Play an unused word containing the prompt.","Find a word containing a random part of the last word.","Connect neighboring tiles to build a word.","Aim, memorize, time your click and judge angles.","Answer the question before the fuse burns out.","Race the clock. Space advances to the next word.","Listen to the word and spell it. Stinger rounds score double.","Follow the instructions before the fuse burns out.","Draw the secret word while others guess.","Name the highlighted country on the globe.","Play a timed chess match.","Fight rune monsters and vote on dungeon doors.","Give clues and find your team’s cards.","Draw and discard tiles to spell out your rack.","Win a quick-draw word duel.","Solve each floor before the lava rises.","Type the word stream to race to the finish.","Memorize a color and recreate it. First to six wins."];
let dictionaryPromise;
function loadDictionary(){
 if(!dictionaryPromise)dictionaryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src="/lexicon.js";
  script.onload=()=>resolve(lexicon);script.onerror=()=>{dictionaryPromise=null;reject(Error("Dictionary could not load. Try again."))};document.head.append(script)
 });return dictionaryPromise
}
const get=(k,v)=>JSON.parse(localStorage.getItem("letter-"+k)||JSON.stringify(v));
const put=(k,v)=>localStorage.setItem("letter-"+k,JSON.stringify(v));
let nick=get("name","Guest"),session=sessionStorage.lbSession||=crypto.randomUUID(),room=null,noticeTimer,loading=false,epoch=0;
const dialog=document.querySelector("dialog");
function toast(msg){el("toast").textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el("toast").textContent="",3200)}
function modal(title,markup){dialog.classList.toggle("creator",title==="Create room");el("caption").textContent=title;el("panel").innerHTML=markup;if(!dialog.open)dialog.showModal()}
document.querySelector(".x").onclick=()=>dialog.close();
el("profile").textContent=nick;
function wallet(){el("coins").textContent=get("coins",0)}
wallet();
async function api(path,data,revision){const res=await fetch("/api"+path,{method:data?"POST":"GET",headers:{"Content-Type":"application/json","X-Player":session,...(revision!=null?{"X-Room-Revision":String(revision)}:{})},body:data?JSON.stringify(data):undefined});if(res.status===204)return null;let obj=await res.json();if(obj.error)throw Error(obj.error);return obj}
function row(name,detail,icon,color,action,label){let div=document.createElement("div");div.className="row";div.innerHTML='<span class="pic"></span><div><b></b><small></small></div><button class="go"></button>';div.querySelector(".pic").style.setProperty("--paint",color);const art=icons.indexOf(icon);div.style.setProperty("--paint",color);if(art>=0&&art<8){div.querySelector(".pic").style.backgroundImage="url(/card"+art+".webp)"}else div.querySelector(".pic").textContent=icon;div.querySelector("b").textContent=name;div.querySelector("small").textContent=detail;let btn=div.querySelector("button");btn.textContent=label;btn.onclick=action;return div}
modes.forEach((m,i)=>el("practiceRooms").append(row(m,details[i],icons[i],colors[i],()=>practice(m),"PLAY")));
let lastList="";
async function refresh(){
 try{
  const rooms=await api("/rooms"),snapshot=JSON.stringify(rooms);if(snapshot===lastList)return;
  lastList=snapshot;const list=rooms.map(r=>{
   const i=modes.indexOf(r.mode),item=row(r.name,r.mode+"　·　"+r.count+"/32　·　"+r.phase+"　·　🇺🇸",icons[i],colors[i],()=>enterByCode(r.id,r.phase!=="Started"),r.phase==="Started"?"WATCH":"JOIN");
   const watch=document.createElement("button");watch.className="room-watch";watch.textContent="◉";watch.setAttribute("aria-label","Spectate "+r.name);watch.onclick=()=>openRoom(r.id);item.insertBefore(watch,item.lastChild);return item
  });el("rooms").replaceChildren(...list);
 }catch{lastList="";el("rooms").textContent="Room list unavailable."}
}
async function enterByCode(id,join){try{const r=await api("/rooms/"+id,join?{action:"join",name:nick}:undefined);dialog.close();enter(r)}catch(e){toast(e.message)}}
el("profile").onclick=profile;
function create(){
 modal("Create room",'<div class="tabs"><button id="newTab">Create</button><button id="joinTab">Join</button></div><div id="createContent"></div><div class="createFoot"><button id="cancel">Cancel</button><button class="blue" id="make">Create</button></div>');
 let mode=modes[0],visible=true,joining=false;
 function draw(){
  el("newTab").setAttribute("aria-pressed",!joining);el("joinTab").setAttribute("aria-pressed",joining);el("make").textContent=joining?"Join":"Create";
  if(joining){el("createContent").innerHTML='<label>Room code<input id="code" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="Four-letter room key"></label>';el("code").focus();return}
  el("createContent").innerHTML='<div class="createBody"><div class="modeGrid"></div><div><b>🇺🇸　English</b><div class="settingsCard"><big>◎</big><h3 id="visibility"></h3><p id="access"></p><label id="roundLabel" hidden>Rounds<input type="number" id="roundCount" min="3" max="15" value="5"></label><fieldset id="skillSet" hidden><legend>Skill tests</legend></fieldset><label id="heartLabel">Starting hearts<select id="hearts"><option>1</option><option selected>2</option><option>3</option></select></label><label id="variantLabel" hidden><span></span><select id="variant"></select></label><div class="privacy"><button id="private">PRIVATE</button><button id="public">PUBLIC</button></div></div></div></div>';
  for(const test of skillTests){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.checked=true;input.value=test;label.append(input,skillLabels[test]);el("skillSet").append(label)}
  modes.forEach((m,i)=>{const btn=document.createElement("button");btn.className="modeCard";btn.style.setProperty("--paint",colors[i]);btn.setAttribute("aria-pressed",m===mode);btn.style.setProperty("--art",i<8?"url(/card"+i+".webp)":"linear-gradient(135deg,"+colors[i]+",#12132c)");btn.textContent=(i>7?icons[i]+" ":"")+m;btn.onclick=()=>{mode=m;el("skillSet").hidden=m!=="Skill Check";el("heartLabel").hidden=!["Original","Chain Word","Defuser"].includes(m);const variants={"Original":["Words per prompt","Very easy","Easy","Medium","Hard","Very hard"],"Wokey":["Word length",4,3,5,6],"Chess":["Clock (minutes)",1,3,5,10,15],"Typing Race":["Race length (seconds)",30,15,60,120],"Map":["Game type","Only Country","Flag & Country","Capitals"]}[m];el("variantLabel").hidden=!variants;if(variants){el("variantLabel").firstChild.textContent=variants[0];el("variant").replaceChildren(...variants.slice(1).map(v=>new Option(v,v)))}el("roundLabel").hidden=m!=="Skill Check";document.querySelectorAll(".modeCard").forEach(n=>n.setAttribute("aria-pressed",n===btn))};document.querySelector(".modeGrid").append(btn)});
  document.querySelectorAll(".modeCard")[modes.indexOf(mode)].click();
  function privacy(){el("visibility").textContent=visible?"Public Room":"Private Room";el("access").textContent=visible?"Anyone can find and join it from the room list.":"Players can join with the room code or invite link.";el("public").classList.toggle("selected",visible);el("private").classList.toggle("selected",!visible)}
  el("public").onclick=()=>{visible=true;privacy()};el("private").onclick=()=>{visible=false;privacy()};privacy()
 }
 el("newTab").onclick=()=>{joining=false;draw()};el("joinTab").onclick=()=>{joining=true;draw()};el("cancel").onclick=()=>dialog.close();
 el("make").onclick=async()=>{const btn=el("make");btn.disabled=true;try{if(joining){await enterByCode(el("code").value.trim().toUpperCase(),true);return}const r=await api("/rooms",{name:nick,mode,public:visible,rounds:el("roundCount")?.value,hearts:el("hearts").value,difficulty:el("variant")?.value,tests:[...el("skillSet").querySelectorAll(":checked")].map(n=>n.value),wordLength:el("variant")?.value,minutes:el("variant")?.value,seconds:el("variant")?.value,mapType:el("variant")?.value});dialog.close();enter(r)}catch(e){toast(e.message)}finally{btn.disabled=false}};draw()
}
el("create").onclick=create;
async function openRoom(id){try{enter(await api("/rooms/"+id))}catch(e){toast(e.message)}}
function enter(r){lastState="";epoch++;room=r;history.replaceState(null,"",r.local?"/?practice="+encodeURIComponent(r.mode):"?room="+r.id);el("room").hidden=false;el("lobby").hidden=true;render()}
function render(){
 const r=room,me=r.players.find(p=>p.you),p=r.players[r.active],started=r.phase==="Started";
 if(r.ranked&&r.phase==="Finished"&&r.turn>0&&me){const record=get("duels",{});if(!(r.id in record)){record[r.id]=me.hp>0;put("duels",record)}}
 el("roomTitle").textContent=r.mode+" · "+(r.local?"Practice":r.id);
 el("invite").hidden=!!r.local;if(!r.local)el("invite").textContent="Invite · "+r.id;
 if(r.ranked)el("roomTitle").textContent="Ranked · "+r.id;
 const count=r.players.length;
 el("members").replaceChildren(...r.players.map((x,i)=>{
  const angle=seatAngle(i,count),seat=document.createElement("div");seat.className="seat"+(i===r.active&&started?" live":"")+(x.hp?"":" out");
  seat.style.left=(50+39*Math.cos(angle))+"%";seat.style.top=(50+39*Math.sin(angle))+"%";seat.style.setProperty("--paint",colors[i%colors.length]);
  const name=document.createElement("span"),avatar=document.createElement("b"),health=document.createElement("small");name.textContent=x.name;avatar.className="avatar";avatar.textContent=icons[i%icons.length];health.textContent=x.hp?"♥".repeat(Math.min(6,x.hp)):"Out";seat.append(name,avatar,health);return seat
 }));
 el("pointer").hidden=!started||shared.has(r.mode);el("pointer").style.transform="rotate("+seatAngle(r.active,count)+"rad)";
 el("stats").textContent=r.players.map(x=>x.name+"　　"+x.score+(["Original","Chain Word"].includes(r.mode)?" words":" points")).join("\n");el("played").textContent=r.used.slice(-5).reverse().join(" · ");
 el("tiles").replaceChildren(...(r.grid||[]).map(c=>{const b=document.createElement("b");b.textContent=c.toUpperCase();if(c===r.required)b.className="required";return b}));
 el("state").textContent=started&&shared.has(r.mode)?"Round "+r.turn:started?(p.you?"Your turn":p.name+"'s turn"):r.phase;
 el("clue").textContent=started?r.prompt.toUpperCase():r.phase==="Finished"?r.note:"Waiting room";
 el("launch").hidden=!!r.ranked||!r.players[0]?.you||started;el("launch").disabled=r.players.length<(r.mode==="Paw Finders"?4:2);el("launch").textContent=r.phase==="Finished"?"Play again":"Start round";
 el("join").hidden=!!r.ranked||!!me||started;const wasHidden=el("wordForm").hidden;el("wordForm").hidden=!started||!me||!me.hp||(shared.has(r.mode)?me.answered:r.mode==="Paw Finders"?(me.team!==r.team||!r.cluePhase||me!==p):!p?.you)||r.mode==="Sketch"||r.mode==="Skill Check"&&!["logo","angle"].includes(r.check)||!!r.choices||r.mode==="Color Guesser"||r.mode==="Dungeon"&&r.doors;el("word").placeholder=r.mode==="Paw Finders"?"Clue and number, e.g. forest 2":r.mode==="Chess"?"Move, e.g. e2e4":"Type your answer…";if(wasHidden&&!el("wordForm").hidden)el("word").focus();el("chatForm").hidden=!me||(r.local&&r.mode!=="Sketch");el("message").placeholder=r.mode==="Sketch"&&started?"Type a guess in chat…":"Type here to chat…";el("messages").textContent=r.chat.join("\n");
 specialUI(r,me);gameFeedback(r);el("note").textContent=r.note;el("alphabet").textContent=started&&me&&["Original","Chain Word"].includes(r.mode)?"Heart letters left · "+[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(c=>!me.letters.includes(c.toLowerCase())).join(" "):"";clock()
}
function seatAngle(i,count){return Math.PI+(i*2*Math.PI/Math.max(count,1))}
function clock(){if(room){const value=room.phase==="Started"?Math.max(0,Math.ceil((room.deadline-Date.now())/1000))+"s":"";if(room.phase==="Started")countdown(room,parseInt(value));if(el("time").textContent!==value)el("time").textContent=value}}
async function act(action,extra={}){if(loading||!room)return;loading=true;epoch++;try{if(room.local)return await localAct(action,extra);const id=room.id,next=await api("/rooms/"+id,{action,...extra});if(room?.id!==id)return false;room=next;render();return true}catch(e){if(action==="word")effect("miss");toast(e.message)}finally{loading=false}}
el("launch").onclick=()=>act("start");el("join").onclick=()=>act("join",{name:nick});el("invite").onclick=()=>navigator.clipboard.writeText(location.href).then(()=>toast("Invite copied"),()=>toast(location.href));
function lobby(){
 epoch++;clearTimeout(practiceTimer);resetFeedback();room=null;lastState="";lastList="";history.replaceState(null,"","/");el("room").hidden=true;el("lobby").hidden=false;el("rooms").replaceChildren()
}
function sendLeave(id){return fetch("/api/rooms/"+id,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json","X-Player":session},body:'{"action":"leave"}'})}
el("leave").onclick=async()=>{const r=room;if(!r)return;lobby();if(!r.local&&r.players.some(p=>p.you)){try{await sendLeave(r.id)}catch{try{await sendLeave(r.id)}catch{toast("Disconnected. The room will expire automatically.")}}}refresh()};
window.addEventListener("pagehide",()=>{if(room&&!room.local&&room.players.some(p=>p.you))sendLeave(room.id).catch(()=>{})});
setInterval(()=>{if(document.hidden&&room&&!room.local&&room.players[0]?.you)api("/rooms/"+room.id,{action:"heartbeat"}).catch(()=>{})},30000);
el("wordForm").onsubmit=async e=>{e.preventDefault();let word=el("word").value.trim().toLowerCase(),turn=room.turn;if(await act("word",{word,turn})&&room){el("word").value="";if(!room.local&&room.used.at(-1)===word)earn(word)}};
function earn(w){put("words",[...new Set([...get("words",[]),w])]);put("coins",get("coins",0)+w.length);wallet()}
el("chatForm").onsubmit=async e=>{e.preventDefault();if(await act("chat",{message:el("message").value}))el("message").value=""};
let polling=false,nextLobbyPoll=0,lastState="";
async function poll(){
 if(polling||loading||document.hidden||room?.local)return;
 polling=true;try{if(room){let generation=epoch,next=await api("/rooms/"+room.id,undefined,room.revision);if(!next)return;const state=JSON.stringify(next);if(epoch===generation&&!loading&&state!==lastState){room=next;lastState=state;render()}}
 else if(Date.now()>=nextLobbyPoll){nextLobbyPoll=Date.now()+5000;await refresh()}}catch(e){if(room&&!room.local&&/Room (closed|not found)/.test(e.message)){lobby();toast("The host closed this room.");refresh()}}finally{polling=false}
}
setInterval(poll,700);document.addEventListener("visibilitychange",()=>{if(!document.hidden){nextLobbyPoll=0;poll()}});setInterval(clock,200);
const themes=["Classic","Emerald","Violet","Amber"],tints=["#0b0c10","#0b1914","#171121","#19150d"];
function apply(){document.body.style.backgroundColor=tints[themes.indexOf(get("skin","Classic"))]}apply();
async function tab(name){if(name==="Ranked"){ranked();return}if(name==="Rooms"){dialog.close();return}
 if(name==="Words"){modal("Your words","<p>Accepted words from your multiplayer rounds.</p><div id='list'></div>");el("list").textContent=get("words",[]).join(" · ")||"No words played yet.";return}
 if(name==="Syllables"){modal("Syllable finder",'<input id="query" placeholder="Enter 2–4 letters" maxlength="4"><p id="results"></p>');el("query").oninput=async()=>{let q=el("query").value.trim().toLowerCase();if(q.length<2){el("results").textContent="";return}const input=el("query");let dict;try{dict=await loadDictionary()}catch(e){toast(e.message);return}if(!input.isConnected||input.value.trim().toLowerCase()!==q)return;let matches=[...dict].filter(w=>w.includes(q));el("results").textContent=matches.length+" words · "+matches.slice(0,40).join(", ")};return}
 let owned=get("owned",["Classic"]);modal(name,name==="Shop"?"<p>Earn one coin per letter played in multiplayer. Lobby colors cost 30 coins each.</p>":"<p>Choose your lobby color.</p>");
 for(const t of (name==="Shop"?themes:owned)){let b=document.createElement("button");b.className="item";b.textContent=t+(name==="Shop"?(owned.includes(t)?" · Owned":" · 30 🪙"):(get("skin","Classic")===t?" ✓":""));b.onclick=()=>{if(!owned.includes(t)){if(get("coins",0)<30)return toast("You need 30 coins.");put("coins",get("coins",0)-30);put("owned",[...owned,t]);wallet()}put("skin",t);apply();tab(name)};el("panel").append(b)}
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>tab(b.dataset.tab));
el("menu").onclick=()=>{modal("Letter Bomb",'<p>Find a real word containing the prompt before time runs out. Each missed turn costs a heart. Complete the alphabet to earn another heart.</p><button id="edit">Edit profile</button> <a href="/practice.html">Local practice ↗</a>');el("edit").onclick=profile};
el("daily").onclick=async()=>{try{await loadDictionary()}catch(e){toast(e.message);return}const day=new Date().toISOString().slice(0,10),pool=[...lexicon].filter(w=>/^[a-z]{5}$/.test(w)),seed=Math.floor(Date.parse(day)/86400000),target=pool[(seed*173)%pool.length],k="daily-"+day,guesses=get(k,[]);modal("Daily word",'<p>Find today’s five-letter word in six guesses.</p><div id="guesses"></div><form id="dailyForm"><input id="guess" maxlength="5" autocomplete="off" aria-label="Five letter word"><button>Guess</button></form><p id="dailyResult"></p>');
 function paint(){el("guesses").replaceChildren();for(const w of guesses){let chars=[...target],marks=Array(5).fill("#363b46");[...w].forEach((c,i)=>{if(c===target[i]){marks[i]="#357249";chars[i]=""}});[...w].forEach((c,i)=>{let j=chars.indexOf(c);if(marks[i]==="#363b46"&&j>=0){marks[i]="#947522";chars[j]=""}});let line=document.createElement("div");[...w].forEach((c,i)=>{let tile=document.createElement("b");tile.style.cssText="display:inline-block;padding:7px 12px;margin:2px;background:"+marks[i];tile.textContent=c.toUpperCase();line.append(tile)});el("guesses").append(line)}if(guesses.includes(target)||guesses.length>=6){el("dailyForm").hidden=true;el("dailyResult").textContent=guesses.includes(target)?"Solved!":"The word was "+target.toUpperCase()}}
 paint();el("dailyForm").onsubmit=e=>{e.preventDefault();let w=el("guess").value.toLowerCase();if(w.length!==5||!lexicon.has(w))return toast("Enter a five-letter dictionary word.");guesses.push(w);put(k,guesses);el("guess").value="";paint()}}
nextLobbyPoll=Date.now()+5000;refresh();const code=new URLSearchParams(location.search).get("room");if(code)openRoom(code);

const requestedPractice=new URLSearchParams(location.search).get("practice");if(!code&&modes.includes(requestedPractice))practice(requestedPractice);

function ranked(){
 modal("Ranked duel",'<p>Face another player in Original. Two hearts each. The last player standing wins.</p><p>Your duels on this device: <b id="rankRecord"></b></p><button class="blue" id="queue">Find opponent</button>');
 const record=get("duels",{}),values=Object.values(record);el("rankRecord").textContent=values.filter(Boolean).length+" wins · "+values.filter(v=>!v).length+" losses";
 el("queue").onclick=async()=>{const btn=el("queue");btn.disabled=true;try{const r=await api("/ranked",{name:nick});dialog.close();enter(r)}catch(e){toast(e.message)}finally{btn.disabled=false}}
}
el("rank").onclick=ranked;

el("word").addEventListener("keydown",e=>{
 if(e.key===" "&&room?.mode==="Typing Race"){
  e.preventDefault();if(el("word").value.trim())el("wordForm").requestSubmit()
 }
});
