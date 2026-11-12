/**
 * Sistema de Registros Operacionais - Pré-Caju / CBMSE
 * Baseado nos scripts originais fornecidos.
 * Abas da planilha: Users, Checkins, Ocorrencias, Alteracoes Militares, Viaturas, Avisos e Locais.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'dashboard') return dashboardJsonp_(e);
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('CBMSE - Sistema de Registros Pré-Caju')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function dashboardJsonp_(e) {
  var payload;
  try { payload = buildDashboardData_(e.parameter.date || ''); }
  catch (err) { payload = { success:false, error:'Não foi possível consultar os registros operacionais.' }; }
  var json = JSON.stringify(payload).replace(/</g, '\\u003c');
  var callback = String(e.parameter.callback || '');
  if (callback) {
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(callback))
      return ContentService.createTextOutput('/* callback inválido */').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function buildDashboardData_(requestedDate) {
  var ss=SpreadsheetApp.getActiveSpreadsheet(), tz=Session.getScriptTimeZone()||'America/Maceio';
  var today=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
  var day=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)?requestedDate:today;
  var users=sheetRows_(ss,'Users'), checkins=sheetRows_(ss,'Checkins'), vehicles=sheetRows_(ss,'Viaturas');
  var occurrences=sheetRows_(ss,'Ocorrencias'), alterations=sheetRows_(ss,'Alteracoes Militares');
  var roster=users.slice(1).filter(function(r){return normalizeMatricula_(r[4])!=='';}), checked={};
  checkins.slice(1).forEach(function(r){if(dateKey_(r[0],tz)===day){var id=normalizeMatricula_(r[2]);if(id)checked[id]=true;}});
  var dayVehicles=vehicles.slice(1).filter(function(r){return dateKey_(r[0],tz)===day;});
  var vc={terrestre:0,drone:0,aquatica:0,aerea:0};
  dayVehicles.forEach(function(r){var s=normalizeText_([r[3],r[4],r[5]].join(' '));
    if(/drone/.test(s))vc.drone++;else if(/aquatic|aquát|embarc|mar[ií]tim/.test(s))vc.aquatica++;
    else if(/a[eé]re/.test(s))vc.aerea++;else if(/terrestr|viatura|auto|ambul|carro|moto|abt|usb|ur/.test(s))vc.terrestre++;
  });
  var dayAlt=alterations.slice(1).filter(function(r){return dateKey_(r[0],tz)===day;});
  var occ=occurrences.slice(1).filter(function(r){return r[0]&&dateKey_(r[0],tz)!=='';}).map(function(r){return {
    data:dateKey_(r[0],tz),tipo:String(r[5]||'Outras').trim(),setor:String(r[3]||'').trim(),
    local:String(r[4]||'').trim(),gravidade:normalizeSeverity_(r[6]),qtd:Number(r[7])||0,relato:'Registro operacional'
  };}).slice(-500).reverse();
  var present=Object.keys(checked).length;
  return {success:true,updatedAt:new Date().toISOString(),date:day,
    summary:{efetivoPrevisto:roster.length,efetivoApresentado:present,faltas:Math.max(0,roster.length-present),
      viaturasTerrestres:vc.terrestre,drones:vc.drone+vc.aerea,recursosAquaticos:vc.aquatica,
      alteracoes:dayAlt.length,checkins:present,ocorrenciasHoje:occ.filter(function(o){return o.data===day;}).length},
    occurrences:occ};
}
function sheetRows_(ss,name){var sh=ss.getSheetByName(name);return sh?sh.getDataRange().getValues():[[]];}
function normalizeMatricula_(v){return String(v==null?'':v).replace(/\D/g,'');}
function normalizeText_(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function dateKey_(v,tz){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,tz,'yyyy-MM-dd');
  var s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  var m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);return m?m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2):'';}
