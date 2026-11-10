const roomModes = ["Original","Chain Word","Letter Link","Skill Check","Trivia","Typing Race","Spelling Bee","Defuser"];
const choose = items => items[Math.floor(Math.random()*items.length)];
const ordinaryPrompts = "an er st re ea th ie es en ar ing est ion ell ant ine ant at be cl dr ve ll br it".split(" ");
const raceWords = "river garden planet window bottle marble cloud candle jacket stone garden pepper almond rocket orange maple lemon ocean summer timber silver honey mouse turtle plate whale peach flag olive snow clock cherry".split(" ");
const trivia = [
 ["What is the largest planet in our solar system?","jupiter"],["How many sides does an octagon have?","8"],["What is the capital of Peru?","lima"],["Which instrument measures temperature?","thermometer"],["How many minutes are in two hours?","120"],["What is the smallest continent by area?","australia"],["Which element has the symbol Au?","gold"],["What is the first month of the year?","january"],["Which bird is known for mimicking human speech?","parrot"],["What is the main ingredient in hummus?","chickpeas"],["Which chess piece can jump over pieces?","knight"],["How many letters are in the English alphabet?","26"],["What color do blue and yellow paint make?","green"],["What is the capital of Greece?","athens"],["Which planet is famous for its prominent rings?","saturn"],["Which ocean is largest?","pacific"],["How many faces does a cube have?","6"],["What planet is called the Red Planet?","mars"],["Which animal builds dams?","beaver"],["What is the capital of Japan?","tokyo"],["Which gas do plants absorb in photosynthesis?","carbon dioxide"],["Which metal has the symbol Fe?","iron"],["How many strings does a standard violin have?","4"],["What is the largest land animal?","elephant"],["What is frozen water called?","ice"],["How many sides does a hexagon have?","6"],["What do you call a group of wolves?","pack"],["What is the smallest prime number?","2"],["What language is spoken in Brazil?","portuguese"],["Which instrument has 88 keys?","piano"]
];
const beeSeeds=["planets","orchids","jackets","baskets","candles","flowers","markets","gardens"].filter(w=>new Set(w).size===7);
function chainPrompt(word){
 const size=Math.min(word.length,choose([2,2,3]));
 const offset=Math.floor(Math.random()*(word.length-size+1));
 return word.slice(offset,offset+size)
}
function makeChallenge(r,lastWord=""){
 r.grid=null;r.solution=null;r.seedWord=null;r.required=null;
 switch(r.mode){
 case "Chain Word":r.prompt=lastWord?chainPrompt(lastWord):choose(ordinaryPrompts);break;
 case "Typing Race":r.prompt=choose(raceWords.filter(w=>!r.used.includes(w)))||choose(raceWords);break;
 case "Letter Link":{
  const word=choose(raceWords.filter(w=>w.length<=6&&!r.used.includes(w)))||"day";
  r.grid=Array.from({length:16},()=>choose("eetaoinshrdlmcbuy"));
  r.seedWord=word;const path=[0,1,2,3,7,6];[...word].forEach((c,i)=>r.grid[path[i]]=c);r.prompt="Link the tiles";break}
 case "Spelling Bee":{
  const seed=choose(beeSeeds);r.seedWord=seed;r.grid=[...new Set(seed)];r.required=choose(r.grid);r.prompt="Include "+r.required.toUpperCase();break}
 case "Trivia":[r.prompt,r.solution]=choose(trivia);break;
 case "Skill Check":case "Defuser":{
  const a=1+Math.floor(Math.random()*14),b=1+Math.floor(Math.random()*8);
  if(r.mode==="Defuser"&&r.turn%2===0){r.prompt="Reverse "+String(a*100+b);r.solution=String(a*100+b).split("").reverse().join("")}
  else {r.prompt=a+" + "+b;r.solution=String(a+b)}break}
 default:r.prompt=choose(ordinaryPrompts)
 }
}
function followsTiles(word,tiles){
 if(word.length<3||word.length>16)return false;
 function step(i,n,mask){if((mask&(1<<i))||tiles[i]!==word[n])return false;if(n+1===word.length)return true;
  for(let j=0;j<16;j++)if(Math.abs((i%4)-(j%4))<=1&&Math.abs((i>>2)-(j>>2))<=1&&step(j,n+1,mask|(1<<i)))return true;
  return false}
 return tiles.some((c,i)=>c===word[0]&&step(i,0,0));
}
function answerError(r,w,words){
 if(r.solution!==null&&r.solution!==undefined)return w===r.solution?"":"Try another answer.";
 if(r.mode==="Typing Race")return w===r.prompt?"":"Type the displayed word.";
 if(!words().has(w))return "Word not in dictionary.";
 if(r.used.includes(w))return "Word already used.";
 if(r.mode==="Letter Link")return followsTiles(w,r.grid)?"":"Connect at least three neighboring tiles.";
 if(r.mode==="Spelling Bee")return w.length>=4&&w.includes(r.required)&&[...w].every(c=>r.grid.includes(c))?"":"Use four or more letters and include the center letter.";
 return w.includes(r.prompt)?"":"Include "+r.prompt.toUpperCase()+" in your word.";
}
