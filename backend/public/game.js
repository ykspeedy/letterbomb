const $=id=>document.getElementById(id);
const descriptions={
 Original:'Beat the fuse with a word containing the prompt.',
 'Chain Word':'Use the end of the last word to start the next challenge.',
 'Typing Race':'Type the word on the bomb before time runs out.',
 'Letter Link':'Trace a word through neighboring letters on the board.'
};
const prompts='an at er st in ar ou le th or ch un re de sp tr co pl sh bl'.split(' ');
const race='tiger rocket candle panic bright velvet cinnamon mountain apricot magnet paper violet banana planet secret musical jungle purple whisper lemon frozen balloon guitar coffee forest sunset'.split(' ');
const pick=a=>a[Math.floor(Math.random()*a.length)];
const saved=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
let muted=saved('lb-muted','false')==='true',audio,players,current,used,mode,clue,board,phase='home',duration,deadline,timer,history,chain;
const soundLabel=()=>$('sound').textContent=muted?'Sound off':'Sound on';
function tone(frequency,length=.12){
 if(muted)return;
 try{audio??=new AudioContext();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=frequency;gain.gain.setValueAtTime(.12,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+length)}catch{}
}
function home(){clearInterval(timer);phase='home';$('home').hidden=false;$('arena').hidden=true;$('record').textContent=saved('lb-best','0')+' words'}
function roster(){$('roster').replaceChildren(...players.map((p,i)=>{let e=document.createElement('span');e.className='chip '+(i===current?'active':'');e.textContent=(players.length===1?'You':'Player '+(i+1))+' · '+('♥'.repeat(p.hearts)||'Out')+' · '+p.score;return e}))}
function start(){players=Array.from({length:+$('players').value},()=>({hearts:3,score:0}));current=0;used=new Set;history=[];chain='';mode=$('mode').value;duration=+$('fuse').value*1000;$('home').hidden=true;$('arena').hidden=false;$('modeTag').textContent=mode;$('log').textContent='';tone(460);turn()}
function gridFits(word){
 function walk(i,n,mask){if(i<0||i>15||(mask&(1<<i))||board[i]!==word[n])return false;if(n+1===word.length)return true;for(let j=0;j<16;j++)if(Math.abs((i%4)-(j%4))<=1&&Math.abs((i>>2)-(j>>2))<=1&&walk(j,n+1,mask|(1<<i)))return true;return false}
 return word.length<=16&&board.some((_,i)=>walk(i,0,0))
}
function turn(){clearInterval(timer);phase='running';roster();$('next').hidden=true;document.querySelector('form').hidden=false;$('feedback').textContent='';$('grid').replaceChildren();clue=pick(prompts);
 if(mode==='Chain Word'&&chain)clue=chain;
 if(mode==='Typing Race'){let choices=race.filter(w=>!used.has(w));if(!choices.length){used.clear();choices=race}clue=pick(choices)}
 if(mode==='Letter Link'){board=Array.from({length:16},()=>pick('aeiouetaoinshrdlcmbpf'));const seed=pick(race.filter(w=>w.length<=6&&!used.has(w)).concat(['cat','dog','bee'].filter(w=>!used.has(w))));if(seed){const path=[0,1,2,3,7,6];[...seed].forEach((c,i)=>board[path[i]]=c)}for(const c of board){const e=document.createElement('b');e.textContent=c.toUpperCase();$('grid').append(e)}}
 $('instruction').textContent=mode==='Typing Race'?'Type this word':mode==='Letter Link'?'Connect adjacent letters':'Your word must contain';
 $('prompt').textContent=mode==='Letter Link'?'':clue.toUpperCase();$('answer').value='';$('answer').focus();deadline=Date.now()+duration;let prev=99;
 const tick=()=>{const left=Math.max(0,deadline-Date.now()),s=Math.ceil(left/1000);$('clock').firstElementChild.style.transform='scaleX('+left/duration+')';$('seconds').textContent=s+'s';if(!left){finish(false,'');return}if(s<=3&&prev!==s)tone(300+s*75,.07);prev=s};tick();timer=setInterval(tick,80)
}
function finish(success,word){if(phase!=='running')return;clearInterval(timer);phase='between';let p=players[current];
 if(success){p.score++;used.add(word);chain=word.slice(-2);history.unshift(word);$('log').textContent=history.slice(0,10).join(' · ');if(p.score>Number(saved('lb-best','0')))save('lb-best',String(p.score));tone(740)}
 else{p.hearts--;chain='';tone(100,.35)}
 roster();$('feedback').textContent=success?'Accepted · '+word:'Time’s up! One heart lost.';document.querySelector('form').hidden=true;const alive=players.filter(p=>p.hearts>0);const done=players.length===1?!alive.length:alive.length===1;
 if(done){phase='done';$('prompt').textContent=players.length===1?'Game over':'Player '+(players.indexOf(alive[0])+1)+' wins!';$('grid').replaceChildren();$('instruction').textContent='Round complete';$('next').textContent='Play again';$('next').hidden=false;return}
 do{current=(current+1)%players.length}while(!players[current].hearts);
 if(players.length===1&&success){turn();$('feedback').textContent='✓ '+word;return}
 $('next').textContent=players.length===1?'Next turn':'Ready, Player '+(current+1)+'?';$('next').hidden=false;$('next').focus()
}
document.querySelector('form').onsubmit=e=>{e.preventDefault();if(phase!=='running')return;if(Date.now()>=deadline)return finish(false,'');const w=$('answer').value.trim().toLowerCase();let err='';
 if(mode==='Typing Race'&&w!==clue)err='Match the word exactly.';
 else if(!lexicon.has(w))err='Word not in the dictionary.';
 else if(used.has(w))err='That word has already been played.';
 else if(mode==='Letter Link'&&(w.length<3||!gridFits(w)))err='Use three or more adjacent tiles.';
 else if(mode!=='Letter Link'&&!w.includes(clue))err='Include '+clue.toUpperCase()+' in your word.';
 if(err){$('feedback').textContent=err;$('answer').select();tone(190)}else finish(true,w)
};
$('mode').onchange=()=>$('description').textContent=descriptions[$('mode').value];$('mode').onchange();$('start').onclick=start;$('next').onclick=()=>phase==='done'?start():turn();$('exitBtn').onclick=home;$('sound').onclick=()=>{muted=!muted;save('lb-muted',String(muted));soundLabel();tone(500)};$('help').onclick=()=>document.querySelector('dialog').showModal();$('closeHelp').onclick=()=>document.querySelector('dialog').close();soundLabel();home();

const selectedMode=new URLSearchParams(location.search).get('mode');
if(Object.hasOwn(descriptions,selectedMode)){$('mode').value=selectedMode;$('mode').dispatchEvent(new Event('change'))}
