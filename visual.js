/* V3.19 — additive, on-demand tools. No background history or photo polling. */
'use strict';
const visual319_={floor:3,mode:'pending',days:'90',section:'cross',selected:'',history:new Map(),historySeq:0,historyBusy:false,historyError:'',detailSeq:0,workSeq:0,photoCache:new Map(),photoActive:0,photoQueue:[],objectUrls:[]};
const roomNorth319_=[1,3,5,7,9,11,15,17,19,21,23,25,27,29];
const roomSouth319_=[2,6,8,10,12,16,18],roomLeft319_=[36,38,40,42,46],roomRight319_=[35,37,39,41,43,45];
const roomSuffixes319_=[...roomNorth319_,...roomSouth319_,31,...roomLeft319_,...roomRight319_];
function vEsc319_(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function vButton319_(text,fn,kind=''){const b=document.createElement('button');b.type='button';b.className='v-button '+kind;b.textContent=text;b.onclick=fn;return b;}
function vPlace319_(c){return (c.correctedArea||c.area||'')+' · '+(c.normalizedLocation||c.location||'');}
function vRoom319_(c){
  if(String(c.correctedArea||c.area||'').trim()!=='會館')return '';
  const type=String(c.correctedLocType||c.locationType||'').trim();if(type&&type!=='客房')return '';
  const m=String(c.normalizedLocation||c.location||'').normalize('NFKC').trim().match(/^(?:會館\s*)?(?:房號\s*[:：]?\s*)?([356]\d{2})(?:\s*(?:號房|號|房|室))?$/);
  return m&&roomSuffixes319_.includes(Number(m[1].slice(1)))?m[1]:'';
}
function vPending319_(){return allCases.filter(c=>c.status==='待處理'&&!c.flagReason&&String(c.correctedArea||c.area||'').trim()==='會館');}
function vHeat319_(n){return n>=7?4:n>=4?3:n>=2?2:n===1?1:0;}
async function visualApi319_(payload){
  if(!getStoredAuthToken())throw Error('請先登入管理帳號');
  const data=await callReadApi_({...payload,token:getStoredAuthToken()},35000);
  if(!data?.success){if(data?.code==='UNAUTHORIZED')clearStoredAuth();const error=Error(data?.code==='UNAUTHORIZED'?'登入已過期，請重新登入':data?.message||'資料暫時無法讀取，請稍後重試');error.code=data?.code;throw error;}
  return data;
}
function invalidateVisual319_(){visual319_.history.clear();visual319_.historySeq++;visual319_.historyBusy=false;}
function resetVisual319_(){closeWorkbench319_();invalidateVisual319_();visual319_.photoCache.clear();visual319_.selected='';visual319_.detailSeq++;visual319_.mode='pending';visual319_.historyError='';}
function initVisual319_(){
  document.querySelector('#page-mgr .mgr-toolbar-actions')?.prepend(vButton319_('成果圖卡',()=>openAccomplishment319_(),'visual-entry319'));
  document.addEventListener('keydown',e=>{
    const w=document.getElementById('visualWorkbench319');if(!w)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeWorkbench319_();}
    if(e.key==='Tab'){
      e.stopImmediatePropagation();const list=[...w.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(x=>x.getClientRects().length);
      const a=list[0],b=list[list.length-1];if(!a)return;
      if(e.shiftKey&&(document.activeElement===a||!w.contains(document.activeElement))){e.preventDefault();b.focus();}
      else if(!e.shiftKey&&(document.activeElement===b||!w.contains(document.activeElement))){e.preventDefault();a.focus();}
    }
  },true);
}
function enterRooms319_(){renderRooms319_();if(visual319_.mode==='history')void loadHeat319_();else void loadCases();}
async function refreshRooms319_(){if(visual319_.mode==='history')await loadHeat319_(true);else await loadCases(true);}
async function loadHeat319_(force=false){
  const days=visual319_.days,cached=visual319_.history.get(days);
  if(!force&&cached&&Date.now()-cached.received<120000){renderRooms319_();return;}
  if(visual319_.historyBusy&&!force)return;
  const seq=++visual319_.historySeq;visual319_.historyBusy=true;visual319_.historyError='';renderRooms319_();
  try{const result=await visualApi319_({action:'getClubhouseHeatmap',days,force});if(seq!==visual319_.historySeq)return;
    if(result.coverage!=='main+archive'||!result.rooms)throw Error('後端尚未更新，請先部署本版 code.gs');
    visual319_.history.set(days,{...result,received:Date.now()});
  }catch(e){if(seq===visual319_.historySeq)visual319_.historyError=e.message;}
  finally{if(seq===visual319_.historySeq){visual319_.historyBusy=false;if(currentPageId==='rooms')renderRooms319_();}}
}
function renderRooms319_(){
  const root=document.getElementById('roomBoard319');if(!root)return;
  const s=visual319_,pending=vPending319_(),history=s.history.get(s.days),isHistory=s.mode==='history';
  const known=isHistory?!!history:!!(allCases.length||lastCasesSuccessfulSyncAt_||lastCasesLoadTime);
  const counts={};[3,5,6].forEach(f=>roomSuffixes319_.forEach(n=>counts[String(f*100+n)]=0));
  if(isHistory&&history)Object.assign(counts,history.rooms);else if(!isHistory)pending.forEach(c=>{const r=vRoom319_(c);if(r)counts[r]++;});
  const otherCount=isHistory?(history?.otherCount||0):pending.filter(c=>!vRoom319_(c)).length;
  const priorities=new Set(pending.filter(c=>c.todayPriority).map(vRoom319_));
  const floorCount=f=>roomSuffixes319_.reduce((n,x)=>n+counts[String(f*100+x)],0);
  const modeLabel=isHistory?'報修':'待處理';
  function tile(n,extra=''){
    const room=String(s.floor*100+n),count=counts[room],selected=s.selected===room,priority=!isHistory&&priorities.has(room);
    return `<button type="button" class="room-tile319 ${n===31?'room-corner319':''} heat-${vHeat319_(count)} ${selected?'selected':''}" data-room="${room}" ${extra} ${known?'':'disabled'} aria-pressed="${selected}" aria-label="${room} 房，${known?count+' 件'+modeLabel:'尚未取得資料'}${priority?'，今日優先':''}"><strong>${room}</strong><span>${!known?'—':count?`${!isHistory?'<i class="room-pulse319"></i>':''}${count} 件`:(isHistory?'0 件':'無待處理')}</span>${priority?'<b class="room-priority319" title="今日優先">!</b>':''}</button>`;
  }
  root.innerHTML=`<div class="room-toolbar319 v-panel"><div class="v-row spread"><div><p class="v-eyebrow">會館 · 房間位置</p><h2>${s.floor} 樓 <span>${known?floorCount(s.floor)+' 件'+modeLabel:'尚未取得資料'}</span></h2></div><div class="v-segment" aria-label="看板模式"><button type="button" data-mode="pending" aria-pressed="${!isHistory}">目前待處理</button><button type="button" data-mode="history" aria-pressed="${isHistory}">報修頻率</button></div></div>
    <div class="v-row spread"><div class="room-floors319">${[3,5,6].map(f=>`<button type="button" data-floor="${f}" aria-pressed="${s.floor===f}"><b>${f}F</b><span>${known?floorCount(f)+' 件':'—'}</span></button>`).join('')}</div>${isHistory?`<label class="v-label-inline">統計期間 <select id="roomDays319">${[['30','近 30 天'],['90','近 90 天'],['365','近一年'],['all','全部歷史']].map(([v,t])=>`<option value="${v}" ${s.days===v?'selected':''}>${t}</option>`).join('')}</select></label>`:'<p class="v-muted">顏色越深，待處理件數越多</p>'}</div>
    <div class="room-legend319">${['0','1','2–3','4–6','7+'].map((v,i)=>`<span><i class="heat-${i}"></i>${v} 件</span>`).join('')}${!isHistory?'<span class="priority-legend319">! 今日優先</span>':''}</div>
    ${isHistory?`<p class="v-muted" role="status">${s.historyBusy?'正在讀取完整歷史…':s.historyError?vEsc319_(s.historyError)+(history?'；目前顯示上次結果':''):history?`含主表與封存 · ${vEsc319_(history.range.from||'最早紀錄')} ～ ${vEsc319_(history.range.to)}${history.undatedCount?' · '+history.undatedCount+' 件缺少日期未計入':''}`:'尚未取得歷史資料'}</p>`:''}
  </div><div class="v-panel room-map-panel319"><div class="v-row spread"><h3>房號配置</h3><p class="v-muted">位置示意，非等比例平面圖</p></div>
    <div class="room-section-switch319 v-segment"><button type="button" data-section="cross" aria-pressed="${s.section==='cross'}">橫向走道</button><button type="button" data-section="wing" aria-pressed="${s.section==='wing'}">轉角走道</button></div>
    <div class="room-map-scroll319" tabindex="0" aria-label="房間配置，可左右捲動"><div class="room-diagram319 section-${s.section}"><div class="room-cross319">${roomNorth319_.map((n,i)=>tile(n,`style="grid-column:${i+1};grid-row:1"`)).join('')}<div class="room-corridor319 cross">走道 <span>→ 轉角</span></div>${roomSouth319_.map((n,i)=>tile(n,`style="grid-column:${i+2};grid-row:3"`)).join('')}${tile(31,'style="grid-column:14;grid-row:3"')}</div>
    <div class="room-wing319"><div class="room-corridor319 vertical">走<br>道</div>${roomLeft319_.map((n,i)=>tile(n,`style="grid-column:1;grid-row:${[1,2,3,5,6][i]}${n===40?' / span 2':''}"`)).join('')}${roomRight319_.map((n,i)=>tile(n,`style="grid-column:3;grid-row:${i+1}"`)).join('')}</div></div></div>
    <p class="v-muted room-mobile-hint319">橫向走道可左右滑動；轉角走道保留兩側房號位置。</p>
    <div class="room-foot319"><p class="v-muted">無待處理僅代表沒有待處理報修，與住宿或可售狀態無關。</p><button type="button" id="roomOther319" class="v-button">公共區域／其他位置 <b>${known?otherCount:'—'}</b></button></div></div><div id="roomDetail319" class="v-panel" ${s.selected?'':'hidden'}></div>`;
  root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{s.mode=b.dataset.mode;s.selected='';s.historySeq++;s.historyBusy=false;renderRooms319_();if(s.mode==='history')void loadHeat319_();else void loadCases();refreshSyncStatusView316_();});
  root.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{s.floor=Number(b.dataset.floor);s.selected='';renderRooms319_();});
  root.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{s.section=b.dataset.section;renderRooms319_();});
  root.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>selectRoom319_(b.dataset.room));
  root.querySelector('#roomOther319').disabled=!known;root.querySelector('#roomOther319').onclick=()=>selectRoom319_('other');
  root.querySelector('#roomDays319')?.addEventListener('change',e=>{s.days=e.target.value;s.selected='';s.historySeq++;s.historyBusy=false;void loadHeat319_();});
  if(s.selected)void renderRoomDetail319_();
}
function selectRoom319_(room){visual319_.selected=room;renderRooms319_();document.getElementById('roomDetail319')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
async function renderRoomDetail319_(page=0){
  const s=visual319_,root=document.getElementById('roomDetail319');if(!root||!s.selected)return;
  const seq=++s.detailSeq,room=s.selected,mode=s.mode;
  root.innerHTML=`<div class="v-row spread"><h3>${room==='other'?'公共區域／其他位置':vEsc319_(room)+' 房'} · ${mode==='history'?'報修紀錄':'待處理'}</h3><button type="button" class="v-button" id="roomDetailClose319">收起</button></div><div id="roomDetailRows319" role="status">讀取中…</div>`;
  root.querySelector('#roomDetailClose319').onclick=()=>{s.selected='';s.detailSeq++;renderRooms319_();};
  const rows=root.querySelector('#roomDetailRows319');
  try{
    let data;if(mode==='history')data=await visualApi319_({action:'getVisualCases',scope:'room',room,days:s.days,page});
    else {const pool=vPending319_().filter(c=>room==='other'?!vRoom319_(c):vRoom319_(c)===room);data={cases:pool.slice(page*40,(page+1)*40),total:pool.length,hasMore:(page+1)*40<pool.length};}
    if(seq!==s.detailSeq||!rows.isConnected)return;
    rows.replaceChildren();rows.removeAttribute('role');
    const info=document.createElement('p');info.className='v-muted';info.textContent=data.total?'共 '+data.total+' 件':'目前沒有符合的案件';rows.append(info);
    (data.cases||[]).forEach(c=>{
      const b=vButton319_('',()=>openVisualCase319_(c),'room-case319');
      b.innerHTML=`<span><strong>${vEsc319_(c.description||'未填寫描述')}</strong><small>${vEsc319_(c.caseId)} · ${vEsc319_(c.datetime)}${room==='other'?' · '+vEsc319_(c.normalizedLocation||c.location):''}</small></span><span>${vEsc319_(c.status)}${c.archived?' · 已封存':''} ›</span>`;rows.append(b);
    });
    const nav=document.createElement('div');nav.className='v-row';if(page)nav.append(vButton319_('上一頁',()=>void renderRoomDetail319_(page-1)));if(data.hasMore)nav.append(vButton319_('下一頁',()=>void renderRoomDetail319_(page+1)));rows.append(nav);
  }catch(e){if(seq!==s.detailSeq||!rows.isConnected)return;rows.textContent=e.message;rows.append(vButton319_('重試',()=>void renderRoomDetail319_(page)));}
}
function openVisualCase319_(c){
  const live=allCases.find(x=>x.caseId===c.caseId);
  if(live&&!c.archived){openCaseActionModal(live.rowIndex);if(panelContext318_)panelContext318_.ids=vPending319_().filter(x=>visual319_.selected==='other'?!vRoom319_(x):vRoom319_(x)===visual319_.selected).map(x=>x.caseId);return;}
  void openHistoricalCase319_(c);
}
async function openHistoricalCase319_(c){
  const w=openWorkbench319_('案件紀錄');w.body.textContent='讀取中…';
  try{const data=await visualApi319_({action:'getVisualCase',caseId:c.caseId});if(!w.alive())return;c=data.case;
    w.body.innerHTML=`<p class="v-eyebrow">${vEsc319_(c.caseId)} · ${c.archived?'封存紀錄':'案件紀錄'}</p><h2>${vEsc319_(vPlace319_(c))}</h2><p class="v-muted">${vEsc319_(c.datetime)} · ${vEsc319_(c.status)}</p><div class="v-panel"><h3>${vEsc319_(c.description)}</h3><p>${vEsc319_(c.repairNote||'未填寫維修紀錄')}</p></div>`;
    w.footer.append(vButton319_('照片比較',()=>void openCompare319_(c)));
  }catch(e){if(w.alive())workError319_(w,e,()=>void openHistoricalCase319_(c));}
}

// A separate workbench leaves the case editor, entered notes and scroll intact.
function openWorkbench319_(title){
  closeWorkbench319_();const s=visual319_,seq=++s.workSeq,focus=document.activeElement,overflow=document.body.style.overflow;
  const root=document.createElement('div');root.id='visualWorkbench319';root.className='visual319';
  root.innerHTML=`<section class="v-workbench" role="dialog" aria-modal="true" aria-labelledby="vWorkTitle319"><header><div><p class="v-eyebrow">修繕工具</p><h2 id="vWorkTitle319">${vEsc319_(title)}</h2></div><button type="button" class="v-close" aria-label="關閉工具">×</button></header><div class="v-workbody"></div><footer class="v-workfooter"></footer></section>`;
  document.body.append(root);document.body.style.overflow='hidden';
  const w={root,body:root.querySelector('.v-workbody'),footer:root.querySelector('footer'),alive:()=>seq===s.workSeq&&root.isConnected,cleanup:null,focus,overflow};s.workbench=w;
  root.querySelector('.v-close').onclick=closeWorkbench319_;root.querySelector('.v-close').focus({preventScroll:true});return w;
}
function closeWorkbench319_(){
  const w=visual319_.workbench;visual319_.workSeq++;if(!w)return;
  w.cleanup?.();w.root.remove();document.body.style.overflow=w.overflow;if(w.focus?.isConnected)w.focus.focus({preventScroll:true});visual319_.workbench=null;
  visual319_.objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));
}
function workError319_(w,error,retry){w.body.replaceChildren();const p=document.createElement('p');p.className='v-error';p.setAttribute('role','alert');p.textContent=error.message||'暫時無法讀取';w.body.append(p);if(error.code==='UNAUTHORIZED'||!getStoredAuthToken())w.body.append(vButton319_('重新登入',()=>{closeWorkbench319_();pendingPage=currentPageId==='form'?'mgr':currentPageId;showLock();}));else if(retry)w.body.append(vButton319_('重試',retry));}
function installVisualCaseTools319_(c){
  const box=document.createElement('div');box.className='visual-case-tools319';
  box.append(vButton319_('照片比較',()=>void openCompare319_(c)));
  if(c.status==='已結案'&&!c.flagReason&&!c.closeSyncState)box.append(vButton319_('編排 PPT',()=>void openPptEditor319_(c)));
  document.getElementById('caseActionContent')?.prepend(box);
}
function vFileId319_(url){return String(url).match(/[?&]id=([\w-]+)/)?.[1]||String(url).match(/\/d\/([\w-]+)/)?.[1]||'';}
function vPhotos319_(c){return [...(c.reportPhotos||[]).map((url,i)=>({fileId:vFileId319_(url),url,label:'報修照片 '+(i+1),group:'report'})),...(c.closePhotos||[]).map((url,i)=>({fileId:vFileId319_(url),url,label:'結案照片 '+(i+1),group:'close'}))];}
function photoData319_(c,p){
  const key=c.caseId+':'+p.fileId,cache=visual319_.photoCache,old=cache.get(key);
  if(old&&Date.now()-old.time<600000&&(old.ready||old.owner===visual319_.workSeq))return old.promise;
  const promise=new Promise((resolve,reject)=>{visual319_.photoQueue.push({c,p,resolve,reject,owner:visual319_.workSeq});pumpPhotos319_();});const entry={time:Date.now(),promise,ready:false,owner:visual319_.workSeq};cache.set(key,entry);
  promise.then(()=>{entry.ready=true;},()=>{if(cache.get(key)===entry)cache.delete(key);});while(cache.size>24)cache.delete(cache.keys().next().value);return promise;
}
function pumpPhotos319_(){
  const s=visual319_;while(s.photoActive<2&&s.photoQueue.length){const job=s.photoQueue.shift();if(job.owner!==s.workSeq){job.reject(Error('照片工具已關閉'));continue;}s.photoActive++;
    visualApi319_({action:'getVisualPhoto',caseId:job.c.caseId,fileId:job.p.fileId}).then(d=>{if(!/^data:image\/(jpeg|png|webp);base64,/.test(d.dataUrl||''))throw Error('照片格式無效');job.resolve(d.dataUrl);}).catch(job.reject).finally(()=>{s.photoActive--;pumpPhotos319_();});
  }
}
function image319_(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('照片無法解碼'));img.src=src;});}
function drawContain319_(ctx,img,x,y,w,h){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*ratio,ih=img.naturalHeight*ratio;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}

