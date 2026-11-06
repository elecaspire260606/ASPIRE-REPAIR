/* V3.21.3: edit location and classification in the existing case side panel. */
let caseEditor3213_=null,caseEditorSeq3213_=0;
function caseEditButton3213_(){return getStoredAuthToken()?'<div class="case-edit-entry"><button type="button" onclick="openCaseEditor3213_()">修改案件</button><span>調整場地、位置與維修分類</span></div>':'';}
function caseEditorOptions3213_(list,value){return [...new Set([...list,value].filter(Boolean))].map(x=>`<option value="${escapeHtml_(x)}" ${x===value?'selected':''}>${escapeHtml_(x)}</option>`).join('');}
async function openCaseEditor3213_(){
  const c=window.__panelCase3213;if(!c||caseEditor3213_?.busy)return;
  if(!getStoredAuthToken()){showToast('請先登入再修改案件');return;}
  const seq=++caseEditorSeq3213_;
  const button=document.querySelector('.case-edit-entry button');if(button){button.disabled=true;button.textContent='載入最新資料…';}
  try{
    const data=await callApi({action:'getVisualCase',caseId:c.caseId,rowHint:c.rowIndex},30000);
    if(seq!==caseEditorSeq3213_||window.__panelCase3213?.caseId!==c.caseId||!document.getElementById('caseDetailPanel').classList.contains('open'))return;
    if(!data.success||!data.case?.workToken)throw Error(data.message||'請先更新後端再使用修改功能');
    const fresh=data.case;caseEditor3213_={c:fresh,busy:false,pending:null};renderCaseEditor3213_();
  }catch(e){showToast(e.message||'載入失敗，請重試');}
  finally{if(button){button.disabled=false;button.textContent='修改案件';}}
}
function renderCaseEditor3213_(){
  const c=caseEditor3213_.c,b=Work320.base(c),type=c.correctedLocType||c.locationType||'公共區域／其他';
  const area=c.correctedArea||c.area,loc=String(c.normalizedLocation||c.location||''),facility=c.facilityDetail??Work320.inferFacility(loc);
  document.getElementById('panelBody').innerHTML=`<form id="caseEditForm3213" class="case-editor" onsubmit="event.preventDefault();saveCaseEditor3213_()">
    <h3>修改案件</h3><p class="case-edit-note">${escapeHtml_(c.caseId)} · ${escapeHtml_(c.status)}${c.rowIndex<0?' · 已封存':''}</p>
    <div class="case-edit-context">${escapeHtml_(c.description||'未填描述')}</div>
    <label>區域<select id="ce-area">${caseEditorOptions3213_(['會館','雅舍一棟','雅舍二棟','雅舍三棟','研究園','智尊','其他'],area)}</select></label>
    <label>地點／房號<input id="ce-location" maxlength="160" required value="${escapeHtml_(loc)}" placeholder="例如：B1停車場、629、球池"></label>
    <label>位置類型<select id="ce-type" onchange="toggleCaseFacility3213_()">${caseEditorOptions3213_(['客房','餐廳','辦公室','設施','公共區域／其他'],type)}</select></label>
    <label id="ce-facility-wrap">設施細項<input id="ce-facility" maxlength="40" list="ce-facilities" value="${escapeHtml_(facility||'')}" placeholder="選擇或輸入，例如：球池"><datalist id="ce-facilities">${[...Work320.facilities,'健身房','球池','撞球區','KTV'].map(x=>`<option value="${escapeHtml_(x)}">`).join('')}</datalist></label>
    <label>維修主分類<select id="ce-category">${caseEditorOptions3213_([...Work320.categories,'待分類'],b.category)}</select></label>
    <label><span><input type="checkbox" id="ce-transferred" ${Work320.isTransferred(c)?'checked':''}> 轉總務</span></label><p class="case-edit-note">標記後不計入修繕完成件數及結案率。這裡只更正紀錄，不寄信、不變更結案狀態。</p>
    <fieldset><legend>工作項目（可複選）</legend><div class="case-edit-tags">${Work320.tags.map(t=>`<label><input type="checkbox" name="workTag" value="${escapeHtml_(t)}" ${b.tags.includes(t)?'checked':''}>${escapeHtml_(t)}</label>`).join('')}</div></fieldset>
    <p class="case-edit-note">儲存後更新統計，保留原結案狀態、紀錄與照片。</p><p id="ce-message" role="status" aria-live="polite"></p>
    <div class="case-edit-actions"><button type="button" onclick="cancelCaseEditor3213_()">取消</button><button type="submit" id="ce-save">儲存修改</button></div></form>`;
  toggleCaseFacility3213_();
}
function toggleCaseFacility3213_(){const yes=document.getElementById('ce-type').value==='設施';document.getElementById('ce-facility-wrap').hidden=!yes;document.getElementById('ce-facility').required=yes;}
function cancelCaseEditor3213_(){if(caseEditor3213_?.busy)return;if(caseEditor3213_&&!confirm('放棄目前修改並返回案件內容？'))return;const c=caseEditor3213_?.c;caseEditor3213_=null;if(c)openCasePanel(c);}
async function saveCaseEditor3213_(){
  const state=caseEditor3213_;if(!state||state.busy)return;const form=document.getElementById('caseEditForm3213'),message=document.getElementById('ce-message');
  if(!state.pending){
    if(!form.reportValidity())return;
    const val=id=>document.getElementById(id).value.trim();
    const edit={transferredToGeneralAffairs:document.getElementById('ce-transferred').checked,area:val('ce-area'),location:val('ce-location'),locationType:val('ce-type'),facility:val('ce-type')==='設施'?val('ce-facility'):'',category:val('ce-category'),tags:[...form.querySelectorAll('[name=workTag]:checked')].map(x=>x.value)};
    if(edit.locationType==='設施'&&!Work320.validFacility(edit.facility)){message.textContent='請填寫具體設施名稱，例如球池或泳池';return;}
    state.pending={action:'patchCaseDetails3213',caseId:state.c.caseId,expectedToken:state.c.workToken,operationId:makeCloseOperationId_(),edit};
  }
  state.busy=true;form.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);message.textContent='儲存中…';
  let saved;
  try{
    const data=await callApi(state.pending,45000);
    if(!data.success){const e=new Error(data.message||'儲存失敗');e.code=data.code;throw e;}
    saved=data;
  }catch(e){
    state.busy=false;
    const conflict=['WORK_CONFLICT','CASE_AMBIGUOUS'].includes(e.code);
    const uncertain=!e.code||['RESULT_UNKNOWN','CASE_EDIT_UNCERTAIN'].includes(e.code);
    message.textContent=e.message||(uncertain?'結果待確認，請按重試確認':'儲存失敗');
    form.querySelectorAll('button').forEach(x=>x.disabled=false);
    if(conflict){document.getElementById('ce-save').disabled=true;message.textContent+='。請取消後重新開啟修改。';}
    else if(uncertain){document.getElementById('ce-save').textContent='重試確認';}
    else{state.pending=null;form.querySelectorAll('input,select').forEach(x=>x.disabled=false);}
    return;
  }
  // A rendering/cache refresh failure must not turn a committed save into a retry.
  caseEditor3213_=null;
  try{
    window.__panelCase3213=saved.case;openCasePanel(saved.case);
    if(saved.case.rowIndex>0)applyServerCasePatch_(saved.case,saved.version);
    for(const list of Object.values(window.caseListSources||{}))if(Array.isArray(list))for(const item of list)if(item.caseId===saved.case.caseId)Object.assign(item,saved.case);
    invalidateReportCaches_();closeDrillModal();showToast('案件資料已更新');
    if(currentPageId==='dash')await loadDashboardSnapshot(true);
  }catch(e){showToast('已儲存，請重新整理以更新統計');}
}
const originalCloseCasePanel3213_=closeCasePanel;
closeCasePanel=function(){if(caseEditor3213_?.busy){showToast('正在儲存，請稍候');return;}if(caseEditor3213_&&!confirm('放棄目前修改並關閉？'))return;caseEditor3213_=null;++caseEditorSeq3213_;window.__panelCase3213=null;originalCloseCasePanel3213_();};
