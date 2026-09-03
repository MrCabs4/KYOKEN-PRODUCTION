(function(){
  async function initManagementDrawer(){
    const tab=document.getElementById('managementTab');
    const drawer=document.getElementById('managementDrawer');
    const close=document.getElementById('managementDrawerClose');
    const backdrop=document.getElementById('managementBackdrop');

    if(!tab||!drawer||!close||!backdrop)return;

    // Fail closed: never show Management unless the server explicitly authorizes it.
    tab.hidden=true;
    tab.classList.remove('is-open');
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-visible');

    try{
      const r=await fetch('/api/command/access',{
        method:'GET',
        credentials:'include',
        cache:'no-store',
        headers:{Accept:'application/json'}
      });

      if(!r.ok)return;

      const data=await r.json();

      const allowedPositions=['leader','viceleader','secretary','admins'];
      const position=String(data?.position||'').toLowerCase();

      if(
        data?.loggedIn !== true ||
        data?.authorized !== true ||
        !allowedPositions.includes(position)
      ){
        return;
      }

      tab.hidden=false;

      const welcome=document.getElementById('managementWelcome');
      if(welcome){
        welcome.textContent=data.positionName
          ? `${data.positionName} • KYŌKEN STAFF`
          : 'KYŌKEN STAFF CONTROL CENTER';
      }
    }catch(e){
      console.debug('Kyōken management drawer access check failed:',e);
      return;
    }

    const setOpen=(open)=>{
      if(tab.hidden)open=false;
      tab.classList.toggle('is-open',open);
      drawer.classList.toggle('is-open',open);
      backdrop.classList.toggle('is-visible',open);
      document.body.classList.toggle('management-drawer-open',open);
      tab.setAttribute('aria-expanded',String(open));
      drawer.setAttribute('aria-hidden',String(!open));
      backdrop.setAttribute('aria-hidden',String(!open));
    };

    tab.addEventListener('click',()=>setOpen(!drawer.classList.contains('is-open')));
    close.addEventListener('click',()=>setOpen(false));
    backdrop.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
    document.querySelectorAll('.management-scroll-link').forEach(
      link=>link.addEventListener('click',()=>setOpen(false))
    );
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initManagementDrawer);
  }else{
    initManagementDrawer();
  }
})();