const form=document.getElementById("announcementForm"),list=document.getElementById("announcementList"),message=document.getElementById("announcementMessage"),button=document.getElementById("publishAnnouncementButton"),operator=document.getElementById("operator");
const mentionPicker=document.getElementById("mentionPicker"),mentionTrigger=document.getElementById("mentionPickerTrigger"),mentionPanel=document.getElementById("mentionPickerPanel"),mentionSearch=document.getElementById("mentionSearch"),mentionOptions=document.getElementById("mentionOptions"),mentionSelected=document.getElementById("mentionSelected");
const mentionState={roles:[],members:[],channels:[],selected:[],loaded:false};
const inlineMentionState={targets:[],active:false,start:0,query:"",prefix:"@",index:0};
const announcementContent=document.getElementById("announcementContent");
const inlineMentionMenu=document.getElementById("inlineMentionMenu");
const inlineMentionOptions=document.getElementById("inlineMentionOptions");

function allMentionTargets(){
    return [...mentionState.roles,...mentionState.members,...mentionState.channels];
}

function getInlineMentionContext(){
    if(!announcementContent)return null;
    const value=announcementContent.value;
    const cursor=announcementContent.selectionStart;
    const before=value.slice(0,cursor);
    const match=before.match(/(^|\s)([@#])([\w.-]*)$/);
    if(!match)return null;
    return {
        start:cursor-match[3].length-1,
        query:match[3].toLowerCase(),
        prefix:match[2]
    };
}

function renderInlineMentionOptions(){
    if(!inlineMentionOptions)return;
    const query=inlineMentionState.query;
    const prefix=inlineMentionState.prefix;
    let source=allMentionTargets();
    if(prefix==="#") source=mentionState.channels;
    else source=[...mentionState.roles,...mentionState.members];

    const filtered=source.filter(target=>{
        if(target.type==="everyone")return prefix==="@" && (!query || "everyone".includes(query));
        const haystack=`${target.name} ${target.username||""}`.toLowerCase();
        return !query || haystack.includes(query);
    });

    inlineMentionState.targets=filtered;
    inlineMentionState.index=Math.min(inlineMentionState.index,Math.max(filtered.length-1,0));
    if(!filtered.length){
        inlineMentionOptions.innerHTML='<div class="inline-mention-empty">NO MATCHES FOUND.</div>';
        return;
    }

    inlineMentionOptions.innerHTML=filtered.map((target,index)=>`
        <button type="button" class="inline-mention-option ${index===inlineMentionState.index?"is-active":""}" data-inline-index="${index}">
            <span>${escapeHtml(target.name)}</span>
            <small>${target.type==="role"||target.type==="everyone"?"ROLE":target.type==="channel"?"CHANNEL":"@"+escapeHtml(target.username||"")}</small>
        </button>`).join("");
}

function openInlineMentionMenu(context){
    if(!inlineMentionMenu)return;
    inlineMentionState.active=true;
    inlineMentionState.start=context.start;
    inlineMentionState.query=context.query;
    inlineMentionState.prefix=context.prefix;
    inlineMentionState.index=0;
    inlineMentionMenu.hidden=false;
    renderInlineMentionOptions();
}

function closeInlineMentionMenu(){
    if(!inlineMentionMenu)return;
    inlineMentionState.active=false;
    inlineMentionMenu.hidden=true;
}

function insertInlineMention(index){
    const target=inlineMentionState.targets[index];
    if(!target||!announcementContent)return;
    const cursor=announcementContent.selectionStart;
    const value=announcementContent.value;
    const prefix=inlineMentionState.prefix||"@";
    const replacement=`${prefix}${target.name} `;
    announcementContent.value=value.slice(0,inlineMentionState.start)+replacement+value.slice(cursor);
    const newCursor=inlineMentionState.start+replacement.length;
    announcementContent.setSelectionRange(newCursor,newCursor);
    if(!mentionState.selected.some(item=>mentionKey(item)===mentionKey(target))){
        mentionState.selected.push(target);
    }
    closeInlineMentionMenu();
    announcementContent.focus();
}

if(announcementContent){
    announcementContent.addEventListener("input",async()=>{
        const context=getInlineMentionContext();
        if(!context){closeInlineMentionMenu();return;}
        await loadMentionTargets();
        openInlineMentionMenu(context);
    });
    announcementContent.addEventListener("keydown",event=>{
        if(!inlineMentionState.active)return;
        if(event.key==="ArrowDown"){event.preventDefault();inlineMentionState.index=Math.min(inlineMentionState.index+1,Math.max(inlineMentionState.targets.length-1,0));renderInlineMentionOptions();}
        else if(event.key==="ArrowUp"){event.preventDefault();inlineMentionState.index=Math.max(inlineMentionState.index-1,0);renderInlineMentionOptions();}
        else if(event.key==="Enter"||event.key==="Tab"){if(inlineMentionState.targets.length){event.preventDefault();insertInlineMention(inlineMentionState.index);}}
        else if(event.key==="Escape"){event.preventDefault();closeInlineMentionMenu();}
    });
    announcementContent.addEventListener("blur",()=>setTimeout(closeInlineMentionMenu,150));
}

if(inlineMentionOptions)inlineMentionOptions.addEventListener("mousedown",event=>{
    const option=event.target.closest("[data-inline-index]");
    if(!option)return;
    event.preventDefault();
    insertInlineMention(Number(option.dataset.inlineIndex));
});

function showMessage(text,type=""){
    if(!message)return;
    message.hidden=!text;
    message.textContent=text||"";
    message.className="message";
    if(type)message.classList.add(type);
}

function mentionKey(target){
    return `${target.type}:${target.id}`;
}

function renderSelectedMentions(){
    if(!mentionSelected)return;
    if(!mentionState.selected.length){
        mentionSelected.innerHTML='<span class="mention-none">NO MENTIONS SELECTED</span>';
        return;
    }
    mentionSelected.innerHTML=mentionState.selected.map(target=>`
        <button type="button" class="mention-chip" data-remove-mention="${escapeHtml(mentionKey(target))}">
            ${escapeHtml(target.name)} <span aria-hidden="true">×</span>
        </button>
    `).join("");
}

function renderMentionOptions(){
    if(!mentionOptions)return;
    const query=(mentionSearch?.value||"").trim().toLowerCase();
    const source=mentionState.tab==="roles"?mentionState.roles:mentionState.members;
    const filtered=source.filter(target=>{
        if(target.type==="everyone")return !query || "@everyone everyone".includes(query);
        return `${target.name} ${target.username||""}`.toLowerCase().includes(query);
    });
    if(!filtered.length){
        mentionOptions.innerHTML='<div class="mention-empty">NO MATCHES FOUND.</div>';
        return;
    }
    mentionOptions.innerHTML=filtered.map(target=>{
        const selected=mentionState.selected.some(item=>mentionKey(item)===mentionKey(target));
        return `<button type="button" class="mention-option ${selected?"is-selected":""}" data-mention-type="${escapeHtml(target.type)}" data-mention-id="${escapeHtml(target.id)}">
            <span class="mention-option-main">${escapeHtml(target.name)}</span>
            ${target.type==="user"?`<span class="mention-option-sub">@${escapeHtml(target.username||"")}</span>`:""}
            <span class="mention-option-check">${selected?"✓":"＋"}</span>
        </button>`;
    }).join("");
}

async function loadMentionTargets(){
    if(mentionState.loaded)return;
    try{
        const response=await fetch("/api/announcements/mention-targets",{credentials:"include",headers:{Accept:"application/json"},cache:"no-store"});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||"Unable to load mention targets.");
        mentionState.roles=[data.everyone,...(Array.isArray(data.roles)?data.roles:[])];
        mentionState.members=Array.isArray(data.members)?data.members:[];
        mentionState.channels=Array.isArray(data.channels)?data.channels:[];
        mentionState.loaded=true;
        if(mentionOptions)renderMentionOptions();
    }catch(error){
        console.error("Kyōken mention targets load failed:",error);
        if(mentionOptions)mentionOptions.innerHTML=`<div class="mention-empty">${escapeHtml(error.message)}</div>`;
    }
}

function toggleMentionTarget(type,id){
    const source=[...mentionState.roles,...mentionState.members];
    const target=source.find(item=>item.type===type&&item.id===id);
    if(!target)return;
    const key=mentionKey(target);
    const existing=mentionState.selected.findIndex(item=>mentionKey(item)===key);
    if(existing>=0)mentionState.selected.splice(existing,1);
    else mentionState.selected.push(target);
    renderSelectedMentions();
    renderMentionOptions();
}

if(mentionTrigger&&mentionPanel){
    mentionTrigger.addEventListener("click",async()=>{
        mentionPanel.hidden=!mentionPanel.hidden;
        if(!mentionPanel.hidden){
            await loadMentionTargets();
            mentionSearch?.focus();
        }
    });
}

if(mentionSearch)mentionSearch.addEventListener("input",renderMentionOptions);
if(mentionOptions)mentionOptions.addEventListener("click",event=>{
    const option=event.target.closest("[data-mention-type]");
    if(!option)return;
    toggleMentionTarget(option.dataset.mentionType,option.dataset.mentionId);
});
if(mentionSelected)mentionSelected.addEventListener("click",event=>{
    const chip=event.target.closest("[data-remove-mention]");
    if(!chip)return;
    const [type,id]=chip.dataset.removeMention.split(":");
    toggleMentionTarget(type,id);
});
document.querySelectorAll("[data-mention-tab]").forEach(tab=>tab.addEventListener("click",()=>{
    mentionState.tab=tab.dataset.mentionTab;
    document.querySelectorAll("[data-mention-tab]").forEach(item=>item.classList.toggle("is-active",item===tab));
    if(mentionSearch)mentionSearch.value="";
    renderMentionOptions();
}));
renderSelectedMentions();

function escapeHtml(value){
    return String(value??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function dateText(value){
    const date=new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value||"—")
        : date.toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}

async function verifyAccess(){
    try{
        const response=await fetch("/api/command/access",{credentials:"include",headers:{Accept:"application/json"},cache:"no-store"});
        const data=await response.json();
        if(!response.ok||!data.authorized||!data.headquarters){location.href="index.html";return false;}
        if(operator)operator.textContent=`${data.positionName||"HEADQUARTERS"} · ${data.username||"OPERATOR"}`;
        return true;
    }catch(error){
        console.error("Kyōken announcement access check failed:",error);
        location.href="index.html";
        return false;
    }
}

function render(items){
    if(!list)return;
    if(!Array.isArray(items)||!items.length){
        list.innerHTML='<div class="empty-state">NO ACTIVE ANNOUNCEMENTS.</div>';
        return;
    }

    list.innerHTML=items.map(item=>`
        <article class="announcement-item" data-announcement-id="${Number(item.id)}">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.content)}</p>
            <time class="announcement-time" datetime="${escapeHtml(item.created_at)}">${escapeHtml(dateText(item.created_at))}</time>
            <div class="announcement-actions">
                <button type="button" class="announcement-delete-button" data-delete-id="${Number(item.id)}">DELETE ANNOUNCEMENT</button>
            </div>
        </article>
    `).join("");
}

async function load(){
    try{
        const response=await fetch("/api/announcements",{credentials:"include",headers:{Accept:"application/json"},cache:"no-store"});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||"Unable to load announcements.");
        render(data.announcements);
    }catch(error){
        console.error("Kyōken announcements load failed:",error);
        if(list)list.innerHTML=`<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
}

async function deleteAnnouncement(id){
    if(!Number.isInteger(id)||id<=0)return;

    const confirmed=window.confirm("Delete this announcement from the website?\n\nThe Discord announcement will remain in the announcement channel.");
    if(!confirmed)return;

    const deleteButton=list?.querySelector(`[data-delete-id="${id}"]`);
    if(deleteButton){
        deleteButton.disabled=true;
        deleteButton.textContent="DELETING...";
    }

    try{
        const response=await fetch(`/api/announcements/${id}`,{
            method:"DELETE",
            credentials:"include",
            headers:{Accept:"application/json"}
        });
        const data=await response.json();
        if(!response.ok)throw Error(data.error||"Unable to delete announcement.");
        showMessage("ANNOUNCEMENT REMOVED FROM THE WEBSITE. THE DISCORD MESSAGE WAS PRESERVED.","success");
        await load();
    }catch(error){
        console.error("Kyōken announcement delete failed:",error);
        showMessage(error.message||"Unable to delete announcement.","error");
        if(deleteButton){
            deleteButton.disabled=false;
            deleteButton.textContent="DELETE ANNOUNCEMENT";
        }
    }
}

if(list){
    list.addEventListener("click",event=>{
        const button=event.target.closest("[data-delete-id]");
        if(!button)return;
        deleteAnnouncement(Number.parseInt(button.dataset.deleteId,10));
    });
}

if(form){
    form.addEventListener("submit",async event=>{
        event.preventDefault();

        const title=document.getElementById("announcementTitle")?.value.trim()||"";
        const content=document.getElementById("announcementContent")?.value.trim()||"";
        const duration=document.getElementById("announcementDuration")?.value||"24h";

        if(!title||!content){
            showMessage("Please enter an announcement title and message.","error");
            return;
        }

        button.disabled=true;
        showMessage("PUBLISHING TO WEBSITE + DISCORD...");

        try{
            const response=await fetch("/api/announcements",{
                method:"POST",
                credentials:"include",
                headers:{"Content-Type":"application/json",Accept:"application/json"},
                body:JSON.stringify({
                    title,
                    content,
                    duration,
                    mentionTargets:mentionState.selected.map(target=>({type:target.type,id:target.id}))
                })
            });
            const data=await response.json();
            if(!response.ok)throw Error(data.error||"Unable to publish announcement.");

            form.reset();
            showMessage("ANNOUNCEMENT PUBLISHED TO THE WEBSITE AND DISCORD.","success");
            await load();
        }catch(error){
            console.error("Kyōken announcement publish failed:",error);
            showMessage(error.message||"Unable to publish announcement.","error");
        }finally{
            button.disabled=false;
        }
    });
}

(async()=>{
    if(await verifyAccess())await load();
})();
