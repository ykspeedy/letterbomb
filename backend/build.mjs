import fs from "node:fs";
const types={json:"application/json",webp:"image/webp",html:"text/html",js:"text/javascript",css:"text/css",svg:"image/svg+xml",txt:"text/plain"};
const assets={};
for(const name of fs.readdirSync("public").filter(x=>x!=="lexicon.js"))assets[name]=[types[name.split(".").pop()]+"; charset=utf-8",fs.readFileSync("public/"+name,name.endsWith(".webp")?"base64":"utf8")];
fs.mkdirSync("dist/server",{recursive:true});
const wordText=fs.readFileSync("public/lexicon.js","utf8").split('"')[1];
const counts=new Map();
for(const word of wordText.split(" ")){
 const parts=new Set();
 for(const size of [2,3])for(let i=0;i+size<=word.length;i++)parts.add(word.slice(i,i+size));
 for(const part of parts)counts.set(part,(counts.get(part)||0)+1);
}
const bands={"Very easy":[],"Easy":[],"Medium":[],"Hard":[],"Very hard":[]};
for(const [part,count] of counts){
 if(count<4)continue;
 const tier=count>=500?"Very easy":count>=200?"Easy":count>=70?"Medium":count>=20?"Hard":"Very hard";bands[tier].push(part)
}
assets["rules.js"][1]+="\nconst promptBands="+JSON.stringify(bands)+";\n";
const version='"'+(await import("node:crypto")).createHash("sha256").update(JSON.stringify(assets)).digest("hex").slice(0,16)+'"';
const chessSource=fs.readFileSync("vendor/chess.js","utf8");
assets["chess.js"]=["text/javascript",chessSource];
assets["chess-license.txt"]=["text/plain",fs.readFileSync("vendor/chess-license.txt","utf8")];
assets["world-atlas-license.txt"]=["text/plain",fs.readFileSync("vendor/world-atlas-license.txt","utf8")];
const versionKey=version.slice(1,-1);
const shell=assets["index.html"][1].replace('<link rel="stylesheet" href="/lobby.css">',()=>"<style>"+assets["lobby.css"][1]+"</style>").replace(/<script src="\/([^"]+)"><\/script>/g,(_,name)=>"<script>"+assets[name][1]+"</script>").replace(/(\/card[0-7]\.webp)/g,"$1?v="+versionKey);
assets["index.html"][1]=shell;
fs.writeFileSync("dist/server/index.js","const version="+JSON.stringify(version)+";const assets="+JSON.stringify(assets)+";const wordText="+JSON.stringify(wordText)+";\n"+chessSource+"\n"+assets["rules.js"][1]+"\n"+assets["engine.js"][1]+"\n"+fs.readFileSync("server/accounts.mjs","utf8")+"\n"+fs.readFileSync("server/game.mjs","utf8"));