async function openCompare319_(c){
  const w=openWorkbench319_('照片比較');w.body.textContent='讀取照片資料…';
  try{
    const data=await visualApi319_({action:'getVisualCase',caseId:c.caseId});if(!w.alive())return;c=data.case;
    const photos=vPhotos319_(c),before=photos.filter(p=>p.group==='report'),after=photos.filter(p=>p.group==='close');
    w.body.innerHTML=`<p class="v-muted">${vEsc319_(vPlace319_(c))} · ${vEsc319_(c.description)}</p><div class="v-row spread"><div class="v-segment" id="compareMode319"><button type="button" data-view="side" aria-pressed="true">並排比較</button><button type="button" data-view="slider" aria-pressed="false" ${!before.length||!after.length?'disabled':''}>滑動比較</button></div><span class="v-muted">滑動比較適合同角度照片</span></div><div class="compare-pickers319">${[before,after].map((list,i)=>`<label>${i?'結案':'報修'}照片<select id="compareSelect${i}319" ${list.length?'':'disabled'}>${list.length?list.map((p,n)=>`<option value="${n}">${vEsc319_(p.label)}</option>`).join(''):'<option>沒有照片</option>'}</select></label>`).join('')}</div><div class="compare-stage319" data-view="side"><figure><figcaption>報修</figcaption><div id="compareBefore319" class="compare-image319"></div></figure><figure><figcaption>結案</figcaption><div id="compareAfter319" class="compare-image319"></div></figure></div><label id="compareRangeWrap319" hidden>比較位置<input id="compareRange319" type="range" min="0" max="100" value="50" aria-label="報修與結案照片分界"></label><p id="compareStatus319" class="v-muted" role="status"></p>`;
    let seq=0;const stage=w.body.querySelector('.compare-stage319'),status=w.body.querySelector('#compareStatus319');
    const load=async()=>{const mine=++seq;status.textContent='照片讀取中…';
      await Promise.all([before,after].map(async(list,i)=>{const target=w.body.querySelector(i?'#compareAfter319':'#compareBefore319');target.textContent=list.length?'讀取中…':'尚無'+(i?'結案':'報修')+'照片';if(!list.length)return;
        try{const src=await photoData319_(c,list[Number(w.body.querySelector('#compareSelect'+i+'319').value)]);if(!w.alive()||mine!==seq)return;const img=await image319_(src);if(!w.alive()||mine!==seq)return;img.alt=i?'結案照片':'報修照片';target.replaceChildren(img);}
        catch(e){if(w.alive()&&mine===seq){target.textContent=e.message;target.append(vButton319_('重試',()=>void load()));}}
      }));if(w.alive()&&mine===seq)status.textContent='照片以完整比例顯示';};
    w.body.querySelectorAll('select').forEach(el=>el.onchange=()=>void load());
    w.body.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.onclick=()=>{stage.dataset.view=b.dataset.view;w.body.querySelector('#compareRangeWrap319').hidden=b.dataset.view!=='slider';w.body.querySelectorAll('#compareMode319 button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};});
    w.body.querySelector('#compareRange319').oninput=e=>stage.style.setProperty('--compare-cut',e.target.value+'%');await load();
  }catch(e){if(w.alive())workError319_(w,e,()=>void openCompare319_(c));}
}

// Annotation is limited to new local images; no remote original is overwritten.
async function openAnnotation319_(prefix,index){
  const source=selectedPhotoLibraryItems_(prefix)[index];if(!source)return;
  const owner=prefix.startsWith('close-')?findCaseForAction318_(Number(prefix.slice(6)))?.caseId:'';
  const w=openWorkbench319_('照片標註');
  w.body.innerHTML=`<div class="v-row annotation-tools319"><label>工具<select id="annotationTool319"><option value="circle">圈選</option><option value="arrow">箭頭</option><option value="pen">畫筆</option><option value="text">文字</option></select></label><label>顏色<select id="annotationColor319"><option value="#E14D25">橘紅</option><option value="#1562C0">藍色</option><option value="#FFFFFF">白色</option><option value="#FFC52A">黃色</option></select></label><label class="annotation-text319">標註文字<input id="annotationText319" maxlength="30" placeholder="填寫後點照片放置"></label></div><div class="annotation-canvas319"><canvas id="annotationCanvas319" aria-label="照片標註畫布"></canvas></div><p class="v-muted">在照片上拖曳圈選或箭頭；選文字後點選放置位置。套用後才會更新這張待送照片。</p>`;
  const undo=vButton319_('復原',()=>{strokes.pop();render();}),clear=vButton319_('清除標註',()=>{strokes=[];render();});w.footer.append(undo,clear);
  let strokes=[],draft=null,img,canvas=w.body.querySelector('canvas'),ctx=canvas.getContext('2d');
  const apply=vButton319_('套用標註',()=>{
    if(selectedPhotoLibraryItems_(prefix)[index]!==source||(owner&&findCaseForAction318_(Number(prefix.slice(6)))?.caseId!==owner)){showToast('照片或案件已變更，請重新開啟標註');return;}
    render();const result=canvas.toDataURL('image/jpeg',.82);photoData[prefix][index]=result;renderPhotoLibraryPicker_(prefix);preparePhotos318_(prefix,photoData[prefix]);closeWorkbench319_();showToast('照片標註已套用');
  },'primary');apply.disabled=true;w.footer.append(vButton319_('取消',closeWorkbench319_),apply);
  function draw(stroke){
    const a=stroke.points[0],b=stroke.points[stroke.points.length-1];ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineWidth=Math.max(3,canvas.width/160);ctx.lineCap='round';ctx.lineJoin='round';
    if(stroke.tool==='text'){ctx.font='bold '+Math.max(18,canvas.width/22)+'px sans-serif';ctx.strokeStyle=stroke.color==='#FFFFFF'?'#153e53':'#FFFFFF';ctx.lineWidth=2;ctx.strokeText(stroke.text,a.x,a.y);ctx.fillText(stroke.text,a.x,a.y);return;}
    ctx.beginPath();if(stroke.tool==='circle'){ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(1,Math.abs(b.x-a.x)/2),Math.max(1,Math.abs(b.y-a.y)/2),0,0,Math.PI*2);}
    else {ctx.moveTo(a.x,a.y);stroke.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));}ctx.stroke();
    if(stroke.tool==='arrow'){const angle=Math.atan2(b.y-a.y,b.x-a.x),len=Math.max(12,canvas.width/28);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-len*Math.cos(angle-.5),b.y-len*Math.sin(angle-.5));ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-len*Math.cos(angle+.5),b.y-len*Math.sin(angle+.5));ctx.stroke();}
  }
  function render(){if(!img)return;ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);strokes.forEach(draw);if(draft)draw(draft);undo.disabled=!strokes.length;clear.disabled=!strokes.length;}
  try{img=await image319_(source);if(!w.alive())return;const scale=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);render();apply.disabled=false;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.min(canvas.width,Math.max(0,(e.clientX-r.left)*canvas.width/r.width)),y:Math.min(canvas.height,Math.max(0,(e.clientY-r.top)*canvas.height/r.height))};};
    canvas.onpointerdown=e=>{e.preventDefault();if(strokes.length>=60){showToast('單張照片最多 60 個標註');return;}const tool=w.body.querySelector('#annotationTool319').value,text=w.body.querySelector('#annotationText319').value.trim();if(tool==='text'&&!text){w.body.querySelector('#annotationText319').focus();return;}draft={tool,text,color:w.body.querySelector('#annotationColor319').value,points:[point(e)]};canvas.setPointerCapture(e.pointerId);render();};
    canvas.onpointermove=e=>{if(!draft)return;const p=point(e);if(draft.tool==='pen')draft.points.push(p);else if(draft.tool!=='text')draft.points[1]=p;render();};
    canvas.onpointerup=()=>{if(!draft)return;strokes.push(draft);draft=null;render();};canvas.onpointercancel=()=>{draft=null;render();};
  }catch(e){if(w.alive())workError319_(w,e);}
}

