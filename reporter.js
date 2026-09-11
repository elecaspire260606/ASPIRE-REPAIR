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
const reportJobs_=new Map();
function openReportDb_(){
  if(!reportDbPromise_)reportDbPromise_=new Promise((resolve,reject)=>{
    const r=indexedDB.open('aspire-report-outbox-v1',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('jobs',{keyPath:'id'});
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    r.onblocked=()=>reject(new Error('請關閉其他報修頁面後重試'));
  }).catch(e=>{reportDbPromise_=null;throw e;});
  return reportDbPromise_;
}
async function reportStore_(action,value){
  const db=await openReportDb_();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('jobs',action==='getAll'?'readonly':'readwrite');
    const r=tx.objectStore('jobs')[action](value);
    tx.oncomplete=()=>resolve(r.result);
    tx.onerror=()=>reject(tx.error||r.error);tx.onabort=()=>reject(tx.error||new Error('暫存失敗'));
  });
}
async function initReportJobs_(){
  if(reportInitPromise_)return reportInitPromise_;
  reportInitPromise_=(async()=>{
    const rows=await reportStore_('getAll');
    for(const job of rows){
      if(job.state==='sending'){job.state='uncertain';job.message='上次送出結果待確認';}
      reportJobs_.set(job.id,job);
    }
    renderReportJobs_();
    window.addEventListener('online',()=>void processReportJobs_());
    window.addEventListener('pageshow',()=>void processReportJobs_());
    void processReportJobs_();
  })().catch(e=>{reportInitPromise_=null;throw e;});
  return reportInitPromise_;
}
async function enqueueReportJob_(payload){
  try { await initReportJobs_(); }
  catch(e){throw new Error('此瀏覽器目前無法保存待送資料，內容與照片仍保留，請稍後重試');}
  // The same draft may survive an interrupted page reset; do not queue it twice.
  const existing=reportJobs_.get(payload.operationId);
  if(existing){
    if(existing.payload && JSON.stringify(existing.payload)!==JSON.stringify(payload))throw new Error('此草稿已有背景送出紀錄，請先查看底部進度；目前輸入仍保留');
    return;
  }
  const job={id:payload.operationId,state:'queued',payload:JSON.parse(JSON.stringify(payload)),label:payload.area+' · '+payload.location,created:Date.now()};
  try {await reportStore_('put',job);}catch(e){throw new Error('暫存空間不足或無法寫入，內容與照片仍保留，尚未開始送出');}
  reportJobs_.set(job.id,job);renderReportJobs_();
}
async function sendReportJob_(payload){
  const controller=new AbortController();let timer;
  try {
    return await Promise.race([
      new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('送出結果待確認'));controller.abort();},45000);}),
      (async()=>{
        const r=await fetch(API_URL,{method:'POST',body:JSON.stringify(payload),signal:controller.signal});
        const text=await r.text();
        if(!r.ok)throw new Error('連線暫時異常');
        const data=JSON.parse(text);
        if(data.success && !data.caseId)throw new Error('案件編號尚未確認');
        return data;
      })()
    ]);
  }finally{clearTimeout(timer);}
}
async function processReportJobs_(){
  if(reportJobsBusy_ || !navigator.onLine)return;
  reportJobsBusy_=true;
  try {
    for(const job of reportJobs_.values()){
      if(job.state!=='queued')continue;
      job.state='sending';job.message='';renderReportJobs_();
      try {await reportStore_('put',job);}catch(e){job.state='failed';job.message='無法更新暫存，尚未傳送';renderReportJobs_();continue;}
      activeWriteCount++;
      try {
        const data=await sendReportJob_(job.payload);
        if(!data.success){job.state='failed';job.message=data.message||'未完成送出';}
        else {
          job.state='done';job.caseId=data.caseId;job.message=data.warning||'';
          delete job.payload; // Successful jobs retain only their receipt, not identity/photos.
          try { invalidateReportCaches_(); showToast('✓ 報修已送出 · '+data.caseId); } catch(e) { console.error(e); }
        }
      }catch(e){job.state='uncertain';job.message='連線中斷或逾時，送出結果待確認';}
      finally{activeWriteCount=Math.max(0,activeWriteCount-1);}
      try{await reportStore_('put',job);}catch(e){job.message+='（暫存更新失敗）';}
      renderReportJobs_();
    }
  }finally{reportJobsBusy_=false;}
}
async function retryReportJob_(id){
  const job=reportJobs_.get(id);
  if(!job || !['failed','uncertain'].includes(job.state))return;
  // Same operationId: backend looks for the existing case before attempting creation.
  const queued={...job,state:'queued',message:''};
  try{await reportStore_('put',queued);reportJobs_.set(id,queued);renderReportJobs_();void processReportJobs_();}
  catch(e){showToast('暫存無法更新，請稍後重試');}
}
async function dismissReportJob_(id){
  if(reportJobs_.get(id)?.state!=='done')return;
  try{await reportStore_('delete',id);reportJobs_.delete(id);renderReportJobs_();}catch(e){showToast('暫時無法清除紀錄');}
}
function renderReportJobs_(){
  let box=document.getElementById('reportOutbox');
  if(!box){box=document.createElement('details');box.id='reportOutbox';document.body.append(box);}
  const jobs=[...reportJobs_.values()].sort((a,b)=>a.created-b.created);
  box.hidden=!jobs.length;document.body.classList.toggle('has-report-outbox',!!jobs.length);
  const pending=jobs.filter(j=>j.state!=='done').length,failed=jobs.filter(j=>['failed','uncertain'].includes(j.state)).length;
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
