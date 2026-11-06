/* V3.20: shared pure rules. The same source is bundled into code.gs. */
var Work320 = (function () {
  'use strict';
  const categories=['門窗與五金','建物與裝修','衛浴設備','給排水與熱水','照明設備','電力設備','空調與通風','弱電與門禁','消防設備','電梯與升降','家具與配備','專用設備','一般支援／庶務'];
  const tags=['油漆','防水','鐵工','木工','泥作','疏通','零件更換','清潔保養','調整修復','搬運布置'];
  const facilities=['休閒中心','泳池','教室','體育館'];
  const legacy={'弱電與資訊':'弱電與門禁','弱電':'弱電與門禁','空調':'空調與通風','照明':'照明設備','電力':'電力設備','消防':'消防設備','電梯':'電梯與升降','衛浴':'衛浴設備','給排水':'給排水與熱水','建物':'建物與裝修','建物土木':'建物與裝修','庶務':'一般支援／庶務'};
  function normalizeCategory(v){return v==='弱電與資訊'?'弱電與門禁':v;}
  function isTransferred(c){
    if(typeof c.transferredToGeneralAffairs==='boolean')return c.transferredToGeneralAffairs;
    const m=parse(c.workMetadata);
    if(typeof m.transferredToGeneralAffairs==='boolean')return m.transferredToGeneralAffairs;
    if(['轉總務','其他：轉總務處理'].includes(String(c.caseType||'')))return true;
    return String(c.repairNote||'').split(/\r?\n/).some(line=>/^轉交總務處處理(?:（|$)/.test(line.trim()));
  }
  function isRepairDone(c){return c.status==='已結案'&&!isTransferred(c);}
  function parse(raw){try{return String(raw||'').startsWith('WC320:')?JSON.parse(String(raw).slice(6)):{};}catch(e){return {};}}
  function encode(m){return 'WC320:'+JSON.stringify(m);}
  function base(c){
    if(c.workCategory!==undefined)return {category:normalizeCategory(c.workCategory)||'待分類',tags:c.workTags||[],source:c.workSource||'pending'};
    const old=String(c.caseType||'').trim();
    const category=categories.includes(old)?old:legacy[old]||'待分類';
    return {category,tags:tags.filter(t=>old===t),source:category==='待分類'?'pending':'legacy'};
  }
  function inferFacility(location){
    const text=String(location||'').trim();
    const found=facilities.filter(f=>text.includes(f));
    return found.length===1&&(text.startsWith(found[0])||/^\d+教室$/.test(text)||/^韻律教室$/.test(text))?found[0]:'';
  }
  function validFacility(value){return typeof value==='string'&&value.trim().length>0&&value.length<=40&&!/^(設施|其他|其他設施|未細分|待確認|待分類)$/.test(value.trim())&&!['__proto__','constructor','prototype'].includes(value.trim())&&!/[\x00-\x1f<>]/.test(value);}
  function locationLabel(c){
    const type=c.correctedLocType||c.locationType||'未填位置類型';
    if(type!=='設施')return type;
    if(c.facilityDetail!==undefined&&c.facilityDetail!==null)return c.facilityDetail||'設施／未細分';
    return inferFacility(c.normalizedLocation||c.location)||'設施／未細分';
  }
  // V3.21: learned vocabulary and equipment boundaries; no case IDs or personal data.
  function clean(text){return String(text||'').replace(/抽風善/g,'抽風扇').replace(/門弓氣/g,'門弓器').replace(/門檔/g,'門擋').replace(/賭塞/g,'堵塞').replace(/洗手檯/g,'洗手台').replace(/窗廉/g,'窗簾').replace(/燈炮/g,'燈泡').replace(/矽酸蓋板/g,'矽酸鈣板').replace(/呂框/g,'鋁框');}
  function clauses(text){return clean(text).split(/[，,。；;\n]/).map(x=>x.trim()).filter(Boolean);}
  function positive(text){return clauses(text).filter(s=>!/(尚未|還沒|未施|未更換|未修|未做|沒有更換|無需|不需|不必|預計|待料|待修|待施工|待更換|安排中|後續安排|再安排|先結案|轉交總務|依照合約|不方便施工)/.test(s));}
  function objects(text){
    let t=clean(text).replace(/(?:現勘|測試|確認|檢查)?插座有電/g,'').replace(/電話通知[^，,。；;\n)]*/g,'').replace(/房客有兩支電話[^，,。；;\n]*/g,'').replace(/(?:天花板|牆壁|牆|客梯|電梯|中溫池|冷卻水塔)(?:上方|下方|周圍|旁邊|旁|前|上|右手邊|側)(?=.{0,16}(燈|插座|除濕機|屋頂))/g,'').replace(/(?:不是|並非|非)(?:冷氣|空調|門鎖|電視|馬桶)(?:故障|問題)?/g,'');
    // A landmark is not the broken asset: TV wall, lamps near extinguishers, walls beside windows.
    t=t.replace(/電視(?:機)?(?=牆|旁牆|上方天花板)/g,'').replace(/滅火器(?:附近|旁|上方|下方)/g,'').replace(/(?:窗戶|小窗戶|大窗戶|窗台|窗邊|門)(?:旁邊|旁|周邊|周圍|邊|上方|下方)(?=.{0,12}(牆|油漆|裂痕|天花板))/g,'');
    t=t.replace(/(?:天花板|馬桶)(?:上方|上|的)?(?=.{0,6}燈)/g,'').replace(/房客有兩支電話[^，,。；;\n]*/g,'').replace(/先打電話/g,'');
    const out=new Set(),add=(cat,test)=>{if(test)out.add(cat);};
    const furniture=/置物櫃|衣櫥|衣櫃|櫃子|櫃體|櫃鎖|更衣室.{0,25}鎖頭|抽屜|床板|床架|床頭板|床頭櫃手把|行李架壁紙|桌腳|桌子|桌椅|圓桌|椅腳|窗簾|捲簾|拉簾|窗簾鏈|行軍床|行李推車|手推車|裝置花|壓克力箱|地墊|領台.*木條/.test(t);
    add('家具與配備',furniture);
    add('門窗與五金',/門鎖|電子鎖|喇叭鎖|門舌|鎖芯|鎖舌|門弓器|門擋|門框|門扇|門片|門把|拉門|鐵門|木門|紗窗|紗門|手推窗|窗戶|窗框|窗台|鋁框|玻璃門|防火門|一道門|推門手把|門卡卡|門關|門無法|門被推|更衣室門|對外門|小綠門|柵門|房卡|房間門|百葉窗|百葉破|門百葉|鐵捲門|自動門|柵欄門|大門|側門|反鎖|關門|開門|門歪|門故障|房門|地鉸鏈|地腳鏈|門軌道/.test(t)&&!furniture);
    add('建物與裝修',/牆|天花板|屋頂|地坪|磁磚|壁磚|地磚|樓板|隔間|輕鋼架|結構|筏基|矽酸鈣板|白水泥|水溝蓋|地板pvc|地板裂|地板破|鋼筋|鐵皮|壁紙|梁柱|樑上/.test(t)&&!(/行李架壁紙/.test(t)));
    add('衛浴設備',/馬桶|小便斗|洗手台|洗臉盆|臉盆|洗手槽|水龍頭|蓮蓬頭|淋浴頭|淋浴管|淋浴間出水|分水桿|落水皮|進水器|沖水閥|沖水桿|沖水按|衛生紙|毛巾架|浴室扶手|水槽|給皂|沐浴乳盒|洗手慕斯|鏡子|玻璃層架|熱水閥芯/.test(t));
    add('給排水與熱水',/排水孔|排水溝|水溝.*(阻塞|堵塞)|排污管|排水管|給水管|水管|水塔|供水|水池水位|上水池|下水池|揚水|加壓泵|廢水泵|防洪|抽水馬達|熱水器|熱水設備|沒熱水|熱水阻塞|鍋爐|回水|噴灌|澆水|灑水頭|止水閥|存水彎|清潔口|前置過濾|瀑布排水|流瀑排水/.test(t));
    add('照明設備',/燈泡|燈管|燈具|照明|崁燈|坎燈|日光燈|吸頂燈|電燈|筒燈|壁燈|玄關燈|門廳燈|路燈|軌道燈|防爆燈|燈軌|燈不亮|燈閃|燈色衰|燈壞|盞燈|燈亮度|燈光|燈.{0,6}(故障|閃爍|不會亮|不亮|壞|沒亮|熄滅|關不掉)/.test(t));
    add('電力設備',/插座|插孔|插頭|配電|斷路器|無熔絲|漏電開關|漏電箱|電盤|節能|電箱|電線拆除|供電異常|供電線路|該區跳電|房間.*跳電/.test(t));
    add('空調與通風',/冷氣|空調|排風|抽風|送風|風管|室內機|室外機|回風|出風口|通風口|浴室風扇|冰水|冰機|除濕機|集水盤|積水盤|冷凝水/.test(t));
    add('弱電與門禁',/安全門.*刷卡|電視|電話|網路|監視|監控|CCTV|MOD|機上盒|數據機|HDMI|wifi|路由器|讀卡|刷卡機|門禁|磁力鎖|感應警鈴|車牌辨識|車位數|感應線圈|柵欄機|PLC|能資源|麥克風|投影機|對講機|電視架|遙控器/i.test(t));
    add('消防設備',/火警|火災|偵煙|探測器|消防儲水|消防採水|消防.*漏|滅火器.*(故障|掉落|檢查)|安全警示燈|緊急照明/.test(t));
    add('電梯與升降',/電梯|客梯|貨梯|升降台|升降平台/.test(t));
    add('專用設備',/空壓機|冰球桌|烤箱|洗碗機|保溫櫃|保溫臺|飲水機|咖啡機|RO\s*水|淨水|濾芯|濾心|冰箱|籃球架|跑步機|溜滑梯|撞球桿|高壓水槍|瓦斯|高溫池|中溫池|(?:戲水|泳池).*過濾桶|CL值|CL異常/.test(t));
    // Prefer the actual faulty component over its mounting surface or nearby landmark.
    if(/鋼筋外露/.test(t))out.delete('照明設備');
    if(out.has('照明設備')&&!/天花板.*(破|漏|滲|塌)|牆.*(破|漏|滲)|壁紙/.test(t))out.delete('建物與裝修');
    if(/插座.*(脫落|落陷|外蓋)|插座蓋子|插座孔遺失/.test(t)){out.delete('建物與裝修');out.delete('家具與配備');out.delete('專用設備');}
    if(/磁力鎖|門禁|安全門.*刷卡/.test(t))out.delete('門窗與五金');
    if(/(?:鏡頭|監視|監控|網路|電話|電視|數據機)/.test(t)&&/更換電池/.test(t))out.delete('電力設備');
    if(/(?:門鎖|電子鎖|房卡|房間門)/.test(t)&&!/門禁|刷卡機|磁力鎖/.test(t))out.delete('弱電與門禁');
    if(/(?:水管|排水管|存水彎|清潔口)/.test(t)&&!/蓮蓬頭|另.*水龍頭/.test(t)){out.delete('衛浴設備');if(/烤箱旁/.test(t))out.delete('專用設備');}
    if(/鍋爐|回水/.test(t))out.delete('衛浴設備');
    if(/(?:白水泥|矽酸鈣板|結構漏水|鐵皮鏽蝕|油漆脫落|油漆發霉|發霉油漆)/.test(t)&&out.has('建物與裝修')){for(const cat of ['門窗與五金','衛浴設備','空調與通風','照明設備','電梯與升降','給排水與熱水','電力設備'])out.delete(cat);}
    if(out.has('專用設備')&&/冰球桌/.test(t))out.delete('空調與通風');
    if(/水槽/.test(t)&&out.has('家具與配備')&&/櫃子門/.test(t))out.delete('衛浴設備');
    // Integral parts stay with the asset, not the material or electrical component.
    if(out.has('空調與通風')){out.delete('弱電與門禁');if(/排水|冰水|集水盤|積水盤/.test(t))out.delete('給排水與熱水');}
    if(out.has('衛浴設備')&&!/水管|排水管|存水彎|清潔口|排水孔|排水溝|鍋爐|沒熱水|熱水阻塞/.test(t))out.delete('給排水與熱水');
    if(/電話插座|網路.*插座|插座.*網路/.test(t))out.delete('電力設備');
    if(/(?:燈具|檯燈).*插頭/.test(t)){out.delete('電力設備');out.add('照明設備');}
    if(out.has('電梯與升降')&&/電梯.*門|貨梯.*門|客梯.*門/.test(t))out.delete('門窗與五金');
    if(/(?:給水|供水|下水池|上水池).*過濾桶/.test(t)){out.delete('專用設備');out.add('給排水與熱水');}
    if(/(?:烤箱旁|烤箱).*水龍頭/.test(t))out.delete('專用設備');
    if(/冷氣|空調/.test(t)&&/遙控器/.test(t))out.delete('弱電與門禁');
    return [...out];
  }
  const tagRules=[['油漆',/補漆|粉刷|油漆|塗漆/],['防水',/防水處理|防水施工|施作防水|重做防水|防水修補|防水施做|填補矽利康|塗抹.*矽利康/],['鐵工',/焊接|電焊/],['木工',/木作|木工|新木料|加固木頭/],['泥作',/泥作|泥水|貼磚|補磚|補水泥|白水泥|補土/],['疏通',/疏通|清通|通管|清除樹葉|挖到.*頭髮/],['零件更換',/更換|換新|已換|換電池/],['清潔保養',/清洗|清潔|拆洗|清除淤泥|黃油潤滑|上油|wd40|回風網.*髒/],['調整修復',/調整|校正|矯正|修復|固定|黏|鎖回|鎖緊|設定|配對|復歸|復原|重開機|重置/],['搬運布置',/搬運|搬桌椅|活動布置|場地復原|拆搬/]];
  function recommend(c,note){
    const b=base(c);if(['manual','import'].includes(b.source))return {...b,reason:'保留人工分類',confidence:'confirmed'};
    note=clean(note===undefined?c.repairNote:note);const desc=clean(c.description),loc=clean(c.normalizedLocation||c.location);
    const scope=desc+' '+loc;let reported=objects(desc),done=objects(positive(note).join('；'));
    let category='待分類',reason='',confidence='high';
    // Service-only requests are counted together with repairs but do not imply failed equipment.
    if(/已撿回|已協助取回|已清除廢棄物|已除油處理|清除樹葉/.test(note)&&!/疏通|排水|水溝/.test(scope)){
      category='一般支援／庶務';reason='處理內容為取物、清除或支援';
    }else if(/識別證掉入|球丟|活動布置|場地復原|高壓水槍沖洗地面|指示牌.*掛回|告示牌掉落|數字.*掉落|房號數字黏貼|蜂巢|廠商用完沒有歸位|協助.*粉槽開啟|有落葉需清/.test(desc)){
      category='一般支援／庶務';reason='報修為支援作業';
    }else if(/飲水機/.test(desc)&&/沒電|無電/.test(desc)){
      category='電力設備';reason='安裝設備時發現供電問題';
    }else if(/水源.*關閉|關閉.*水源/.test(desc)){
      category='給排水與熱水';reason='供水系統關閉作業';
    }else if(/電風扇/.test(desc)&&!/冷氣/.test(desc)){
      category='空調與通風';reason='電風扇／通風設備';
    }else if(/遙控器/.test(desc)&&! /電視|機上盒|MOD/i.test(desc)&&c.caseType==='空調'){
      category='空調與通風';reason='遙控器用途依原空調紀錄辨識';confidence='medium';
    }else if(/防水|結構漏水/.test(note)&&/屋頂|戶外|鵝頸|穿牆|矽利康/.test(note)){
      category='建物與裝修';reason='處理內容指向建物外殼防水';
    }else if(/防塞錠/.test(note)&&/排水|水盤/.test(note)&&c.caseType==='空調'){
      category='空調與通風';reason='原空調案件，處理冷凝排水與防塞錠';
    }else if(/油漆/.test(desc)&&/窗.{0,12}(周圍|周邊|旁|邊)|天花板|滅火器附近/.test(desc)){
      category='建物與裝修';reason='設備旁牆面／天花裝修油漆';
    }else if(/拆電視(?:架)?、壓條/.test(desc)){
      category='弱電與門禁';reason='電視線路拆除為主要工作；牆面補修另列工作項目';
    }else if(/熱泵/.test(scope)&&!/熱水|鍋爐|空調供冷/.test(scope)){
      reason='熱泵用途未明：需確認供熱水或空調';
    }else{
      // A component-only repair note should inherit the explicitly reported asset.
      const componentOnly=/^(?:已)?(?:更換|調整|電源|軸承|開關|變壓器|電磁閥|二通閥|2通閥|計時器|保護電驛|電容|馬達)/.test(note)&&!/配電盤|電盤|斷路器|線路斷線/.test(note);
      if(componentOnly&&reported.length===1&&done.length===0)done=[];
      if(done.length===1){category=done[0];reason='依處理紀錄的明確對象／原因';}
      else if(done.length>1){reason='處理紀錄涉及多種設備，需確認主要項目';}
      else if(reported.length===1){category=reported[0];reason='依報修的設備／構件';}
      else if(reported.length>1){reason='報修涉及多種設備，需確認主要項目';}
      else{
        const at=objects(loc);
        if(at.length===1){category=at[0];reason='描述省略設備名稱，依明確位置補充';confidence='medium';}
        else if(b.category!=='待分類'){category=b.category;reason='內容不足，暫沿用舊系統分類';confidence='low';}
        else reason='未指出具體設備或構件';
      }
      // Leakage is a symptom; incidental furniture, TV or a ceiling is not proof of cause.
      if(/漏水|滲水|滴水|滲漏/.test(desc)&&!/結構|筏基|窗框|窗台|窗戶|鋁框|屋頂|外牆/.test(desc)&&
        !/冷氣|空調|冰水|風管|水管|水龍頭|蓮蓬頭|洗手|洗臉|馬桶|水池|水塔|過濾桶|軸封|淋浴管|澆水|高壓水槍|通風口|噴水頭/.test(desc)&&
        (!done.length||/沒有漏水|無漏水|再觀察|無發現|查無/.test(note))){
        if(/結構|筏基|防水|裂縫|屋頂/.test(note)||c.caseType==='防水'){category='建物與裝修';reason='沿用建物防水紀錄；漏點原因仍以現勘為準';confidence='medium';}
        else if(!/冷凝水|集水盤|積水盤|送風機|除濕機|冰箱|清潔口|水管|水龍頭|水盤/.test(note)){category='待分類';reason='漏水來源未明，不以天花板或鄰近設備推定原因';}
      }
    }
    const oldTags=b.tags||[],actual=positive(note).join('；');
    const blocked=/未更換|未施工|先結案|待料|已無滲漏|觀察無漏水|無漏水現象|經測試沒有問題|現勘正常|檢查設備正常|重覆報修|轉交總務|自行安排/.test(note);
    const completed=/完成|已修復|已處理/.test(note)&&!blocked;
    const taskText=actual+(completed?'；'+positive(desc).join('；'):'');
    const workTags=[...new Set([...oldTags,...tagRules.filter(x=>x[1].test(taskText)).map(x=>x[0])])];
    return {category,tags:workTags,source:category==='待分類'?'pending':'auto',reason,confidence:category==='待分類'?'review':confidence};
  }
  const baselineFields=['caseId','datetime','area','locationType','location','description','status','repairNote','normalizedLocation','flagReason','caseType','correctedLocType','correctedArea','closeDatetime','closerName','closeRevision'];
  function backupBaseline(c){return Object.fromEntries(baselineFields.map(k=>[k,String(c[k]??'')]));}
  function importSuggestions(data,review){
    if(!data||!['aspire-classification-1','aspire-classification-backup-1'].includes(data.schema)||!Array.isArray(data.cases)||data.cases.length>10000)throw Error('請使用本系統的分類 JSON');
    const legacyFile=data.schema==='aspire-classification-backup-1',byId=new Map(review.map(c=>[c.caseId,c])),seen=new Set(),items=[],skipped=[];
    for(const r of data.cases){
      if(typeof r.caseId!=='string'||seen.has(r.caseId))throw Error('檔案含缺少或重複的案件編號');seen.add(r.caseId);
      if(r.suggestedCategory==null&&r.suggestedTags==null&&r.suggestedFacility==null)continue;
      const c=byId.get(r.caseId);if(!c||c.duplicate){skipped.push(r.caseId);continue;}
      const match=legacyFile?(Number(c.workRevision||0)===0&&r.baseline&&baselineFields.every(k=>Object.prototype.hasOwnProperty.call(r.baseline,k)&&r.baseline[k]===backupBaseline(c)[k])):r.expectedToken===c.workToken;
      if(!match||!c.workToken){skipped.push(r.caseId);continue;}
      const patch={category:r.suggestedCategory==null?c.workCategory:r.suggestedCategory,tags:r.suggestedTags==null?c.workTags:r.suggestedTags};
      if(r.suggestedFacility!=null){if((c.correctedLocType||c.locationType)!=='設施')throw Error(r.caseId+' 不是設施案件');patch.facility=r.suggestedFacility;}
      Object.assign(patch,validate(patch));items.push({c,patch,expectedToken:c.workToken,reason:String(r.reason||'').slice(0,300)});
    }
    return {items,skipped};
  }
  function validate(p){
    if(p)p={...p,category:normalizeCategory(p.category)};
    if(!p||!categories.concat('待分類').includes(p.category))throw Error('請使用固定的主分類');
    if(!Array.isArray(p.tags)||p.tags.length>tags.length||p.tags.some(t=>!tags.includes(t))||new Set(p.tags).size!==p.tags.length)throw Error('工作項目不在選項清單內');
    if(p.facility!==undefined&&p.facility!==''&&!validFacility(p.facility))throw Error('設施名稱不完整或過長');
    return {category:p.category,tags:[...p.tags].sort(),...(p.facility!==undefined?{facility:p.facility.trim()}:{})};
  }
  return {normalizeCategory,isTransferred,isRepairDone,categories,tags,facilities,parse,encode,base,inferFacility,validFacility,locationLabel,recommend,validate,backupBaseline,importSuggestions,baselineFields};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Work320;
