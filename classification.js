/* V3.21 UI: no timers/polling, no AI/network calls while recommending. */
var WorkUI320=(function(){
  'use strict';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels=Work320.categories.concat('待分類');
  const sourceLabel={manual:'人員確認',import:'匯入確認',auto:'系統建議',legacy:'沿用舊分類',pending:'待分類'};
  let selectedFacility='',review=[],reviewSelected=new Set(),reviewPage=0,reviewMode='pending',reviewSearch='',pendingBatch=[],busy=false;
  const states=new Map();
  let chartMode='category';
  function key(c){return String(c.caseId);}
  function state(c,note){
    let s=states.get(key(c));
    if(!s||s.token!==c.workToken){s={...Work320.base(c),token:c.workToken,manual:['manual','import'].includes(c.workSource),note:null};states.set(key(c),s);}
    if(!s.manual&&s.note!==String(note||'')){Object.assign(s,Work320.recommend(c,note));s.note=String(note||'');}
    return s;
  }
  function picker(c,id,note){
    const s=state(c,note===undefined?c.repairNote:note);
    return `<div class="work-picker" id="${id}" data-case="${esc(c.caseId)}" data-selected-type="${esc(s.category)}">
      <div class="work-summary"><strong>${esc(s.category)}</strong><span>${sourceLabel[s.source]||'待分類'}</span></div>
      <div class="work-hint">${esc(s.reason||'主分類每案計一次；不確定可先結案。')}</div>
      <details><summary>更改主分類</summary><div class="work-options">${labels.map((v,i)=>`<button type="button" data-work-category="${i}" aria-pressed="${s.category===v}" class="${s.category===v?'selected':''}">${v}</button>`).join('')}</div></details>
      <details ${s.tags.length?'open':''}><summary>工作項目${s.tags.length?' · '+s.tags.join('、'):'（可複選）'}</summary><div class="work-options">${Work320.tags.map((v,i)=>`<button type="button" data-work-tag="${i}" aria-pressed="${s.tags.includes(v)}" class="${s.tags.includes(v)?'selected':''}">${v}</button>`).join('')}</div></details>
    </div>`;
  }
  function caseFor(root){return findCaseById320_(root?.dataset.case);}
  function findCaseById320_(id){return (typeof allCases!=='undefined'?allCases:[]).find(c=>String(c.caseId)===String(id))||review.find(c=>String(c.caseId)===String(id));}
  function currentNote(c){const n=document.getElementById('note-'+c.rowIndex);if(n)return n.value;if(quickCloseState_.caseId===c.caseId&&document.getElementById('quickCloseBackdrop')?.classList.contains('open'))return document.getElementById('quickCloseNote').value;return c.repairNote||'';}
  function refresh(c){
    document.querySelectorAll('.work-picker').forEach(root=>{if(root.dataset.case!==String(c.caseId))return;const opens=[...root.querySelectorAll('details')].map(d=>d.open);const id=root.id;root.outerHTML=picker(c,id,currentNote(c));document.getElementById(id)?.querySelectorAll('details').forEach((d,i)=>d.open=opens[i]);});
    if(quickCloseState_.caseId===c.caseId)quickCloseState_.caseType=state(c,currentNote(c)).category;
  }
  const oldPicker=caseTypePickerHtml_;
  caseTypePickerHtml_=function(row,type){const c=findCaseByRowIndex_(row);return c?picker(c,'ctype-'+row):oldPicker(row,type);};
  getSelectedCaseType=function(row){const c=findCaseByRowIndex_(row);return c?state(c,currentNote(c)).category:'待分類';};
  // The current app uses a single case-action sheet; keep old shortcut callers compatible.
  openQuickClose=function(row){openCaseActionModal(row);};
  const oldRenderQuick=renderQuickCloseChips_;
  renderQuickCloseChips_=function(){oldRenderQuick();const c=findCaseByRowIndex_(quickCloseState_.rowIndex);if(c){document.getElementById('quickCloseType').innerHTML=picker(c,'work-quick-320',document.getElementById('quickCloseNote').value);quickCloseState_.caseType=state(c,currentNote(c)).category;document.getElementById('quickCloseTypeOther').style.display='none';}};
  const oldQuickNote=setQuickCloseNote;
  setQuickCloseNote=function(t){oldQuickNote(t);const c=findCaseByRowIndex_(quickCloseState_.rowIndex);if(c)refresh(c);};
  const oldActionNote=setCaseActionNote;
  setCaseActionNote=function(row,t){oldActionNote(row,t);const c=findCaseByRowIndex_(row);if(c)refresh(c);};
  document.addEventListener('input',e=>{
    if(e.target.matches('[id^="note-"]')){const c=findCaseByRowIndex_(Number(e.target.id.slice(5)));if(c)refresh(c);}
    if(e.target.id==='quickCloseNote'){const c=findCaseByRowIndex_(quickCloseState_.rowIndex);if(c)refresh(c);}
    if(e.target.id==='work-review-search'){reviewSearch=e.target.value;reviewPage=0;renderReview();}
    if(e.target.id==='facility-name-320'&&selectedFacility==='other'){document.getElementById('f-location').value=e.target.value;showNormPreview();}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-work-category],[data-work-tag]');if(!b)return;
    const root=b.closest('.work-picker'),c=caseFor(root);if(!c)return;const s=state(c,currentNote(c));
    if(b.dataset.workCategory!==undefined)s.category=labels[Number(b.dataset.workCategory)];
    else{const t=Work320.tags[Number(b.dataset.workTag)];s.tags=s.tags.includes(t)?s.tags.filter(x=>x!==t):s.tags.concat(t);}
    s.manual=true;s.source='manual';s.reason='已依你的選擇保留';refresh(c);
  });
  const oldSetLoc=setLocType;
  setLocType=function(t,b){selectedFacility='';oldSetLoc(t,b);const input=document.getElementById('facility-name-320');if(input){input.value='';input.hidden=true;}};
  const oldSetRestaurant=setRestaurant;
  setRestaurant=function(name,b){oldSetRestaurant(name,b);if(b.closest('#facility-quick-row')){selectedFacility=Work320.facilities.includes(name)?name:'other';const input=document.getElementById('facility-name-320');input.hidden=selectedFacility!=='other';input.value='';if(selectedFacility==='other'){document.getElementById('f-location').value='';input.focus();}}};
  function restoreFacility(detail,location){
    if(!Work320.validFacility(detail))return;
    const row=document.getElementById('facility-quick-row');
    const known=Work320.facilities.includes(detail),button=[...row.querySelectorAll('button')].find(b=>b.textContent.trim()===(known?detail:'其他設施'));
    if(!button)return;setRestaurant(known?detail:'其他設施',button);
    if(!known)document.getElementById('facility-name-320').value=detail;
    document.getElementById('f-location').value=location||detail;
  }
  function facilityValue(){const row=document.getElementById('facility-quick-row');if(!row.querySelector('.active'))return '';const detail=selectedFacility==='other'?document.getElementById('facility-name-320').value.trim():selectedFacility;return Work320.validFacility(detail)?detail:'';}
  function payload(c){
    if(!c.workToken)throw Error('請先更新 V3.21 後端並重新整理案件，再儲存分類');
    const s=state(c,currentNote(c));
    return {workClassification:{category:s.category,tags:s.tags},workExpectedToken:c.workToken,workSource:s.source,caseType:s.category};
  }
  function init(){
    const row=document.getElementById('facility-quick-row');
    const b=document.createElement('button');b.type='button';b.className='loc-type-btn';b.textContent='其他設施';b.onclick=()=>setRestaurant('其他設施',b);row.appendChild(b);
    const name=document.createElement('input');name.id='facility-name-320';name.placeholder='請填寫設施名稱，例如：會議室';name.maxLength=40;name.hidden=true;name.setAttribute('aria-label','其他設施名稱');row.after(name);
    const chart=document.getElementById('caseTypeChart');
    const toolbar=document.createElement('div');toolbar.className='work-toolbar';toolbar.innerHTML='<button type="button" id="work-category-mode">主分類</button><button type="button" id="work-tag-mode">工作項目</button><button type="button" id="work-review-open">整理分類／設施</button>';chart.before(toolbar);
    toolbar.querySelector('#work-category-mode').onclick=()=>{chartMode='category';renderDashboard();};
    toolbar.querySelector('#work-tag-mode').onclick=()=>{chartMode='tags';renderDashboard();};
    toolbar.querySelector('#work-review-open').onclick=()=>openReview();
    // Also reachable from management, without another main tab.
    const mgr=document.querySelector('#page-mgr .filter-row')||document.getElementById('page-mgr');
    if(mgr){const b=document.createElement('button');b.className='work-review-link';b.textContent='整理分類／設施';b.type='button';b.onclick=()=>openReview();mgr.appendChild(b);}
  }
  renderCaseTypeBreakdown_=function(snap){
    const root=document.getElementById('caseTypeChart'),counts=chartMode==='category'?snap.typeCounts||{}:snap.workCounts||{};
    document.getElementById('caseTypeOtherPanel').innerHTML='';
    if(!snap.workCounts){root.innerHTML='<p class="work-hint">請先部署 V3.21 後端，再重新整理統計。</p>';return;}
    const total=snap.closedTotal||0,entries=Object.entries(counts).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
    root.innerHTML=`<p class="work-hint">${chartMode==='category'?'已結案 '+total+' 件；含舊分類對應與系統初分。':'同案可有多個工作項目，比例以已結案件數為分母，不可相加為總件數。'}</p><div class="work-bars">${entries.map(([label,n],i)=>`<button type="button" class="work-bar" data-work-drill="${i}"><span>${esc(label)}</span><span>${n} 件 · ${total?Math.round(n/total*100):0}%</span><i style="width:${total?Math.min(100,n/total*100):0}%"></i></button>`).join('')||'<p>目前沒有已記錄的工作項目。</p>'}</div>`;
    root.querySelectorAll('[data-work-drill]').forEach(b=>{b.onclick=()=>drillByFilter(chartMode==='category'?'caseType':'workTag',entries[Number(b.dataset.workDrill)][0],entries[Number(b.dataset.workDrill)][0]);});
    document.getElementById('work-category-mode')?.setAttribute('aria-pressed',String(chartMode==='category'));
    document.getElementById('work-tag-mode')?.setAttribute('aria-pressed',String(chartMode==='tags'));
  };
  async function openReview(){
    if(!localStorage.getItem('adminToken')){showToast('請先登入管理者');return;}
    let dialog=document.getElementById('work-review-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='work-review-dialog';dialog.className='work-dialog';document.body.appendChild(dialog);}
    dialog.innerHTML='<div class="work-dialog-head"><strong>整理分類／設施</strong><button type="button" id="work-review-close">關閉</button></div><p id="work-review-status" role="status">讀取主表與封存案件中…</p><div id="work-review-controls"></div><div id="work-review-rows"></div><div id="work-review-preview"></div>';
    dialog.querySelector('#work-review-close').onclick=()=>{if(!busy)dialog.close();};dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.showModal();
    try{
      const data=await callApi({action:'getWorkReview'},60000);if(!data.success)throw Error(data.message||'讀取失敗');if(data.classificationProtocol!==1)throw Error('請先更新 V3.21 後端');
      review=data.cases||[];reviewSearch='';reviewSelected.clear();reviewPage=0;pendingBatch=[];
      const duplicate=new Set(data.duplicateIds||[]);review.forEach(c=>c.duplicate=duplicate.has(c.caseId));
      document.getElementById('work-review-controls').innerHTML=`<div class="work-toolbar"><input id="work-review-search" placeholder="搜尋地點、描述、分類" aria-label="搜尋分類案件"><select id="work-review-filter" aria-label="分類整理篩選"><option value="pending">待整理</option><option value="all">全部案件</option><option value="facility">設施未細分</option><option value="auto">系統初分</option></select><button id="work-export" type="button">匯出 AI 整理檔</button><label class="work-file">匯入建議 JSON<input type="file" id="work-import" accept=".json,application/json"></label></div><div class="work-toolbar"><select id="work-batch-category" aria-label="批次主分類"><option value="">選取案件：批次主分類</option>${labels.map(x=>`<option>${x}</option>`).join('')}</select><button type="button" id="work-batch-preview">預覽批次修改</button><button type="button" id="work-select-page">勾選本頁</button></div>`;
      document.getElementById('work-review-filter').value=reviewMode;
      document.getElementById('work-review-filter').onchange=e=>{reviewMode=e.target.value;reviewPage=0;renderReview();};
      document.getElementById('work-export').onclick=exportFile;
      document.getElementById('work-import').onchange=importFile;
      document.getElementById('work-batch-preview').onclick=()=>{const category=document.getElementById('work-batch-category').value;if(!category)return showToast('請先選主分類');const items=review.filter(c=>reviewSelected.has(c.caseId)).map(c=>({c,patch:{category,tags:c.workTags||[]}}));preview(items,'manual');};
      document.getElementById('work-select-page').onclick=()=>{filtered().slice(reviewPage*20,reviewPage*20+20).filter(c=>!c.duplicate).forEach(c=>reviewSelected.add(c.caseId));renderReview();};
      renderReview();
    }catch(e){document.getElementById('work-review-status').textContent=e.message+'；可關閉後重試。';}
  }
  function filtered(){return review.filter(c=>{
    if(reviewMode==='pending'&&c.workCategory!=='待分類'&&Work320.locationLabel(c)!=='設施／未細分')return false;
    if(reviewMode==='facility'&&Work320.locationLabel(c)!=='設施／未細分')return false;
    if(reviewMode==='auto'&&c.workSource!=='auto')return false;
    return !reviewSearch||[c.caseId,c.area,c.location,c.description,c.repairNote,c.workCategory,...(c.workTags||[])].join(' ').toLowerCase().includes(reviewSearch.toLowerCase());
  });}
  function renderReview(){
    const list=filtered(),pages=Math.max(1,Math.ceil(list.length/20));reviewPage=Math.min(reviewPage,pages-1);
    document.getElementById('work-review-status').textContent=`共 ${list.length} 件 · 已勾選 ${reviewSelected.size} 件 · 包含主表與封存；標記案件也保留供整理。`;
    const root=document.getElementById('work-review-rows');
    root.innerHTML=list.slice(reviewPage*20,reviewPage*20+20).map(c=>{
      const index=review.indexOf(c),facility=(c.correctedLocType||c.locationType)==='設施';
      return `<article class="work-review-row" data-review-index="${index}"><div class="work-review-title"><input type="checkbox" data-review-check ${reviewSelected.has(c.caseId)?'checked':''} ${c.duplicate?'disabled':''} aria-label="勾選 ${esc(c.caseId)}"><strong>${esc(c.caseId)} · ${esc(c.correctedArea||c.area)} · ${esc(c.normalizedLocation||c.location)}</strong></div><p>${esc(c.description)}</p><p class="work-hint">處理：${esc(c.repairNote||'未填寫')}｜原分類：${esc(c.originalCaseType||'未填')}｜${sourceLabel[c.workSource]||'待分類'}${c.archived?' · 已封存':''}${c.duplicate?' · 編號重複，禁止修改':''}</p><label>主分類 <select data-review-category>${labels.map(x=>`<option ${c.workCategory===x?'selected':''}>${x}</option>`).join('')}</select></label><details><summary>工作項目：${esc((c.workTags||[]).join('、')||'未填')}</summary><div class="work-options">${Work320.tags.map(t=>`<label><input type="checkbox" data-review-tag="${t}" ${(c.workTags||[]).includes(t)?'checked':''}>${t}</label>`).join('')}</div></details>${facility?`<label>設施細項 <input data-review-facility maxlength="40" placeholder="未細分" value="${esc(Work320.locationLabel(c)==='設施／未細分'?'':Work320.locationLabel(c))}" list="facility-list-320"></label>`:''}<div class="work-toolbar"><button type="button" data-review-save ${c.duplicate?'disabled':''}>儲存這筆分類</button><button type="button" data-review-suggest ${c.duplicate?'disabled':''}>查看規則建議</button>${c.workHistory?.length?'<button type="button" data-review-undo>預覽還原上次分類</button>':''}</div><small data-row-status role="status"></small></article>`;
    }).join('')+`<datalist id="facility-list-320">${Work320.facilities.map(x=>`<option>${x}</option>`).join('')}</datalist><div class="work-toolbar"><button id="work-prev" type="button" ${reviewPage===0?'disabled':''}>上一頁</button><span>${reviewPage+1}／${pages}</span><button id="work-next" type="button" ${reviewPage===pages-1?'disabled':''}>下一頁</button></div>`;
    root.querySelector('#work-prev').onclick=()=>{reviewPage--;renderReview();};root.querySelector('#work-next').onclick=()=>{reviewPage++;renderReview();};
    root.querySelectorAll('[data-review-check]').forEach(x=>x.onchange=()=>{const c=review[Number(x.closest('article').dataset.reviewIndex)];x.checked?reviewSelected.add(c.caseId):reviewSelected.delete(c.caseId);document.getElementById('work-review-status').textContent=`共 ${list.length} 件 · 已勾選 ${reviewSelected.size} 件`;});
    root.querySelectorAll('[data-review-save]').forEach(b=>b.onclick=()=>{
      const row=b.closest('article'),c=review[Number(row.dataset.reviewIndex)],patch={category:row.querySelector('[data-review-category]').value,tags:[...row.querySelectorAll('[data-review-tag]:checked')].map(x=>x.dataset.reviewTag)};
      if(row.querySelector('[data-review-facility]'))patch.facility=row.querySelector('[data-review-facility]').value.trim();
      try{Work320.validate(patch);preview([{c,patch}],'manual');}catch(e){row.querySelector('[data-row-status]').textContent=e.message;}
    });
    root.querySelectorAll('[data-review-suggest]').forEach(b=>b.onclick=()=>{const c=review[Number(b.closest('article').dataset.reviewIndex)];const suggestion=Work320.recommend({...c,workSource:'legacy'});preview([{c,patch:{category:suggestion.category,tags:suggestion.tags},reason:suggestion.reason}],'manual');});
    root.querySelectorAll('[data-review-undo]').forEach(b=>b.onclick=()=>{const c=review[Number(b.closest('article').dataset.reviewIndex)],h=c.workHistory.at(-1);preview([{c,patch:{category:h.category,tags:h.tags,...((c.correctedLocType||c.locationType)==='設施'?{facility:h.facility}: {})},reason:'還原到 '+h.at}],'manual');});
  }
  function preview(items,source){
    if(busy)return;if(!items.length)return showToast('沒有可套用的分類變更');
    try{items.forEach(x=>{Work320.validate(x.patch);if(x.c.duplicate)throw Error('案件編號重複，請先確認');});}catch(e){return showToast(e.message);}
    pendingBatch=items.map(x=>({...x,caseId:x.c.caseId,expectedToken:x.expectedToken||x.c.workToken,operationId:makeCloseOperationId_()}));
    const root=document.getElementById('work-review-preview');
    root.innerHTML=`<div class="work-preview"><strong>預覽 ${items.length} 筆修改</strong><p>只改分類與設施細項，不改案件原文、照片或結案時間。</p>${items.map(x=>`<p><b>${esc(x.c.caseId)}</b>：${esc(x.c.workCategory)} → ${esc(x.patch.category)}；工作：${esc((x.c.workTags||[]).join('、')||'未填')} → ${esc(x.patch.tags.join('、')||'未填')}${x.patch.facility!==undefined?'；設施：'+esc(Work320.locationLabel(x.c))+' → '+esc(x.patch.facility||'未細分'):''}${x.reason?' · '+esc(x.reason):''}</p>`).join('')}<button id="work-apply" type="button">確認套用</button><button id="work-cancel" type="button">取消</button><p id="work-apply-status" role="status"></p></div>`;
    document.getElementById('work-apply').onclick=()=>applyBatch(source);document.getElementById('work-cancel').onclick=()=>{pendingBatch=[];root.innerHTML='';};root.scrollIntoView({block:'start'});
  }
  async function applyBatch(source){
    if(busy)return;busy=true;const todo=[...pendingBatch],status=document.getElementById('work-apply-status');
    document.querySelectorAll('#work-review-dialog button,#work-review-dialog input,#work-review-dialog select').forEach(x=>x.disabled=true);
    let ok=0;const errors=[],remaining=[];
    try{
      for(let i=0;i<todo.length;i+=20){
        const batch=todo.slice(i,i+20);status.textContent=`儲存中 ${i}／${todo.length}…`;
        const data=await callApi({action:'patchWorkClassification',source,changes:batch.map(x=>({caseId:x.caseId,expectedToken:x.expectedToken,operationId:x.operationId,patch:x.patch}))},60000);
        if(!data.success)throw Error(data.message||'未完成');
        const results=new Map((data.results||[]).map(r=>[r.caseId,r]));
        for(const x of batch){const r=results.get(x.caseId);if(r?.success){ok++;Object.assign(x.c,r.case,{workHistory:r.workHistory||[]});states.delete(x.caseId);reviewSelected.delete(x.caseId);if(r.case.rowIndex>0)applyServerCasePatch_(r.case,data.version);}else{remaining.push(x);errors.push(x.caseId+'：'+(r?.message||'未收到結果'));}}
      }
      pendingBatch=remaining;
    }catch(e){errors.push(e.message+'；請先重新載入核對，或以相同操作重試。');/* preserve operation IDs for uncertain retries */}
    finally{
      busy=false;invalidateReportCaches_();
      document.querySelectorAll('#work-review-dialog button,#work-review-dialog input,#work-review-dialog select').forEach(x=>x.disabled=false);
      renderReview();
      status.textContent=`成功 ${ok} 筆。${errors.join('；')}`;document.getElementById('work-apply').disabled=pendingBatch.length===0;
      if(errors.some(x=>/已更新|找不到|重複/.test(x)))document.getElementById('work-apply').disabled=true;
    }
  }
  function exportFile(){
    const candidates=reviewSelected.size?review.filter(c=>reviewSelected.has(c.caseId)):filtered();
    const file={schema:'aspire-classification-1',exportedAt:new Date().toISOString(),instructions:'保留案件編號與 expectedToken。只填 suggestedCategory、suggestedTags、suggestedFacility、reason。null 代表不修改，tags 空陣列代表清除標籤，category 待分類代表清除主分類；資訊不足不要猜測。不要更改原始內容。',categories:labels,tags:Work320.tags,
      cases:candidates.map(c=>({caseId:c.caseId,expectedToken:c.workToken,original:{area:c.correctedArea||c.area,locationType:c.correctedLocType||c.locationType,location:c.normalizedLocation||c.location,description:c.description,repairNote:c.repairNote,category:c.workCategory,tags:c.workTags,facility:Work320.locationLabel(c)},suggestedCategory:null,suggestedTags:null,suggestedFacility:null,reason:''}))};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}));a.download='ASPIRE_分類整理_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function importFile(e){
    try{
      const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024)throw Error('檔案超過 10 MB，請分批匯入');
      const data=JSON.parse(await f.text());
      const {items,skipped}=Work320.importSuggestions(data,review);
      preview(items,'import');if(skipped.length)document.getElementById('work-review-status').textContent='已略過資料變更、編號重複或不存在的案件：'+skipped.join('、');
    }catch(err){showToast('匯入未套用：'+err.message);}finally{e.target.value='';}
  }
  init();
  return {payload,facilityValue,restoreFacility,openReview,preview,importFile};
})();
function facilityForm320_(){return WorkUI320.facilityValue();}
function workPayload320_(c){return WorkUI320.payload(c);}
function attachWorkPayload320_(c,p){if(!p.workClassification)Object.assign(p,workPayload320_(c));}