function shortText319_(text,limit){let s='',width=0;for(const c of String(text||'')){const n=/[\x20-\x7e]/.test(c)?.6:1;if(c==='\n'||width+n>limit)return s+'…';s+=c;width+=n;}return s;}
function pptPages319_(photos){const pages=[],per=photos.length?Math.ceil(photos.length/Math.ceil(photos.length/4)):4;for(let i=0;i<photos.length;i+=per)pages.push(photos.slice(i,i+per));return pages.length?pages:[[]];}
function drawPpt319_(canvas,model,photos,page=0){
  const ctx=canvas.getContext('2d');canvas.width=1440;canvas.height=810;ctx.scale(2,2);
  const navy='#082B50',orange='#F58220',muted='#536D82';ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,720,405);
  const text=(v,x,y,size,color=navy,bold=false,align='left')=>{ctx.fillStyle=color;ctx.font=(bold?'700 ':'')+size+'px "Noto Sans TC",sans-serif';ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(v,x,y);};
  ctx.fillStyle=navy;ctx.fillRect(20,68,680,3);ctx.fillStyle=orange;ctx.fillRect(20,68,125,3);
  text(shortText319_(model.title,22),360,18,28,navy,true,'center');text('結案日期：'+model.date,360,77,13,navy,true,'center');
  if(page===0){ctx.fillStyle='#EAF4FA';ctx.fillRect(20,104,680,81);[['處理原因',model.description],['處理內容',model.repairNote],['處理結果','已結案']].forEach(([k,v],i)=>{ctx.fillStyle=i?navy:orange;ctx.fillRect(29,113+i*24,3,15);text(k+'：',38,112+i*24,14,i?navy:orange,true);text(shortText319_(v,35),128,112+i*24,14);});}
  const pages=pptPages319_(photos),items=pages[page],top=page===0?198:106,bottom=369,gap=10,width=items.length?(680-gap*(items.length-1))/items.length:0;
  items.forEach((p,i)=>{const x=20+i*(width+gap),h=bottom-top-30;ctx.fillStyle='#EAF4FA';ctx.fillRect(x,top,width,bottom-top);if(p.img)drawContain319_(ctx,p.img,x+4,top+4,width-8,h-8);else text('照片讀取中',x+width/2,top+h/2,11,muted,false,'center');ctx.fillStyle=navy;ctx.fillRect(x,top+h,width,26);text(shortText319_(p.label,Math.max(4,Math.floor(width/12)-1)),x+width/2,top+h+5,12,'#FFFFFF',true,'center');ctx.fillStyle=orange;ctx.fillRect(x,bottom-2,width,2);});
  text(model.caseId,20,380,9,muted);text('處理人員：'+shortText319_(model.closerName,18),280,380,9,muted);text((page+1)+' / '+pages.length,660,380,9,muted,false,'center');
}
async function openPptEditor319_(initial){
  const w=openWorkbench319_('PPT 編排');w.body.textContent='讀取案件與照片…';
  try{
    const data=await visualApi319_({action:'getVisualCase',caseId:initial.caseId});if(!w.alive())return;const c=data.case;
    if(c.status!=='已結案'||c.flagReason||c.archived)throw Error('請從主表的正常已結案案件開啟編排');
    const photos=vPhotos319_(c),model={title:(vPlace319_(c)+' '+(c.description||'修繕紀錄')).slice(0,120),description:String(c.description||'').slice(0,400),repairNote:String(c.repairNote||'').slice(0,400),date:String(c.closeDatetime||'（未記錄）').split(' ')[0].replaceAll('/','.'),caseId:c.caseId,closerName:c.closerName||'—'};
    w.body.innerHTML=`<div class="ppt-editor319"><div class="ppt-fields319"><label>報告標題<input id="pptTitle319" maxlength="120" value="${vEsc319_(model.title)}"></label><label>處理原因<textarea id="pptCause319" maxlength="400" rows="2">${vEsc319_(model.description)}</textarea></label><label>處理內容<textarea id="pptNote319" maxlength="400" rows="2">${vEsc319_(model.repairNote)}</textarea></label><p class="v-muted">編排僅影響本次 PPT；照片保留完整比例。長文字會在版面內截短，不加文字續頁。</p><h3>照片順序與說明</h3><div id="pptPhotos319"></div></div><div class="ppt-preview319"><canvas id="pptCanvas319" aria-label="PPT 版面預覽"></canvas><div id="pptPageNav319" class="v-row"></div><p class="v-muted">版面預覽；實際字型以 PowerPoint 顯示為準。</p><p id="pptPreviewStatus319" role="status" class="v-muted">照片讀取中…</p></div></div>`;
    let page=0,ready=photos.length===0,dragIndex=-1;const canvas=w.body.querySelector('canvas'),status=w.body.querySelector('#pptPreviewStatus319');
    const redraw=()=>{drawPpt319_(canvas,model,photos,page);const nav=w.body.querySelector('#pptPageNav319');nav.replaceChildren();const pages=pptPages319_(photos);pages.forEach((_,i)=>{const b=vButton319_('第 '+(i+1)+' 頁',()=>{page=i;redraw();});b.setAttribute('aria-pressed',String(page===i));nav.append(b);});};
    ['pptTitle319','pptCause319','pptNote319'].forEach((id,i)=>{w.body.querySelector('#'+id).oninput=e=>{model[['title','description','repairNote'][i]]=e.target.value;redraw();};});
    const move=(from,to)=>{if(to<0||to>=photos.length)return;const [p]=photos.splice(from,1);photos.splice(to,0,p);renderPhotoList();redraw();};
    function renderPhotoList(){const list=w.body.querySelector('#pptPhotos319');list.replaceChildren();photos.forEach((p,i)=>{
      const row=document.createElement('div');row.className='ppt-photo-row319';row.draggable=true;row.innerHTML=`<span class="ppt-order319">${i+1}</span><label><span class="v-sr-only">第 ${i+1} 張照片說明</span><input maxlength="40" value="${vEsc319_(p.label)}"></label>`;
      row.querySelector('input').oninput=e=>{p.label=e.target.value;redraw();};const up=vButton319_('↑',()=>move(i,i-1)),down=vButton319_('↓',()=>move(i,i+1));up.setAttribute('aria-label','第 '+(i+1)+' 張移前');down.setAttribute('aria-label','第 '+(i+1)+' 張移後');up.disabled=i===0;down.disabled=i===photos.length-1;row.append(up,down);
      row.ondragstart=e=>{if(e.target.tagName==='INPUT'){e.preventDefault();return;}dragIndex=i;e.dataTransfer.setData('text/plain',String(i));};row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();if(dragIndex>=0)move(dragIndex,i);dragIndex=-1;};list.append(row);
    });if(!photos.length)list.textContent='這筆案件沒有照片';}
    const generate=vButton319_('產生編排後 PPT',async()=>{
      if(!ready)return;if(!model.title.trim()){showToast('請填寫報告標題');return;}
      const current=allCases.find(x=>x.caseId===c.caseId);if(!current){showToast('案件已移動，請重新整理後再試');return;}
      const options={baseKey:data.baseKey,title:model.title,description:model.description,repairNote:model.repairNote,photos:photos.map(p=>({fileId:p.fileId,label:p.label}))};
      generate.disabled=true;status.textContent='正在製作，可關閉編排視窗；完成後管理頁會顯示下載連結。';await generateReport318_(current.rowIndex,generate,options);
      if(w.alive()){generate.disabled=false;const job=pptJobs318_.get(c.caseId);status.textContent=job?.state==='done'?'PPT 已完成':'製作進度已顯示於管理頁';if(job?.state==='done'){const a=document.createElement('a');a.className='v-button primary';a.href=job.result.url;a.target='_blank';a.rel='noopener';a.textContent='下載 PPT';w.footer.querySelector('a')?.remove();w.footer.append(a);}}
    },'primary');generate.disabled=!ready;w.footer.append(vButton319_('關閉',closeWorkbench319_),generate);renderPhotoList();redraw();
    const loadPhotos=async()=>{generate.disabled=true;status.textContent='照片讀取中…';try{await Promise.all(photos.map(async p=>{if(p.img)return;p.img=await image319_(await photoData319_(c,p));if(w.alive())redraw();}));if(!w.alive())return;ready=true;generate.disabled=false;status.textContent='預覽已準備好';}catch(e){if(w.alive()){status.textContent=e.message;status.append(vButton319_('重新載入照片',()=>void loadPhotos()));}}};await loadPhotos();
  }catch(e){if(w.alive())workError319_(w,e,()=>void openPptEditor319_(initial));}
}