function normalizeSeverity_(v){var s=normalizeText_(v);if(s==='baixa'||s==='leve')return 'Leve';if(s==='media'||s==='moderada')return 'Moderada';if(s==='alta'||s==='grave')return 'Grave';if(s==='fatal')return 'Fatal';return String(v||'').trim();}

// Autenticação original preservada. Migrar CPF em texto simples para credencial segura antes de exposição externa.
function checkLogin(name,key){var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');if(!sh)return {success:false,message:'A aba Users não foi encontrada.'};
  var data=sh.getDataRange().getValues(),id=normalizeMatricula_(name);
  for(var i=1;i<data.length;i++)if(normalizeMatricula_(data[i][4])===id&&String(data[i][5]||'').trim()===String(key||'').trim())
    var token=createSession_(data[i]);
    return {success:true,token:token,user:String(data[i][1]||'')+' '+String(data[i][2]||''),matricula:String(data[i][4]||''),zona:data[i][6],local:data[i][9],funcao:data[i][7],supervisor:isSupervisor_(data[i][8]),checkin:isCheckedIn(data[i][4])};
  return {success:false,message:'Matrícula e/ou credencial inválidas.'};}
function isSupervisor_(value) { return value === true || ['true','sim','1','yes'].indexOf(normalizeText_(value)) >= 0; }
function createSession_(userRow) {
  var token=Utilities.getUuid();
  var session={matricula:normalizeMatricula_(userRow[4]),user:String(userRow[1]||'')+' '+String(userRow[2]||''),
    zona:String(userRow[6]||''),supervisor:isSupervisor_(userRow[8])};
  CacheService.getScriptCache().put('precaju_session_'+token,JSON.stringify(session),21600);
  return token;
}
function requireSession_(token) {
  if(!token)throw new Error('Sessão não informada. Faça login novamente.');
  var raw=CacheService.getScriptCache().get('precaju_session_'+String(token));
  if(!raw)throw new Error('Sessão expirada. Faça login novamente.');
  return JSON.parse(raw);
}
function requireSupervisor_(token) {
  var session=requireSession_(token);
  if(!session.supervisor)throw new Error('Acesso restrito à supervisão.');
  return session;
}
function saveResponse(token,a1,a2,a3,a4,a5,a6) {
  var session=requireSession_(token),sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ocorrencias');
  if(!sh)throw new Error('A aba Ocorrencias não foi encontrada.');
  sh.appendRow([new Date(),session.user,session.matricula,a1,a2,a3,a4,a6,a5]);return {success:true};
}
function saveAlteracao(token,tipo,militar,relato) {
  var session=requireSupervisor_(token),sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Alteracoes Militares');
  if(!sh)throw new Error('A aba Alteracoes Militares não foi encontrada.');
  sh.appendRow([new Date(),session.user,session.matricula,tipo,militar,relato]);return {success:true};
}
function saveViatura(token,tipo,prefixo,obs) {
  var session=requireSession_(token),sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Viaturas');
  if(!sh)throw new Error('A aba Viaturas não foi encontrada.');
  sh.appendRow([new Date(),session.user,session.matricula,tipo,prefixo,obs]);return {success:true};
}
function saveCheckIn(token) {
  var session=requireSession_(token),sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Checkins');
  if(!sh)throw new Error('A aba Checkins não foi encontrada.');
  if(isCheckedIn(session.matricula))return {success:true,alreadyRegistered:true};
  sh.appendRow([new Date(),session.user,"'"+session.matricula]);return {success:true};
}
function saveAviso(token,aviso) {
  var session=requireSupervisor_(token),sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Avisos');
  if(!sh)throw new Error('A aba Avisos não foi encontrada.');
  sh.appendRow([new Date(),session.user,"'"+session.matricula,session.zona,aviso]);return {success:true};
}
function isCheckedIn(m){var rows=sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Checkins'),tz=Session.getScriptTimeZone()||'America/Maceio',today=dateKey_(new Date(),tz),id=normalizeMatricula_(m);
  return rows.slice(1).some(function(r){return dateKey_(r[0],tz)===today&&normalizeMatricula_(r[2])===id;});}
