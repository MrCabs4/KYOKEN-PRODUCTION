const REFRESH_MS = 30000;

function escapeHTML(value){
    return String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}
function presenceLabel(status){return ({online:"ONLINE",idle:"IDLE",dnd:"DND",offline:"OFFLINE"}[status] || "OFFLINE");}
function statusLabel(status){return ({PENDING:"PENDING",TRYOUT:"TRY OUT",ACCEPTED:"ACCEPTED",REJECTED:"REJECTED"}[String(status||"").toUpperCase()] || String(status||"UNKNOWN"));}
function formatDate(value){if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}
function showMessage(text){const box=document.getElementById("message");if(!box)return;box.hidden=!text;box.textContent=text||"";}

async function checkAccess(){
    const response=await fetch("/api/command/access",{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});
    if(response.status===401){window.location.href="/auth/discord";return false;}
    const data=await response.json();
    if(!data.authorized){document.body.innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;font-family:Arial,sans-serif;text-align:center"><div><h1 style="letter-spacing:4px;color:#d21b1b">ACCESS DENIED</h1><p style="color:#999">You are not authorized to access KYŌKEN COMMAND.</p><a href="/" style="display:inline-block;margin-top:15px;border:1px solid #9d1111;padding:12px 18px">RETURN HOME</a></div></div>`;return false;}
    document.getElementById("operator").textContent=`${data.positionName||"KYŌKEN OFFICER"} · ${data.username||"AUTHORIZED"}`;return true;
}

function renderOfficers(officers){
    const grid=document.getElementById("officerGrid"),count=document.getElementById("officerCount");if(!grid)return;
    count.textContent=`${officers.length} OFFICER${officers.length===1?"":"S"}`;
    if(!officers.length){grid.innerHTML=`<div class="officer-card"><div class="officer-name">NO OFFICERS FOUND</div></div>`;return;}
    const order={leader:0,viceleader:1,secretary:2,admins:3,division1:4,division2:5,division3:6,division4:7,division5:8};
    officers.sort((a,b)=>(order[a.position]??99)-(order[b.position]??99));
    grid.innerHTML=officers.map(officer=>{
        const status=officer.discordPresence||"offline";
        const styles=officer.secondaryFightingStyle?`${officer.mainFightingStyle||"—"} / ${officer.secondaryFightingStyle}`:(officer.mainFightingStyle||"—");
        const divisionNames={division1:"1ST DIVISION",division2:"2ND DIVISION",division3:"3RD DIVISION",division4:"4TH DIVISION",division5:"5TH DIVISION"};
        const division=officer.position==="admins"?"HEADQUARTERS":(divisionNames[officer.position]||"HEADQUARTERS");
        return `<article class="officer-card"><div class="officer-top"><div class="officer-position">${escapeHTML(officer.positionName||"OFFICER")}</div><div class="presence ${escapeHTML(status)}">● ${presenceLabel(status)}</div></div><div class="officer-name">${escapeHTML(officer.displayName||"UNKNOWN OFFICER")}</div><div class="officer-division">${escapeHTML(division)}</div><div class="officer-style">${escapeHTML(styles)}</div></article>`;
    }).join("");
}

function renderRecentApplications(applications){
    const box=document.getElementById("recentApplications");if(!box)return;
    const recent=(applications||[]).slice(0,5);
    if(!recent.length){box.innerHTML=`<div class="empty-state">NO APPLICATION ACTIVITY YET.</div>`;return;}
    box.innerHTML=recent.map(a=>`<a class="recent-row" href="applications.html"><div class="recent-id">#${escapeHTML(a.id)}</div><div><div class="recent-ign">${escapeHTML(a.ign||"UNKNOWN IGN")}</div><div class="recent-user">${escapeHTML(a.discordUsername||"Unknown Discord")}</div></div><div class="recent-status ${String(a.status||"").toLowerCase()}">${escapeHTML(statusLabel(a.status))}</div><div class="recent-date">${escapeHTML(formatDate(a.createdAt))}</div></a>`).join("");
}

async function loadApplicationsOverview(){
    const response=await fetch("/api/command/applications?status=ALL",{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});
    const data=await response.json();
    if(!response.ok||!data.success)throw new Error(data.error||"Unable to load applications.");
    document.getElementById("tryout").textContent=Number(data.stats.tryout||0).toLocaleString();
    renderRecentApplications(data.applications||[]);
}

async function loadDashboard(){
    try{
        const [dashboardResponse,applicationsResult,officersResponse,announcementsResponse]=await Promise.all([
            fetch("/api/command/data",{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}}),
            loadApplicationsOverview(),
            fetch("/api/officers",{cache:"no-store",headers:{Accept:"application/json"}}),
            fetch("/api/announcements/public",{cache:"no-store",headers:{Accept:"application/json"}})
        ]);
        const data=await dashboardResponse.json();
        if(!dashboardResponse.ok||!data.success)throw new Error(data.error||"Unable to load dashboard data.");
        document.getElementById("members").textContent=data.server.members==null?"—":Number(data.server.members).toLocaleString();
        document.getElementById("pending").textContent=Number(data.applications.pending||0).toLocaleString();
        document.getElementById("accepted").textContent=Number(data.applications.accepted||0).toLocaleString();
        document.getElementById("rejected").textContent=Number(data.applications.rejected||0).toLocaleString();
        const officersData=await officersResponse.json();
        if(!officersResponse.ok||!officersData.success)throw new Error(officersData.error||"Unable to load officers.");
        renderOfficers(officersData.officers||[]);
        if(announcementsResponse.ok){
            const announcementsData=await announcementsResponse.json();
            document.getElementById("announcementCount").textContent=Array.isArray(announcementsData.announcements)?announcementsData.announcements.length.toLocaleString():"0";
        } else {
            document.getElementById("announcementCount").textContent="0";
        }
        const discordOnline=Boolean(data.server.online);
        document.getElementById("discordService").textContent=discordOnline?"Connected to KYŌKEN Discord":"Discord connection unavailable";
        document.getElementById("discordDot").className=`service-dot ${discordOnline?"online":"offline"}`;
        document.getElementById("databaseDot").className="service-dot online";
        document.getElementById("websiteDot").className="service-dot online";
        document.getElementById("lastUpdated").textContent=`LAST UPDATED ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
        document.getElementById("systemStatus").textContent=discordOnline?"● DISCORD CONNECTED":"● DISCORD OFFLINE";
        showMessage("");
    }catch(error){console.error("Kyōken command dashboard failed:",error);showMessage(error.message||"Unable to load KYŌKEN COMMAND data.");document.getElementById("systemStatus").textContent="● CONNECTION ERROR";document.getElementById("discordDot")?.classList.add("offline");}
}

document.addEventListener("DOMContentLoaded",async()=>{if(await checkAccess()){await loadDashboard();setInterval(loadDashboard,REFRESH_MS);}});
