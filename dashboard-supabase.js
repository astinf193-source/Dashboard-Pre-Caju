(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const configured=cfg.url&&cfg.anonKey&&!cfg.url.includes('SEU-PROJETO')&&!cfg.anonKey.includes('SUA_CHAVE');
  const client=configured&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey):null;
  window.CBMSE_DB=client;
  const $=id=>document.getElementById(id);
  const setStatus=t=>{const el=$('status');if(el)el.textContent=t;};
  const showLogin=()=>{$('loginScreen')?.classList.remove('hidden');$('app')?.classList.add('hidden');};
  const showApp=()=>{$('loginScreen')?.classList.add('hidden');$('app')?.classList.remove('hidden');};
  async function profileFor(user){
    const {data,error}=await client.from('profiles').select('full_name,role,active').eq('id',user.id).single();
    if(error)throw error;
    if(!data||!data.active)throw new Error('Usuário sem autorização ativa. Procure o administrador.');
    return data;
  }
  async function refreshDashboard(){
    if(!client)return;
    const day=new Date().toLocaleDateString('en-CA');
    const [occ,veh,assign]=await Promise.all([
      client.from('occurrences').select('id,occurrence_date,type,reference_point,sector,severity,report,prevention_class').order('occurrence_date',{ascending:false}).limit(1000),
      client.from('vehicles').select('id,category,status,active').eq('active',true),
      client.from('daily_assignments').select('id,duty_status,service_date').eq('service_date',day)
    ]);
    const err=[occ,veh,assign].find(x=>x.error);if(err)throw err.error;
    const mapSeverity={Grave:'Grave',Moderada:'Moderada',Leve:'Leve'};
    window.CBMSE_OCCURRENCES=(occ.data||[]).map(o=>({
      tipo:o.type,local:o.reference_point,setor:o.sector,gravidade:mapSeverity[o.severity]||o.severity,
      data:o.occurrence_date?new Date(o.occurrence_date).toLocaleDateString('pt-BR'):'',
      relato:o.report,classificacao:o.prevention_class
    }));
    if(typeof window.CBMSE_RENDER_OCCURRENCES==='function')window.CBMSE_RENDER_OCCURRENCES(window.CBMSE_OCCURRENCES);
    const counts={
      'Terrestre':(veh.data||[]).filter(v=>v.category==='Terrestre'&&v.status==='operational').length,
      'Drone':(veh.data||[]).filter(v=>v.category==='Drone'&&v.status==='operational').length,
      'Aquática':(veh.data||[]).filter(v=>v.category==='Aquática'&&v.status==='operational').length,
      'Militares':(assign.data||[]).filter(a=>a.duty_status==='present').length,
      'Faltas':(assign.data||[]).filter(a=>a.duty_status==='absent').length
    };
    document.querySelectorAll('[data-resource]').forEach(el=>{
      const name=el.getAttribute('data-resource');const strong=el.querySelector('strong');if(strong)strong.textContent=counts[name]??0;
    });
    const pending=(assign.data||[]).filter(a=>a.duty_status==='pending').length;
    setStatus('Supabase conectado · '+(occ.data||[]).length+' ocorrências · '+counts.Militares+' apresentados · '+counts.Faltas+' faltas · '+pending+' pendentes');
  }
  async function start(){
    if(!client){showLogin();setStatus('Configure a URL e a chave pública do Supabase em supabase-config.js.');$('loginMessage').textContent='A integração precisa ser configurada pelo administrador antes do primeiro acesso.';$('loginButton').disabled=true;return;}
    const {data:{session}}=await client.auth.getSession();
    if(!session){showLogin();return;}
    try{
      const profile=await profileFor(session.user);showApp();
      $('userIdentity').textContent=(profile.full_name||session.user.email)+' · '+profile.role;
      await refreshDashboard();
    }catch(e){await client.auth.signOut();showLogin();$('loginMessage').textContent=e.message||'Falha ao validar o usuário.';}
  }
  $('loginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();if(!client)return;
    $('loginButton').disabled=true;$('loginMessage').textContent='Validando acesso...';
    const {data,error}=await client.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
    if(error){$('loginMessage').textContent='Não foi possível entrar. Verifique usuário e senha.';$('loginButton').disabled=false;return;}
    try{const profile=await profileFor(data.user);$('userIdentity').textContent=(profile.full_name||data.user.email)+' · '+profile.role;showApp();await refreshDashboard();}
    catch(err){await client.auth.signOut();$('loginMessage').textContent=err.message||'Usuário sem permissão.';}
    $('loginButton').disabled=false;
  });
  $('logoutButton')?.addEventListener('click',async()=>{if(client)await client.auth.signOut();showLogin();});
  $('refresh')?.addEventListener('click',async()=>{try{await refreshDashboard();}catch(e){setStatus('Falha ao atualizar os dados do Supabase.');console.error(e);}});
  client?.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||!session)showLogin();});
  window.CBMSE_REFRESH=refreshDashboard;
  start();
})();