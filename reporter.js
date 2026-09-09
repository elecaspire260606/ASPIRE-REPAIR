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
  options.innerHTML='<label for="reporterRemember">在這台裝置記住</label><select id="reporterRemember"><option value="none">不記住</option><option value="full">單位、姓名與 Email</option><option value="unit">只記住單位（共用裝置）</option></select><p>成功送出後儲存；只適用此瀏覽器，不代表登入。</p><button type="button" id="reporterForget">清除身分</button>';
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
  success.innerHTML='<div class="reporter-success-head"><span aria-hidden="true">✓</span><strong id="reporterSuccessText"></strong></div><div class="reporter-next"><button type="button" id="reporterNew">新增其他報修</button><button type="button" id="reporterSame">同地點再報一件</button></div>';
  document.querySelector('#page-form > .card').before(success);
  document.getElementById('reporterNew').addEventListener('click',()=>continueReporter_(false));
  document.getElementById('reporterSame').addEventListener('click',()=>continueReporter_(true));
  document.querySelector('#page-form > .card').addEventListener('input',()=>{success.hidden=true;});
  document.querySelector('#page-form > .card').addEventListener('click',()=>{success.hidden=true;});
}
function reporterSubmitSuccess_(draft,mode,caseId){
  applyReporter_(draft); // Current session retains identity even without device persistence.
  lastSubmittedPlace_={area:draft.area,selectedBuilding:draft.selectedBuilding,locType:draft.locType,location:draft.location};
  try {
    localStorage.removeItem(REPORTER_KEY_);
    if(mode!=='none')localStorage.setItem(REPORTER_KEY_,JSON.stringify({version:1,mode,unit:draft.unit,name:mode==='full'?draft.name:'',email:mode==='full'?draft.email:''}));
  }catch(e){showToast('案件已送出，但此瀏覽器無法記住身分');}
  refreshReporterSummary_(true);
  document.getElementById('reporterSuccessText').textContent='報修已送出'+(caseId?' · '+caseId:'');
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
