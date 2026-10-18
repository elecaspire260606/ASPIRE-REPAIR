'use strict';
// Device-local convenience only: never used as authentication or API authority.
const REPORTER_KEY_='aspire_reporter_v1';
let lastSubmittedPlace_=null;
function reporterValue_(id){return document.getElementById(id).value.trim();}
function readReporter_(){
  try {
    const p=JSON.parse(localStorage.getItem(REPORTER_KEY_)||'null');
    if(!p||p.version!==1||!['full','unit'].includes(p.mode)||typeof p.unit!=='string')return null;
    return {version:1,mode:p.mode,unit:p.unit.slice(0,100),name:p.mode==='full'&&typeof p.name==='string'?p.name.slice(0,100):'',email:p.mode==='full'&&typeof p.email==='string'?p.email.slice(0,254):''};
  }catch(e){return null;}
}
function applyReporter_(p){
  const buttons=[...document.querySelectorAll('#unit-btn-row .loc-type-btn')];
  const b=buttons.find(x=>x.textContent.trim()===p.unit);
  if(b)setUnit(p.unit,b);
  else {
    buttons.forEach(x=>x.classList.remove('active'));
    const other=buttons.find(x=>x.textContent.trim()==='其他');
    if(p.unit&&other)other.classList.add('active');
    document.getElementById('f-unit').style.display=p.unit?'block':'none';
    document.getElementById('f-unit').value=p.unit||'';
  }
  document.getElementById('f-unit').value=p.unit||'';
  document.getElementById('f-name').value=p.name||'';
  document.getElementById('f-email').value=p.email||'';
}
function refreshReporterSummary_(collapse=false){
  const unit=reporterValue_('f-unit'),name=reporterValue_('f-name');
  document.getElementById('reporterSummaryText').textContent=unit&&name?unit+' · '+name:'基本資料';
  document.getElementById('reporterDetails').classList.toggle('is-complete',!!(unit&&name));
  if(collapse)document.getElementById('reporterDetails').open=!(unit&&name);
}
function changeReporterMemory_(){
  // Removing consent immediately removes saved identity, including old draft identity.
  const mode=document.getElementById('reporterRemember').value;
  try {
    const p=readReporter_();
    localStorage.removeItem(REPORTER_KEY_);
    if(mode==='unit'&&p)localStorage.setItem(REPORTER_KEY_,JSON.stringify({version:1,mode:'unit',unit:p.unit}));
  }catch(e){showToast('此瀏覽器無法儲存設定；仍可正常報修');}
  saveRepairDraft_();
}
function forgetReporter_(){
  document.getElementById('reporterRemember').value='none';
  changeReporterMemory_();
  applyReporter_({});
  saveRepairDraft_();
  refreshReporterSummary_(true);
  document.getElementById('f-name').focus();
}
function initReporter_(){
  void initReportJobs_().catch(()=>{});
  const module=document.querySelector('.form-module-basic');
  const heading=module.querySelector('.section-label');
  heading.remove();
  const details=document.createElement('details');details.id='reporterDetails';details.open=true;
  const summary=document.createElement('summary');
  summary.innerHTML='<span id="reporterSummaryText">基本資料</span><span class="reporter-edit">變更</span>';
  details.append(summary);
  const fields=document.createElement('div');fields.className='reporter-fields';
  while(module.firstChild)fields.append(module.firstChild);
  // Keep email's original ID and submission logic, but group it with identity.
  fields.append(document.getElementById('f-email').closest('.field'));
  const options=document.createElement('div');options.className='reporter-options';
  options.innerHTML='<label for="reporterRemember">在這台裝置記住</label><select id="reporterRemember"><option value="none">不記住</option><option value="full">單位、姓名與 Email</option><option value="unit">只記住單位（共用裝置）</option></select><p>送出時儲存；只適用此瀏覽器，不代表登入。</p><button type="button" id="reporterForget">清除身分</button>';
  fields.append(options);details.append(fields);module.append(details);
  document.getElementById('reporterRemember').addEventListener('change',changeReporterMemory_);
  document.getElementById('reporterForget').addEventListener('click',forgetReporter_);
  fields.addEventListener('input',()=>refreshReporterSummary_());
  fields.addEventListener('click',()=>refreshReporterSummary_());
  document.getElementById('f-name').autocomplete='name';
  document.getElementById('f-email').autocomplete='email';
  const saved=readReporter_();
  if(saved){applyReporter_(saved);document.getElementById('reporterRemember').value=saved.mode;}
  const success=document.createElement('section');success.id='reporterSuccess';success.hidden=true;success.setAttribute('aria-live','polite');
  success.innerHTML='<div class="reporter-success-head"><span aria-hidden="true">↑</span><strong id="reporterSuccessText"></strong></div><div class="reporter-next"><button type="button" id="reporterNew">新增其他報修</button><button type="button" id="reporterSame">同地點再報一件</button></div>';
  document.querySelector('#page-form > .card').before(success);
  document.getElementById('reporterNew').addEventListener('click',()=>continueReporter_(false));
  document.getElementById('reporterSame').addEventListener('click',()=>continueReporter_(true));
  document.querySelector('#page-form > .card').addEventListener('input',()=>{success.hidden=true;});
  document.querySelector('#page-form > .card').addEventListener('click',()=>{success.hidden=true;});
}
function reporterQueued_(draft,mode){
  applyReporter_(draft); // Current session retains identity even without device persistence.
  lastSubmittedPlace_={area:draft.area,selectedBuilding:draft.selectedBuilding,locType:draft.locType,location:draft.location};
  try {
    localStorage.removeItem(REPORTER_KEY_);
    if(mode!=='none')localStorage.setItem(REPORTER_KEY_,JSON.stringify({version:1,mode,unit:draft.unit,name:mode==='full'?draft.name:'',email:mode==='full'?draft.email:''}));
  }catch(e){showToast('案件已暫存，但此瀏覽器無法記住身分');}
  refreshReporterSummary_(true);
  document.getElementById('reporterSuccessText').textContent='已保存，可繼續新增報修';
  document.getElementById('reporterSuccess').hidden=false;
  document.getElementById('reporterSuccess').scrollIntoView({block:'start',behavior:'auto'});
}
function continueReporter_(same){
  const d=lastSubmittedPlace_;
  if(same&&d){
    const areaBtn=[...document.querySelectorAll('#area-btn-row .loc-type-btn')].find(b=>b.textContent.trim()===d.area);
    if(areaBtn)setArea(d.area,areaBtn);
    if(d.selectedBuilding){const b=[...document.querySelectorAll('#yashe-building-row .loc-type-btn')].find(b=>b.textContent.trim()===d.selectedBuilding);if(b)setBuilding(d.selectedBuilding,b);}
    const typeBtn=[...document.querySelectorAll('#loctype-btn-row .loc-type-btn')].find(b=>(b.getAttribute('onclick')||'').includes("setLocType('"+d.locType+"'"));
    if(typeBtn)setLocType(d.locType,typeBtn);
    document.getElementById('f-location').value=d.location;showNormPreview();
  }
  document.getElementById('reporterSuccess').hidden=true;
  saveRepairDraft_();
  const target=same?document.getElementById('f-desc'):document.querySelector('#area-btn-row button');
  target.focus();target.scrollIntoView({block:'center',behavior:'auto'});
}

