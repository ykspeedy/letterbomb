let accountName=null,googleLoader;
async function accountRequest(action="",body){
 const res=await fetch("/api/account"+action,body===undefined?{cache:"no-store"}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const result=await res.json();if(!res.ok)throw Error(result.error||"Account service unavailable.");return result
}
function showAccount(name){
 accountName=name||null;nick=name||get("name","Guest");el("profile").textContent=nick
}
async function restoreAccount(){
 try{showAccount((await accountRequest()).name)}catch{}
}
function loadGoogle(){
 if(!googleLoader)googleLoader=new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.onload=resolve;script.onerror=()=>{googleLoader=null;reject(Error("Google sign-in could not load."))};document.head.append(script)
 });return googleLoader
}
async function profile(){
 modal("Player profile",'<label>Display name<input id="nick" maxlength="17"></label><button id="save" class="blue">Save name</button><hr><div id="accountControls"></div><p id="accountStatus" role="status">Checking account…</p>');
 const controls=el("accountControls"),status=el("accountStatus"),field=el("nick");field.value=nick;
 el("save").onclick=async()=>{try{const name=field.value.trim()||"Guest";if(accountName){showAccount((await accountRequest("/profile",{name})).name)}else{put("name",name);showAccount(null)}dialog.close()}catch(e){status.textContent=e.message}};
 try{
  const state=await accountRequest();if(!controls.isConnected)return;showAccount(state.name);if(state.name&&field!==document.activeElement)field.value=state.name;
  if(state.name){
   status.textContent="Signed in with Google";const out=document.createElement("button");out.textContent="Sign out";controls.append(out);
   out.onclick=async()=>{try{await accountRequest("/logout",{});showAccount(null);window.google?.accounts.id.disableAutoSelect();dialog.close()}catch(e){status.textContent=e.message}};return
  }
  if(!state.clientId){status.textContent="Guest profile · Google sign-in is awaiting setup.";return}
  const [challenge]=await Promise.all([accountRequest("/challenge",{}),loadGoogle()]);if(!controls.isConnected)return;
  status.textContent="Your first sign-in creates your Letter Bomb account.";
  google.accounts.id.initialize({client_id:challenge.clientId,nonce:challenge.nonce,callback:async result=>{try{
   const user=await accountRequest("/google",{credential:result.credential});showAccount(user.name);dialog.close();toast("Signed in as "+user.name)
  }catch(e){status.textContent=e.message}}});
  google.accounts.id.renderButton(controls,{type:"standard",text:"continue_with",theme:"outline",size:"large"})
 }catch(e){status.textContent=e.message}
}
