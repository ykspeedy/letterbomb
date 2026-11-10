const modeNames=["Original","Chain Word","Letter Link","Skill Check","Trivia","Typing Race","Spelling Bee","Defuser","Sketch","Map","Chess","Dungeon","Paw Finders","Wokey","Dead or Alive","Lava Rising","Word Race","Color Guesser"];
const shared=new Set(["Trivia","Skill Check","Typing Race","Word Race","Map","Letter Link","Spelling Bee","Sketch","Dead or Alive","Lava Rising","Dungeon","Color Guesser"]);
const maps=["France","Brazil","Japan","Australia","Italy","India","Canada","Egypt","China","Germany","Mexico","Argentina","Spain","Sweden","Norway","Finland","Turkey","Thailand","Madagascar","South Africa"];
const beeWords="lantern velvet comet copper compass biscuit emerald voyage glacier bicycle chimney whistle orchard penguin anchor meadow library gravity rhythm autumn curious antique cinnamon miniature mischievous silhouette privilege silhouette camouflage necessary orchestra fluorescent reservoir".split(" ");
const capitals=["Paris","Brasilia","Tokyo","Canberra","Rome","New Delhi","Ottawa","Cairo","Beijing","Berlin","Mexico City","Buenos Aires","Madrid","Stockholm","Oslo","Helsinki","Ankara","Bangkok","Antananarivo","Pretoria"];
const flags="🇫🇷 🇧🇷 🇯🇵 🇦🇺 🇮🇹 🇮🇳 🇨🇦 🇪🇬 🇨🇳 🇩🇪 🇲🇽 🇦🇷 🇪🇸 🇸🇪 🇳🇴 🇫🇮 🇹🇷 🇹🇭 🇲🇬 🇿🇦".split(" ");
const skillTests=["aim","memory","timing","angle","reaction","beat","circle","color","logo"];
const skillLabels={aim:"Hit the targets",memory:"Chimp memory",timing:"Stop the clock",angle:"Match the angle",reaction:"React fast",beat:"Repeat the beat",circle:"Draw a circle",color:"Match the color",logo:"Guess the logo"};
const palette=["Coral","Amber","Mint","Violet"];
const tileWord=()=>choose(raceWords);
const duration=r=>r.mode==="Chess"?r.clocks[r.active]:r.mode==="Sketch"?60000:r.mode==="Dungeon"?45000:r.mode==="Paw Finders"||r.mode==="Wokey"?90000:r.mode==="Letter Link"?45000:Math.max(6000,11000-Math.floor(r.turn/8)*1000);
function winner(r,label){r.phase="Finished";r.note=label}
function highScore(r){const best=Math.max(...r.players.map(p=>p.score));winner(r,r.players.filter(p=>p.score===best).map(p=>p.name).join(" & ")+" · "+best+" points")}
function shuffle(list){const copy=list.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function startRound(r){
 Object.assign(r,{phase:"Started",turn:0,active:0,used:[],note:"",floor:1,team:0,cluePhase:true,clocks:Array(2).fill((r.minutes||1)*60000),moves:[],discard:null,discards:{},alphaTurn:0});
 r.spokenHistory=[];r.triviaDeck=shuffle((r.questions||[]).concat(trivia));
 r.players.forEach((p,i)=>Object.assign(p,{score:0,hp:r.hearts||2,letters:"",team:i%2,answered:false,rack:null,drawn:false,progress:0,typed:0}));
 if(r.mode==="Paw Finders"){
  r.cards=shuffle([...new Set(raceWords)]).slice(0,16);r.roles=shuffle([0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3]);r.revealed=[];
 }
 if(r.mode==="Wokey")for(const p of r.players)p.rack=shuffle(Array.from({length:(r.wordLength||4)*2-1},()=>choose("aaaeeeiiooustrnldcmpgbfhywk")));
 if(r.mode==="Chess")r.board=new Chess().fen();
 challenge(r)
}
function challenge(r,last=""){
 r.turn++;r.opened=Date.now();r.deadline=r.opened+duration(r);r.solution=null;r.grid=null;r.seedWord=null;r.choices=null;r.required=null;r.drawing=[];r.memory=null;r.check=null;
 r.players.forEach(p=>p.answered=false);
 switch(r.mode){
 case "Chess":r.prompt=r.active===0?"White to move":"Black to move";return;
 case "Paw Finders":r.cluePhase=true;r.active=r.players.findIndex(p=>p.team===r.team);r.prompt=(r.team?"Cats":"Dogs")+" · Give a clue and number";return;
 case "Wokey":r.prompt="Draw, then discard or lay down your words";return;
 case "Dungeon":r.runes=shuffle(ordinaryPrompts).slice(0,3);r.monsters=[2,2,r.floor%3===0?5:2];r.doors=false;r.votes={};r.prompt="Floor "+r.floor+" · Match monster runes";return;
 case "Color Guesser":r.target="#"+Math.floor(Math.random()*16777216).toString(16).padStart(6,"0");r.prompt="Memorize the color";for(const p of r.players)p.distance=null;r.deadline=r.opened+16000;return;
 case "Original":if(typeof promptBands!=="undefined"&&r.difficulty){r.prompt=choose(promptBands[r.difficulty]||ordinaryPrompts);return}makeChallenge(r);return;
 case "Map":{
  r.mapIndex=Math.floor(Math.random()*maps.length);
  r.solution=r.mapType==="Capitals"?capitals[r.mapIndex]:maps[r.mapIndex];
  r.prompt=r.mapType==="Capitals"?"Name the capital":r.mapType==="Flag & Country"?flags[r.mapIndex]+" · Name the country":"Name the highlighted country";return}
 case "Spelling Bee":{
  const remaining=beeWords.filter(w=>!(r.spokenHistory||[]).includes(w));
  r.solution=choose(remaining.length?remaining:beeWords);r.spokenWord=r.solution;r.spokenHistory=[...(r.spokenHistory||[]),r.solution].slice(-20);
  r.stinger=r.turn%4===0;r.prompt=r.stinger?"Stinger · Spell for double points":"Listen and spell";r.deadline=r.opened+20000;return}
 case "Sketch":r.active=(r.turn-1)%r.players.length;r.solution=choose(["house","tree","fish","sun","clock","boat"]);r.players[r.active].answered=true;r.prompt="Guess the drawing";return;
 case "Skill Check":{
  const pool=r.tests?.length?r.tests:skillTests;
  r.check=pool[(r.turn-1)%pool.length];r.prompt=skillLabels[r.check];r.deadline=r.opened+18000;
  if(r.check==="aim"){r.choices=["Target"];r.solution="target"}
  if(r.check==="memory"){r.sequence=shuffle([1,2,3,4,5,6,7,8,9]).slice(0,5);r.solution=r.sequence.join("");r.prompt="Memorize the numbered squares"}
  if(r.check==="timing"){r.choices=["Stop"];r.goal=choose([2,3,4]);r.prompt="Stop at "+r.goal+" seconds"}
  if(r.check==="angle"){r.angle=15+Math.floor(Math.random()*150);r.prompt="Estimate the angle"}
  if(r.check==="reaction"){r.ready=r.opened+1800+Math.floor(Math.random()*2200);r.choices=["Tap"];r.prompt="Wait for green"}
  if(r.check==="beat"){r.beat=choose([430,550,650,800]);r.prompt="Repeat the interval between beats"}
  if(r.check==="color"){r.target="#"+Math.floor(Math.random()*16777216).toString(16).padStart(6,"0");r.prompt="Memorize this color"}
  if(r.check==="logo"){const pair=choose([["A bitten apple","apple"],["Four interlocking rings","audi"],["A red bullseye","target"],["Golden arches","mcdonalds"]]);r.prompt="Which brand uses "+pair[0].toLowerCase()+"?";r.solution=pair[1]}
  return}
 case "Trivia":{const bank=r.triviaDeck||(r.questions||[]).concat(trivia);[r.prompt,r.solution]=bank[(r.turn-1)%bank.length];return}
 case "Typing Race":case "Word Race":
  r.track=Array.from({length:r.mode==="Word Race"?26:220},tileWord);r.prompt=r.track[0];r.deadline=r.opened+(r.mode==="Word Race"?90000:(r.raceSeconds||30)*1000);return;
 case "Defuser":{const n=r.turn%5;if(n===0){const target=choose(r.players);r.prompt="Match this player · "+target.name;r.choices=r.players.map(p=>p.name);r.solution=target.name.toLowerCase();return}if(n===1){r.choices=["Press"];r.prompt="Press the switch";r.solution="press"}else if(n===2){r.choices=["Press"];r.prompt="Do not press";r.solution="hold"}else if(n===3){r.memory=String(Math.floor(Math.random()*9000+1000));r.solution=r.memory;r.prompt="Remember the number"}else{const a=Math.ceil(Math.random()*13),b=Math.ceil(Math.random()*8);r.prompt=a+" + "+b;r.solution=String(a+b)}return}
 case "Dead or Alive":r.ready=r.opened+1800;r.prompt=choose(ordinaryPrompts);return;
 case "Lava Rising":r.prompt=choose(ordinaryPrompts);return;
 default:makeChallenge(r,last)
 }
}
function nextPlayer(r,last){
 if(r.players.filter(p=>p.hp>0).length<=1){winner(r,(r.players.find(p=>p.hp>0)?.name||"Nobody")+" wins!");return}
 do{r.active=(r.active+1)%r.players.length}while(!r.players[r.active].hp);challenge(r,last)
}
function nextWave(r){
 if(r.mode==="Color Guesser"){
  const answered=r.players.filter(p=>p.distance!=null);
  if(answered.length){const min=Math.min(...answered.map(p=>p.distance));for(const p of answered)if(p.distance===min){p.score++;r.note=p.name+" guessed closest"}}
  if(r.players.some(p=>p.score>=6)){highScore(r);return}
 }
 if(r.mode==="Lava Rising"){for(const p of r.players)if(!p.answered)p.hp=Math.max(0,p.hp-1)}
 if(["Dead or Alive","Lava Rising"].includes(r.mode)&&r.players.filter(p=>p.hp).length<=1){winner(r,(r.players.find(p=>p.hp)?.name||"Nobody")+" wins!");return}
 const limit={Trivia:30,"Skill Check":r.rounds||5,Sketch:r.players.length*3,"Spelling Bee":12,Map:15,"Typing Race":8,"Word Race":8}[r.mode];
 if(limit&&r.turn>=limit){highScore(r);return}
 challenge(r)
}
function expire(r){
 if(r.phase!=="Started"||Date.now()<r.deadline)return false;
 if(r.mode==="Chess"){winner(r,r.players[1-r.active].name+" wins on time");return true}
 if(r.mode==="Dungeon"){if(!r.doors){for(const p of r.players)p.hp=Math.max(0,p.hp-1);if(r.players.every(p=>!p.hp)){winner(r,"Dungeon run ended on floor "+r.floor);return true}}else r.floor++;challenge(r);return true}
 if(r.mode==="Typing Race"||r.mode==="Word Race"){highScore(r);return true}
 if(shared.has(r.mode)){nextWave(r);return true}
 if(r.mode==="Paw Finders"){r.team=1-r.team;challenge(r);return true}
 if(r.mode==="Wokey"){const p=r.players[r.active];if(p.drawn){r.discard=p.rack.pop();p.drawn=false}nextPlayer(r);return true}
 if(!(r.mode==="Defuser"&&r.solution==="hold"))r.players[r.active].hp--;nextPlayer(r);return true
}
function roomChat(r,p,message,dict){
 const msg=String(message||"").trim().slice(0,220);if(!msg)return;
 if(r.mode==="Sketch"&&r.phase==="Started"&&msg.toLowerCase().includes(r.solution)){
  if(!p.answered&&msg.toLowerCase()===r.solution)play(r,p,msg,dict);
  return
 }
 r.chat.push(p.name+" · "+msg);r.chat=r.chat.slice(-40)
}
function requireGame(ok,msg){if(!ok)throw Error(msg)}
function chessPlay(r,w){
 const game=new Chess();for(const move of r.moves)game.move(move);
 let move;try{move=game.move(w)}catch{}requireGame(move,"Illegal chess move.");
 r.clocks[r.active]=Math.max(0,r.deadline-Date.now());r.moves.push(move.san);r.board=game.fen();r.used.push(move.san);
 if(game.isCheckmate()){winner(r,r.players[r.active].name+" wins by checkmate");return}
 if(game.isDraw()){winner(r,"Draw");return}r.active=1-r.active;challenge(r)
}
function pawPlay(r,p,w){
 requireGame(p.team===r.team,"Other team’s turn.");
 if(r.cluePhase){requireGame(r.players[r.active]===p,"The team leader gives the clue.");const match=/^([a-z]+)\s+([1-5])$/.exec(w);requireGame(match&&!r.cards.includes(match[1]),"Enter a clue word and number from 1 to 5.");r.prompt=match[1]+" · "+match[2];r.left=Number(match[2])+1;r.cluePhase=false;return}
 requireGame(r.players[r.active]!==p,"A teammate must guess.");
 let end=w==="pass";
 if(!end){const i=r.cards.indexOf(w);requireGame(i>=0&&!r.revealed.includes(i),"Pick an unrevealed card.");r.revealed.push(i);const role=r.roles[i];
 if(role===3){winner(r,(r.team?"Dogs":"Cats")+" win · bomb revealed");return}
 if(role<2&&r.roles.every((v,j)=>v!==role||r.revealed.includes(j))){winner(r,(role?"Cats":"Dogs")+" win!");return}end=role!==r.team||--r.left<=0}
 if(end){r.team=1-r.team;challenge(r)}
}
function wokeyPlay(r,p,w,dict){
 const parts=w.split(/\s+/),op=parts.shift();
 if(op==="draw"||op==="take"){requireGame(!p.drawn,"Discard a tile first.");const left=(r.active+r.players.length-1)%r.players.length;r.discard=r.discards[left];requireGame(op!=="take"||r.discard,"Discard pile is empty.");p.rack.push(op==="take"?r.discard:choose("aaeeeiiooustrnldcmpgbfhywk"));if(op==="take"){r.discards[left]=null;r.discard=null}p.drawn=true;return}
 requireGame(p.drawn,"Draw or take a tile first.");
 if(op==="finish"){requireGame(parts.length&&parts.every(x=>x.length===(r.wordLength||4)&&dict().has(x))&&[...parts.join("")].sort().join("")===[...p.rack].sort().join(""),"Use the entire rack in "+(r.wordLength||4)+"-letter words.");winner(r,p.name+" goes out!");return}
 const i=p.rack.indexOf(parts[0]);requireGame(op==="discard"&&i>=0,"Choose a tile to discard.");r.discard=p.rack.splice(i,1)[0];r.discards[r.active]=r.discard;p.drawn=false;nextPlayer(r)
}
function play(r,p,word,dict){
 requireGame(r.phase==="Started"&&p&&p.hp,"Wait for the next game.");
 const w=word.trim().toLowerCase();
 if(r.mode==="Typing Race"||r.mode==="Word Race"){
  requireGame(w===r.track[p.progress],"Correct the word before continuing.");p.progress++;p.typed=(p.typed||0)+w.length+1;p.score=p.progress;r.used.push(w);r.note=p.name+" · "+p.progress+"/"+r.track.length;
  if(p.progress===r.track.length)winner(r,p.name+" wins the race!");return
 }
 if(r.mode==="Color Guesser"){
  requireGame(!p.answered&&Date.now()-r.opened>=1800,"Wait until the sample disappears.");requireGame(/^#[0-9a-f]{6}$/.test(w),"Choose a color.");
  p.distance=[1,3,5].reduce((sum,i)=>sum+(parseInt(w.slice(i,i+2),16)-parseInt(r.target.slice(i,i+2),16))**2,0);p.answered=true;if(r.players.every(x=>x.answered))nextWave(r);return
 }
 if(r.mode==="Paw Finders"){pawPlay(r,p,w);return}
 if(!shared.has(r.mode))requireGame(r.players[r.active]===p,"Wait for your turn.");
 if(r.mode==="Chess"){chessPlay(r,w);return}
 if(r.mode==="Wokey"){wokeyPlay(r,p,w,dict);return}
 if(r.mode==="Dungeon"){
  if(r.doors){requireGame(["chest","stairs"].includes(w),"Vote for a door.");r.votes[r.players.indexOf(p)]=w;if(Object.keys(r.votes).length>=r.players.filter(x=>x.hp).length){if(Object.values(r.votes).filter(x=>x==="chest").length>=Object.keys(r.votes).length/2)r.players.forEach(x=>x.hp=Math.min(4,x.hp+1));r.floor++;challenge(r)}return}
  requireGame(dict().has(w)&&!r.used.includes(w),"Use an unused dictionary word.");let hits=0;r.runes.forEach((rune,i)=>{if(r.monsters[i]>0&&w.includes(rune)){hits++;r.monsters[i]--}});requireGame(hits,"Match a living monster’s rune.");r.used.push(w);p.score+=hits;if(r.monsters.every(n=>!n)){r.doors=true;r.prompt="Vote on the next door";r.deadline=Date.now()+12000}return
 }
 requireGame(!p.answered,"Already answered this round.");
 if(r.mode==="Dead or Alive")requireGame(Date.now()>=r.ready,"Wait for the signal.");
 if(r.memory)requireGame(Date.now()-r.opened>=1500,"Memorize first.");
 let err;
 if(r.mode==="Skill Check"){
  const elapsed=Date.now()-r.opened;let score=1000;
  if(r.check==="reaction"){requireGame(Date.now()>=r.ready&&w==="tap","Wait for green.");score-=Date.now()-r.ready}
  else if(r.check==="timing"){requireGame(w==="stop","Press Stop.");score-=Math.abs(elapsed-r.goal*1000)}
  else if(r.check==="angle"){requireGame(/^\d{1,3}$/.test(w)&&+w<=180,"Enter an angle from 0 to 180.");score-=Math.abs(+w-r.angle)*12}
  else if(r.check==="beat"||r.check==="circle"){requireGame(/^\d{1,5}$/.test(w),"Complete the challenge.");score=r.check==="beat"?1000-Math.abs(+w-r.beat)*2:Math.min(1000,+w)}
  else if(r.check==="color"){requireGame(/^#[0-9a-f]{6}$/.test(w)&&elapsed>=1800,"Wait for the sample to disappear.");score-=Math.sqrt([1,3,5].reduce((sum,i)=>sum+(parseInt(w.slice(i,i+2),16)-parseInt(r.target.slice(i,i+2),16))**2,0))*3}
  else{requireGame(w===r.solution,"Try again.");score-=elapsed/30}
  score=Math.max(1,Math.round(score));p.score+=score;p.answered=true;r.note=p.name+" · +"+score;
  if(r.players.every(x=>!x.hp||x.answered))nextWave(r);return
 }
 if(r.check==="timing"){const phase=((Date.now()-r.opened)%1500)/1500;err=w==="stop"&&phase>=.37&&phase<=.68?"":"Missed the green zone."}
 else if(r.mode==="Map")err=w===r.solution.toLowerCase()?"":"Try another country.";
 else err=answerError(r,w,dict);
 if(err&&r.mode==="Defuser"){p.hp--;r.note=p.name+" lost a heart.";nextPlayer(r);return}requireGame(!err,err);
 if(r.mode==="Sketch"||r.mode==="Spelling Bee"){
  const elapsed=Math.max(0,(Date.now()-r.opened)/1000);
  const points=r.mode==="Sketch"?Math.max(400,Math.round(1460-16*elapsed)):Math.max(1,Math.ceil(20-elapsed))*(r.stinger?2:1);
  p.score+=points;p.answered=true;r.note=p.name+" · +"+points+" points";r.chat.push(r.note+" · "+elapsed.toFixed(1)+"s");r.chat=r.chat.slice(-40);
  if(r.players.every(x=>!x.hp||x.answered))nextWave(r);return
 }
 r.used.push(w);r.note=p.name+" · "+w;p.score+=r.mode==="Letter Link"?w.length:["Trivia","Sketch","Skill Check","Map","Typing Race","Word Race"].includes(r.mode)?Math.max(1,Math.ceil((r.deadline-Date.now())/1000)):1;
 if(r.mode==="Letter Link"||r.mode==="Spelling Bee"){if(p.score>=35)highScore(r);return}
 if(r.mode==="Dead or Alive"){const foe=r.players.find(x=>x!==p&&x.hp);if(foe)foe.hp--;nextWave(r);return}
 if(shared.has(r.mode)){p.answered=true;if(r.players.every(x=>!x.hp||x.answered))nextWave(r);return}
 p.letters=[...new Set((p.letters+w).replace(/[^a-z]/g,""))].join("");if(p.letters.length===26){p.hp++;p.letters=""}nextPlayer(r,w)
}
