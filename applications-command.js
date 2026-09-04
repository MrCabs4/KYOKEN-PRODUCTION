let currentStatus = "ALL";
let applications = [];
let selectedId = null;
let canManage = false;
let pendingAction = null;
let searchTerm = "";
let allApplications = [];

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function showNotice(text, error=false){
  const n=$("notice"); if(!n)return; n.hidden=!text; n.textContent=text||""; n.style.borderColor=error?"rgba(230,92,92,.45)":"rgba(157,17,17,.35)";
}
function statusClass(status){ return String(status||"").toLowerCase(); }
function formatDate(value){ if(!value)return "—"; const d=new Date(value); return Number.isNaN(d.getTime())?value:d.toLocaleString(); }
function statusLabel(status){ return status === "TRYOUT" ? "TRY OUT" : status || "UNKNOWN"; }

async function access(){
  const r=await fetch("/api/command/access",{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});
  if(r.status===401){location.href="/auth/discord";return false;}
  const d=await r.json();
  if(!d.authorized){document.body.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;font-family:Arial,sans-serif;text-align:center"><div><h1 style="color:#d21b1b;letter-spacing:4px">ACCESS DENIED</h1><p style="color:#999">You are not authorized to access KYŌKEN COMMAND.</p><a href="command.html" style="color:#fff">RETURN</a></div></div>';return false;}
  $("operator").textContent=`${d.positionName||"KYŌKEN OFFICER"} · ${d.username||"AUTHORIZED"}`;
  canManage=["LEADER","VICE LEADER","SECRETARY","ADMINS"].includes(String(d.positionName||""));
  return true;
}

async function load(){
  try{
    const r=await fetch(`/api/command/applications?status=${encodeURIComponent(currentStatus)}`,{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});
    const d=await r.json(); if(!r.ok||!d.success)throw new Error(d.error||"Unable to load applications.");
    allApplications=d.applications||[];
    applications=filterApplications(allApplications);
    $("statTotal").textContent=d.stats.total.toLocaleString(); $("statPending").textContent=d.stats.pending.toLocaleString(); $("statTryout").textContent=d.stats.tryout.toLocaleString(); $("statAccepted").textContent=d.stats.accepted.toLocaleString();
    $("systemStatus").textContent="● DISCORD CONNECTED"; renderList();
    if(selectedId && applications.some(a=>a.id===selectedId)) renderDetail(applications.find(a=>a.id===selectedId)); else if(applications[0]){selectedId=applications[0].id;renderDetail(applications[0]);}
    else {selectedId=null;$("applicationDetail").innerHTML='<div class="empty">NO APPLICATIONS FOUND FOR THIS FILTER.</div>';}
  }catch(e){console.error(e);$("systemStatus").textContent="● CONNECTION ERROR";showNotice(e.message,true);}
}
function filterApplications(items){
  const q=searchTerm.trim().toLowerCase();
  if(!q)return items;
  return items.filter(a=>[a.id,a.ign,a.discordUsername,a.discordUserId,a.status,a.mainStyle].some(v=>String(v??"").toLowerCase().includes(q)));
}

function renderList(){
  const list=$("applicationList"); if(!applications.length){list.innerHTML='<div class="empty">NO APPLICATIONS FOUND.</div>';return;}
  list.innerHTML=applications.map(a=>`<div class="app-row ${a.id===selectedId?'active':''}" data-id="${a.id}"><div class="row-top"><span class="app-id">APPLICATION #${a.id}</span><span class="app-status ${statusClass(a.status)}">${esc(statusLabel(a.status))}</span></div><div class="app-name">${esc(a.ign||"UNKNOWN IGN")}</div><div class="app-meta">${esc(a.discordUsername||"Unknown Discord")} · ${esc(a.mainStyle||"—")} · ${formatDate(a.createdAt)}</div></div>`).join("");
  list.querySelectorAll(".app-row").forEach(row=>row.addEventListener("click",()=>{selectedId=Number(row.dataset.id);renderList();renderDetail(applications.find(a=>a.id===selectedId));}));
}
function field(label,value,full=false){return `<div class="field ${full?'full':''}"><span>${esc(label)}</span><strong>${esc(value||"—")}</strong></div>`;}
async function loadAccountRecord(a){
  const box=$("accountRecord"); if(!box)return;
  try{
    const r=await fetch(`/api/command/applications/${a.id}`,{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});
    const d=await r.json();
    if(!r.ok||!d.success)throw new Error();
    const rows=d.accountRecord||[];
    box.innerHTML=`<h4>APPLICATION HISTORY</h4>${rows.length?rows.map(x=>`<div class="history-row">#${esc(x.id)} · ${esc(statusLabel(x.status))} · ${esc(x.reason||"No reason recorded")}</div>`).join(""):"<div class=\"small\">No previous application records.</div>"}`;
  }catch(e){box.innerHTML=`<div class="small">Unable to load application history.</div>`;}
}

function timelineStep(label, date, by, state){
  const cls = state || "";
  const detail = date ? `${formatDate(date)}${by ? ` · ${esc(by)}` : ""}` : "Awaiting this stage";
  return `<div class="timeline-step ${cls}"><span class="timeline-dot"></span><div class="timeline-label">${esc(label)}</div><div class="timeline-meta">${detail}</div></div>`;
}
function renderTimeline(a){
  const created = a.createdAt;
  const passed = a.status === "APPROVED";
  const accepted = !["PENDING", "REJECTED"].includes(a.status) ? a.reviewedAt : null;
  const rejected = a.status === "REJECTED" ? a.reviewedAt : null;
  const joined = a.joinedAt;
  const failed = a.status === "TRYOUT_FAILED" ? a.tryoutReviewedAt : null;
  let html = `<div class="status-timeline"><h4 class="timeline-title">APPLICATION WORKFLOW</h4><div class="timeline">`;
  html += timelineStep("APPLICATION SUBMITTED", created, "", "done");
  if (rejected) {
    html += timelineStep("APPLICATION REJECTED", rejected, a.reviewedBy, "current");
    html += timelineStep("TRY OUT", null, "", "");
    html += timelineStep("TRY OUT RESULT", null, "", "");
  } else {
    html += timelineStep("APPLICATION ACCEPTED", accepted, a.reviewedBy, accepted ? "done" : "current");
    html += timelineStep("JOINED KYŌKEN / TRY OUT", joined, "", joined ? "done" : "current");
    if (failed) {
      html += timelineStep("TRY OUT FAILED", failed, a.tryoutReviewedBy, "current");
    } else if (a.status === "TRYOUT") {
      html += timelineStep("TRY OUT RESULT", null, "", "current");
    } else if (passed) {
      html += timelineStep("TRY OUT PASSED", a.tryoutReviewedAt, a.tryoutReviewedBy, "done");
    } else {
      html += timelineStep("TRY OUT RESULT", null, "", "");
    }
  }
  html += `</div></div>`;
  return html;
}

function renderDetail(a){
  if(!a){$("applicationDetail").innerHTML='<div class="empty">SELECT AN APPLICATION.</div>';return;}
  const actions=(a.status==="PENDING"&&canManage)?`<div class="detail-actions"><button class="action-btn accept" data-action="accept">✓ ACCEPT APPLICATION</button><button class="action-btn reject" data-action="reject">✕ REJECT APPLICATION</button></div>`:(!canManage&&a.status==="PENDING"?'<div class="small">Your position can view this application, but does not have permission to accept or reject it.</div>':'');
  $("applicationDetail").innerHTML=`<div class="detail-inner"><p class="eyebrow">APPLICATION #${a.id}</p><div class="detail-title">${esc(a.ign||"UNKNOWN IGN")}</div><div class="detail-sub">${esc(a.discordUsername||"Unknown Discord")} · ${esc(statusLabel(a.status))}</div><div class="detail-grid">${field("Discord User ID",a.discordUserId)}${field("Gender",a.gender)}${field("Age",a.age)}${field("Device",a.device)}${field("Microphone",a.microphone)}${field("Main Fighting Style",a.mainStyle)}${field("Secondary Fighting Style",a.secondaryStyle||"None")}${field("Previous Clan / Gang",a.pastGang)}${field("Previous Clan Name",a.previousClan||"None")}${field("Submitted",formatDate(a.createdAt))}${field("Reviewed",formatDate(a.reviewedAt))}${field("Reason",a.reason||"None",true)}${field("Try Out Fail Reason",a.tryoutFailReason||"—",true)}</div>${renderTimeline(a)}${actions}</div>`;
  loadAccountRecord(a);
  $("applicationDetail").querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>openConfirm(a,btn.dataset.action)));
}
function openConfirm(a,action){
  const modal=$("confirmModal");
  if(!modal||!a)return;
  pendingAction={id:a.id,action};
  $("confirmTitle").textContent=action==="accept"?"ACCEPT APPLICATION":"REJECT APPLICATION";
  $("confirmText").textContent=action==="accept"?`Accept Application #${a.id}? A one-use Discord invitation will be generated and sent to the applicant by DM when possible.`:`Reject Application #${a.id}? This will mark it as rejected and remove its Discord review buttons.`;
  modal.hidden=false;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("kyoken-modal-open");
  requestAnimationFrame(()=>$("confirmAction")?.focus());
}
function closeConfirm(){
  const modal=$("confirmModal");
  pendingAction=null;
  if(!modal)return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden","true");
  modal.hidden=false;
  document.body.classList.remove("kyoken-modal-open");
}
async function execute(){
  if(!pendingAction)return; const {id,action}=pendingAction; $("confirmAction").disabled=true;
  try{const r=await fetch(`/api/command/applications/${id}/action`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({action})});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||"Action failed.");closeConfirm();showNotice(action==="accept"?"APPLICATION ACCEPTED SUCCESSFULLY.":"APPLICATION REJECTED SUCCESSFULLY.");await load();}catch(e){showNotice(e.message,true);closeConfirm();}finally{$("confirmAction").disabled=false;}
}
$("filters").querySelectorAll(".filter-btn").forEach(b=>b.addEventListener("click",()=>{$("filters").querySelectorAll(".filter-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentStatus=b.dataset.status;selectedId=null;load();}));
$("cancelAction").addEventListener("click",closeConfirm);$("confirmAction").addEventListener("click",execute);$("confirmModal").addEventListener("click",e=>{if(e.target===$("confirmModal"))closeConfirm();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeConfirm();});
(async()=>{if(await access()){await load();setInterval(load,30000);}})();

$("applicationSearch").addEventListener("input",e=>{searchTerm=e.target.value;applications=filterApplications(allApplications);renderList();if(selectedId){const a=applications.find(x=>x.id===selectedId);if(a)renderDetail(a);}});
$("refreshApplications").addEventListener("click",()=>load());
