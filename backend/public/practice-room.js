let practiceTimer,chessPromise;
function loadChess(){if(typeof Chess!=="undefined")return Promise.resolve();return chessPromise??=new Promise((yes,no)=>{const s=document.createElement("script");s.src="/chess.js";s.onload=yes;s.onerror=()=>{chessPromise=null;no(Error("Chess engine could not load."))};document.head.append(s)})}
const needsWords=m=>["Original","Chain Word","Letter Link","Lava Rising","Dead or Alive","Dungeon","Wokey"].includes(m);
const botWords=[...new Set(raceWords.concat("artist story train brain tree giant enter ears other this cloud lemon sport treat stair table bread water game plant flame chocolate toast mountain hidden smile thunder stone dream sea near old line drink shine cabin beetle random window spark marble silver anchor simple stripe stripe cherry gold trade transfer stare twin silent tree trap came jest paper orange".split(" ")))];
async function practice(mode){
 if(room)return;
 const names=mode==="Paw Finders"?[nick,"Cat captain","Dog scout","Cat scout"]:[nick,"Practice Bot"];
 const r={id:"practice",local:true,mode,rounds:5,phase:"Waiting",turn:0,active:0,used:[],chat:[],note:"",players:names.map((name,i)=>({name,you:i===0,hp:2,letters:"",score:0}))};
 enter(r);
 try{if(mode==="Chess")await loadChess();if(room!==r)return;startRound(r);if(needsWords(mode))loadDictionary().catch(e=>toast(e.message));render();scheduleBots(r)}catch(e){toast(e.message)}
}
function botAnswer(r,p){
 if(r.mode==="Color Guesser")return "#"+Math.floor(Math.random()*16777216).toString(16).padStart(6,"0");
 if(r.track&&["Typing Race","Word Race"].includes(r.mode))return r.track[p.progress]
 if(r.mode==="Paw Finders"){if(r.cluePhase)return r.players[r.active]===p?"forest 2":null;return r.players[r.active]!==p?choose(r.cards.filter((x,i)=>!r.revealed.includes(i))):null}
 if(r.mode==="Wokey")return p.drawn?"discard "+choose(p.rack):"draw";
 if(r.mode==="Dungeon"&&r.doors)return "stairs";
 if(r.mode==="Skill Check")return ({timing:"stop",reaction:"tap",angle:String(r.angle||90),circle:"735",beat:String((r.beat||600)+55),color:"#9887aa"})[r.check]||r.solution;
 if(r.mode==="Sketch")return r.drawing.length>3?r.solution:null;
 if(r.solution!=null)return r.solution;
 if(r.seedWord&&!r.used.includes(r.seedWord))return r.seedWord;
 return choose(botWords.filter(w=>!r.used.includes(w)&&(r.mode==="Dungeon"?r.runes.some((rune,i)=>r.monsters[i]&&w.includes(rune)):w.includes(r.prompt))))||null
}
const doodles={house:[[[100,500],[500,100],[890,500]],[[230,405],[230,875],[760,875],[760,405]],[[440,875],[440,650],[555,650],[555,875]]],fish:[[[120,500],[330,280],[560,310],[745,490],[555,690],[330,705],[120,500]],[[745,490],[920,310],[920,695],[745,490]],[[315,425],[335,428]]],tree:[[[490,80],[735,480],[620,480],[775,680],[545,680],[545,900],[455,900],[455,680],[225,680],[380,480],[265,480],[490,80]]]};
function scheduleBots(r){
 clearTimeout(practiceTimer);if(room!==r||r.phase!=="Started")return;
 const turn=r.turn;
 if(r.mode==="Sketch"&&r.active!==0&&!r.drawing.length){r.solution=choose(Object.keys(doodles));r.drawing=doodles[r.solution];render()}
 const step=async()=>{if(room!==r||r.phase!=="Started")return;
  if(!expire(r)){
   for(const p of r.players.slice(1)){if(!p.hp||p.answered||!shared.has(r.mode)&&r.mode!=="Paw Finders"&&r.players[r.active]!==p||r.mode==="Paw Finders"&&p.team!==r.team)continue;
    if(r.mode==="Sketch"&&p===r.players[r.active])continue;
    if(needsWords(r.mode)&&typeof lexicon==="undefined")continue;
    try{let w;if(r.mode==="Chess"){const move=choose(new Chess(r.board).moves({verbose:true}));w=move.from+move.to+(move.promotion||"")}else w=botAnswer(r,p);
     if(w&&Math.random()>.22)play(r,p,w,()=>lexicon);
    }catch{}if(r.turn!==turn||r.phase!=="Started")break
   }
  }render();scheduleBots(r)
 };practiceTimer=setTimeout(step,Math.max(50,Math.min(1800+Math.random()*600,r.deadline-Date.now())))
}
async function localAct(action,data){
 const r=room;if(action==="start"){startRound(r);render();scheduleBots(r);return true}
 if(action==="chat"){roomChat(r,r.players[0],data.message,()=>lexicon);render();scheduleBots(r);return true}
 if(action==="draw"){r.drawing.push(data.points);render();return true}
 if(action==="word"){if(needsWords(r.mode))await loadDictionary();if(room!==r)return false;if(expire(r)){render();scheduleBots(r);throw Error("Time is up.")}
  play(r,r.players[0],data.word,()=>lexicon);render();scheduleBots(r);return true}
 return false
}
