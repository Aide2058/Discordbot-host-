export const DASHBOARD = `<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>Bot Host</title>
<style>
:root{--bg:#fff;--fg:#17171c;--card:#f3f3f7;--mut:#6b6b78;--ac:#5865f2}
@media(prefers-color-scheme:dark){:root{--bg:#131318;--fg:#ececf1;--card:#1d1d25;--mut:#9a9aa8}}
*{box-sizing:border-box}body{margin:0;font:15px system-ui;background:var(--bg);color:var(--fg);padding:16px;max-width:760px;margin:auto}
.c{background:var(--card);border-radius:12px;padding:14px;margin:12px 0}
input,textarea{width:100%;padding:9px;margin:5px 0;border-radius:8px;border:1px solid #8884;background:var(--bg);color:var(--fg);font:inherit}
textarea{font:13px ui-monospace,monospace;min-height:150px}
button{background:var(--ac);color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:3px 3px 0 0;font:inherit;cursor:pointer}
button.g{background:#8883;color:var(--fg)}pre{background:var(--bg);padding:8px;border-radius:8px;max-height:200px;overflow:auto;font-size:12px;white-space:pre-wrap}
.s{font-size:12px;padding:2px 8px;border-radius:99px;background:#8883}.running,.healthy{background:#23a55a;color:#fff}
</style></head><body><h2>🤖 Bot Host</h2><div id=app></div><script>
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let key=localStorage.key||'';
const api=async(p,o={})=>{const r=await fetch('/api'+p,{...o,headers:{'x-api-key':key,'content-type':'application/json'}});
 const t=await r.text();try{const j=JSON.parse(t);if(j.error)alert(j.error);return j}catch{return t}};
async function signup(){const r=await fetch('/api/register',{method:'POST'}).then(r=>r.json());key=r.key;localStorage.key=key;
 alert('Your access key (save it!):\\n'+key);render()}
function login(){key=$('#k').value.trim();localStorage.key=key;render()}
async function create(){await api('/bots',{method:'POST',body:JSON.stringify({name:$('#n').value,token:$('#t').value,code:$('#c').value})});render()}
async function act(id,a){await api('/bots/'+id+'/'+a,{method:'POST'});setTimeout(render,1500)}
async function del(id){if(confirm('Delete bot?')){await api('/bots/'+id,{method:'DELETE'});render()}}
async function logs(id){$('#l'+id).textContent=await api('/bots/'+id+'/logs')}
async function save(id){await api('/bots/'+id,{method:'PUT',body:JSON.stringify({code:$('#e'+id).value})});alert('Saved. Restart to apply.')}
async function render(){
 if(!key){$('#app').innerHTML='<div class=c><button onclick=signup()>Create account</button><p>or log in:</p><input id=k placeholder="Access key"><button class=g onclick=login()>Log in</button></div>';return}
 const bots=await api('/bots');if(!Array.isArray(bots)){localStorage.key=key='';return render()}
 $('#app').innerHTML='<div class=c><b>New bot</b><input id=n placeholder="Name"><input id=t type=password placeholder="Discord bot token">'+
 '<textarea id=c placeholder="Paste bot code (discord.js, reads process.env.DISCORD_TOKEN)"></textarea><button onclick=create()>Create</button></div>'+
 bots.map(b=>'<div class=c><b>'+esc(b.name)+'</b> <span class="s '+b.status+'">'+b.status+'</span><br>'+
 '<button onclick="act(\\''+b.id+'\\',\\'start\\')">Start</button><button onclick="act(\\''+b.id+'\\',\\'restart\\')">Restart</button>'+
 '<button class=g onclick="act(\\''+b.id+'\\',\\'stop\\')">Stop</button><button class=g onclick="logs(\\''+b.id+'\\')">Logs</button>'+
 '<button class=g onclick="del(\\''+b.id+'\\')">Delete</button><pre id=l'+b.id+'></pre>'+
 '<textarea id=e'+b.id+'>'+esc(b.code)+'</textarea><button class=g onclick="save(\\''+b.id+'\\')">Save code</button></div>').join('')}
render();
</script></body></html>`;
