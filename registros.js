(function(){
const cfg=window.SUPABASE_CONFIG||{},ready=cfg.url&&cfg.anonKey&&!cfg.url.includes('SEU-PROJETO')&&!cfg.anonKey.includes('SUA_CHAVE');
const db=ready&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey):null;
const $=id=>document.getElementById(id),msg=(id,t)=>$(id).textContent=t;
const show=()=>{$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden')};
async function profile(user){const {data,error}=await db.from('profiles').select('full_name,role,active').eq('id',user.id).single();if(error)throw error;if(!data?.active||!['admin','operator'].includes(data.role))throw new Error('Seu perfil não possui permissão para registrar dados.');$('userIdentity').textContent=(data.full_name||user.email)+' · '+data.role;}
function values(form){return Object.fromEntries(new FormData(form).entries());}
function bind(formId,table,messageId,transform){$(formId).addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{const payload=transform?transform(values(e.currentTarget)):values(e.currentTarget);const {error}=await db.from(table).insert(payload);if(error)throw error;e.currentTarget.reset();msg(messageId,'Registro salvo com sucesso.');await reload();}catch(err){msg(messageId,err.message||'Não foi possível salvar.');}finally{btn.disabled=false;}});}
async function loadPersonnel(){const {data,error}=await db.from('personnel').select('id,registration,full_name').eq('active',true).order('full_name');if(error)throw error;$('personnelSelect').innerHTML='<option value="">Selecione o militar</option>'+(data||[]).map(p=>'<option value="'+p.id+'">'+escapeHtml(p.full_name)+' · '+escapeHtml(p.registration)+'</option>').join('');}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function reload(){
 const [o,p,v,a]=await Promise.all([
 db.from('occurrences').select('occurrence_date,type,reference_point,sector,severity').order('occurrence_date',{ascending:false}).limit(15),
 db.from('personnel').select('id,registration,full_name,active').order('created_at',{ascending:false}).limit(15),
 db.from('vehicles').select('code,category,status,updated_at').order('updated_at',{ascending:false}).limit(15),
 db.from('daily_assignments').select('service_date,duty_status,personnel:personnel_id(full_name)').order('service_date',{ascending:false}).limit(15)
 ]);
 const err=[o,p,v,a].find(x=>x.error);if(err)throw err.error;
 const rows=[
 ...(o.data||[]).map(x=>({date:x.occurrence_date,kind:'Ocorrência',desc:x.type+' · '+x.reference_point,status:x.severity})),
 ...(p.data||[]).map(x=>({date:'—',kind:'Militar',desc:x.full_name+' · '+x.registration,status:x.active?'Ativo':'Inativo'})),
 ...(v.data||[]).map(x=>({date:x.updated_at,kind:x.category,desc:x.code,status:x.status})),
 ...(a.data||[]).map(x=>({date:x.service_date,kind:'Efetivo diário',desc:x.personnel?.full_name||'Militar',status:x.duty_status}))
 ].sort((x,y)=>String(y.date).localeCompare(String(x.date))).slice(0,30);
 $('recentRows').innerHTML=rows.length?rows.map(x=>'<tr><td>'+escapeHtml(x.date?new Date(x.date).toLocaleString('pt-BR'):'—')+'</td><td>'+escapeHtml(x.kind)+'</td><td>'+escapeHtml(x.desc)+'</td><td>'+escapeHtml(x.status)+'</td></tr>').join(''):'<tr><td colspan="4">Nenhum registro encontrado.</td></tr>';
}
async function init(){
 if(!db){msg('loginMessage','Configure URL e chave pública em supabase-config.js.');$('loginButton').disabled=true;return;}
 const {data:{session}}=await db.auth.getSession();if(session){try{await profile(session.user);show();await loadPersonnel();await reload();}catch(e){await db.auth.signOut();msg('loginMessage',e.message);}}
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;const {data,error}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){msg('loginMessage','Credenciais inválidas ou acesso não autorizado.');$('loginButton').disabled=false;return;}try{await profile(data.user);show();await loadPersonnel();await reload();}catch(err){await db.auth.signOut();msg('loginMessage',err.message);}finally{$('loginButton').disabled=false;}});
$('logoutButton').addEventListener('click',async()=>{await db?.auth.signOut();$('app').classList.add('hidden');$('loginScreen').classList.remove('hidden');});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));['occurrences','personnel','assignments','vehicles'].forEach(t=>$('tab-'+t).classList.toggle('hidden',t!==b.dataset.tab));}));
$('reloadRecords').addEventListener('click',()=>reload().catch(e=>alert(e.message)));
bind('occurrenceForm','occurrences','occurrenceMessage',v=>({...v,occurrence_date:new Date(v.occurrence_date).toISOString()}));
bind('personnelForm','personnel','personnelMessage');
bind('assignmentForm','daily_assignments','assignmentMessage');
bind('vehicleForm','vehicles','vehicleMessage',v=>({...v,updated_at:new Date().toISOString()}));
init().catch(e=>msg('loginMessage',e.message));
})();