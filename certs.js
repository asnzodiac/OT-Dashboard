/* Docs tab: certifications, AEP & documents with expiry reminders.
   Loaded AFTER the main script in index.html: <script src="certs.js"></script> */
(function(){
const WARN=45;
const st=document.createElement("style");
st.textContent=`
.cs{border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;white-space:nowrap}
.cs.ok{background:color-mix(in srgb,var(--gr) 18%,var(--card));color:var(--gr)}
.cs.warn{background:color-mix(in srgb,var(--warn) 22%,var(--card));color:var(--warn)}
.cs.bad{background:color-mix(in srgb,#e5484d 18%,var(--card));color:#e5484d}
.cs.none{background:var(--bd);color:var(--mut)}
.cw.warn{border-color:var(--warn)}.cw.bad{border-color:#e5484d}
.cn{overflow-wrap:anywhere;min-width:0}
.ca{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap}.ca .btn{padding:6px 11px;font-size:13px}
.banner.bad{border-color:#e5484d;background:color-mix(in srgb,#e5484d 14%,var(--card))}
.banner ul{margin:6px 0 0;padding-left:18px}
sup.bdg{background:#e5484d;color:#fff;border-radius:9px;font-size:9px;padding:1px 4px;margin-left:-3px;vertical-align:top}`;
document.head.appendChild(st);

S.cert=[];S.cq="";
const FC={};
const t0=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const dl=c=>c.expD?Math.round((c.expD-t0())/864e5):null;
function toCert(x){const r=x.v;return{row:x.row,sno:r[0],name:r[1]||"",ini:r[2]||"",exp:r[3]||"",iniD:pdate(r[2]),expD:pdate(r[3]),fname:r[5]||"",fid:r[6]||""}}
const due=()=>S.cert.filter(c=>c.expD&&dl(c)<=WARN).sort((a,b)=>dl(a)-dl(b));
function stat(c){const d=dl(c);
 if(d==null)return{cls:"none",txt:"No expiry"};
 if(d<0)return{cls:"bad",txt:"Expired "+(-d)+(d==-1?" day":" days")+" ago"};
 if(d==0)return{cls:"bad",txt:"Expires today"};
 return{cls:d<=WARN?"warn":"ok",txt:d+(d==1?" day left":" days left")}}
function banner(){const a=due();if(!a.length)return"";const bad=a.some(c=>dl(c)<0);
 return`<div class="banner ${bad?"bad":""}"><b>${bad?"⛔":"⚠️"} ${a.length} document${a.length>1?"s":""} expired or expiring within ${WARN} days</b><ul>${a.slice(0,6).map(c=>`<li>${esc(c.name)} — ${stat(c).txt}</li>`).join("")}</ul>${a.length>6?`<div class="sub">+${a.length-6} more in the Docs tab</div>`:""}</div>`}

function docsView(){
 const q=S.cq.toLowerCase();
 const rows=S.cert.filter(c=>!q||(c.name+" "+c.exp+" "+c.ini).toLowerCase().includes(q))
  .sort((a,b)=>(a.expD?dl(a):1e9)-(b.expD?dl(b):1e9)||a.name.localeCompare(b.name));
 const cards=rows.map(c=>{const s=stat(c);
  return`<div class="rw cw ${s.cls}"><div class="r1"><b class="cn">${esc(c.name)}</b><span class="sp"></span><span class="cs ${s.cls}">${s.txt}</span></div>
  <div class="r2">Issued: ${esc(c.ini||"—")} · Expires: ${esc(c.exp||"—")}</div>
  <div class="ca">${c.fid?`<button class="btn ghost" data-cview="${c.row}">View</button><button class="btn ghost" data-cdl="${c.row}">Download</button>`:'<span class="sub">No file attached</span>'}<span class="sp"></span><button class="ic" data-cedit="${c.row}">✎</button><button class="ic" data-cdel="${c.row}">🗑</button></div></div>`}).join("");
 return`<div class="bar"><input type="search" id="cq" placeholder="Search documents…" value="${esc(S.cq)}"><button class="btn" data-cadd>＋ Add</button></div>`+banner()+
  (cards||'<div class="empty">No documents yet. Tap ＋ Add to log your first certificate.</div>')+
  '<div class="sub" style="text-align:center;margin-top:8px">Soonest expiry first · reminders start '+WARN+' days before expiry</div><button class="fab" id="cfab">＋</button>'}

const b64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(",")[1]);r.onerror=no;r.readAsDataURL(b)});
async function prep(file){
 if(file.type.startsWith("image/")&&file.type!="image/gif"){
  try{const bmp=await createImageBitmap(file),k=Math.min(1,2200/Math.max(bmp.width,bmp.height)),cv=document.createElement("canvas");
   cv.width=Math.round(bmp.width*k);cv.height=Math.round(bmp.height*k);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
   const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.85));
   return{name:file.name.replace(/\.\w+$/,"")+".jpg",type:"image/jpeg",data:await b64(blob)}}catch(e){}}
 if(file.size>8*1024*1024)throw{message:"File is too large (max 8 MB)"};
 return{name:file.name,type:file.type||"application/octet-stream",data:await b64(file)}}

