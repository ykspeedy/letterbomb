let geography=null,geoLoading=null,selectedSquare=null;
function drawMap(canvas,r){
 if(!geography){geoLoading??=fetch("/world.json").then(x=>x.json()).then(data=>{geography=data;if(room?.mode==="Map")render()}).catch(()=>{geoLoading=null;toast("Map could not load.")});return}
 const target=maps[r.mapIndex],rings=geography[target];if(!rings)return;
 const ring=rings.slice().sort((a,b)=>b.length-a.length)[0],center=ring.reduce((a,b)=>[a[0]+b[0]/ring.length,a[1]+b[1]/ring.length],[0,0]);
 const ctx=canvas.getContext("2d"),rad=Math.PI/180,lat=center[1]*rad;ctx.clearRect(0,0,600,360);ctx.save();ctx.beginPath();ctx.arc(300,180,167,0,Math.PI*2);ctx.clip();ctx.fillStyle="#146996";ctx.fillRect(0,0,600,360);
 for(const [name,polys] of Object.entries(geography)){ctx.fillStyle=name===target?"#ffd34e":"#59b29a";ctx.strokeStyle="#1f777c";ctx.lineWidth=.65;for(const poly of polys){ctx.beginPath();let count=0;for(const [lon,la] of poly){const dl=(lon-center[0])*rad,phi=la*rad,cos=Math.cos(phi);if(Math.sin(lat)*Math.sin(phi)+Math.cos(lat)*cos*Math.cos(dl)<=0)continue;const x=300+167*cos*Math.sin(dl),y=180-167*(Math.cos(lat)*Math.sin(phi)-Math.sin(lat)*cos*Math.cos(dl));if(count++)ctx.lineTo(x,y);else ctx.moveTo(x,y)}if(count>2){ctx.closePath();ctx.fill();ctx.stroke()}}}
 ctx.restore()
}
function specialUI(r,me){
 const box=el("special"),canvas=el("visual"),started=r.phase==="Started";
 box.replaceChildren();canvas.hidden=!started||!["Map","Sketch"].includes(r.mode);const boardMode=["Map","Sketch","Chess","Paw Finders","Letter Link"].includes(r.mode);
 document.querySelector(".orbit").hidden=started&&boardMode;el("room").dataset.mode=r.mode;
 if(!started){if(r.mode==="Trivia"&&me?.you&&me===r.players[0]&&!r.local){const b=document.createElement("button");b.textContent="Add question";b.onclick=()=>{modal("Add a trivia question",'<label>Question<input id="cq"></label><label>Answer<input id="ca"></label><button id="add">Save</button>');el("add").onclick=async()=>{if(await act("question",{question:el("cq").value,answer:el("ca").value}))dialog.close()}};box.append(b)}return}
 function button(text,fn,cls=""){const b=document.createElement("button");b.textContent=text;b.className="piece "+cls;b.onclick=fn;box.append(b);return b}
 const send=word=>act("word",{word,turn:r.turn});
 if(r.mode==="Color Guesser"){
  if(Date.now()-r.opened<1800){const swatch=document.createElement("b");swatch.className="swatch";swatch.style.background=r.target;box.append(swatch);setTimeout(()=>{if(room?.id===r.id&&room.turn===r.turn)specialUI(room,room.players.find(x=>x.you))},Math.max(1,r.opened+1820-Date.now()))}
  else if(me&&!me.answered){el("clue").textContent="Recreate the color";const field=document.createElement("input");field.type="color";field.setAttribute("aria-label","Your color guess");field.value="#888888";box.append(field);button("Lock guess",()=>send(field.value))}
 }
 if(r.mode==="Spelling Bee")button("↻ Hear word",()=>pronounce(r));
 if(r.mode==="Map")drawMap(canvas,r);
 if(["Word Race","Typing Race"].includes(r.mode)&&r.track){const runner=me||r.players[0];el("clue").textContent=(r.track[runner.progress]||"Finish").toUpperCase();if(r.mode==="Typing Race"){
   const stream=document.createElement("div");stream.className="raceStream";
   r.track.slice(runner.progress,runner.progress+8).forEach((w,i)=>{const token=document.createElement(i?"span":"b");token.textContent=w;stream.append(token)});box.append(stream);el("word").placeholder="Type the word, then space"
  }
  r.players.forEach(p=>{const label=document.createElement("label");label.className="raceLane";label.textContent=p.name+" · "+(r.mode==="Typing Race"?Math.round((p.typed||0)*12000/Math.max(1000,Date.now()-r.opened))+" WPM":p.progress+"/"+r.track.length);const bar=document.createElement("progress");bar.max=r.track.length;bar.value=p.progress;label.append(bar);box.append(label)})}
 if(r.mode==="Dead or Alive"&&Date.now()<r.ready){el("clue").textContent="Hold fire…";setTimeout(()=>{if(room?.id===r.id&&room.turn===r.turn)el("clue").textContent=r.prompt.toUpperCase()},r.ready-Date.now()+5)}

 if(r.mode==="Sketch"){
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff8e2";ctx.fillRect(0,0,600,360);ctx.strokeStyle="#292a48";ctx.lineWidth=5;ctx.lineJoin=ctx.lineCap="round";
  const stroke=pts=>{if(!pts.length)return;ctx.beginPath();ctx.moveTo(pts[0][0]*.6,pts[0][1]*.36);for(const [x,y] of pts)ctx.lineTo(x*.6,y*.36);ctx.stroke()};(r.drawing||[]).forEach(stroke);
  const artist=me&&r.players[r.active]===me;
  if(artist)el("clue").textContent="Draw · "+(r.brush||r.solution);
  const point=e=>{const rect=canvas.getBoundingClientRect();return [[e.clientX-rect.left,rect.width],[e.clientY-rect.top,rect.height]].map(([v,n])=>Math.round(Math.max(0,Math.min(1000,v/n*1000))))};
  canvas.onpointerdown=e=>{if(artist){canvas.setPointerCapture(e.pointerId);canvas.strokePoints=[point(e)]}};canvas.onpointermove=e=>{if(canvas.strokePoints?.length<128){canvas.strokePoints.push(point(e));stroke(canvas.strokePoints.slice(-2))}};canvas.onpointerup=()=>{const points=canvas.strokePoints;canvas.strokePoints=null;if(artist&&points?.length)act("draw",{turn:r.turn,points})};canvas.onpointercancel=()=>canvas.strokePoints=null
 }
 const mine=me&&me.hp&&(shared.has(r.mode)?!me.answered:r.players[r.active]===me);
 if(r.mode==="Chess"){let y=0;const chars={p:"♟",r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",P:"♙",R:"♖",N:"♘",B:"♗",Q:"♕",K:"♔"};
  for(const row of r.board.split(" ")[0].split("/")){let x=0;for(const ch of row){for(let n=0;n<(Number(ch)||1);n++){const sq="abcdefgh"[x]+(8-y),b=button(chars[ch]||" ",()=>{if(!mine)return;if(!selectedSquare){selectedSquare=sq;b.classList.add("selected")}else{const a=selectedSquare;selectedSquare=null;const promote=(r.board&&document.querySelector('[data-square="'+a+'"]')?.textContent||"").match(/[♙♟]/)&&/[18]$/.test(sq)?"q":"";send(a+sq+promote)}},(x+y)%2?"dark":"light");b.dataset.square=sq;b.setAttribute("aria-label",sq+" "+(chars[ch]||"empty"));x++}}y++}
 }
 if(r.mode==="Paw Finders"){r.cards.forEach((w,i)=>{const seen=r.revealed.includes(i),role=r.roles?.[i],leader=r.players.indexOf(me)<2&&!!me;const b=button(w,()=>send(w),seen||leader?["dog","cat","neutral","bomb"][role]||"":"");b.disabled=!!seen||r.cluePhase||!me||me.team!==r.team||r.players[r.active]===me});if(!r.cluePhase&&me?.team===r.team&&r.players[r.active]!==me)button("Pass",()=>send("pass"))}
 if(r.mode==="Wokey"&&me){if(mine&&!me.drawn){button("Draw",()=>send("draw"));if(r.discard)button("Take "+r.discard,()=>send("take"))}for(const c of me.rack||[]){const b=button(c.toUpperCase(),()=>send("discard "+c));b.disabled=!mine||!me.drawn}el("word").placeholder="finish · use "+(r.wordLength||4)+"-letter words"}
 if(r.mode==="Dungeon"){box.append(document.createTextNode(r.runes.map((s,i)=>s.toUpperCase()+" · "+r.monsters[i]+" HP").join("　")));if(r.doors)for(const v of ["chest","stairs"])button(v,()=>send(v))}
 if(r.check==="angle"){box.append(document.createTextNode("∠"));box.style.setProperty("--angle",r.angle+"deg");const dial=document.createElement("i");dial.className="angleDial";box.append(dial)}
 if(r.check==="timing"&&!r.goal){const meter=document.createElement("i");meter.className="timingMeter";meter.style.setProperty("--elapsed",-(Date.now()-r.opened)%1500+"ms");box.append(meter)}
 if(r.mode==="Skill Check"&&mine)renderSkill(r,box,send);
 if(r.choices&&mine&&!(r.mode==="Skill Check"&&["aim","reaction"].includes(r.check))){for(const v of r.choices)button(v,()=>send(v.toLowerCase()),v.toLowerCase())}
 if(r.memory&&Date.now()<r.opened+1500){el("clue").textContent=r.memory.toUpperCase();setTimeout(()=>{if(room?.turn===r.turn&&room.id===r.id){el("clue").textContent=r.prompt.toUpperCase()}},Math.max(1,r.opened+1500-Date.now()))}
 if(r.mode==="Letter Link"){let path=[];el("tiles").querySelectorAll("b").forEach((b,i)=>{b.onclick=()=>{if(!el("word").value)path=[];if(path.includes(i))return;const last=path.at(-1);if(last!=null&&(Math.abs(i%4-last%4)>1||Math.abs((i>>2)-(last>>2))>1))return;if(!el("word").value)path=[];path.push(i);el("word").value=path.map(j=>r.grid[j]).join("");b.classList.add("selected")}})}
}

let skillInput={};
function renderSkill(r,box,send){
 if(skillInput.opened!==r.opened)skillInput={opened:r.opened,path:[],taps:[],hits:0};
 const state=skillInput;
 function control(text,callback){const button=document.createElement("button");button.type="button";button.textContent=text;button.onclick=callback;box.append(button);return button}
 if(r.check==="aim"){
  const field=document.createElement("div");field.className="targetField";box.append(field);
  const target=control("◎",()=>{if(++state.hits===3){send("target");state.hits=0}else position()});
  field.append(target);target.ariaLabel="Hit target";function position(){target.style.left=(8+Math.random()*78)+"%";target.style.top=(10+Math.random()*64)+"%"}position()
 }
 if(r.check==="reaction"){
  const b=control("Wait…",()=>send("tap"));const go=()=>{b.textContent="Tap now";b.style.background="#218e62"};if(Date.now()>=r.ready)go();else setTimeout(go,r.ready-Date.now())
 }
 if(r.check==="memory"){
  const grid=document.createElement("div");grid.className="memoryGrid";box.append(grid);
  const deadline=r.opened+2200;
  for(let i=1;i<=9;i++){const position=r.sequence.indexOf(i);const b=control(position<0?"·":String(position+1),()=>{
    if(Date.now()<deadline)return;
    if(i!==r.sequence[state.path.length]){state.path=[];effect("miss");render();return}
    state.path.push(i);b.disabled=true;b.textContent=String(position+1);if(state.path.length===r.sequence.length)send(state.path.join(""))
   });grid.append(b);if(state.path.includes(i))b.disabled=true;else if(Date.now()>=deadline)b.textContent="·";else setTimeout(()=>b.textContent="·",deadline-Date.now())}
 }
 if(r.check==="beat"){
  control("Play beat",()=>{tone(520,.1);tone(520,.1,r.beat/1000)});const tap=control("Tap twice",()=>{const now=performance.now();if(!state.beatStart){state.beatStart=now;tap.textContent="Tap again"}else{const gap=Math.round(now-state.beatStart);state.beatStart=null;send(String(gap))}})
 }
 if(r.check==="circle"){
  const pad=document.createElement("canvas");pad.width=320;pad.height=180;pad.className="circlePad";box.append(pad);
  const ctx=pad.getContext("2d");ctx.strokeStyle="#ffe198";ctx.lineWidth=3;
  let line;const point=e=>{const rect=pad.getBoundingClientRect();return [(e.clientX-rect.left)*320/rect.width,(e.clientY-rect.top)*180/rect.height]};
  pad.onpointerdown=e=>{pad.setPointerCapture(e.pointerId);line=[point(e)];ctx.clearRect(0,0,320,180);ctx.beginPath();ctx.moveTo(...line[0])};
  pad.onpointermove=e=>{if(line){line.push(point(e));ctx.lineTo(...line.at(-1));ctx.stroke()}};
  pad.onpointerup=()=>{if(!line)return;const pts=line;line=null;if(pts.length<12)return;const xs=pts.map(v=>v[0]),ys=pts.map(v=>v[1]);const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
   const radii=pts.map(([x,y])=>Math.hypot(x-cx,y-cy)),radius=radii.reduce((a,b)=>a+b,0)/pts.length;if(radius<12)return;
   const bins=new Set(pts.map(([x,y])=>Math.floor((Math.atan2(y-cy,x-cx)+Math.PI)*12/Math.PI)%24));
   const error=radii.reduce((sum,n)=>sum+Math.abs(n-radius),0)/pts.length/radius;send(String(Math.max(1,Math.round(1000*(bins.size/24)*(1-Math.min(1,error*3))))))};
  pad.onpointercancel=()=>line=null
 }
 if(r.check==="color"){
  const node=document.createElement("input");node.type="color";node.value=state.color||"#888888";node.ariaLabel="Match color";node.oninput=()=>state.color=node.value;box.append(node);
  const submit=control("Lock color",()=>send(node.value));const left=r.opened+1800-Date.now();
  if(left>0){node.hidden=true;submit.disabled=true;const sample=document.createElement("b");sample.className="swatch";sample.style.background=r.target;box.append(sample);setTimeout(()=>{sample.remove();node.hidden=false;submit.disabled=false},left)}
 }
}