function includePage(name){return HtmlService.createHtmlOutputFromFile(name).getContent();}
function getLocationsByZone(token,z){requireSession_(token);return sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Locais').slice(1).filter(function(r){return String(r[0]||'').trim()===String(z||'').trim();}).map(function(r){return r[1];});}
function getUsersByZone(token,z){requireSupervisor_(token);return sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Users').slice(1).filter(function(r){return String(r[6]||'').trim()===String(z||'').trim();}).sort(function(a,b){return (Number(a[0])||0)-(Number(b[0])||0)||String(a[2]||'').localeCompare(String(b[2]||''),'pt-BR');}).map(function(r){return String(r[1]||'')+' '+String(r[2]||'');});}
function getUserWithCheckinByZone(token,z){requireSupervisor_(token);return sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Users').slice(1).filter(function(r){return String(r[6]||'').trim()===String(z||'').trim();}).sort(function(a,b){return (Number(a[0])||0)-(Number(b[0])||0)||String(a[2]||'').localeCompare(String(b[2]||''),'pt-BR');}).map(function(r){return {militar:String(r[1]||'')+' '+String(r[2]||''),checkin:isCheckedIn(r[4])};});}
function serialDate_(v){return v instanceof Date?v.toISOString():String(v||'');}
function getSubmitsbyZone(token,z){requireSupervisor_(token);return sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Ocorrencias').slice(1).filter(function(r){return z==='COMANDO E CONTROLE'||z==='INFORMAÇÃO'||String(r[3]||'').trim()===String(z||'').trim();}).map(function(r){return {classe:'Ocorrencia',time:serialDate_(r[0]),militar:r[1],zona:r[3],local:r[4],tipo:r[5],gravidade:r[6],qtd:r[7],relato:r[8]};}).sort(function(a,b){return new Date(b.time)-new Date(a.time);});}
function getSubmitsbyUser(token){var session=requireSession_(token),id=session.matricula,ss=SpreadsheetApp.getActiveSpreadsheet(),out=[];
  sheetRows_(ss,'Ocorrencias').slice(1).filter(function(r){return normalizeMatricula_(r[2])===id;}).forEach(function(r){out.push({classe:'Ocorrencia',time:serialDate_(r[0]),zona:r[3],local:r[4],tipo:r[5],gravidade:r[6],qtd:r[7],relato:r[8]});});
  sheetRows_(ss,'Alteracoes Militares').slice(1).filter(function(r){return normalizeMatricula_(r[2])===id;}).forEach(function(r){out.push({classe:'AlteracaoMilitar',time:serialDate_(r[0]),militar:r[4],tipo:r[3],relato:r[5]});});
  sheetRows_(ss,'Checkins').slice(1).filter(function(r){return normalizeMatricula_(r[2])===id;}).forEach(function(r){out.push({classe:'Checkin',time:serialDate_(r[0])});});
  sheetRows_(ss,'Viaturas').slice(1).filter(function(r){return normalizeMatricula_(r[2])===id;}).forEach(function(r){out.push({classe:'Viatura',time:serialDate_(r[0]),viatura:r[4],tipo:r[3],relato:r[5]});});
  return out.sort(function(a,b){return new Date(b.time)-new Date(a.time);});}
function getAvisos(token){var session=requireSession_(token);var z=session.zona;return sheetRows_(SpreadsheetApp.getActiveSpreadsheet(),'Avisos').slice(1).filter(function(r){return r[3]==='COMANDO E CONTROLE'||r[3]===z;}).map(function(r){return {time:serialDate_(r[0]),militar:r[1],zona:r[3],aviso:r[4]};}).sort(function(a,b){return new Date(b.time)-new Date(a.time);});}