function certForm(row){const c=row?S.cert.find(x=>x.row==row):null;
 $("#modal").innerHTML=`<div class="sheet"><h2>${c?"Edit":"Add"} document</h2>
 <label>Name of certification / document<input id="c_name" value="${esc(c?c.name:"")}"></label>
 <label>Initial date (if applicable)<input type="date" id="c_ini" value="${c?ymd(c.iniD):""}"></label>
 <label>Expiry date (if applicable)<input type="date" id="c_exp" value="${c?ymd(c.expD):""}"></label>
 <label>${c&&c.fid?"Replace file (optional)":"Attach file (PDF or photo)"}<input type="file" id="c_file" accept="image/*,application/pdf,.doc,.docx"></label>
 ${c&&c.fid?`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="c_rm" style="width:auto;margin:0"> Remove current file (${esc(c.fname)})</label>`:""}
 <div class="err" id="cerr"></div><div class="acts"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="csave" data-row="${row||""}">Save</button></div></div>`;
 $("#modal").hidden=false}

async function certSave(row){
 const f={name:$("#c_name").value.trim(),initial:$("#c_ini").value,expiry:$("#c_exp").value},err=$("#cerr");
 if(!f.name){err.textContent="Enter a name";return}
 if(f.initial&&f.expiry&&f.expiry<f.initial){err.textContent="Expiry must be after the initial date";return}
 const file=$("#c_file").files[0],btn=$("#csave");btn.disabled=true;err.textContent=file?"Uploading…":"";
 try{if(file){const u=await prep(file);f.fileName=u.name;f.fileType=u.type;f.fileData=u.data}
  else if($("#c_rm")&&$("#c_rm").checked)f.removeFile=true;
  await api(row?"cupdate":"cadd",{row,f});$("#modal").hidden=true;load()}
 catch(e){err.textContent=e.message||"Couldn't save";btn.disabled=false}}

async function getFile(row){const c=S.cert.find(x=>x.row==row);
 if(c.fid&&FC[c.fid])return FC[c.fid];
 const j=await api("cfile",{row}),bytes=Uint8Array.from(atob(j.data),ch=>ch.charCodeAt(0));
 const f={url:URL.createObjectURL(new Blob([bytes],{type:j.type})),name:j.name,type:j.type};
 if(c.fid)FC[c.fid]=f;return f}

async function certOpen(row,download,btn){const c=S.cert.find(x=>x.row==row);if(!c)return;
 const old=btn.textContent;btn.disabled=true;btn.textContent="Loading…";
 try{const f=await getFile(row);
  if(download){const a=document.createElement("a");a.href=f.url;a.download=f.name;document.body.appendChild(a);a.click();a.remove()}
  else{const body=f.type.startsWith("image/")?`<img src="${f.url}" style="width:100%;border-radius:10px">`:f.type=="application/pdf"?`<iframe src="${f.url}" style="width:100%;height:65vh;border:0;border-radius:10px"></iframe>`:'<div class="empty">Preview isn’t available for this file type. Use Download.</div>';
   $("#modal").innerHTML=`<div class="sheet"><h2>${esc(c.name)}</h2>${body}<div class="acts"><a class="btn ghost" href="${f.url}" download="${esc(f.name)}" style="text-decoration:none">Download</a><button class="btn" data-close>Close</button></div></div>`;$("#modal").hidden=false}}
 catch(e){alert(e.message||"Couldn't load the file")}
 btn.disabled=false;btn.textContent=old}

document.addEventListener("click",e=>{
 const g=e.target.closest("[data-cadd],[data-cedit],[data-cdel],[data-cview],[data-cdl],#csave,#cfab");if(!g)return;
 if(g.hasAttribute("data-cadd")||g.id=="cfab")certForm(0);
 else if(g.dataset.cedit)certForm(+g.dataset.cedit);
 else if(g.dataset.cview)certOpen(+g.dataset.cview,false,g);
 else if(g.dataset.cdl)certOpen(+g.dataset.cdl,true,g);
 else if(g.id=="csave")certSave(g.dataset.row?+g.dataset.row:0);
 else if(g.dataset.cdel){if(confirm("Delete this document and its attached file?"))api("cdelete",{row:+g.dataset.cdel}).then(load).catch(x=>alert(x.message))}});
document.addEventListener("input",e=>{if(e.target.id=="cq"){S.cq=e.target.value;const p=e.target.selectionStart;render();const i=$("#cq");i.focus();i.setSelectionRange(p,p)}});

// Hook into the existing app
const _apply=window.applyData;
window.applyData=function(j){_apply(j);S.cert=(j.cert||[]).map(toCert)};
const _render=window.render;
window.render=function(){_render();
 const n=due().length;
 $("#nav").insertAdjacentHTML("beforeend",`<button data-t="docs" class="${S.tab=="docs"?"on":""}"><span>📄${n?`<sup class="bdg">${n}</sup>`:""}</span>Docs</button>`);
 if(S.tab=="docs")$("#view").innerHTML=docsView();
 else if(S.tab=="dash"){const b=banner();if(b)$("#view").insertAdjacentHTML("afterbegin",b)}};
// Cached data from the first load() call may already be on screen
try{const c=JSON.parse(localStorage.getItem("ot_cache")||"null");if(c&&c.cert){S.cert=c.cert.map(toCert)}}catch(e){}
if(TOK)render();
})();
