let audioContext, feedbackSnapshot, lastTick, spokenRound;
let muted = localStorage.getItem("letter-sound") === "off";
const soundButton = document.getElementById("sound");
function showSound(){
 soundButton.textContent=muted?"♫ off":"♫ on";
 soundButton.setAttribute("aria-pressed",String(!muted));
 soundButton.title=soundButton.ariaLabel=muted?"Enable game sounds":"Mute game sounds";
}
function unlockSound(){
 if(muted||!window.AudioContext)return;
 audioContext??=new AudioContext();
 if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
}
document.addEventListener("pointerdown",unlockSound);
document.addEventListener("keydown",unlockSound);
soundButton.onclick=()=>{muted=!muted;localStorage.setItem("letter-sound",muted?"off":"on");showSound();if(!muted){unlockSound();tone(570,.09)}};
showSound();
function tone(hz,length,delay=0,type="sine"){
 if(muted||document.hidden||audioContext?.state!=="running")return;
 const start=audioContext.currentTime+delay,osc=audioContext.createOscillator(),gain=audioContext.createGain();
 osc.type=type;osc.frequency.value=hz;gain.gain.setValueAtTime(.001,start);
 gain.gain.exponentialRampToValueAtTime(.045,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+length);
 osc.connect(gain).connect(audioContext.destination);osc.start(start);osc.stop(start+length+.01);
 osc.onended=()=>{osc.disconnect();gain.disconnect()};
}
function effect(kind){
 const notes={correct:[520,780],miss:[180,125],lost:[150,85],win:[392,494,587,784],pass:[370],tick:[660]};
 notes[kind].forEach((n,i)=>tone(n,kind==="tick"?.045:.13,i*.065,kind==="lost"?"triangle":"sine"));
 if(kind==="tick"||document.hidden||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const target=document.querySelector(kind==="miss"?"#wordForm":kind==="pass"?".bombcore":".promptbox");
 const frames=kind==="miss"?[{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"none"}]:[{transform:"scale(.96)",filter:"brightness(1.35)"},{transform:"scale(1.035)"},{transform:"none",filter:"none"}];
 target?.animate(frames,{duration:260,easing:"ease-out"});
}
function resetFeedback(){
 feedbackSnapshot=null;lastTick=null;spokenRound=null;window.speechSynthesis?.cancel();
}
function pronounce(r){
 if(!window.speechSynthesis){toast("This browser has no speech voice. Open Spelling Bee in a browser with speech enabled.");return}
 speechSynthesis.cancel();const phrase=new SpeechSynthesisUtterance(r.spokenWord);phrase.lang="en-US";phrase.rate=.85;speechSynthesis.speak(phrase)
}
function gameFeedback(r){
 const players=r.players,me=players.find(p=>p.you);
 const next={id:r.id,phase:r.phase,turn:r.turn,health:players.reduce((s,p)=>s+p.hp,0),score:me?.score||0};
 const prev=feedbackSnapshot;feedbackSnapshot=next;
 if(prev?.id===r.id&&prev.phase==="Started"){
  if(next.phase==="Finished")effect("win");
  else if(next.health<prev.health)effect("lost");
  else if(next.score>prev.score)effect("correct");
  else if(next.turn!==prev.turn)effect("pass");
 }
 if(r.mode==="Spelling Bee"&&r.phase==="Started"&&r.spokenWord&&spokenRound!==r.opened){
  spokenRound=r.opened;if(!document.hidden)pronounce(r)
 }
}
function countdown(r,seconds){
 const key=r.opened+"-"+seconds;
 if(seconds>0&&seconds<=3&&lastTick!==key){lastTick=key;effect("tick")}
}
