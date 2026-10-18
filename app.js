'use strict';
// V3.18 conveniences are local only; authority and completion remain server-side.
const appPrefs318_={places:'aspire_recent_places_v318',notes:'aspire_note_favorites_v318',ppt:'aspire_ppt_jobs_v318'};
function readLocal318_(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function writeLocal318_(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
function icon318_(name){
  const paths={camera:'M4 7h4l2-3h4l2 3h4v13H4z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',print:'M7 8V3h10v5 M7 17H3V8h18v9h-4 M7 13h10v8H7z',report:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6',pin:'M12 22s7-8 7-13a7 7 0 1 0-14 0c0 5 7 13 7 13z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',room:'M5 21V3h14v18 M2 21h20 M14 12h1',food:'M4 3v6h6V3 M7 3v18 M18 3c-3 4-3 8 0 9v9 M18 3v9',building:'M3 21h18 M5 21V8h14v13 M3 8l9-5 9 5 M9 11v6 M15 11v6',bolt:'M13 2 4 14h7l-1 8 10-13h-7z'};
  return '<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.report)+'"/></svg>';
}
function tidyIcons318_(root=document){
  const pairs=[['.mgr-print-btn','print','列印'],['.ppt-btn','report','產生 PPT'],['#btn-room','room',null],['[onclick*="setLocType"]','pin',null]];
  for(const [selector,icon,label] of pairs)root.querySelectorAll(selector).forEach(el=>{
    if(el.querySelector('.app-icon'))return;
    const text=(label||el.textContent).replace(/^[\s\p{Extended_Pictographic}\uFE0F]+/u,'').trim();
    let glyph=icon;if(text.includes('餐廳'))glyph='food';if(text==='設施')glyph='building';if(text.includes('客房'))glyph='room';
    el.innerHTML=icon318_(glyph)+'<span>'+escapeHtml_(text)+'</span>';
  });
  root.querySelectorAll('.mgr-label').forEach(el=>{if(el.firstChild?.nodeType===3)el.firstChild.textContent=el.firstChild.textContent.replace(/^[\s\p{Extended_Pictographic}\uFE0F]+/u,'').trimStart();});
}
function saveRecentPlace318_(draft){
  if(!draft.area||!draft.locType||!draft.location)return;
  const place={area:String(draft.area).slice(0,30),selectedBuilding:String(draft.selectedBuilding||'').slice(0,20),locType:String(draft.locType).slice(0,20),location:String(draft.location).slice(0,120)};
  const signature=JSON.stringify(place);
  writeLocal318_(appPrefs318_.places,[place,...readLocal318_(appPrefs318_.places).filter(p=>JSON.stringify(p)!==signature)].slice(0,6));
  renderRecentPlaces318_();
}
function applyRecentPlace318_(place){
  const area=[...document.querySelectorAll('#area-btn-row button')].find(b=>b.textContent.trim()===place.area);
  if(!area)return;
  setArea(place.area,area);
  if(place.selectedBuilding){const b=[...document.querySelectorAll('#yashe-building-row button')].find(b=>b.textContent.trim()===place.selectedBuilding);if(b)setBuilding(place.selectedBuilding,b);}
  const type=[...document.querySelectorAll('#loctype-btn-row button')].find(b=>(b.getAttribute('onclick')||'').includes("setLocType('"+place.locType+"'"));
  if(type)setLocType(place.locType,type);
  document.getElementById('f-location').value=place.location;showNormPreview();saveRepairDraft_();tidyIcons318_();
  document.getElementById('f-desc').focus({preventScroll:true});
}
function renderRecentPlaces318_(){
  let box=document.getElementById('recentPlaces318');
  if(!box){box=document.createElement('div');box.id='recentPlaces318';box.className='local-shortcuts';document.querySelector('.form-module-location .section-label')?.after(box);}
  const places=readLocal318_(appPrefs318_.places).filter(p=>p&&typeof p.location==='string'&&typeof p.area==='string').slice(0,6);
  box.hidden=!places.length;box.replaceChildren();if(!places.length)return;
  const head=document.createElement('div');head.className='shortcut-head';head.innerHTML='<span>最近使用地點</span>';
  const clear=document.createElement('button');clear.type='button';clear.className='text-action';clear.textContent='清除';clear.onclick=()=>{writeLocal318_(appPrefs318_.places,[]);renderRecentPlaces318_();};head.append(clear);box.append(head);
  const row=document.createElement('div');row.className='shortcut-row';
  places.forEach(p=>{const b=document.createElement('button');b.type='button';b.textContent=p.area+(p.selectedBuilding||'')+' · '+p.location;b.onclick=()=>applyRecentPlace318_(p);row.append(b);});box.append(row);
}
function installNoteFavorites318_(note){
  if(!note||note.nextElementSibling?.classList.contains('note-favorites'))return;
  const box=document.createElement('div');box.className='note-favorites';note.after(box);
  const render=()=>{
    box.replaceChildren();const head=document.createElement('div');head.className='shortcut-head';
    const label=document.createElement('span');label.textContent='常用維修內容';head.append(label);
    const save=document.createElement('button');save.type='button';save.className='text-action';save.textContent='儲存目前內容';
    save.onclick=()=>{const value=note.value.trim();if(!value){showToast('請先填寫維修內容');return;}if(value.length>300){showToast('常用內容請控制在 300 字內');return;}const notes=readLocal318_(appPrefs318_.notes).filter(x=>typeof x==='string'&&x!==value);if(writeLocal318_(appPrefs318_.notes,[value,...notes].slice(0,8))){render();showToast('已儲存常用內容');}else showToast('此瀏覽器目前無法儲存常用內容');};head.append(save);box.append(head);
    const row=document.createElement('div');row.className='shortcut-row';
    readLocal318_(appPrefs318_.notes).filter(x=>typeof x==='string').slice(0,8).forEach(value=>{
      const item=document.createElement('span');item.className='favorite-note';
      const use=document.createElement('button');use.type='button';use.textContent=value;use.title=value;
      use.onclick=()=>{note.value=value;note.dispatchEvent(new Event('input',{bubbles:true}));note.focus({preventScroll:true});};
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','移除常用內容：'+value);remove.onclick=()=>{writeLocal318_(appPrefs318_.notes,readLocal318_(appPrefs318_.notes).filter(x=>x!==value));render();};item.append(use,remove);row.append(item);
    });box.append(row);
  };render();
}

let managerFilteredIds318_=[];
let panelContext318_=null;
function captureCaseContext318_(c){
  panelContext318_={caseId:c.caseId,status:c.status,revision:Number(c.closeRevision)||0,ids:[...managerFilteredIds318_],scrollY:window.scrollY,focus:document.activeElement};
}
function findCaseForAction318_(rowIndex){
  if(!panelContext318_||rowIndex!==caseActionRowIndex_)return findCaseByRowIndex_(rowIndex);
  const c=allCases.find(x=>x.caseId===panelContext318_.caseId);
  if(!c||c.status!==panelContext318_.status||(Number(c.closeRevision)||0)!==panelContext318_.revision)return null;
  return c;
}
function installCaseTools318_(c){
  installNoteFavorites318_(document.getElementById('note-'+c.rowIndex));tidyIcons318_(document.getElementById('caseActionContent'));
  if(typeof installVisualCaseTools319_==='function')installVisualCaseTools319_(c);
  if(c.status!=='待處理'||c.closeSyncState)return;
  const label=document.createElement('label');label.className='next-case-choice';
  const input=document.createElement('input');input.type='checkbox';input.id='nextCase318';
  try{input.checked=sessionStorage.getItem('aspire_continue318')==='1';}catch(e){}
  input.onchange=()=>{try{sessionStorage.setItem('aspire_continue318',input.checked?'1':'0');}catch(e){}};
  label.append(input,document.createTextNode('送出後開啟下一件'));document.getElementById('caseActionFooter').prepend(label);
}
function nextCaseAfterQueue318_(c){
  if(!document.getElementById('nextCase318')?.checked)return null;
  const ids=panelContext318_?.ids||[],at=ids.indexOf(c.caseId);
  const candidates=at<0?ids:ids.slice(at+1).concat(ids.slice(0,at));
  return candidates.find(id=>{const row=allCases.find(x=>x.caseId===id);return row?.status==='待處理'&&!row.closeSyncState&&!closeEnqueueCases_.has(id);})||null;
}
function openNextCase318_(id){
  if(!id)return;
  requestAnimationFrame(()=>{const c=allCases.find(x=>x.caseId===id);if(c?.status==='待處理'&&!c.closeSyncState)openCaseActionModal(c.rowIndex);});
}
function restoreCaseContext318_(){
  const ctx=panelContext318_;panelContext318_=null;if(!ctx)return;
  window.scrollTo({top:ctx.scrollY,behavior:'instant'});
  if(ctx.focus?.isConnected)ctx.focus.focus({preventScroll:true});
}
function trapCaseFocus318_(event){
  const panel=document.getElementById('caseActionBackdrop');if(event.key!=='Tab'||!panel?.classList.contains('open'))return;
  const nodes=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  if(!nodes.length)return;
  const first=nodes[0],last=nodes[nodes.length-1];
  if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
}
async function animateCaseReceipt318_(caseId){
  if(document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const c=allCases.find(x=>x.caseId===caseId);if(!c)return;
  const row=document.getElementById('collapsed-'+c.rowIndex)||document.querySelector('.room-case-row[onclick="openCaseActionModal('+c.rowIndex+')"]');
  if(!row||!row.animate||row.getBoundingClientRect().bottom<0||row.getBoundingClientRect().top>innerHeight)return;
  await row.animate([{opacity:1,transform:'translateX(0)'},{opacity:.25,transform:'translateX(8px)'}],{duration:160,easing:'ease-out'}).finished.catch(()=>{});
}

// A single restrained dock prevents report and closure status trays overlapping.
function mountActivityDock318_(){
  let dock=document.getElementById('activityDock318');if(!dock){dock=document.createElement('aside');dock.id='activityDock318';dock.setAttribute('aria-label','送出進度');document.body.append(dock);}
  ['reportOutbox','closeSyncTray'].forEach(id=>{const node=document.getElementById(id);if(node&&node.parentElement!==dock)dock.append(node);});
  return dock;
}

// Photo preparation: one upload at a time, no polling. Cancelled/unclaimed photos
// expire on the server; durable jobs always retain original compressed data.
const photoStages318_=new Map();let photoStageRunning318_=false;
function randomToken318_(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}
function stageScopeFor318_(group){if(group==='report')return 'report';const c=group==='quick'?findCaseByRowIndex_(quickCloseState_.rowIndex):findCaseForAction318_(Number(group.slice(6)));return c?'close:'+c.caseId:'';}
function preparePhotos318_(group,photos){
  const scope=stageScopeFor318_(group);if(!scope)return;
  for(const entry of photoStages318_.values())if(entry.group===group&&!photos.includes(entry.src)){entry.cancelled=true;if(entry.state==='ready')void discardPhoto318_(entry);}
  photos.forEach(src=>{if(![...photoStages318_.values()].some(e=>e.group===group&&e.src===src&&!e.cancelled&&!e.detached)){const entry={key:randomToken318_(),group,scope,src,state:'queued',cancelled:false};photoStages318_.set(entry.key,entry);}});
  renderPhotoStage318_(group);void runPhotoStages318_();
}
async function photoStageRequest318_(payload){
  return callReadApi_({...payload,...(payload.scope==='report'?{}:{token:getStoredAuthToken()})},35000);
}
async function discardPhoto318_(entry){
  if(entry.detached)return;
  try{await photoStageRequest318_({action:'discardStagedPhoto',scope:entry.scope,uploadKey:entry.key});}catch(e){}finally{photoStages318_.delete(entry.key);}
}
async function runPhotoStages318_(){
  if(photoStageRunning318_||!navigator.onLine||document.hidden)return;
  photoStageRunning318_=true;
  try{
    for(const entry of photoStages318_.values()){
      if(entry.cancelled||entry.detached||entry.state!=='queued')continue;
      entry.state='uploading';renderPhotoStage318_(entry.group);
      try{const data=await photoStageRequest318_({action:'stagePhoto',scope:entry.scope,uploadKey:entry.key,photo:entry.src});entry.state=data.success&&data.uploadKey===entry.key?'ready':'fallback';entry.expires=data.expires||0;}
      catch(e){entry.state='fallback';}
      if(entry.cancelled||entry.detached)void discardPhoto318_(entry);
      renderPhotoStage318_(entry.group);
      if(!navigator.onLine||document.hidden)break;
    }
  }finally{photoStageRunning318_=false;}
}
function renderPhotoStage318_(group){
  const target=group==='quick'?document.getElementById('quickClosePhotoPreview'):photoLibraryElements_(group).preview;if(!target)return;
  let status=target.nextElementSibling;if(!status?.classList.contains('photo-prep-status')){status=document.createElement('div');status.className='photo-prep-status';status.setAttribute('role','status');target.after(status);}
  const entries=[...photoStages318_.values()].filter(e=>e.group===group&&!e.cancelled&&!e.detached);
  status.textContent=!entries.length?'':entries.every(e=>e.state==='ready')?'照片已準備好':entries.some(e=>['queued','uploading'].includes(e.state))?'照片準備中，可繼續填寫':'照片將隨案件一起送出';
}
function collectPhotoRefs318_(group,photos){
  return photos.map(src=>{const e=[...photoStages318_.values()].find(e=>e.group===group&&e.src===src&&!e.cancelled&&!e.detached&&e.state==='ready'&&e.expires>Date.now()+60000);return e?e.key:null;});
}
function releasePhotoGroup318_(group,usedRefs=[]){
  for(const e of photoStages318_.values())if(e.group===group){
    if(usedRefs.includes(e.key)){e.detached=true;photoStages318_.delete(e.key);}
    else {e.cancelled=true;if(e.state==='ready')void discardPhoto318_(e);else if(e.state!=='uploading')photoStages318_.delete(e.key);}
  }
  renderPhotoStage318_(group);
}
function wirePhotos318_(payload){
  const field=payload.action==='submit'?'reportPhotos':'closePhotos',refField=payload.action==='submit'?'reportPhotoRefs':'closePhotoRefs';
  const refs=payload[refField]||[];
  if(!refs.some(Boolean))return payload;
  return {...payload,[field]:(payload[field]||[]).map((src,i)=>refs[i]?'':src)};
}
async function sendWithPreparedPhotos318_(payload,send){
  const result=await send(wirePhotos318_(payload));
  if(result?.code==='PHOTO_STAGE_EXPIRED'){
    const fallback={...payload};delete fallback.reportPhotoRefs;delete fallback.closePhotoRefs;
    return send(fallback); // Same operation ID. Originals never left the outbox.
  }
  return result;
}

// Persist only job metadata and optional report edits, never login tokens. Polling resumes
// on return and reads status only; it cannot create duplicate presentations.
const pptJobs318_=new Map();let pptTimer318_,pptPolling318_=false;
function persistPptJobs318_(){writeLocal318_(appPrefs318_.ppt,[...pptJobs318_.values()].slice(-12));}
function renderPptJobs318_(){
  if(!pptJobs318_.size){document.getElementById('pptDownloadResult')?.remove();return;}
  let box=document.getElementById('pptDownloadResult');if(!box){box=document.createElement('div');box.id='pptDownloadResult';box.setAttribute('aria-live','polite');document.querySelector('#page-mgr .page-hero')?.after(box);}box.replaceChildren();
  for(const job of pptJobs318_.values()){
    const row=document.createElement('div');row.className='ppt-job';row.dataset.state=job.state;
    const text=document.createElement('span');text.textContent=job.state==='done'?'報告已完成 · '+job.result.fileName:job.caseId+' · '+({building:'報告製作中',exporting:'正在轉成 PPT',checking:'正在確認製作進度',waiting:'等待連線確認',paused:'進度暫時無法確認',failed:'報告未完成',auth:'請登入後繼續確認'}[job.state]||'報告製作中');row.append(text);
    if(job.state==='done'){
      const link=document.createElement('a');link.href=job.result.url;link.target='_blank';link.rel='noopener';link.textContent='下載 PPT';row.append(link);
    }else if(['failed','paused','auth'].includes(job.state)){
      const retry=document.createElement('button');retry.type='button';retry.textContent=job.code==='REPORT_CONTENT_CHANGED'?'重新編排':job.state==='failed'?'重試':'確認進度';retry.onclick=()=>{if(!getStoredAuthToken()){pendingPage='mgr';showLock();return;}if(job.state==='failed'){const c=allCases.find(x=>x.caseId===job.caseId);if(c){if(job.code==='REPORT_CONTENT_CHANGED'&&typeof openPptEditor319_==='function')void openPptEditor319_(c);else void generateReport318_(c.rowIndex,retry,job.reportOptions);}else showToast('請先載入此案件');}else {job.state='checking';job.started=Date.now();schedulePptPoll318_(0);renderPptJobs318_();}};row.append(retry);
    }
    if(['done','failed'].includes(job.state)){const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ppt-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','關閉報告進度');dismiss.onclick=()=>{pptJobs318_.delete(job.caseId);persistPptJobs318_();renderPptJobs318_();};row.append(dismiss);}
    box.append(row);
  }
}
function schedulePptPoll318_(delay=10000){clearTimeout(pptTimer318_);if(document.hidden||!navigator.onLine)return;if([...pptJobs318_.values()].some(j=>['building','exporting','checking','waiting'].includes(j.state)))pptTimer318_=setTimeout(()=>void pollPptJobs318_(),delay);}
function completePpt318_(job,result){job.state='done';job.result=result;pptRequests_.delete(job.caseId);persistPptJobs318_();renderPptJobs318_();}
async function pollPptJobs318_(){
  if(pptPolling318_||document.hidden||!navigator.onLine)return;pptPolling318_=true;
  try{
    for(const job of pptJobs318_.values()){
      if(!['building','exporting','checking','waiting'].includes(job.state))continue;
      if(!getStoredAuthToken()){job.state='auth';continue;}
      if(Date.now()-job.started>480000){job.state='paused';pptRequests_.delete(job.caseId);continue;}
      try{
        const data=await callReadApi_({action:'getReportStatus',caseId:job.caseId,requestId:job.requestId||'',token:getStoredAuthToken()},20000);
        if(job.state==='done')continue; // A late poll must not regress a direct receipt.
        if(data.code==='UNAUTHORIZED'){job.state='auth';continue;}
        if(data.success&&data.state==='done'&&data.result?.url)completePpt318_(job,data.result);
        else if(data.success&&['failed','missing','expired'].includes(data.state)){job.state='failed';pptRequests_.delete(job.caseId);}
        else if(data.success&&['building','exporting'].includes(data.state))job.state=data.state;
        else if(data.success&&data.state==='unknown'&&!pptRequests_.has(job.caseId))job.state='failed';
        else job.state='checking';
      }catch(e){if(job.state!=='done')job.state='waiting';}
    }
  }finally{pptPolling318_=false;persistPptJobs318_();renderPptJobs318_();schedulePptPoll318_(20000);}
}
async function generateReport318_(rowIndex,btn,reportOptions){
  const c=findCaseForAction318_(rowIndex);if(!c?.caseId){showToast('案件資料已變更，請重新開啟案件確認');return;}
  const old=pptJobs318_.get(c.caseId);
  if(old&&['building','exporting','checking','waiting'].includes(old.state)){renderPptJobs318_();schedulePptPoll318_(0);showToast('報告製作中，完成後會顯示下載連結');return;}
  if(pptRequests_.has(c.caseId))return;
  const job={caseId:c.caseId,state:'building',started:Date.now(),requestId:randomToken318_(),reportOptions:reportOptions||undefined};pptJobs318_.set(c.caseId,job);pptRequests_.add(c.caseId);persistPptJobs318_();renderPptJobs318_();schedulePptPoll318_(6000);
  const label=btn?.innerHTML;if(btn){btn.disabled=true;btn.textContent='製作中…';}
  try{
    const data=await requestPptReport_({action:'generateReport',caseId:c.caseId,rowHint:rowIndex,requestId:job.requestId,reportOptions:job.reportOptions});
    if(data.success&&data.url)completePpt318_(job,data);
    else if(data.code==='REPORT_BUSY'&&job.state!=='done')job.state='checking';
    else if(job.state!=='done'){job.state='failed';job.code=data.code||'';showToast(data.message||'報告未完成，可在進度列重試');}
  }catch(e){if(job.state!=='done'){job.state=getStoredAuthToken()?'checking':'auth';showToast('正在確認報告結果，可繼續操作');}}
  finally{pptRequests_.delete(c.caseId);if(btn?.isConnected){btn.disabled=false;btn.innerHTML=label;}persistPptJobs318_();renderPptJobs318_();schedulePptPoll318_();}
}
function initApp318_(){
  renderRecentPlaces318_();tidyIcons318_();mountActivityDock318_();
  document.querySelectorAll('.nav-tab,.logout-btn').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});});
  document.addEventListener('keydown',trapCaseFocus318_);
  document.addEventListener('click',event=>{if(event.target.closest('#area-btn-row,#yashe-building-row,#loctype-btn-row'))tidyIcons318_();});
  readLocal318_(appPrefs318_.ppt).filter(j=>j&&/^R[\w-]+$/.test(j.caseId)&&Date.now()-j.started<86400000).slice(-12).forEach(j=>{if(j.state!=='done'&&j.state!=='failed'){j.state='checking';j.started=Date.now();}pptJobs318_.set(j.caseId,j);});
  renderPptJobs318_();schedulePptPoll318_(1500);
  const wake=()=>{if(document.hidden){clearTimeout(pptTimer318_);return;}schedulePptPoll318_(1000);void runPhotoStages318_();};
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
}