// Durable outbox: only clear the form after the IndexedDB transaction commits.
let reportDbPromise_,reportInitPromise_,reportJobsBusy_=false;
let reportWakeTimer_,reportRerun_=false;
const reportJobs_=new Map();
// Only jobs created in this live page qualify; recovered jobs always verify receipts.
const freshReportIds318_=new Set();
function openReportDb_(){
  if(!reportDbPromise_)reportDbPromise_=new Promise((resolve,reject)=>{
    const r=indexedDB.open('aspire-report-outbox-v1',1);
    let expired=false;
    const timeout=setTimeout(()=>{expired=true;reject(new Error('手機暫存開啟逾時，請重新開啟頁面'));},15000);
    r.onupgradeneeded=()=>r.result.createObjectStore('jobs',{keyPath:'id'});
    r.onsuccess=()=>{clearTimeout(timeout);if(expired){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();reportDbPromise_=null;};resolve(r.result);};
    r.onerror=()=>{clearTimeout(timeout);reject(r.error);};
    r.onblocked=()=>{expired=true;clearTimeout(timeout);reject(new Error('請關閉其他報修頁面後重試'));};
  }).catch(e=>{reportDbPromise_=null;throw e;});
  return reportDbPromise_;
}
async function reportStore_(action,value){
  const db=await openReportDb_();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('jobs',action==='getAll'?'readonly':'readwrite');
    const timeout=setTimeout(()=>{try{tx.abort();}catch(e){}db.close();reportDbPromise_=null;reject(new Error('手機暫存讀寫逾時'));},15000);
    const r=tx.objectStore('jobs')[action](value);
    tx.oncomplete=()=>{clearTimeout(timeout);resolve(r.result);};
    tx.onerror=()=>{clearTimeout(timeout);reject(tx.error||r.error);};tx.onabort=()=>{clearTimeout(timeout);reject(tx.error||new Error('暫存失敗'));};
  });
}
async function initReportJobs_(){
  if(reportInitPromise_)return reportInitPromise_;
  reportInitPromise_=(async()=>{
    const rows=await reportStore_('getAll');
    for(const raw of rows){
      const job=withoutDeviceData_(raw);
      if(JSON.stringify(raw)!==JSON.stringify(job))await reportStore_('put',job);
      reportJobs_.set(job.id,job);
    }
    renderReportJobs_();
    window.addEventListener('online',()=>void processReportJobs_());
    window.addEventListener('pageshow',()=>void processReportJobs_());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void processReportJobs_();});
    void processReportJobs_();
  })().catch(e=>{reportInitPromise_=null;throw e;});
  return reportInitPromise_;
}
async function enqueueReportJob_(payload){
  payload=withoutDeviceData_(payload);
  try { await initReportJobs_(); }
  catch(e){throw new Error('此瀏覽器目前無法保存待送資料，內容與照片仍保留，請稍後重試');}
  // The same draft may survive an interrupted page reset; do not queue it twice.
  const existing=reportJobs_.get(payload.operationId);
  if(existing){
    if(existing.payload && JSON.stringify(existing.payload)!==JSON.stringify(payload))throw new Error('此草稿已有背景送出紀錄，請先查看底部進度；目前輸入仍保留');
    return;
  }
  const job={id:payload.operationId,state:'queued',attempts:0,payload:JSON.parse(JSON.stringify(payload)),label:payload.area+' · '+payload.location,created:Date.now()};
  try {await reportStore_('put',job);}catch(e){throw new Error('暫存空間不足或無法寫入，內容與照片仍保留，尚未開始送出');}
  freshReportIds318_.add(job.id);
  reportJobs_.set(job.id,job);renderReportJobs_();
  if(reportJobsBusy_)reportRerun_=true;
}
async function sendReportJob_(payload){
  const controller=new AbortController();let timer;
  try {
    return await Promise.race([
      new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('送出結果待確認'));controller.abort();},45000);}),
      (async()=>{
        const r=await fetch(API_URL,{method:'POST',body:JSON.stringify(withoutDeviceData_(payload)),signal:controller.signal});
        const text=await r.text();
        if(!r.ok)throw new Error('連線暫時異常');
        const data=JSON.parse(text);
        if(data.success && payload.action!=='getReportReceipts' && !data.caseId)throw new Error('案件編號尚未確認');
        return data;
      })()
    ]);
  }finally{clearTimeout(timer);}
}
async function processReportJobs_(){
  if(reportJobsBusy_ || !navigator.onLine || document.hidden)return;
  reportJobsBusy_=true;
  clearTimeout(reportWakeTimer_);
  try {
    // Read durable state again on every wake; another tab may have completed a job.
    const rows=await reportStore_('getAll');
    reportJobs_.clear();
    rows.forEach(job=>reportJobs_.set(job.id,job));
    const pending=rows.filter(job=>job.state!=='done');
    for(let offset=0;offset<pending.length;offset+=50){
      const batch=pending.slice(offset,offset+50);
      let reply={receipts:{}},lookupFailed=false;
      const needsReceipt=batch.filter(j=>!(freshReportIds318_.has(j.id)&&j.state==='queued'&&j.attempts===0));
      try{
        if(needsReceipt.length){
        reply=await sendReportJob_({action:'getReportReceipts',operationIds:needsReceipt.map(j=>j.id)});
        if(!reply.success||reply.receiptProtocol!==1||!reply.receipts||typeof reply.receipts!=='object')throw new Error('未取得收件確認');
        }
      }catch(e){
        needsReceipt.forEach(job=>{job.message='暫時無法核對收件，稍後再確認';});
        renderReportJobs_();
        lookupFailed=true; // Never resend recovered jobs without receipt lookup.
      }
      for(const original of batch){
        const fresh=freshReportIds318_.has(original.id)&&original.state==='queued'&&original.attempts===0;
        if(lookupFailed&&!fresh)continue;
        const receipt=reply.receipts[original.id];
        if(receipt && typeof receipt.caseId==='string' && receipt.caseId){
          const done={...original,state:'done',caseId:receipt.caseId,message:''};
          delete done.payload;
          reportJobs_.set(done.id,await saveReportState_(done));
          try{invalidateReportCaches_();}catch(e){console.error(e);}
          continue;
        }
        if(original.state!=='queued'){
          if(original.state==='sending' && !(original.leaseUntil>Date.now())){
            original.state='uncertain';original.message='上次送出結果待確認，請按確認／重試';
            reportJobs_.set(original.id,await saveReportState_(original));
          }
          continue;
        }
        const job=await claimReportJob_(original.id,fresh);
        if(!job)continue;
        freshReportIds318_.delete(job.id);
        reportJobs_.set(job.id,job);renderReportJobs_();
        activeWriteCount++;
        try {
          const data=typeof sendWithPreparedPhotos318_==='function'?await sendWithPreparedPhotos318_(job.payload,sendReportJob_):await sendReportJob_(job.payload);
          if(!data.success){job.state='failed';job.message=data.message||'未完成送出';}
          else {
            job.state='done';job.caseId=data.caseId;job.message=data.warning||'';
            delete job.payload;
            try {invalidateReportCaches_();showToast('✓ 報修已送出 · '+data.caseId);}catch(e){console.error(e);}
          }
        }catch(e){job.state='uncertain';job.message='送出結果待確認，稍後自動核對';}
        finally{activeWriteCount=Math.max(0,activeWriteCount-1);}
        reportJobs_.set(job.id,await saveReportState_(job));
        renderReportJobs_();
      }
    }
    renderReportJobs_();
  }catch(e){
    console.error('Report queue recovery failed',e);
    showToast('送出進度暫時無法更新，資料仍保留，請稍後再開啟');
  }finally{
    reportJobsBusy_=false;
    if(reportRerun_||[...reportJobs_.values()].some(j=>j.state!=='done'))
      reportWakeTimer_=setTimeout(()=>void processReportJobs_(),reportRerun_?0:60000);
    reportRerun_=false;
  }
}
// Atomic IDB operations coordinate tabs. A confirmed receipt cannot regress.
async function changeReportState_(id,change){
  const db=await openReportDb_();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('jobs','readwrite'),store=tx.objectStore('jobs');
    const timeout=setTimeout(()=>{try{tx.abort();}catch(e){}db.close();reportDbPromise_=null;reject(new Error('手機暫存更新逾時'));},15000);
    let result=null;
    const request=store.get(id);
    request.onsuccess=()=>{
      result=change(request.result);
      if(result)store.put(result);
    };
    tx.oncomplete=()=>{clearTimeout(timeout);resolve(result);};
    tx.onerror=()=>{clearTimeout(timeout);reject(tx.error||request.error);};
    tx.onabort=()=>{clearTimeout(timeout);reject(tx.error||new Error('暫存更新失敗'));};
  });
}
function claimReportJob_(id,fresh=false){
  return changeReportState_(id,current=>{
    if(!current||current.state!=='queued'||current.leaseUntil>Date.now())return null;
    if(fresh&&current.attempts!==0)return null;
    return {...current,state:'sending',attempts:(current.attempts||0)+1,message:'',leaseUntil:Date.now()+120000};
  });
}
function saveReportState_(job){
  return changeReportState_(job.id,current=>{
    if(!current)return null;
    if(current.state==='done')return current;
    // Another active sender owns its pending state; receipts may always finish it.
    if(job.state!=='done' && current.leaseUntil>Date.now() && current.leaseUntil!==job.leaseUntil)return current;
    return {...job,leaseUntil:job.state==='sending'?job.leaseUntil:0};
  }).then(saved=>saved||job);
}
async function retryReportJob_(id){
  const job=reportJobs_.get(id);
  if(!job || !['failed','uncertain'].includes(job.state))return;
  // Same operationId: backend looks for the existing case before attempting creation.
  const queued={...job,state:'queued',message:''};
  try{reportJobs_.set(id,await saveReportState_(queued));renderReportJobs_();void processReportJobs_();}
  catch(e){showToast('暫存無法更新，請稍後重試');}
}
async function dismissReportJob_(id){
  if(reportJobs_.get(id)?.state!=='done')return;
  try{await reportStore_('delete',id);reportJobs_.delete(id);renderReportJobs_();}catch(e){showToast('暫時無法清除紀錄');}
}
function renderReportJobs_(){
  let box=document.getElementById('reportOutbox');
  if(!box){box=document.createElement('details');box.id='reportOutbox';document.body.append(box);}
  if(typeof mountActivityDock318_==='function')mountActivityDock318_();
  const jobs=[...reportJobs_.values()].sort((a,b)=>a.created-b.created);
  box.hidden=!jobs.length;document.body.classList.toggle('has-report-outbox',!!jobs.length);
  const pending=jobs.filter(j=>j.state!=='done').length,failed=jobs.filter(j=>['failed','uncertain'].includes(j.state)).length;
  const errorSignature=jobs.filter(j=>['failed','uncertain'].includes(j.state)).map(j=>j.id+':'+j.state).join('|');
  if(errorSignature&&box.dataset.errors!==errorSignature)box.open=true;
  box.dataset.errors=errorSignature;
  box.innerHTML='<summary aria-live="polite">'+(failed?'報修待確認 '+failed+' 件':pending?'報修背景送出中 '+pending+' 件':'報修已送出')+'<span>查看進度</span></summary>';
  const list=document.createElement('div');list.className='report-outbox-list';
  for(const job of jobs){
    const row=document.createElement('div');row.className='report-outbox-row';
    const text=document.createElement('div');
    const state={queued:navigator.onLine?'等待送出':'等待連線',sending:'送出中',uncertain:'結果待確認',failed:'送出失敗',done:'已送出 · '+job.caseId}[job.state];
    text.textContent=job.label+'｜'+state+(job.message?' · '+job.message:'');row.append(text);
    if(['failed','uncertain','done'].includes(job.state)){
      const btn=document.createElement('button');btn.type='button';btn.textContent=job.state==='done'?'完成':job.state==='uncertain'?'確認／重試':'重試';
      btn.onclick=()=>job.state==='done'?dismissReportJob_(job.id):retryReportJob_(job.id);row.append(btn);
    }
    list.append(row);
  }
  box.append(list);
}