function wrapCanvas319_(ctx,text,maxWidth,maxLines){const out=[];let line='';for(const ch of String(text||'')){if(ch==='\n'||ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch==='\n'?'':ch;if(out.length===maxLines){out[maxLines-1]=out[maxLines-1].slice(0,-1)+'…';return out;}}else line+=ch;}if(line)out.push(line);return out;}
function drawAccomplishment319_(canvas,title,items){
  canvas.width=1600;canvas.height=items.length===4?1580:1000;const ctx=canvas.getContext('2d'),H=canvas.height;
  ctx.fillStyle='#F2F6FA';ctx.fillRect(0,0,1600,H);ctx.fillStyle='#102B40';ctx.fillRect(0,0,1600,190);ctx.fillStyle='#F58220';ctx.fillRect(64,52,8,58);
  ctx.fillStyle='#FFFFFF';ctx.font='bold 46px sans-serif';ctx.fillText(shortText319_(title,25),96,98);ctx.fillStyle='#BDD1DF';ctx.font='25px sans-serif';ctx.fillText('已完成 '+items.length+' 件 · 修繕紀錄',98,148);
  const cols=items.length===4?2:Math.max(1,items.length),gap=28,cardW=(1472-gap*(cols-1))/cols;
  items.forEach((item,i)=>{const x=64+(i%cols)*(cardW+gap),y=224+Math.floor(i/cols)*620;ctx.fillStyle='#FFFFFF';ctx.fillRect(x,y,cardW,590);ctx.fillStyle='#E7EEF4';ctx.fillRect(x+18,y+18,cardW-36,342);
    if(item.img)drawContain319_(ctx,item.img,x+22,y+22,cardW-44,334);else{ctx.fillStyle='#5A7285';ctx.font='26px sans-serif';ctx.fillText('無照片',x+40,y+185);}
    ctx.fillStyle='#F58220';ctx.fillRect(x+28,y+384,5,33);ctx.fillStyle='#183B53';ctx.font='bold 29px sans-serif';ctx.fillText(shortText319_(vPlace319_(item.c),Math.floor((cardW-70)/29)),x+48,y+411);
    ctx.font='25px sans-serif';wrapCanvas319_(ctx,item.caption,cardW-60,3).forEach((line,j)=>ctx.fillText(line,x+30,y+454+j*34));
    ctx.fillStyle='#667D8F';ctx.font='20px sans-serif';ctx.fillText(String(item.c.closeDatetime||'').split(' ')[0]+' · '+item.c.caseId,x+30,y+561);
  });ctx.fillStyle='#5A7285';ctx.font='22px sans-serif';ctx.fillText('渴望園區 · 設施服務中心',64,H-42);
}
async function openAccomplishment319_(){
  const w=openWorkbench319_('成果圖卡'),selected=new Map();let days='30',page=0,seq=0,exportSeq=0;
  w.body.innerHTML=`<div class="v-row spread"><label class="v-label-inline">結案期間<select id="cardDays319"><option value="30">近 30 天</option><option value="90">近 90 天</option><option value="365">近一年</option><option value="all">全部歷史</option></select></label><span class="v-muted">含封存案件 · 最多選 4 件</span></div><label class="v-field">圖卡標題<input id="cardTitle319" maxlength="50" value="修繕成果"></label><div class="accomplishment-layout319"><div><h3>選擇已結案案件</h3><div id="cardCases319"></div><div id="cardCasePages319" class="v-row"></div></div><div><h3>已選案件 <span id="cardCount319">0 / 4</span></h3><div id="cardSelection319"></div></div></div><div id="cardResult319"></div><p id="cardStatus319" class="v-muted" role="status"></p>`;
  const list=w.body.querySelector('#cardCases319'),selection=w.body.querySelector('#cardSelection319'),status=w.body.querySelector('#cardStatus319'),result=w.body.querySelector('#cardResult319');
  const invalidate=()=>{exportSeq++;result.replaceChildren();visual319_.objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));status.textContent='';};
  const renderSelected=()=>{selection.replaceChildren();w.body.querySelector('#cardCount319').textContent=selected.size+' / 4';exportBtn.disabled=!selected.size||[...selected.values()].some(x=>x.loading||x.error);
    if(!selected.size)selection.innerHTML='<p class="v-muted">選取案件後，可調整每件的照片與說明。</p>';
    selected.forEach((item,id)=>{const el=document.createElement('div');el.className='card-selected319';el.innerHTML=`<div class="v-row spread"><b>${vEsc319_(vPlace319_(item.c))}</b></div><p class="v-muted">${item.loading?'照片資料讀取中…':item.error?vEsc319_(item.error):vEsc319_(id)}</p>`;
      el.firstElementChild.append(vButton319_('移除',()=>{selected.delete(id);invalidate();renderSelected();syncChecked();}));
      if(item.error)el.append(vButton319_('重試',()=>void loadItem(item,id)));
      if(!item.loading&&!item.error){const label=document.createElement('label');label.textContent='代表照片';const select=document.createElement('select');select.innerHTML='<option value="-1">不使用照片</option>'+item.photos.map((p,i)=>`<option value="${i}">${vEsc319_(p.label)}</option>`).join('');select.value=String(item.photoIndex);select.onchange=()=>{item.photoIndex=Number(select.value);invalidate();};label.append(select);el.append(label);
        const input=document.createElement('textarea');input.maxLength=120;input.rows=2;input.value=item.caption;input.setAttribute('aria-label',id+' 圖卡說明');input.oninput=()=>{item.caption=input.value;invalidate();};el.append(input);}
      selection.append(el);
    });};
  const syncChecked=()=>list.querySelectorAll('input[type=checkbox]').forEach(box=>box.checked=selected.has(box.value));
  const loadItem=async(item,id)=>{item.loading=true;item.error='';renderSelected();try{const d=await visualApi319_({action:'getVisualCase',caseId:id});if(!w.alive()||selected.get(id)!==item)return;
      if(d.case.status!=='已結案'||d.case.flagReason)throw Error('案件狀態已變更，請移除後重新選擇');item.c=d.case;item.baseKey=d.baseKey;item.photos=vPhotos319_(d.case);const close=item.photos.findIndex(p=>p.group==='close');item.photoIndex=close>=0?close:item.photos.length?0:-1;item.loading=false;renderSelected();
    }catch(e){if(w.alive()&&selected.get(id)===item){item.loading=false;item.error=e.message;renderSelected();}}};
  const loadCases=async()=>{const mine=++seq;list.textContent='讀取已結案案件…';w.body.querySelector('#cardCasePages319').replaceChildren();try{const d=await visualApi319_({action:'getVisualCases',scope:'completed',days,page});if(!w.alive()||mine!==seq)return;
      if(d.coverage!=='main+archive')throw Error('後端尚未更新，請先部署本版 code.gs');list.replaceChildren();
      const count=document.createElement('p');count.className='v-muted';count.textContent='符合期間共 '+d.total+' 件';list.append(count);
      d.cases.forEach(c=>{const label=document.createElement('label');label.className='card-case-choice319';label.innerHTML=`<input type="checkbox" value="${vEsc319_(c.caseId)}"><span><b>${vEsc319_(vPlace319_(c))}</b><span>${vEsc319_(c.description)}</span><small>${vEsc319_(c.closeDatetime)}${c.archived?' · 已封存':''}</small></span>`;const input=label.querySelector('input');input.checked=selected.has(c.caseId);input.onchange=()=>{invalidate();if(!input.checked)selected.delete(c.caseId);else{if(selected.size>=4){input.checked=false;showToast('成果圖卡最多選 4 件');return;}const item={c,caption:c.repairNote||c.description||'',photos:[],photoIndex:-1,loading:true};selected.set(c.caseId,item);void loadItem(item,c.caseId);}renderSelected();};list.append(label);});
      const nav=w.body.querySelector('#cardCasePages319');if(page)nav.append(vButton319_('上一頁',()=>{page--;void loadCases();}));if(d.hasMore)nav.append(vButton319_('下一頁',()=>{page++;void loadCases();}));
    }catch(e){if(w.alive()&&mine===seq){list.textContent=e.message;list.append(vButton319_('重試',()=>void loadCases()));}}};
  const exportBtn=vButton319_('產生圖卡',async()=>{
    const mine=++exportSeq;exportBtn.disabled=true;status.textContent='正在準備圖卡照片…';result.replaceChildren();
    try{const items=[...selected.values()].map(x=>({...x}));const title=w.body.querySelector('#cardTitle319').value.trim()||'修繕成果';
      await Promise.all(items.map(async item=>{const fresh=await visualApi319_({action:'getVisualCase',caseId:item.c.caseId});if(fresh.baseKey!==item.baseKey||fresh.case.status!=='已結案'||fresh.case.flagReason)throw Error('案件內容已更新，請移除後重新選取：'+item.c.caseId);if(item.photoIndex>=0)item.img=await image319_(await photoData319_(item.c,item.photos[item.photoIndex]));}));
      if(!w.alive()||mine!==exportSeq)return;const canvas=document.createElement('canvas');canvas.className='card-export319';drawAccomplishment319_(canvas,title,items);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!w.alive()||mine!==exportSeq)return;if(!blob)throw Error('無法產生圖卡，請稍後重試');
      const url=URL.createObjectURL(blob);visual319_.objectUrls.push(url);const link=document.createElement('a');link.href=url;link.download='修繕成果_'+new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'})+'.png';link.className='v-button primary';link.textContent='下載圖卡 PNG';result.append(canvas,link);status.textContent='圖卡已完成，可下載保存。';result.scrollIntoView({block:'start',behavior:'instant'});
    }catch(e){if(w.alive()&&mine===exportSeq)status.textContent=e.message+'；可重試或選擇不使用照片。';}finally{if(w.alive())exportBtn.disabled=!selected.size||[...selected.values()].some(x=>x.loading||x.error);}
  },'primary');exportBtn.disabled=true;w.footer.append(status,vButton319_('關閉',closeWorkbench319_),exportBtn);
  w.body.querySelector('#cardDays319').onchange=e=>{days=e.target.value;page=0;void loadCases();};w.body.querySelector('#cardTitle319').oninput=invalidate;renderSelected();await loadCases();
}
