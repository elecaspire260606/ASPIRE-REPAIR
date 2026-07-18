// ══════════════════════════════════════════════
// 🎮 史萊姆放置遊戲
// ══════════════════════════════════════════════
const SG_SAVE_KEY = 'aspire_slime_game_v1';
let sg = null; // 遊戲狀態
let sgTickInterval = null;
let sgLuckyInterval = null;
let sgAutoBuyInterval = null;
let sgActiveTab = 'shop';

const SG_STAGES = [
  { min:0,     name:'小史萊姆',     body:'#F4A24A', body2:'#E8761A', eye:'#1a1a1a', crown:false },
  { min:100,   name:'活力史萊姆',   body:'#7ED9A8', body2:'#2D9E5F', eye:'#1a1a1a', crown:false },
  { min:500,   name:'閃亮史萊姆',   body:'#7EC8E3', body2:'#2D8FBF', eye:'#1a1a1a', crown:false },
  { min:2000,  name:'星光史萊姆',   body:'#C89EF2', body2:'#8B4FD9', eye:'#1a1a1a', crown:false },
  { min:8000,  name:'超新星史萊姆', body:'#F2D46E', body2:'#E0A800', eye:'#1a1a1a', crown:true, glow:true },
  { min:30000, name:'史萊姆之王',   body:'#FFFFFF', body2:'#E8761A', eye:'#E8761A', crown:true, glow:true, royal:true },
];

const SG_ACHV_CATEGORIES = [
  { id:'clicks',       icon:'👆', name:'手動點擊次數', statFn:s=>s.manualClicks||0,                                           base:10,  ratio:6,   rewardType:'click',       rewardPerTier:0.03 },
  { id:'autoClicks',   icon:'🐿️', name:'自動點擊次數', statFn:s=>s.autoClicks||0,                                             base:50,  ratio:8,   rewardType:'rate',        rewardPerTier:0.03 },
  { id:'xp',           icon:'✨', name:'累積薪水',   statFn:s=>s.lifetimeXp||0,                                             base:100, ratio:10,  rewardType:'rate',        rewardPerTier:0.03 },
  { id:'prestige',     icon:'🔮', name:'轉生次數',   statFn:s=>s.prestigeCount||0,                                          base:1,   ratio:2,   rewardType:'crystalGain', rewardPerTier:0.05 },
  { id:'colleagueLv', icon:'📖', name:'同事總等級', statFn:s=>Object.values(s.colleagueLv||{}).reduce((a,b)=>a+b,0),      base:5,   ratio:3,   rewardType:'click',       rewardPerTier:0.03 },
  { id:'items',        icon:'🎒', name:'道具收集數', statFn:s=>Object.keys(s.itemInventory||{}).length,                    base:3,   ratio:1.7, rewardType:'rate',        rewardPerTier:0.04 },
  { id:'lucky',        icon:'🍀', name:'幸運史萊姆', statFn:s=>s.luckyClickCount||0,                                        base:3,   ratio:2.2, rewardType:'crit',        rewardPerTier:1 },
  { id:'crit',         icon:'🎯', name:'會心一擊',   statFn:s=>s.critCount||0,                                              base:10,  ratio:3,   rewardType:'click',       rewardPerTier:0.02 },
  { id:'combo',        icon:'🔥', name:'最高連擊',   statFn:s=>s.maxCombo||0,                                               base:10,  ratio:1.6, rewardType:'rate',        rewardPerTier:0.02 },
  { id:'certLv',       icon:'📋', name:'證照總等級', statFn:s=>Object.values(s.certLv||{}).reduce((a,b)=>a+b,0),           base:5,   ratio:2.5, rewardType:'click',       rewardPerTier:0.025 },
  { id:'officeLv',     icon:'🏢', name:'裝潢總等級', statFn:s=>Object.values(s.officeLv||{}).reduce((a,b)=>a+b,0),         base:5,   ratio:2.5, rewardType:'rate',        rewardPerTier:0.025 },
  { id:'propertyLv',   icon:'🏠', name:'房地產總等級', statFn:s=>Object.values(s.propertyLv||{}).reduce((a,b)=>a+b,0),     base:2,   ratio:2.5, rewardType:'rate',        rewardPerTier:0.03 },
  { id:'companySize',  icon:'🏭', name:'公司規模',   statFn:s=>Object.values(s.owned||{}).reduce((a,b)=>a+b,0),           base:50,  ratio:4,   rewardType:'rate',        rewardPerTier:0.03 },
  { id:'jobRank',      icon:'💼', name:'職級',       statFn:s=>sgGetJobRank().rank,                                        base:1,   ratio:1.4, rewardType:'crystalGain', rewardPerTier:0.03 },
];

function sgAchvTier(cat) {
  const val = cat.statFn(sg);
  if (val < cat.base) return 0;
  return Math.floor(Math.log(val/cat.base)/Math.log(cat.ratio)) + 1;
}

function sgAchvBonusSum(rewardType) {
  return SG_ACHV_CATEGORIES.filter(c=>c.rewardType===rewardType)
    .reduce((sum,c) => sum + sgAchvTier(c)*c.rewardPerTier, 0);
}

function sgCheckAchvTierUps() {
  if (!sg.achvSeenTiers) sg.achvSeenTiers = {};
  const ups = [];
  SG_ACHV_CATEGORIES.forEach(cat => {
    const tier = sgAchvTier(cat);
    const seen = sg.achvSeenTiers[cat.id] || 0;
    if (tier > seen) {
      sg.achvSeenTiers[cat.id] = tier;
      ups.push({ cat, tier });
    }
  });
  return ups;
}


const SG_SHOP = [
  { id:'click',   category:'maintenance', name:'💪 點擊力訓練',   desc:'每次點擊 +1 薪水',  baseCost:10,      costMul:1.15,  effect:'click', amount:1 },
  { id:'helper1', category:'maintenance', name:'🐌 蝸牛小弟',     desc:'+1 薪水/秒',        baseCost:25,      costMul:1.13,  effect:'rate',  amount:1 },
  { id:'adm1',    category:'admin',       name:'📠 傳真機',       desc:'每次點擊 +1.5 薪水',baseCost:45,      costMul:1.15,  effect:'click', amount:1.5, unlockReq:{itemId:'helper1',count:15} },
  { id:'click2',  category:'hotel',       name:'🧳 行李員',       desc:'每次點擊 +2 薪水',  baseCost:60,      costMul:1.14,  effect:'click', amount:2, unlockReq:{itemId:'adm1',count:15} },
  { id:'helper2', category:'maintenance', name:'🐢 烏龜工班',     desc:'+5 薪水/秒',        baseCost:150,     costMul:1.14,  effect:'rate',  amount:5, unlockReq:{itemId:'click2',count:15} },
  { id:'click3',  category:'hotel',       name:'🍽️ 餐飲部主管',   desc:'每次點擊 +3 薪水',  baseCost:300,     costMul:1.15,  effect:'click', amount:3, unlockReq:{itemId:'helper2',count:15} },
  { id:'helper8', category:'hotel',       name:'🛎️ 房務阿姨',     desc:'+10 薪水/秒',       baseCost:400,     costMul:1.135, effect:'rate',  amount:10, unlockReq:{itemId:'click3',count:15} },
  { id:'adm2',    category:'admin',       name:'🗂️ 檔案管理員',   desc:'+15 薪水/秒',       baseCost:700,     costMul:1.14,  effect:'rate',  amount:15, unlockReq:{itemId:'helper8',count:15} },
  { id:'helper3', category:'maintenance', name:'🔧 維修小隊',     desc:'+20 薪水/秒',       baseCost:800,     costMul:1.15,  effect:'rate',  amount:20, unlockReq:{itemId:'adm2',count:15} },
  { id:'click4',  category:'hotel',       name:'🎩 禮賓部',       desc:'每次點擊 +8 薪水',  baseCost:1500,    costMul:1.16,  effect:'click', amount:8, unlockReq:{itemId:'helper3',count:15} },
  { id:'helper9', category:'hotel',       name:'🏨 櫃台接待',     desc:'+50 薪水/秒',       baseCost:2000,    costMul:1.145, effect:'rate',  amount:50, unlockReq:{itemId:'click4',count:15} },
  { id:'adm3',    category:'admin',       name:'💼 人資專員',     desc:'每次點擊 +12 薪水', baseCost:2500,    costMul:1.16,  effect:'click', amount:12, unlockReq:{itemId:'helper9',count:15} },
  { id:'helper4', category:'maintenance', name:'🏗️ 營繕大隊',     desc:'+100 薪水/秒',      baseCost:4000,    costMul:1.16,  effect:'rate',  amount:100, unlockReq:{itemId:'adm3',count:15} },
  { id:'adm4',    category:'admin',       name:'🏦 出納員',       desc:'+80 薪水/秒',       baseCost:6000,    costMul:1.165, effect:'rate',  amount:80, unlockReq:{itemId:'helper4',count:15} },
  { id:'click5',  category:'hotel',       name:'💆 SPA技師',      desc:'每次點擊 +20 薪水', baseCost:8000,    costMul:1.17,  effect:'click', amount:20, unlockReq:{itemId:'adm4',count:15} },
  { id:'helper10',category:'hotel',       name:'🚪 客房整理組',   desc:'+250 薪水/秒',      baseCost:10000,   costMul:1.155, effect:'rate',  amount:250, unlockReq:{itemId:'click5',count:15} },
  { id:'adm5',    category:'admin',       name:'📝 行政助理',     desc:'每次點擊 +30 薪水', baseCost:15000,   costMul:1.17,  effect:'click', amount:30, unlockReq:{itemId:'helper10',count:15} },
  { id:'helper5', category:'maintenance', name:'🚁 空拋支援',     desc:'+500 薪水/秒',      baseCost:20000,   costMul:1.16,  effect:'rate',  amount:500, unlockReq:{itemId:'adm5',count:15} },
  { id:'adm6',    category:'admin',       name:'👔 秘書',         desc:'+400 薪水/秒',      baseCost:35000,   costMul:1.175, effect:'rate',  amount:400, unlockReq:{itemId:'helper5',count:15} },
  { id:'helper11',category:'hotel',       name:'🏊 泳池救生員',   desc:'+1200 薪水/秒',     baseCost:50000,   costMul:1.165, effect:'rate',  amount:1200, unlockReq:{itemId:'adm6',count:15} },
  { id:'helper6', category:'maintenance', name:'🏭 史萊姆工廠',   desc:'+2500 薪水/秒',     baseCost:120000,  costMul:1.17,  effect:'rate',  amount:2500, unlockReq:{itemId:'helper11',count:15} },
  { id:'adm7',    category:'admin',       name:'🖋️ 法務顧問',     desc:'每次點擊 +60 薪水', baseCost:150000,  costMul:1.18,  effect:'click', amount:60, unlockReq:{itemId:'helper6',count:15} },
  { id:'helper12',category:'hotel',       name:'🎪 宴會廳團隊',   desc:'+6000 薪水/秒',     baseCost:300000,  costMul:1.175, effect:'rate',  amount:6000, unlockReq:{itemId:'adm7',count:15} },
  { id:'helper7', category:'maintenance', name:'🛰️ 衛星維修站',   desc:'+12000 薪水/秒',    baseCost:800000,  costMul:1.18,  effect:'rate',  amount:12000, unlockReq:{itemId:'helper12',count:15} },
  { id:'adm8',    category:'admin',       name:'🏛️ 行政副總',     desc:'+20000 薪水/秒',    baseCost:1000000, costMul:1.185, effect:'rate',  amount:20000, unlockReq:{itemId:'helper7',count:15} },
  { id:'helper13',category:'hotel',       name:'👔 總經理',       desc:'+60000 薪水/秒',    baseCost:3000000, costMul:1.19,  effect:'rate',  amount:60000, unlockReq:{itemId:'adm8',count:15} },
];

const SG_COLLEAGUES = [
  { id:'f1', emoji:'🐌', name:'蝸牛使者',   baseCost:1,  costMul:1.6,  statLabel:'採購折扣', bonuses:[{stat:'rateMult',perLevel:0.005},{stat:'shopDiscount',perLevel:0.001}] },
  { id:'f2', emoji:'🐢', name:'龜甲工頭',   baseCost:3,  costMul:1.6,  statLabel:'採購折扣', bonuses:[{stat:'rateMult',perLevel:0.01}, {stat:'shopDiscount',perLevel:0.002}] },
  { id:'f3', emoji:'🦊', name:'狐狸主管',   baseCost:10, costMul:1.65, statLabel:'採購折扣', bonuses:[{stat:'rateMult',perLevel:0.02}, {stat:'shopDiscount',perLevel:0.003}] },
  { id:'f4', emoji:'🐉', name:'守護神龍',   baseCost:30, costMul:1.7,  statLabel:'採購折扣', bonuses:[{stat:'rateMult',perLevel:0.04}, {stat:'shopDiscount',perLevel:0.005}] },
  { id:'f5', emoji:'🐸', name:'青蛙電工',   baseCost:2,  costMul:1.6,  statLabel:'點擊力加成', bonuses:[{stat:'clickMult',perLevel:0.01}] },
  { id:'f6', emoji:'🦎', name:'蜥蜴神射手', baseCost:5,  costMul:1.65, statLabel:'會心機率', bonuses:[{stat:'crit',perLevel:1}] },
  { id:'f7', emoji:'🐿️', name:'松鼠快手',   baseCost:8,  costMul:1.7,  statLabel:'自動點擊/秒', bonuses:[{stat:'autoclick',perLevel:0.3}] },
  { id:'f8', emoji:'🦫', name:'河狸工程師', baseCost:6,  costMul:1.6,  statLabel:'離線上限(hr)', bonuses:[{stat:'offlinecap',perLevel:1}] },
  { id:'f9', emoji:'🦜', name:'大廳鸚鵡',   baseCost:15, costMul:1.65, statLabel:'旅館商品加成', bonuses:[{stat:'hotelBoost',perLevel:0.02}] },
  { id:'f10',emoji:'🐝', name:'領班蜜蜂',   baseCost:15, costMul:1.65, statLabel:'維修商品加成', bonuses:[{stat:'maintBoost',perLevel:0.02}] },
  { id:'f11',emoji:'🦉', name:'智慧貓頭鷹', baseCost:15, costMul:1.65, statLabel:'行政商品加成', bonuses:[{stat:'adminBoost',perLevel:0.02}] },
  { id:'f12',emoji:'🦁', name:'首席顧問',   baseCost:100,costMul:1.75, statLabel:'採購折扣', bonuses:[{stat:'rateMult',perLevel:0.08}, {stat:'shopDiscount',perLevel:0.01}] },
  { id:'f13',emoji:'🐘', name:'資深合夥人', baseCost:60, costMul:1.7,  statLabel:'點擊力加成', bonuses:[{stat:'clickMult',perLevel:0.03}] },
  { id:'f14',emoji:'🦅', name:'空中戰略官', baseCost:80, costMul:1.75, statLabel:'自動點擊/秒', bonuses:[{stat:'autoclick',perLevel:1}] },
];

const SG_RARITY_CHANCE = { legendary:5, rare:25, common:70 };
const SG_DUPLICATE_MANNIU = { common:2, rare:8, legendary:30 };

const SG_GLOBAL_ITEMS = [
  { id:'g_c1', rarity:'common', name:'產能藥水', desc:'全體產能永久+5%', type:'globalRate', value:0.05 },
  { id:'g_c2', rarity:'common', name:'點擊手套', desc:'全體點擊力永久+5%', type:'globalClick', value:0.05 },
  { id:'g_c3', rarity:'common', name:'薪水結晶', desc:'立即獲得大量薪水', type:'instantXp', value:0.05 },
  { id:'g_c4', rarity:'common', name:'慣性齒輪', desc:'自動點擊永久+0.2次/秒', type:'autoClickBonus', value:0.2 },
  { id:'g_r1', rarity:'rare', name:'產能精華', desc:'全體產能永久+15%', type:'globalRate', value:0.15 },
  { id:'g_r2', rarity:'rare', name:'狂暴符文', desc:'會心倍率永久+0.5倍', type:'critMultBonus', value:0.5 },
  { id:'g_r3', rarity:'rare', name:'幸運羽毛', desc:'會心機率永久+2%', type:'critBonus', value:2 },
  { id:'g_r4', rarity:'rare', name:'自動連發手套', desc:'自動點擊永久+0.5次/秒', type:'autoClickBonus', value:0.5 },
  { id:'g_l1', rarity:'legendary', name:'產能核心', desc:'全體產能永久+40%', type:'globalRate', value:0.40 },
  { id:'g_l2', rarity:'legendary', name:'時之沙漏', desc:'連擊時間窗永久+0.3秒，且全體產能與點擊力永久+10%', type:'hourglass', value:300, compoundPct:0.10 },
  { id:'g_l3', rarity:'legendary', name:'離線結界', desc:'離線效率永久+50%', type:'offlineMult', value:0.50 },
  { id:'g_l4', rarity:'legendary', name:'永動機核心', desc:'自動點擊永久+1.5次/秒', type:'autoClickBonus', value:1.5 },
  { id:'g_c5', rarity:'common', name:'萬用電表', desc:'全體產能永久+6%', type:'globalRate', value:0.06 },
  { id:'g_c6', rarity:'common', name:'驗電筆', desc:'會心機率永久+1%', type:'critBonus', value:1 },
  { id:'g_c7', rarity:'common', name:'絕緣螺絲起子', desc:'全體點擊力永久+5%', type:'globalClick', value:0.05 },
  { id:'g_c8', rarity:'common', name:'活動扳手', desc:'全體產能永久+5%', type:'globalRate', value:0.05 },
  { id:'g_c9', rarity:'common', name:'尖嘴鉗', desc:'全體點擊力永久+5%', type:'globalClick', value:0.05 },
  { id:'g_c10', rarity:'common', name:'剝線鉗', desc:'全體點擊力永久+5%', type:'globalClick', value:0.05 },
  { id:'g_c11', rarity:'common', name:'電工膠帶', desc:'全體產能永久+4%', type:'globalRate', value:0.04 },
  { id:'g_r5', rarity:'rare', name:'鉤式電流表', desc:'全體產能永久+12%', type:'globalRate', value:0.12 },
  { id:'g_r6', rarity:'rare', name:'安全掛鎖與掛牌（LOTO）', desc:'離線收益上限永久+1小時', type:'offlineHrBonus', value:1 },
  // ── 30個新道具：掉落率提升／重新入職水晶加成／技術力辦公家具／連擊突破等 ──
  // 普通(10)
  { id:'g_c12', rarity:'common', name:'掉落雷達',     desc:'寶箱掉落機率永久+0.05%',   type:'dropRateBonus', value:0.0005 },
  { id:'g_c13', rarity:'common', name:'幸運符',       desc:'幸運史萊姆出現機率永久+3%', type:'luckySpawnBonus', value:0.03 },
  { id:'g_c14', rarity:'common', name:'入職禮金',     desc:'立即獲得 5 水晶',           type:'crystalInstant', value:5 },
  { id:'g_c15', rarity:'common', name:'技術手冊',     desc:'立即獲得 5 技術力',         type:'techPowerInstant', value:5 },
  { id:'g_c16', rarity:'common', name:'團隊建設券',   desc:'立即獲得 5 辦公家具',       type:'auraEnergyInstant', value:5 },
  { id:'g_c17', rarity:'common', name:'加班津貼',     desc:'每日任務水晶獎勵永久+10%',  type:'dailyRewardBonus', value:0.10 },
  { id:'g_c18', rarity:'common', name:'復盤筆記',     desc:'重新入職水晶量永久+5%',     type:'crystalGainBonus', value:0.05 },
  { id:'g_c19', rarity:'common', name:'連擊延伸貼',   desc:'連擊時間窗永久+0.1秒',      type:'comboWindowBonus', value:100 },
  { id:'g_c20', rarity:'common', name:'磁場感應器',   desc:'寶箱掉落機率永久+0.03%',    type:'dropRateBonus', value:0.0003 },
  { id:'g_c21', rarity:'common', name:'小確幸禮包',   desc:'立即獲得 3 水晶',           type:'crystalInstant', value:3 },
  // 稀有(10)
  { id:'g_r7',  rarity:'rare', name:'高階掃描儀',     desc:'寶箱掉落機率永久+0.15%',    type:'dropRateBonus', value:0.0015 },
  { id:'g_r8',  rarity:'rare', name:'資深人脈卡',     desc:'重新入職水晶量永久+15%',    type:'crystalGainBonus', value:0.15 },
  { id:'g_r9',  rarity:'rare', name:'進修證書',       desc:'立即獲得 30 技術力',        type:'techPowerInstant', value:30 },
  { id:'g_r10', rarity:'rare', name:'團建基金',       desc:'立即獲得 20 辦公家具',      type:'auraEnergyInstant', value:20 },
  { id:'g_r11', rarity:'rare', name:'幸運護符',       desc:'幸運史萊姆出現機率永久+8%', type:'luckySpawnBonus', value:0.08 },
  { id:'g_r12', rarity:'rare', name:'稀有度探測器',   desc:'寶箱掉落機率永久+0.2%',     type:'dropRateBonus', value:0.002 },
  { id:'g_r13', rarity:'rare', name:'業務獎金',       desc:'每日任務水晶獎勵永久+25%',  type:'dailyRewardBonus', value:0.25 },
  { id:'g_r14', rarity:'rare', name:'連擊突破卡',     desc:'連擊加成上限永久+30%',      type:'comboCapBonus', value:0.30 },
  { id:'g_r15', rarity:'rare', name:'會心透鏡',       desc:'會心倍率永久+0.8倍',        type:'critMultBonus', value:0.8 },
  { id:'g_r16', rarity:'rare', name:'水晶錢包',       desc:'立即獲得 25 水晶',          type:'crystalInstant', value:25 },
  // 傳說(10)
  { id:'g_l5',  rarity:'legendary', name:'頂級雷達',       desc:'寶箱掉落機率永久+0.4%',     type:'dropRateBonus', value:0.004 },
  { id:'g_l6',  rarity:'legendary', name:'金牌獵頭',       desc:'重新入職水晶量永久+40%',    type:'crystalGainBonus', value:0.40 },
  { id:'g_l7',  rarity:'legendary', name:'博士學位證書',   desc:'立即獲得 150 技術力',       type:'techPowerInstant', value:150 },
  { id:'g_l8',  rarity:'legendary', name:'企業文化獎章',   desc:'立即獲得 100 辦公家具',     type:'auraEnergyInstant', value:100 },
  { id:'g_l9',  rarity:'legendary', name:'幸運女神加持',   desc:'幸運史萊姆出現機率永久+20%', type:'luckySpawnBonus', value:0.20 },
  { id:'g_l10', rarity:'legendary', name:'傳說水晶礦',     desc:'立即獲得 150 水晶',         type:'crystalInstant', value:150 },
  { id:'g_l11', rarity:'legendary', name:'無限連擊卡',     desc:'連擊加成上限永久+100%',     type:'comboCapBonus', value:1.00 },
  { id:'g_l12', rarity:'legendary', name:'至尊會心珠',     desc:'會心倍率永久+2倍',          type:'critMultBonus', value:2.0 },
  { id:'g_l13', rarity:'legendary', name:'年終分紅',       desc:'每日任務水晶獎勵永久+50%',  type:'dailyRewardBonus', value:0.50 },
  { id:'g_l14', rarity:'legendary', name:'命運轉輪',       desc:'寶箱掉落機率永久+0.6%',     type:'dropRateBonus', value:0.006 },
];

// 依道具實際數值動態產生說明文字，避免buff後數值跟文字對不上
function sgFormatItemDesc(item) {
  switch(item.type) {
    case 'globalRate':      return `全體產能永久+${(item.value*100).toFixed(1)}%`;
    case 'globalClick':     return `全體點擊力永久+${(item.value*100).toFixed(1)}%`;
    case 'instantXp':       return `立即獲得大量薪水`;
    case 'autoClickBonus':  return `自動點擊永久+${item.value.toFixed(2)}次/秒`;
    case 'critMultBonus':   return `會心倍率永久+${item.value.toFixed(2)}倍`;
    case 'critBonus':       return `會心機率永久+${item.value.toFixed(1)}%`;
    case 'hourglass':       return `連擊時間窗永久+${(item.value/1000).toFixed(1)}秒，且全體產能與點擊力永久+${(item.compoundPct*100).toFixed(0)}%`;
    case 'offlineMult':     return `離線效率永久+${(item.value*100).toFixed(0)}%`;
    case 'offlineHrBonus':  return `離線收益上限永久+${item.value.toFixed(1)}小時`;
    case 'dropRateBonus':   return `寶箱掉落機率永久+${(item.value*100).toFixed(2)}%`;
    case 'luckySpawnBonus': return `幸運史萊姆出現機率永久+${(item.value*100).toFixed(0)}%`;
    case 'crystalInstant':  return `立即獲得 ${Math.round(item.value)} 水晶`;
    case 'techPowerInstant':return `立即獲得 ${Math.round(item.value)} 技術力`;
    case 'auraEnergyInstant':return `立即獲得 ${Math.round(item.value)} 辦公家具`;
    case 'dailyRewardBonus':return `每日任務水晶獎勵永久+${(item.value*100).toFixed(0)}%`;
    case 'crystalGainBonus':return `重新入職水晶量永久+${(item.value*100).toFixed(0)}%`;
    case 'comboWindowBonus':return `連擊時間窗永久+${(item.value/1000).toFixed(2)}秒`;
    case 'comboCapBonus':   return `連擊加成上限永久+${(item.value*100).toFixed(0)}%`;
  }
  return item.desc;
}

// 道具稀有度倍率：既然道具難拿(尤其傳說級)，數值大幅提升才對得起稀有度
const SG_ITEM_RARITY_BUFF = { common:1.6, rare:2.5, legendary:4.0 };
SG_GLOBAL_ITEMS.forEach(item => {
  const mult = SG_ITEM_RARITY_BUFF[item.rarity];
  item.value = item.value * mult;
  if (item.compoundPct !== undefined) item.compoundPct = item.compoundPct * mult;
  item.desc = sgFormatItemDesc(item);
});

const SG_CHAR_ITEM_BUFF = { common:1.5, rare:2.0, legendary:2.5 };
const SG_CHAR_ITEMS = SG_COLLEAGUES.flatMap(c => [
  { id:`c_${c.id}_common`,    rarity:'common',    name:`${c.name}的祝福（小）`, charId:c.id, type:'charMult', value:0.10 * SG_CHAR_ITEM_BUFF.common },
  { id:`c_${c.id}_rare`,      rarity:'rare',      name:`${c.name}的祝福（中）`, charId:c.id, type:'charMult', value:0.25 * SG_CHAR_ITEM_BUFF.rare },
  { id:`c_${c.id}_legendary`, rarity:'legendary', name:`${c.name}的祝福（大）`, charId:c.id, type:'charMult', value:0.60 * SG_CHAR_ITEM_BUFF.legendary },
]).map(it => ({ ...it, desc: `${SG_COLLEAGUES.find(c=>c.id===it.charId).name} 效果永久+${Math.round(it.value*100)}%` }));

const SG_ITEMS = [...SG_GLOBAL_ITEMS, ...SG_CHAR_ITEMS];

const SG_RARITY_META = {
  common:    { label:'普通', color:'#8B9AA8', bg:'#F0F2F4' },
  rare:      { label:'稀有', color:'#4F7FD9', bg:'#EAF0FB' },
  legendary: { label:'傳說', color:'#E0A800', bg:'#FFF7E0' },
};

// ── 🎽 裝備與證照系統 ──
// 裝備：基礎工具，用薪水購買，買了永久生效(不需穿脫，全部同時作用)
// 裝備：無限升級，前10級用薪水購買，第11級起改用水晶；每級皆需技術力門檻(每3級+1點)
const SG_GEAR_MILESTONE_LEVEL = 8; // 裝備升到此等級，解鎖「功能性」效果(非單純數值疊加)
const SG_GEAR = [
  { id:'g1',  emoji:'⛑️', name:'工程安全帽',     bonuses:[{type:'rate',     value:0.003}], salaryPhase:{baseCost:500, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:20, costMul:1.35}, milestone:'離線結算保底：期間至少開到1個寶箱' },
  { id:'g2',  emoji:'🧤', name:'絕緣工作手套',   bonuses:[{type:'click',    value:0.004}], salaryPhase:{baseCost:900, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:25, costMul:1.35}, milestone:'連擊會心：每20次手動點擊必定會心' },
  { id:'g3',  emoji:'🦺', name:'反光安全背心',   bonuses:[{type:'rate',     value:0.003}], salaryPhase:{baseCost:400, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:18, costMul:1.35}, milestone:'自動購買加速：間隔10秒→6秒' },
  { id:'g4',  emoji:'👢', name:'鋼頭安全鞋',     bonuses:[{type:'rate',     value:0.003}], salaryPhase:{baseCost:600, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:22, costMul:1.35}, milestone:'幸運史萊姆停留時間5秒→9秒' },
  { id:'g5',  emoji:'🥽', name:'護目鏡',         bonuses:[{type:'click',    value:0.003}], salaryPhase:{baseCost:500, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:20, costMul:1.35}, milestone:'會心強化：會心倍率3倍→4倍' },
  { id:'g6',  emoji:'💡', name:'頭燈',           bonuses:[{type:'offlinehr',value:0.05}],  salaryPhase:{baseCost:800, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:28, costMul:1.4}, milestone:'離線寶箱掉落機率×2' },
  { id:'g7',  emoji:'🎒', name:'工具腰帶',       bonuses:[{type:'autoclick',value:0.05}],  salaryPhase:{baseCost:1000,costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:30, costMul:1.4}, milestone:'自動點擊也能開寶箱(手動的一半機率)' },
  { id:'g8',  emoji:'📻', name:'對講機',         bonuses:[{type:'autoclick',value:0.08}],  salaryPhase:{baseCost:1500,costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:35, costMul:1.4}, milestone:'自動購買一次購足三分類CP值最高各一項' },
  { id:'g9',  emoji:'📏', name:'捲尺',           bonuses:[{type:'click',    value:0.002}], salaryPhase:{baseCost:300, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:15, costMul:1.35}, milestone:'安慰獎：未會心時仍額外+8%產出' },
  { id:'g10', emoji:'🔦', name:'手電筒',         bonuses:[{type:'offlinehr',value:0.05}],  salaryPhase:{baseCost:700, costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:25, costMul:1.4}, milestone:'離線收益計算時間額外+20%' },
  { id:'g11', emoji:'🧰', name:'工具箱',         bonuses:[{type:'rate',     value:0.005}], salaryPhase:{baseCost:2000,costMul:1.2, maxLevel:10}, crystalPhase:{baseCost:40, costMul:1.4}, milestone:'自動購買資金夠時可連續多買一輪' },
];

// 判斷指定裝備是否已達里程碑等級(功能解鎖)
function sgGearMS(id) {
  return (sg.gearLv && (sg.gearLv[id]||0) >= SG_GEAR_MILESTONE_LEVEL);
}

// ══════════════════════════════════════════════
// 🗡️ 巡邏系統(肉鴿MVP)：會館地下機房，1園區/3層/3種敵人
// ══════════════════════════════════════════════
const SG_RAID_ENEMIES = [
  { id:'leak',  emoji:'💧', name:'漏水怪',   hp:24, atk:3,  desc:'從水管縫隙滲出的黏稠水漬' },
  { id:'short', emoji:'⚡', name:'跳電怪',   hp:40, atk:5,  desc:'亂竄的電流噴出火花' },
  { id:'rust',  emoji:'🦀', name:'鏽蝕王',   hp:65, atk:7,  desc:'佔據機房許久的鏽蝕巨獸(BOSS)', isBoss:true },
];

const SG_RAID_SKILLS = [
  { id:'r1', emoji:'🔧', name:'校準扳手',   desc:'攻擊有25%機率造成2倍傷害', type:'crit', value:0.25 },
  { id:'r2', emoji:'🩹', name:'補漏貼片',   desc:'每回合開始回復2點生命',    type:'heal', value:2 },
  { id:'r3', emoji:'🧯', name:'滅火筒',     desc:'攻擊附加灼燒，之後2回合每回合額外3點傷害', type:'burn', value:3 },
  { id:'r4', emoji:'⏱️', name:'超時工作',   desc:'每3回合攻擊自動造成雙倍傷害', type:'periodic', value:3 },
  { id:'r5', emoji:'💪', name:'加班津貼',   desc:'基礎攻擊力永久+3',          type:'flatatk', value:3 },
];

// 入場費：隨累計通關次數增加，用薪水支付，這筆錢花掉就是花掉(不會變回產能)
function sgRaidEntryCost() {
  const runs = (sg.raid && sg.raid.runsCompleted) || 0;
  return Math.floor(3000 * Math.pow(1.6, runs));
}

// 裝備升級技術力門檻：升到第N級需要技術力 >= ceil(N/3)
function sgGearTechReq(targetLevel) {
  return Math.ceil(targetLevel / 3);
}

// 視覺代表：只有這兩項會實際疊圖顯示在史萊姆身上（其餘皆為純數值加成）
const SG_GEAR_VISUAL = { head:'g1', hand:'g10' };

// 證照：全部用水晶購買，買了永久生效，可同時持有全部
const SG_CERTIFICATIONS = [
  // 甲級（每級 baseCost x1.4 成長）
  { id:'cert1',  tier:'甲', emoji:'🔌', name:'甲級室內配線技術士',           baseCost:350, costMul:1.4, bonuses:[{type:'rate', value:0.03}] },
  { id:'cert2',  tier:'甲', emoji:'❄️', name:'甲級冷凍空調裝修技術士',       baseCost:350, costMul:1.4, bonuses:[{type:'rate', value:0.03}] },
  { id:'cert3',  tier:'甲', emoji:'🦺', name:'甲級職業安全衛生業務主管',     baseCost:350, costMul:1.4, bonuses:[{type:'offlinehr', value:0.5}] },
  { id:'cert4',  tier:'甲', emoji:'🏗️', name:'營造業甲種職業安全衛生業務主管',baseCost:350, costMul:1.4, bonuses:[{type:'offlinehr', value:0.5}] },
  // 乙級（每級 baseCost x1.35 成長）
  { id:'cert5',  tier:'乙', emoji:'🔌', name:'乙級室內配線技術士',           baseCost:150, costMul:1.35, bonuses:[{type:'rate', value:0.02}] },
  { id:'cert6',  tier:'乙', emoji:'🏭', name:'乙級工業配線技術士',           baseCost:150, costMul:1.35, bonuses:[{type:'rate', value:0.02}] },
  { id:'cert7',  tier:'乙', emoji:'❄️', name:'乙級冷凍空調裝修技術士',       baseCost:150, costMul:1.35, bonuses:[{type:'rate', value:0.02}] },
  { id:'cert8',  tier:'乙', emoji:'🚰', name:'乙級自來水管配管技術士',       baseCost:150, costMul:1.35, bonuses:[{type:'rate', value:0.02}] },
  { id:'cert9',  tier:'乙', emoji:'🔥', name:'乙級氣體燃料導管配管技術士',   baseCost:150, costMul:1.35, bonuses:[{type:'rate', value:0.02}] },
  { id:'cert10', tier:'乙', emoji:'🛗', name:'乙級升降機裝修技術士',         baseCost:150, costMul:1.35, bonuses:[{type:'autoclick', value:0.025}] },
  { id:'cert11', tier:'乙', emoji:'⚙️', name:'乙級機電整合技術士',           baseCost:150, costMul:1.35, bonuses:[{type:'click', value:0.02}] },
  { id:'cert12', tier:'乙', emoji:'🔋', name:'乙級用電設備檢驗技術士',       baseCost:150, costMul:1.35, bonuses:[{type:'autoclick', value:0.025}] },
  { id:'cert13', tier:'乙', emoji:'🏢', name:'乙級建築物室內裝修工程管理技術士',baseCost:150, costMul:1.35, bonuses:[{type:'click', value:0.02}] },
  { id:'cert14', tier:'乙', emoji:'📐', name:'乙級建築物室內設計技術士',     baseCost:150, costMul:1.35, bonuses:[{type:'click', value:0.02}] },
  { id:'cert15', tier:'乙', emoji:'🦺', name:'乙級職業安全衛生業務主管',     baseCost:150, costMul:1.35, bonuses:[{type:'offlinehr', value:0.3}] },
  { id:'cert16', tier:'乙', emoji:'🏗️', name:'營造業乙種職業安全衛生業務主管',baseCost:150, costMul:1.35, bonuses:[{type:'offlinehr', value:0.3}] },
  // 丙級（每級 baseCost x1.3 成長）
  { id:'cert17', tier:'丙', emoji:'🔌', name:'丙級室內配線技術士',           baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert18', tier:'丙', emoji:'🏭', name:'丙級工業配線技術士',           baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert19', tier:'丙', emoji:'❄️', name:'丙級冷凍空調裝修技術士',       baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert20', tier:'丙', emoji:'🚰', name:'丙級自來水管配管技術士',       baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert21', tier:'丙', emoji:'🔥', name:'丙級氣體燃料導管配管技術士',   baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert22', tier:'丙', emoji:'🛗', name:'丙級升降機裝修技術士',         baseCost:60,  costMul:1.3, bonuses:[{type:'autoclick', value:0.015}] },
  { id:'cert23', tier:'丙', emoji:'⚙️', name:'丙級機電整合技術士',           baseCost:60,  costMul:1.3, bonuses:[{type:'click', value:0.01}] },
  { id:'cert24', tier:'丙', emoji:'🔥', name:'丙級特定瓦斯器具裝修技術士',   baseCost:60,  costMul:1.3, bonuses:[{type:'rate', value:0.01}] },
  { id:'cert25', tier:'丙', emoji:'🦺', name:'丙級職業安全衛生業務主管',     baseCost:60,  costMul:1.3, bonuses:[{type:'offlinehr', value:0.2}] },
  { id:'cert26', tier:'丙', emoji:'🏗️', name:'營造業丙種職業安全衛生業務主管',baseCost:60,  costMul:1.3, bonuses:[{type:'offlinehr', value:0.2}] },
  // 專業證照／訓練證書（每級 baseCost x1.4 成長）
  { id:'cert27', tier:'特殊', emoji:'🔥', name:'防火管理人',                baseCost:200, costMul:1.4, bonuses:[{type:'crit', value:0.5}] },
  { id:'cert28', tier:'特殊', emoji:'🚒', name:'消防設備師',                baseCost:280, costMul:1.4, bonuses:[{type:'crit', value:0.8}] },
  { id:'cert29', tier:'特殊', emoji:'🧯', name:'消防設備士',                baseCost:220, costMul:1.4, bonuses:[{type:'crit', value:0.5}] },
  { id:'cert30', tier:'特殊', emoji:'🦺', name:'職業安全衛生管理員',        baseCost:200, costMul:1.4, bonuses:[{type:'offlinehr', value:0.4}] },
  { id:'cert31', tier:'特殊', emoji:'📎', name:'行政管理師',                baseCost:220, costMul:1.4, bonuses:[{type:'click', value:0.015}] },
];

// 辦公室裝潢：水晶購買，無限升級，全部同時生效
const SG_OFFICE_DECOR = [
  { id:'office1', emoji:'🖥️', name:'辦公桌',     baseCost:20, costMul:1.4,  bonuses:[{type:'rate', value:0.02}] },
  { id:'office2', emoji:'🪴', name:'盆栽',       baseCost:15, costMul:1.35, bonuses:[{type:'click', value:0.015}] },
  { id:'office3', emoji:'☕', name:'咖啡機',     baseCost:30, costMul:1.4,  bonuses:[{type:'crit', value:0.3}] },
  { id:'office4', emoji:'🖨️', name:'影印機',     baseCost:25, costMul:1.4,  bonuses:[{type:'autoclick', value:0.03}] },
  { id:'office5', emoji:'🏋️', name:'健身房',     baseCost:40, costMul:1.45, bonuses:[{type:'offlinehr', value:0.2}] },
  { id:'office6', emoji:'🛋️', name:'休息室',     baseCost:35, costMul:1.4,  bonuses:[{type:'rate', value:0.025}] },
  { id:'office7', emoji:'📺', name:'會議室設備', baseCost:30, costMul:1.4,  bonuses:[{type:'click', value:0.02}] },
  { id:'office8', emoji:'🏆', name:'榮譽榜',     baseCost:50, costMul:1.45, bonuses:[{type:'rate', value:0.03}] },
];

// 房地產：薪水購買，非常昂貴，每級同時給予產能加成與「資產」貨幣(不受轉生影響)
const SG_REAL_ESTATE = [
  { id:'prop1',  emoji:'🏠', name:'出租雅房',   baseCost:50000,        costMul:1.35, assetPerLv:2,  bonuses:[{type:'rate', value:0.02}] },
  { id:'prop2',  emoji:'🏡', name:'出租套房',   baseCost:200000,       costMul:1.35, assetPerLv:3,  bonuses:[{type:'rate', value:0.025}] },
  { id:'prop3',  emoji:'🏚️', name:'老公寓',     baseCost:800000,       costMul:1.36, assetPerLv:3,  bonuses:[{type:'rate', value:0.03}] },
  { id:'prop4',  emoji:'🏘️', name:'透天厝',     baseCost:3000000,      costMul:1.36, assetPerLv:5,  bonuses:[{type:'rate', value:0.035}] },
  { id:'prop5',  emoji:'🏢', name:'電梯大樓',   baseCost:12000000,     costMul:1.37, assetPerLv:5,  bonuses:[{type:'rate', value:0.04}] },
  { id:'prop6',  emoji:'🏙️', name:'商辦大樓',   baseCost:50000000,     costMul:1.38, assetPerLv:8,  bonuses:[{type:'rate', value:0.045}] },
  { id:'prop7',  emoji:'🏗️', name:'預售豪宅',   baseCost:200000000,    costMul:1.38, assetPerLv:10, bonuses:[{type:'rate', value:0.05}] },
  { id:'prop8',  emoji:'🌆', name:'頂級豪宅',   baseCost:800000000,    costMul:1.39, assetPerLv:10, bonuses:[{type:'rate', value:0.06}] },
  { id:'prop9',  emoji:'🏔️', name:'渡假別墅',   baseCost:3000000000,   costMul:1.39, assetPerLv:15, bonuses:[{type:'rate', value:0.07}] },
  { id:'prop10', emoji:'🏝️', name:'私人島嶼',   baseCost:12000000000,  costMul:1.40, assetPerLv:20, bonuses:[{type:'rate', value:0.08}] },
];

function sgEquipBonus(type) {
  let sum = 0;
  SG_GEAR.forEach(g => {
    const lv = (sg.gearLv && sg.gearLv[g.id]) || 0;
    if (!lv) return;
    g.bonuses.forEach(b => { if (b.type===type) sum += b.value * lv; });
  });
  SG_CERTIFICATIONS.forEach(c => {
    const lv = (sg.certLv && sg.certLv[c.id]) || 0;
    if (!lv) return;
    c.bonuses.forEach(b => { if (b.type===type) sum += b.value * lv; });
  });
  SG_OFFICE_DECOR.forEach(o => {
    const lv = (sg.officeLv && sg.officeLv[o.id]) || 0;
    if (!lv) return;
    o.bonuses.forEach(b => { if (b.type===type) sum += b.value * lv; });
  });
  SG_REAL_ESTATE.forEach(p => {
    const lv = (sg.propertyLv && sg.propertyLv[p.id]) || 0;
    if (!lv) return;
    p.bonuses.forEach(b => { if (b.type===type) sum += b.value * lv; });
  });
  return sum;
}

// ── 🏢 職級系統：20階，依累積薪水(lifetimeXp)晉升，分4組視覺特效 ──
const SG_JOB_RANKS = [
  { rank:1,  name:'工讀生',         threshold:50,          techReq:0,   auraReq:0,  assetReq:0 },
  { rank:2,  name:'實習生',         threshold:150,         techReq:1,   auraReq:1,  assetReq:1 },
  { rank:3,  name:'約聘專員',       threshold:450,         techReq:1,   auraReq:1,  assetReq:1 },
  { rank:4,  name:'專員',           threshold:1350,        techReq:2,   auraReq:2,  assetReq:2 },
  { rank:5,  name:'高級專員',       threshold:4050,        techReq:3,   auraReq:2,  assetReq:3 },
  { rank:6,  name:'副組長',         threshold:12150,       techReq:4,   auraReq:3,  assetReq:4 },
  { rank:7,  name:'組長',           threshold:36450,       techReq:5,   auraReq:4,  assetReq:5 },
  { rank:8,  name:'副課長',         threshold:109350,      techReq:7,   auraReq:5,  assetReq:7 },
  { rank:9,  name:'課長',           threshold:328050,      techReq:10,  auraReq:6,  assetReq:10 },
  { rank:10, name:'副理',           threshold:984150,      techReq:13,  auraReq:8,  assetReq:13 },
  { rank:11, name:'經理',           threshold:2952450,     techReq:18,  auraReq:11, assetReq:18 },
  { rank:12, name:'資深經理',       threshold:8857350,     techReq:25,  auraReq:14, assetReq:25 },
  { rank:13, name:'協理',           threshold:26572050,    techReq:35,  auraReq:18, assetReq:35 },
  { rank:14, name:'副總經理',       threshold:79716150,    techReq:48,  auraReq:23, assetReq:48 },
  { rank:15, name:'總經理',         threshold:239148450,   techReq:66,  auraReq:30, assetReq:66 },
  { rank:16, name:'執行副總裁',     threshold:717445350,   techReq:91,  auraReq:39, assetReq:91 },
  { rank:17, name:'集團副總裁',     threshold:2152336050,  techReq:125, auraReq:51, assetReq:125 },
  { rank:18, name:'集團資深副總裁', threshold:6457008150,  techReq:173, auraReq:67, assetReq:173 },
  { rank:19, name:'集團總裁',       threshold:19371024450, techReq:239, auraReq:87, assetReq:239 },
  { rank:20, name:'集團CEO',        threshold:58113073350, techReq:329, auraReq:112,assetReq:329 },
];

// 4組視覺特效分級：1-5基層／6-10中階主管／11-15高階主管／16-20集團高層
function sgJobRankTier(rank) {
  if (rank <= 5) return 1;
  if (rank <= 10) return 2;
  if (rank <= 15) return 3;
  return 4;
}

// 職級判定為三維複合條件：薪水、技術力、辦公家具必須同時達標才能晉升到該階
function sgRankMet(r) {
  return (sg.lifetimeXp||0) >= r.threshold && (sg.techPower||0) >= r.techReq && (sg.auraEnergy||0) >= r.auraReq && (sg.assets||0) >= r.assetReq;
}

function sgGetJobRank() {
  let current = SG_JOB_RANKS[0];
  for (const r of SG_JOB_RANKS) { if (sgRankMet(r)) current = r; }
  return current;
}

function sgJobRankProgress() {
  const current = sgGetJobRank();
  const idx = SG_JOB_RANKS.findIndex(r=>r.rank===current.rank);
  const next = SG_JOB_RANKS[idx+1];
  if (!next) return { current, next:null, pct:100 };
  const xpSpan = next.threshold - current.threshold;
  const xpDone = (sg.lifetimeXp||0) - current.threshold;
  const xpPct = Math.min(100, Math.max(0, Math.round(xpDone/xpSpan*100)));
  const techPct = next.techReq>0 ? Math.min(100, Math.round((sg.techPower||0)/next.techReq*100)) : 100;
  const auraPct = next.auraReq>0 ? Math.min(100, Math.round((sg.auraEnergy||0)/next.auraReq*100)) : 100;
  const assetPct = next.assetReq>0 ? Math.min(100, Math.round((sg.assets||0)/next.assetReq*100)) : 100;
  // 綜合進度取四者最小值：任何一項沒跟上，整體進度就卡在那一項
  const pct = Math.min(xpPct, techPct, auraPct, assetPct);
  return { current, next, pct, xpPct, techPct, auraPct, assetPct };
}

function sgJobRankHtml() {
  const { current, next, xpPct, techPct, auraPct, assetPct } = sgJobRankProgress();
  const tierLabel = {1:'基層', 2:'中階主管', 3:'高階主管', 4:'集團高層'}[sgJobRankTier(current.rank)];
  if (!next) {
    return `
      <div class="sg-job-rank-name">🏢 ${current.name}　<span class="sg-job-rank-tier">[${tierLabel}]</span></div>
      <div class="sg-job-rank-next" style="color:#E0A800;font-weight:800;">👑 已達到職涯巔峰！</div>
    `;
  }
  const missingParts = [];
  if (xpPct < 100) missingParts.push('薪水');
  if (techPct < 100) missingParts.push('技術力');
  if (auraPct < 100) missingParts.push('辦公家具');
  if (assetPct < 100) missingParts.push('資產');
  const hintText = missingParts.length
    ? `似乎還有進步空間：${missingParts.join('、')}尚未達標，繼續努力吧`
    : `即將迎來升遷的好消息…`;
  return `
    <div class="sg-job-rank-name">🏢 ${current.name}　<span class="sg-job-rank-tier">[${tierLabel}]</span></div>
    <div class="sg-job-rank-next">${hintText}</div>
  `;
}

// 檢查是否升職，回傳新職級(若無升職則回傳null)
function sgCheckJobPromotion() {
  const current = sgGetJobRank();
  if (current.rank > (sg.seenJobRank||1)) {
    sg.seenJobRank = current.rank;
    return current;
  }
  return null;
}

// ── 📈 股票（賭博機制）──
// 結果表：機率總和100%，水晶/部門完全沒有下檔風險，薪水端小賺小賠打平略正，整體期望值為正
const SG_STOCK_OUTCOMES = [
  { id:'smallWin',  weight:20, type:'rateBonus',    seconds:30,  buffMult:1.05, buffSec:15, label:'小賺',  tone:'good' },
  { id:'medWin',    weight:10, type:'crystalScaled', min:15, max:25,  pct:0.05, buffMult:1.10, buffSec:20, label:'中賺',  tone:'good' },
  { id:'bigWin',    weight:5,  type:'crystalScaled', min:60, max:120, pct:0.20, buffMult:1.15, buffSec:30, label:'大賺',  tone:'good' },
  { id:'jackpot',   weight:2,  type:'jackpot',       min:200, max:400, pct:0.50, deptMin:10, deptMax:25, buffMult:1.25, buffSec:45, label:'頭獎', tone:'good' },
  { id:'deptGift',  weight:8,  type:'deptGift',      min:3, max:10, buffMult:1.08, buffSec:20, label:'部門加碼',  tone:'good' },
  { id:'smallLoss', weight:30, type:'xpPct',         value:-0.04, debuffMult:0.95, debuffSec:15, label:'小賠',  tone:'bad' },
  { id:'medLoss',   weight:12, type:'xpPct',         value:-0.10, debuffMult:0.90, debuffSec:30, label:'中賠',  tone:'bad' },
  { id:'crash',     weight:3,  type:'xpPct',         value:-0.18, debuffMult:0.80, debuffSec:60, label:'慘賠',  tone:'bad' },
  { id:'deptLoss',  weight:10, type:'deptLoss',      pct:0.08, label:'部門裁撤',  tone:'bad' },
];

const SG_STOCK_BASE_COST = 100;      // 基礎成本(薪水)
const SG_STOCK_COST_MUL = 1.15;      // 連續遊玩每次成本上漲15%
const SG_STOCK_DECAY_SEC = 20;       // 每20秒未遊玩，熱度衰減1次

function sgStockHeatDecay() {
  const now = Date.now();
  const elapsed = (now - (sg.lastStockPlayTime||0)) / 1000;
  const decaySteps = Math.floor(elapsed / SG_STOCK_DECAY_SEC);
  if (decaySteps > 0) {
    sg.stockPlayCount = Math.max(0, (sg.stockPlayCount||0) - decaySteps);
    sg.lastStockPlayTime = now - (elapsed % SG_STOCK_DECAY_SEC) * 1000;
  }
}

function sgStockCost() {
  sgStockHeatDecay();
  const heatCost = SG_STOCK_BASE_COST * Math.pow(SG_STOCK_COST_MUL, sg.stockPlayCount||0);
  const salaryBasedCost = sg.xp * 0.0002; // 隨薪水規模成長的下限,避免後期成本形同虛設
  let cost = Math.max(heatCost, salaryBasedCost);
  // debuff期間額外加價：削弱越嚴重，加價越兇，避免賠了就立刻加倍下注翻本
  const debuffMult = sgStockDebuffMult();
  if (debuffMult < 1) {
    const deficit = 1 - debuffMult;
    cost *= (1 + deficit*3);
  }
  return Math.floor(cost);
}

// 股票debuff：暫時削弱產能/點擊力，打在「賺錢能力」而非「現有存款」，避免本金少時懲罰無感
function sgStockDebuffMult() {
  if (Date.now() < (sg.stockDebuffUntil||0)) return sg.stockDebuffMult || 1;
  return 1;
}

function sgStockDebuffSecondsLeft() {
  const left = Math.ceil(((sg.stockDebuffUntil||0) - Date.now()) / 1000);
  return left > 0 ? left : 0;
}

// 股票buff：贏面對稱效果，暫時提升產能/點擊力
function sgStockBuffMult() {
  if (Date.now() < (sg.stockBuffUntil||0)) return sg.stockBuffMult || 1;
  return 1;
}

function sgStockBuffSecondsLeft() {
  const left = Math.ceil(((sg.stockBuffUntil||0) - Date.now()) / 1000);
  return left > 0 ? left : 0;
}

// 動態水晶獎勵：取「隨機基礎值」與「重新入職預期量的一定比例」兩者較大值，確保獎勵隨進度成長不會被固定數字拖垮
function sgStockScaledCrystal(min, max, pct) {
  const randomFloor = min + Math.random()*(max-min);
  const scaled = sgPrestigeCrystalGain() * pct;
  return Math.floor(Math.max(randomFloor, scaled));
}

function sgRollStockOutcome() {
  const totalWeight = SG_STOCK_OUTCOMES.reduce((s,o)=>s+o.weight, 0);
  let r = Math.random() * totalWeight;
  for (const o of SG_STOCK_OUTCOMES) {
    if (r < o.weight) return o;
    r -= o.weight;
  }
  return SG_STOCK_OUTCOMES[0];
}

function sgPlayStock() {
  const cost = sgStockCost();
  if (sg.xp < cost) { showToast('薪水不足，無法上班看股票'); return; }
  sg.xp -= cost;
  sg.stockPlayCount = (sg.stockPlayCount||0) + 1;
  sg.lastStockPlayTime = Date.now();
  sg.stockPlays = (sg.stockPlays||0) + 1;

  const outcome = sgRollStockOutcome();
  let resultMsg = '';

  if (outcome.type === 'rateBonus') {
    const gain = Math.floor(sgEffRate() * outcome.seconds);
    sgAddXp(gain);
    resultMsg = `${outcome.label}！相當於${outcome.seconds}秒產能，薪水+${sgFormatNum(gain)}`;
  } else if (outcome.type === 'xpPct') {
    const delta = Math.floor(sg.xp * outcome.value);
    sg.xp = Math.max(0, sg.xp + delta);
    resultMsg = `${outcome.label}！薪水${delta>=0?'+':''}${sgFormatNum(delta)}`;
  } else if (outcome.type === 'crystalScaled') {
    const gain = sgStockScaledCrystal(outcome.min, outcome.max, outcome.pct);
    sg.crystals += gain;
    resultMsg = `${outcome.label}！獲得 ${sgFormatNum(gain)} 💠`;
  } else if (outcome.type === 'jackpot') {
    const crystalGain = sgStockScaledCrystal(outcome.min, outcome.max, outcome.pct);
    sg.crystals += crystalGain;
    const deptCount = Math.floor(outcome.deptMin + Math.random()*(outcome.deptMax-outcome.deptMin));
    const unlockedItems = SG_SHOP.filter(i=>sgIsShopItemUnlocked(i));
    let deptMsg = '';
    if (unlockedItems.length) {
      const pick = unlockedItems[Math.floor(Math.random()*unlockedItems.length)];
      sg.owned[pick.id] = (sg.owned[pick.id]||0) + deptCount;
      deptMsg = `　免費「${pick.name.replace(/^\S+\s/,'')}」x${deptCount}`;
    }
    resultMsg = `🎉 ${outcome.label}！獲得 ${sgFormatNum(crystalGain)} 💠${deptMsg}`;
  } else if (outcome.type === 'deptGift') {
    const unlockedItems = SG_SHOP.filter(i=>sgIsShopItemUnlocked(i));
    const deptCount = Math.floor(outcome.min + Math.random()*(outcome.max-outcome.min));
    if (unlockedItems.length) {
      const pick = unlockedItems[Math.floor(Math.random()*unlockedItems.length)];
      sg.owned[pick.id] = (sg.owned[pick.id]||0) + deptCount;
      resultMsg = `${outcome.label}！免費獲得「${pick.name.replace(/^\S+\s/,'')}」x${deptCount}`;
    } else {
      resultMsg = `${outcome.label}！但目前尚無可加碼的部門`;
    }
  } else if (outcome.type === 'deptLoss') {
    const ownedItems = SG_SHOP.filter(i => (sg.owned[i.id]||0) > 0);
    if (ownedItems.length) {
      const pick = ownedItems[Math.floor(Math.random()*ownedItems.length)];
      const current = sg.owned[pick.id];
      const lose = Math.max(1, Math.floor(current * outcome.pct));
      sg.owned[pick.id] = Math.max(0, current - lose);
      resultMsg = `${outcome.label}！「${pick.name.replace(/^\S+\s/,'')}」裁撤 -${lose}`;
    } else {
      resultMsg = `${outcome.label}！但目前尚無部門可裁撤，逃過一劫`;
    }
  }

  // debuff：取「更嚴重」的倍率與「更晚」的到期時間，避免被新一輪較輕的結果洗掉
  if (outcome.debuffMult) {
    const now = Date.now();
    const currentlyActive = now < (sg.stockDebuffUntil||0);
    const newUntil = now + outcome.debuffSec*1000;
    if (currentlyActive) {
      sg.stockDebuffMult = Math.min(sg.stockDebuffMult, outcome.debuffMult);
      sg.stockDebuffUntil = Math.max(sg.stockDebuffUntil, newUntil);
    } else {
      sg.stockDebuffMult = outcome.debuffMult;
      sg.stockDebuffUntil = newUntil;
    }
    resultMsg += `　產能/點擊力削弱${Math.round((1-sg.stockDebuffMult)*100)}%（還剩${sgStockDebuffSecondsLeft()}秒）`;
  }

  // buff：對稱debuff，取「更高」的倍率與「更晚」的到期時間
  if (outcome.buffMult) {
    const now = Date.now();
    const currentlyActive = now < (sg.stockBuffUntil||0);
    const newUntil = now + outcome.buffSec*1000;
    if (currentlyActive) {
      sg.stockBuffMult = Math.max(sg.stockBuffMult, outcome.buffMult);
      sg.stockBuffUntil = Math.max(sg.stockBuffUntil, newUntil);
    } else {
      sg.stockBuffMult = outcome.buffMult;
      sg.stockBuffUntil = newUntil;
    }
    resultMsg += `　產能/點擊力提升${Math.round((sg.stockBuffMult-1)*100)}%（還剩${sgStockBuffSecondsLeft()}秒）`;
  }

  sgSave();
  sgUpdateNumbers();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  showToast((outcome.tone==='good' ? '📈 ' : '📉 ') + resultMsg);
}

function sgStockTabHtml() {
  sgStockHeatDecay();
  const cost = sgStockCost();
  const canAfford = sg.xp >= cost;
  const heat = sg.stockPlayCount || 0;
  const debuffLeft = sgStockDebuffSecondsLeft();
  const buffLeft = sgStockBuffSecondsLeft();
  const rows = SG_STOCK_OUTCOMES.map(o => {
    const debuffDesc = o.debuffMult ? `　產能/點擊力-${Math.round((1-o.debuffMult)*100)}%(${o.debuffSec}秒)` : '';
    const buffDesc = o.buffMult ? `　產能/點擊力+${Math.round((o.buffMult-1)*100)}%(${o.buffSec}秒)` : '';
    const desc = o.type==='rateBonus' ? `相當於${o.seconds}秒產能的薪水${buffDesc}`
      : o.type==='xpPct' ? `薪水${o.value>0?'+':''}${Math.round(o.value*100)}%${debuffDesc}`
      : o.type==='crystalScaled' ? `+${o.min}~${o.max} 💠（隨進度成長，取重新入職預期量${Math.round(o.pct*100)}%）${buffDesc}`
      : o.type==='deptGift' ? `免費部門商品 +${o.min}~${o.max} 件${buffDesc}`
      : o.type==='deptLoss' ? `隨機部門商品裁撤 -${Math.round(o.pct*100)}%`
      : `+${o.min}~${o.max} 💠（隨進度成長）加碼免費部門商品${buffDesc}`;
    return `<div class="sg-stock-row ${o.tone}"><span>${o.label}（${o.weight}%）</span><span>${desc}</span></div>`;
  }).join('');
  return `
    <div class="sg-colleague-crystal-bar">✨ 薪水：${sgFormatNum(sg.xp)}　｜　💎 水晶：${sg.crystals}</div>
    ${debuffLeft>0?`<div class="sg-stock-debuff-alert">⚠️ 投資失利中：產能/點擊力削弱 ${Math.round((1-sg.stockDebuffMult)*100)}%，還剩 ${debuffLeft} 秒</div>`:''}
    ${buffLeft>0?`<div class="sg-stock-buff-alert">🎉 投資得利中：產能/點擊力提升 ${Math.round((sg.stockBuffMult-1)*100)}%，還剩 ${buffLeft} 秒</div>`:''}
    <div class="sg-stock-panel">
      <div class="sg-stock-title">📈 上班看股票</div>
      <div class="sg-stock-desc">花一點薪水賭一把，水晶/部門獎勵永遠沒有下檔風險；輸的話薪水小虧，且會暫時削弱產能/點擊力</div>
      <button class="sg-stock-btn" ${canAfford?'':'disabled'} onclick="sgPlayStock()">
        上班看股票　花費 ${sgFormatNum(cost)} ✨
      </button>
      <div class="sg-stock-heat">🔥 目前熱度 Lv.${heat}（連續遊玩成本上漲，${SG_STOCK_DECAY_SEC}秒未玩會冷卻）</div>
      <div class="sg-stock-stats">已上班看股票 ${sg.stockPlays||0} 次</div>
    </div>
    <div class="sg-section-label">🎲 賠率表（僅供參考，實際結果隨機）</div>
    <div class="sg-stock-table">${rows}</div>
  `;
}

const SG_DAILY_TEMPLATES = [
  { id:'d1', name:'今日點擊 50 次',     type:'clicks',   target:50, rewardCrystal:2 },
  { id:'d2', name:'今日賺取指定薪水',   type:'xpEarned', dynamicTarget:true, rewardCrystal:5 },
  { id:'d3', name:'購買 3 次升級',      type:'buys',     target:3, rewardCrystal:3 },
];

function sgDefaultState() {
  return {
    xp: 0,
    totalXp: 0,
    lifetimeXp: 0,   // 永久累積(不受轉生影響)，用於成就計算
    clickPower: 1,
    ratePerSec: 0,
    owned: {},        // { shopId: count }
    lastSeen: Date.now(),
    totalClicks: 0,
    manualClicks: 0,   // 僅手動點擊(成就用，避免自動點擊灌水)
    autoClicks: 0,     // 僅自動點擊(松鼠/水晶/道具觸發)
    critCount: 0,
    combo: 0,
    maxCombo: 0,
    lastClickTime: 0,
    achvSeenTiers: {},  // 各成就分類已通知過的最高階層 { catId: tier }
    _migratedShopCalc: false,  // 舊存檔載入時會觸發一次遷移(見 sgLoad)
    _migratedTechAura: false,  // 技術力/辦公家具回填遷移旗標
    crystals: 0,
    prestigeCount: 0,
    crystalClickLv: 0,  // 永久點擊強化等級
    crystalRateLv: 0,   // 永久產能強化等級
    crystalAutoClickLv: 0,  // 永久自動點擊強化等級(水晶購買)
    itemAutoClickBonus: 0,  // 道具帶來的自動點擊次數/秒加成
    itemCritMultBonus: 0,   // 道具帶來的永久會心倍率加成(基礎3倍+此值)
    itemComboWindowBonus: 0,// 道具帶來的永久連擊時間窗加成(毫秒)
    gearLv: {},       // 裝備等級 { id: level }（無限升級，取代舊版一次性 gearOwned）
    certLv: {},       // 證照等級 { id: level }（無限升級，取代舊版一次性 certOwned）
    officeLv: {},     // 辦公室裝潢等級 { id: level }
    propertyLv: {},   // 房地產等級 { id: level }
    assets: 0,        // 資產貨幣(來自房地產,不受轉生影響)
    seenJobRank: 1,   // 已通知過的最高職級（用於升職提示）
    seenSetBonuses: {}, // 已通知過的套裝加成 { 'category_threshold': true }
    stockPlayCount: 0,  // 目前連續遊玩熱度(影響成本)
    lastStockPlayTime: 0,
    stockPlays: 0,       // 累計遊玩次數(統計用)
    stockDebuffUntil: 0, // 產能/點擊力削弱debuff到期時間戳
    stockDebuffMult: 1,  // debuff倍率(例如0.8=削弱20%)
    stockBuffMult: 1,    // buff倍率(例如1.25=提升25%)
    stockBuffUntil: 0,   // buff到期時間戳
    autoBuy: false,   // 自動購買開關(每10秒觸發一次,買CP值最高的商品)
    techPower: 0,     // 技術力(來自證照升級累積)
    auraEnergy: 0,    // 辦公家具(來自辦公室裝潢升級累積)
    legacyColleagueArray: [],    // (舊版相容用，已棄用)
    colleagueLv: {},  // 圖鑑夥伴等級 { id: level }
    itemInventory: {}, // 已獲得道具 { itemId: count }
    manNiu: 0,         // 蠻牛(來自重複道具轉換)
    itemLv: {},        // 道具升級等級 { itemId: level }(用蠻牛升級,強化該道具原本效果)
    itemGlobalRateBonus: 0,
    itemGlobalClickBonus: 0,
    itemCritBonus: 0,      // 百分點
    itemOfflineBonus: 0,   // 小數(0.5=+50%)
    itemOfflineHrBonus: 0, // 道具帶來的離線收益上限加成(小時)
    itemDropRateBonus: 0,     // 道具帶來的寶箱掉落機率加成(小數)
    itemCrystalGainBonus: 0,  // 道具帶來的重新入職水晶量加成(小數)
    itemLuckySpawnBonus: 0,   // 道具帶來的幸運史萊姆出現機率加成(小數)
    itemDailyRewardBonus: 0,  // 道具帶來的每日任務水晶獎勵加成(小數)
    itemComboCapBonus: 0,     // 道具帶來的連擊加成上限突破(小數，疊加在原本100%封頂上)
    charMult: {},          // 角色專屬加成 { charId: 累計比例 }
    burstClicksRemaining: 0,
    burstMult: 1,
    guaranteedCritUntil: 0,
    dailyDoubleDate: '',   // 上次使用雙倍離線收益的日期
    daily: { date:'', clicks:0, xpEarned:0, buys:0, claimed:[] },
    luckyClickCount: 0,
    raid: {                 // 🗡️巡邏(肉鴿MVP)：薪水的真正出口，花掉就是花掉，不會變回產能
      runsCompleted: 0,     // 累計完整通關次數(影響下次入場費)
      bestFloor: 0,         // 歷史最高抵達樓層(僅供顯示)
      inRun: false,
      floor: 1,
      playerHp: 0,
      playerMaxHp: 0,
      enemyHp: 0,
      enemyMaxHp: 0,
      skills: [],          // 本局已選技能id陣列
      turnCount: 0,
      burnStacks: 0,        // 灼燒剩餘回合數(滅火筒技能)
      log: [],
    },
  };
}

function sgLoad() {
  try {
    const raw = localStorage.getItem(SG_SAVE_KEY);
    sg = raw ? Object.assign(sgDefaultState(), JSON.parse(raw)) : sgDefaultState();
  } catch(e) { sg = sgDefaultState(); }
  // 舊版圖鑑資料（陣列式收集）遷移為等級式
  // 注意：此處刻意讀取舊鍵名 collection（早期存檔格式），而非新的 legacyColleagueArray，
  // 因為舊存檔資料本身就是用 collection 這個鍵名儲存的
  if (Array.isArray(sg.collection) && sg.collection.length && (!sg.colleagueLv || Object.keys(sg.colleagueLv).length===0)) {
    sg.colleagueLv = {};
    sg.collection.forEach(id => { sg.colleagueLv[id] = 1; });
  }
  if (!sg.colleagueLv) sg.colleagueLv = {};
  if (!sg.itemInventory) sg.itemInventory = {};
  if (!sg.gearLv) sg.gearLv = {};
  // 舊版一次性裝備(gearOwned布林值)遷移為等級1
  if (sg.gearOwned && typeof sg.gearOwned === 'object') {
    Object.keys(sg.gearOwned).forEach(id => {
      if (sg.gearOwned[id] && !sg.gearLv[id]) sg.gearLv[id] = 1;
    });
  }
  if (!sg.certLv) sg.certLv = {};
  if (!sg.officeLv) sg.officeLv = {};
  // 舊版一次性證照(certOwned布林值)遷移為等級1
  if (sg.certOwned && typeof sg.certOwned === 'object') {
    Object.keys(sg.certOwned).forEach(id => {
      if (sg.certOwned[id] && !sg.certLv[id]) sg.certLv[id] = 1;
    });
  }
  if (!sg.seenJobRank) sg.seenJobRank = 1;
  if (!sg.seenSetBonuses) sg.seenSetBonuses = {};
  if (!sg.charMult) sg.charMult = {};
  if (typeof sg.techPower !== 'number') sg.techPower = 0;
  if (typeof sg.auraEnergy !== 'number') sg.auraEnergy = 0;
  // 技術力/辦公家具是本次新增的追蹤欄位，回填既有已升級的證照/裝潢對應點數(只執行一次)
  if (!sg._migratedTechAura) {
    let techBackfill = 0;
    Object.keys(sg.certLv||{}).forEach(id => {
      const def = SG_CERTIFICATIONS.find(c=>c.id===id);
      if (def) techBackfill += sgCertTechGain(def.tier) * sg.certLv[id];
    });
    let auraBackfill = 0;
    Object.keys(sg.officeLv||{}).forEach(id => { auraBackfill += sg.officeLv[id]; });
    sg.techPower += techBackfill;
    sg.auraEnergy += auraBackfill;
    sg._migratedTechAura = true;
  }
  // 舊存檔沒有 lifetimeXp 欄位時，用目前 totalXp 補上底線(保守估計)
  if (!sg.lifetimeXp || sg.lifetimeXp < sg.totalXp) sg.lifetimeXp = sg.totalXp;
  // 舊存檔沒有自動點擊功能，過去累積的 totalClicks 全部視為手動點擊
  if (!sg.manualClicks && !sg.autoClicks && sg.totalClicks > 0) {
    sg.manualClicks = sg.totalClicks;
  }
  // 商店改為依 owned 數量即時計算（含分類加成），舊存檔的 clickPower/ratePerSec
  // 是歷史累加值，遷移時重置為基底值，避免與新計算重複疊加
  if (!sg._migratedShopCalc) {
    sg.clickPower = 1;
    sg.ratePerSec = 0;
    sg._migratedShopCalc = true;
  }
}

function sgSave() {
  sg.lastSeen = Date.now();
  try { localStorage.setItem(SG_SAVE_KEY, JSON.stringify(sg)); } catch(e) {}
}

function sgGetStage() {
  let stage = SG_STAGES[0];
  for (const s of SG_STAGES) { if (sg.totalXp >= s.min) stage = s; }
  return stage;
}

function sgShopCost(item) {
  const owned = sg.owned[item.id] || 0;
  const rawCost = item.baseCost * Math.pow(item.costMul, owned);
  const discount = sgColleagueShopDiscount();
  return Math.floor(rawCost * (1 - discount));
}

function sgIsShopItemUnlocked(item) {
  if (!item.unlockReq) return true;
  return (sg.owned[item.unlockReq.itemId] || 0) >= item.unlockReq.count;
}

function sgTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function sgEnsureDailyReset() {
  const today = sgTodayStr();
  if (!sg.daily || sg.daily.date !== today) {
    const xpTarget = Math.max(200, Math.floor(sgEffRate()*60));
    sg.daily = { date: today, clicks:0, xpEarned:0, buys:0, claimed:[], xpTarget };
  }
}

function sgColleagueLv(id) { return sg.colleagueLv[id] || 0; }

function sgColleagueStatSum(stat) {
  return SG_COLLEAGUES.reduce((sum,c) => {
    const bonus = (c.bonuses||[]).find(b=>b.stat===stat);
    if (!bonus) return sum;
    const base = sgColleagueLv(c.id) * bonus.perLevel;
    const charBonus = (sg.charMult && sg.charMult[c.id]) || 0;
    return sum + base * (1 + charBonus);
  }, 0);
}

function sgColleagueShopDiscount() {
  return Math.min(0.9, sgColleagueStatSum('shopDiscount')); // 上限90%折扣，避免商品變免費
}

function sgColleagueRateMultBonus()  { return sgColleagueStatSum('rateMult'); }
function sgColleagueClickMultBonus() { return sgColleagueStatSum('clickMult'); }
function sgColleagueCritBonus()    { return sgColleagueStatSum('crit'); }       // 百分點
function sgColleagueAutoClickPerSec() { return sgColleagueStatSum('autoclick'); }
function sgColleagueOfflineCapHours() { return sgColleagueStatSum('offlinecap'); }

// ── 🎁 寶箱掉落系統 ──
function sgRollRarity() {
  const r = Math.random()*100;
  if (r < SG_RARITY_CHANCE.legendary) return 'legendary';
  if (r < SG_RARITY_CHANCE.legendary + SG_RARITY_CHANCE.rare) return 'rare';
  return 'common';
}

function sgRollItemOfRarity(rarity) {
  const pool = SG_ITEMS.filter(i=>i.rarity===rarity);
  return pool[Math.floor(Math.random()*pool.length)];
}

function sgApplyItemEffect(itemDef) {
  switch(itemDef.type) {
    case 'globalRate':  sg.itemGlobalRateBonus  = (sg.itemGlobalRateBonus||0) + itemDef.value; break;
    case 'globalClick': sg.itemGlobalClickBonus = (sg.itemGlobalClickBonus||0) + itemDef.value; break;
    case 'critBonus':   sg.itemCritBonus = (sg.itemCritBonus||0) + itemDef.value; break;
    case 'offlineMult': sg.itemOfflineBonus = (sg.itemOfflineBonus||0) + itemDef.value; break;
    case 'charMult':
      sg.charMult = sg.charMult || {};
      sg.charMult[itemDef.charId] = (sg.charMult[itemDef.charId]||0) + itemDef.value;
      break;
    case 'instantXp': {
      const gain = Math.max(50, Math.floor(sg.totalXp * itemDef.value));
      sgAddXp(gain);
      itemDef._actualGain = gain;
      break;
    }
    case 'burst':
      sg.burstClicksRemaining = itemDef.count;
      sg.burstMult = itemDef.value;
      break;
    case 'guaranteedCrit':
      sg.guaranteedCritUntil = Date.now() + itemDef.value;
      break;
    case 'autoClickBonus':
      sg.itemAutoClickBonus = (sg.itemAutoClickBonus||0) + itemDef.value;
      break;
    case 'offlineHrBonus':
      sg.itemOfflineHrBonus = (sg.itemOfflineHrBonus||0) + itemDef.value;
      break;
    case 'critMultBonus':
      sg.itemCritMultBonus = (sg.itemCritMultBonus||0) + itemDef.value;
      break;
    case 'comboWindowBonus':
      sg.itemComboWindowBonus = (sg.itemComboWindowBonus||0) + itemDef.value;
      break;
    case 'hourglass':
      sg.itemComboWindowBonus = (sg.itemComboWindowBonus||0) + itemDef.value;
      sg.itemGlobalRateBonus = (sg.itemGlobalRateBonus||0) + itemDef.compoundPct;
      sg.itemGlobalClickBonus = (sg.itemGlobalClickBonus||0) + itemDef.compoundPct;
      break;
    case 'dropRateBonus':
      sg.itemDropRateBonus = (sg.itemDropRateBonus||0) + itemDef.value;
      break;
    case 'crystalGainBonus':
      sg.itemCrystalGainBonus = (sg.itemCrystalGainBonus||0) + itemDef.value;
      break;
    case 'luckySpawnBonus':
      sg.itemLuckySpawnBonus = (sg.itemLuckySpawnBonus||0) + itemDef.value;
      break;
    case 'dailyRewardBonus':
      sg.itemDailyRewardBonus = (sg.itemDailyRewardBonus||0) + itemDef.value;
      break;
    case 'comboCapBonus':
      sg.itemComboCapBonus = (sg.itemComboCapBonus||0) + itemDef.value;
      break;
    case 'techPowerInstant':
      sg.techPower = (sg.techPower||0) + itemDef.value;
      break;
    case 'auraEnergyInstant':
      sg.auraEnergy = (sg.auraEnergy||0) + itemDef.value;
      break;
    case 'crystalInstant':
      sg.crystals = (sg.crystals||0) + itemDef.value;
      break;
  }
}

// 一次性即時效果道具無法升級(升級沒有意義)，其餘持續性加成道具皆可用蠻牛升級
const SG_ITEM_INSTANT_TYPES = ['instantXp','burst','guaranteedCrit','crystalInstant','techPowerInstant','auraEnergyInstant'];

function sgIsItemUpgradeable(itemDef) {
  return !SG_ITEM_INSTANT_TYPES.includes(itemDef.type);
}

function sgItemUpgradeCost(itemId) {
  const lv = (sg.itemLv && sg.itemLv[itemId]) || 0;
  return Math.floor(5 * Math.pow(1.18, lv));
}

// 依道具原本效果類型，將指定的增量疊加進對應的持續性數值(升級用,delta為每級增量)
function sgApplyItemEffectDelta(itemDef, value) {
  switch(itemDef.type) {
    case 'globalRate':  sg.itemGlobalRateBonus  = (sg.itemGlobalRateBonus||0) + value; break;
    case 'globalClick': sg.itemGlobalClickBonus = (sg.itemGlobalClickBonus||0) + value; break;
    case 'critBonus':   sg.itemCritBonus = (sg.itemCritBonus||0) + value; break;
    case 'offlineMult': sg.itemOfflineBonus = (sg.itemOfflineBonus||0) + value; break;
    case 'charMult':
      sg.charMult = sg.charMult || {};
      sg.charMult[itemDef.charId] = (sg.charMult[itemDef.charId]||0) + value;
      break;
    case 'autoClickBonus':    sg.itemAutoClickBonus  = (sg.itemAutoClickBonus||0) + value; break;
    case 'offlineHrBonus':    sg.itemOfflineHrBonus  = (sg.itemOfflineHrBonus||0) + value; break;
    case 'critMultBonus':     sg.itemCritMultBonus   = (sg.itemCritMultBonus||0) + value; break;
    case 'comboWindowBonus':  sg.itemComboWindowBonus= (sg.itemComboWindowBonus||0) + value; break;
    case 'dropRateBonus':     sg.itemDropRateBonus   = (sg.itemDropRateBonus||0) + value; break;
    case 'crystalGainBonus':  sg.itemCrystalGainBonus= (sg.itemCrystalGainBonus||0) + value; break;
    case 'luckySpawnBonus':   sg.itemLuckySpawnBonus = (sg.itemLuckySpawnBonus||0) + value; break;
    case 'dailyRewardBonus':  sg.itemDailyRewardBonus= (sg.itemDailyRewardBonus||0) + value; break;
    case 'comboCapBonus':     sg.itemComboCapBonus   = (sg.itemComboCapBonus||0) + value; break;
    case 'hourglass':
      sg.itemComboWindowBonus = (sg.itemComboWindowBonus||0) + value;
      sg.itemGlobalRateBonus = (sg.itemGlobalRateBonus||0) + value*0.5;
      sg.itemGlobalClickBonus = (sg.itemGlobalClickBonus||0) + value*0.5;
      break;
  }
}

function sgUpgradeItem(itemId) {
  const itemDef = SG_ITEMS.find(i=>i.id===itemId);
  if (!itemDef || !sgIsItemUpgradeable(itemDef)) return;
  if (!sg.itemInventory[itemId]) { showToast('尚未擁有此道具，無法升級'); return; }
  const cost = sgItemUpgradeCost(itemId);
  if ((sg.manNiu||0) < cost) { showToast('🐂 蠻牛不足'); return; }
  sg.manNiu -= cost;
  const lv = (sg.itemLv[itemId]||0) + 1;
  sg.itemLv[itemId] = lv;
  const deltaValue = itemDef.value * 0.28; // 每級增加原效果的28%
  sgApplyItemEffectDelta(itemDef, deltaValue);
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  showToast(`💪 「${itemDef.name}」升級到 Lv.${lv}！`);
}

function sgObtainItem(itemDef) {
  const owned = sg.itemInventory[itemDef.id] || 0;
  if (owned > 0) {
    const manNiuGain = SG_DUPLICATE_MANNIU[itemDef.rarity];
    sg.manNiu = (sg.manNiu||0) + manNiuGain;
    sg.itemInventory[itemDef.id] = owned + 1;
    return { itemDef, duplicate:true, manNiuGain };
  } else {
    sg.itemInventory[itemDef.id] = 1;
    sgApplyItemEffect(itemDef);
    return { itemDef, duplicate:false };
  }
}

function sgTryDropItem(source, silent) {
  // click: 手動點擊；click_auto_half: 🎒工具腰帶里程碑解鎖後的自動點擊(手動的一半機率)；其餘(tick): 放置固定機率
  const baseChance = source==='click' ? 0.005 : (source==='click_auto_half' ? 0.0025 : 0.0025);
  const chance = baseChance + (sg.itemDropRateBonus||0);
  if (Math.random() >= chance) return null;
  const rarity = sgRollRarity();
  const itemDef = sgRollItemOfRarity(rarity);
  const result = sgObtainItem(itemDef);
  if (!silent) sgShowDropBanner(result);
  sgSave();
  return result;
}

function sgRollOfflineDrops(hours) {
  const results = [];
  // 💡頭燈里程碑：離線寶箱掉落機率×2
  const perHourChance = 0.008 * (sgGearMS('g6') ? 2 : 1);
  const whole = Math.floor(hours);
  for (let i=0; i<whole; i++) {
    if (Math.random() < perHourChance) {
      const rarity = sgRollRarity();
      results.push(sgObtainItem(sgRollItemOfRarity(rarity)));
    }
  }
  const frac = hours - whole;
  if (Math.random() < frac*perHourChance) {
    const rarity = sgRollRarity();
    results.push(sgObtainItem(sgRollItemOfRarity(rarity)));
  }
  // ⛑️工程安全帽里程碑：只要離線超過1小時，結算保底至少開到1個寶箱
  if (results.length===0 && hours>=1 && sgGearMS('g1')) {
    const rarity = sgRollRarity();
    results.push(sgObtainItem(sgRollItemOfRarity(rarity)));
  }
  return results;
}

function sgShowDropBanner(result) {
  const stageBox = document.getElementById('sgStage');
  if (!stageBox) return;
  const meta = SG_RARITY_META[result.itemDef.rarity];
  const banner = document.createElement('div');
  banner.className = 'sg-drop-banner';
  banner.style.background = meta.bg;
  banner.style.color = meta.color;
  banner.style.borderColor = meta.color;
  const dupText = result.duplicate ? `（重複，轉換 ${result.manNiuGain} 🐂 蠻牛）` : '（新獲得！）';
  banner.innerHTML = `
    <div class="sg-drop-rarity">🎁 ${meta.label}道具${dupText}</div>
    <div class="sg-drop-name">${result.itemDef.name}</div>
    <div class="sg-drop-desc">${result.itemDef.desc}</div>
  `;
  stageBox.appendChild(banner);
  setTimeout(()=>{ banner.classList.add('sg-drop-out'); setTimeout(()=>banner.remove(), 300); }, 2600);
}

// 批次點擊(自動點擊一次tick內)如果同時開出多個寶箱，合併成單一橫幅顯示，避免多個橫幅疊在同一位置
// 套裝加成：持有同分類商品達到門檻時觸發的加成
const SG_SET_BONUSES = [
  { category:'maintenance', threshold:500,  bonus:0.10, name:'維修天團' },
  { category:'maintenance', threshold:1000, bonus:0.15, name:'維修傳奇' },
  { category:'hotel',       threshold:500,  bonus:0.10, name:'五星服務' },
  { category:'hotel',       threshold:1000, bonus:0.15, name:'金牌旅館' },
  { category:'admin',       threshold:500,  bonus:0.10, name:'行政效率' },
  { category:'admin',       threshold:1000, bonus:0.15, name:'行政典範' },
];

function sgCategoryOwnedTotal(category) {
  return SG_SHOP.filter(i=>i.category===category).reduce((s,i)=>s+(sg.owned[i.id]||0), 0);
}

function sgSetBonusSum(category) {
  const total = sgCategoryOwnedTotal(category);
  return SG_SET_BONUSES.filter(b=>b.category===category && total>=b.threshold).reduce((s,b)=>s+b.bonus, 0);
}

function sgCategoryBoost(category) {
  const colleagueStat = category==='hotel' ? 'hotelBoost' : (category==='admin' ? 'adminBoost' : 'maintBoost');
  return sgColleagueStatSum(colleagueStat) + sgSetBonusSum(category);
}

// 檢查套裝加成是否剛跨過新門檻，回傳新啟動的套裝清單(用於顯示通知)
function sgCheckSetBonusUnlocks() {
  if (!sg.seenSetBonuses) sg.seenSetBonuses = {};
  const newlyActive = [];
  SG_SET_BONUSES.forEach(b => {
    const key = b.category + '_' + b.threshold;
    const total = sgCategoryOwnedTotal(b.category);
    if (total >= b.threshold && !sg.seenSetBonuses[key]) {
      sg.seenSetBonuses[key] = true;
      newlyActive.push(b);
    }
  });
  return newlyActive;
}

function sgShopContribution(effectType) {
  return SG_SHOP.filter(i=>i.effect===effectType).reduce((sum,item) => {
    const owned = sg.owned[item.id] || 0;
    if (!owned) return sum;
    const mult = 1 + sgCategoryBoost(item.category);
    return sum + owned * item.amount * mult;
  }, 0);
}

// 水晶持有加成：即使不花掉，光是持有水晶本身就有被動全體加成(無上限，係數極低)
function sgCrystalHoldBonus() {
  return Math.sqrt(sg.crystals||0) * 0.002;
}

// 技術力被動加成(來自證照升級累積，無上限，係數極低，優先度低於同事系統)
function sgTechPowerBonus() {
  return Math.sqrt(sg.techPower||0) * 0.001;
}

// 辦公家具被動加成(來自辦公室裝潢升級累積，無上限，係數極低，優先度低於同事系統)
function sgAuraEnergyBonus() {
  return Math.sqrt(sg.auraEnergy||0) * 0.001;
}

function sgEffClickPower() {
  const base = sg.clickPower + sgShopContribution('click');
  const crystalMult = 1 + 0.08*(sg.crystalClickLv||0);
  const itemMult = 1 + (sg.itemGlobalClickBonus||0);
  const achvMult = 1 + sgAchvBonusSum('click');
  const equipMult = 1 + sgEquipBonus('click');
  const holdMult = 1 + sgCrystalHoldBonus() + sgTechPowerBonus() + sgAuraEnergyBonus();
  const colleagueMult = 1 + sgColleagueClickMultBonus();
  const debuffMult = sgStockDebuffMult();
  const buffMult = sgStockBuffMult();
  return base * crystalMult * itemMult * achvMult * equipMult * holdMult * colleagueMult * debuffMult * buffMult;
}

function sgEffRate() {
  const base = sg.ratePerSec + sgShopContribution('rate');
  const crystalMult = 1 + 0.08*(sg.crystalRateLv||0);
  const itemMult = 1 + (sg.itemGlobalRateBonus||0);
  const achvMult = 1 + sgAchvBonusSum('rate');
  const equipMult = 1 + sgEquipBonus('rate');
  const holdMult = 1 + sgCrystalHoldBonus() + sgTechPowerBonus() + sgAuraEnergyBonus();
  const colleagueMult = 1 + sgColleagueRateMultBonus();
  const debuffMult = sgStockDebuffMult();
  const buffMult = sgStockBuffMult();
  return base * crystalMult * itemMult * achvMult * equipMult * holdMult * colleagueMult * debuffMult * buffMult;
}

function sgTotalAutoClickPerSec() {
  const base = sgColleagueAutoClickPerSec() + (sg.itemAutoClickBonus||0) + (sg.crystalAutoClickLv||0)*0.1;
  return base * (1 + sgEquipBonus('autoclick'));
}

function sgEquipOfflineHrBonus() {
  return sgEquipBonus('offlinehr');
}

function sgCrystalUpgradeCost(id) {
  const lv = id==='crystalClick' ? (sg.crystalClickLv||0) : (id==='crystalRate' ? (sg.crystalRateLv||0) : (sg.crystalAutoClickLv||0));
  return Math.floor((id==='crystalAutoClick'?30:20) * Math.pow(id==='crystalAutoClick'?1.35:1.3, lv));
}

function sgBuyCrystalUpgrade(id) {
  const cost = sgCrystalUpgradeCost(id);
  if (sg.crystals < cost) return;
  sg.crystals -= cost;
  if (id==='crystalClick') sg.crystalClickLv = (sg.crystalClickLv||0)+1;
  else if (id==='crystalRate') sg.crystalRateLv = (sg.crystalRateLv||0)+1;
  else sg.crystalAutoClickLv = (sg.crystalAutoClickLv||0)+1;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
}

function sgPrestigeThreshold() {
  return Math.floor(50000 * Math.pow(1.6, sg.prestigeCount));
}

function sgPrestigeCrystalGain() {
  const base = Math.floor(Math.sqrt(sg.totalXp / 1000));
  const mult = 1 + sgAchvBonusSum('crystalGain') + (sg.itemCrystalGainBonus||0);
  return Math.floor(base * mult);
}

function openSlimeGame() {
  sgLoad();
  sgEnsureDailyReset();
  // 計算離線累積
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - (sg.lastSeen||now)) / 1000));
  let offlineGain = 0;
  const effRate = sgEffRate();
  const capHours = 8 + sgColleagueOfflineCapHours() + sgEquipOfflineHrBonus() + (sg.itemOfflineHrBonus||0);
  const rawCappedSec = Math.min(elapsedSec, capHours*3600);
  // 🔦手電筒里程碑：離線收益計算時間額外+20%(仍受上限秒數保護，不會超過原始經過時間)
  const cappedSec = sgGearMS('g10') ? Math.min(elapsedSec, rawCappedSec*1.2) : rawCappedSec;
  if (elapsedSec > 5 && effRate > 0) {
    const offlineMult = 1 + (sg.itemOfflineBonus||0);
    offlineGain = Math.floor(cappedSec * effRate * offlineMult);
    sgAddXp(offlineGain);
  }
  sg._offlineGain = offlineGain;
  sg._offlineSec = elapsedSec;
  sg._offlineDoubled = false;
  sg._offlineChecked = elapsedSec > 5;
  sg._offlineDrops = elapsedSec > 5 ? sgRollOfflineDrops(cappedSec/3600) : [];

  document.getElementById('slimeGameOverlay').classList.add('open');
  sgActiveTab = sgActiveTab || 'shop';
  sgRender();
  sgSave();

  if (sgTickInterval) clearInterval(sgTickInterval);
  sgTickInterval = setInterval(()=>{
    const rate = sgEffRate();
    if (rate > 0) {
      sgAddXp(rate);
      sgUpdateNumbers();
      const promotion = sgCheckJobPromotion();
      if (promotion) {
        showToast(`🎉 恭喜升職！你現在是「${promotion.name}」了！`);
        sgRender();
      } else {
        const jobRankEl = document.getElementById('sgJobRank');
        if (jobRankEl) jobRankEl.innerHTML = sgJobRankHtml();
      }
    }
    sgTryDropItem('tick');    // 放置本身的寶箱機率(與點擊分開)
    sgAutoClickTick();        // 自動點擊(松鼠/水晶/道具)：模擬真實點擊，各自吃點擊寶箱機率
  }, 1000);

  if (sgLuckyInterval) clearInterval(sgLuckyInterval);
  sgLuckyInterval = setInterval(()=>{
    if (!sg._luckyActive && Math.random() < (0.22 + (sg.itemLuckySpawnBonus||0))) sgSpawnLucky();
  }, 5000);

  if (sgAutoBuyInterval) clearInterval(sgAutoBuyInterval);
  sg._autoBuyElapsedMs = sg._autoBuyElapsedMs || 0;
  sgAutoBuyInterval = setInterval(()=>{
    if (!sg.autoBuy) return;
    sg._autoBuyElapsedMs += 1000;
    const interval = sgGearMS('g3') ? 6000 : 10000; // 🦺反光背心里程碑：自動購買加速 10秒→6秒
    if (sg._autoBuyElapsedMs >= interval) {
      sg._autoBuyElapsedMs = 0;
      sgAutoBuyTick();
    }
  }, 1000);
}

function sgAutoBuyTick() {
  const bought = sgAutoBuyRound();
  // 🧰工具箱里程碑：若這輪有買到東西且資金還夠，可連續多買一輪
  if (bought && sgGearMS('g11')) sgAutoBuyRound();
}

// 執行一輪自動購買，回傳是否有買到任何東西
function sgAutoBuyRound() {
  // 📻對講機里程碑：一次購買維修/行政/旅館三分類CP值最高各一項；未解鎖則只買全體CP值最高一項
  const categories = sgGearMS('g8') ? ['maintenance','admin','hotel'] : [null];
  let anyBought = false;
  const tierUpsAll = [], setBonusUpsAll = [];

  categories.forEach(cat => {
    let best = null, bestCP = -1;
    SG_SHOP.forEach(item => {
      if (cat && item.category !== cat) return;
      if (!sgIsShopItemUnlocked(item)) return;
      const cost = sgShopCost(item);
      if (sg.xp < cost) return;
      const cp = item.amount / cost;
      if (cp > bestCP) { best = item; bestCP = cp; }
    });
    if (!best) return;

    // 用全部可用薪水買到不能再買為止(MAX)，靜默處理不整頁重繪，避免打斷玩家操作
    const { count, cost } = sgCalcBuyQty(best, Infinity);
    if (count <= 0) return;
    sg.xp -= cost;
    sg.owned[best.id] = (sg.owned[best.id]||0) + count;
    anyBought = true;
    sgEnsureDailyReset();
    sg.daily.buys++;
    sgCheckAchvTierUps().forEach(u => tierUpsAll.push(u));
    sgCheckSetBonusUnlocks().forEach(b => setBonusUpsAll.push(b));
    showToast(`🤖 自動購買「${best.name.replace(/^\S+\s/,'')}」x${count}`);
  });

  if (!anyBought) return false;
  sgSave();
  sgUpdateNumbers();
  // 若目前正在商店/公司分頁，更新畫面上的持有數量與按鈕狀態
  if (sgActiveTab === 'shop') document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  tierUpsAll.forEach(u => showToast(`🏆 ${u.cat.icon} ${u.cat.name} 達成 Lv.${u.tier}！`));
  setBonusUpsAll.forEach(b => showToast(`🎖️ 套裝效果啟動：${b.name}！${({maintenance:'維修',hotel:'旅館',admin:'行政'})[b.category]}類產能額外+${Math.round(b.bonus*100)}%`));
  return true;
}

function closeSlimeGame() {
  document.getElementById('slimeGameOverlay').classList.remove('open');
  if (sgTickInterval) { clearInterval(sgTickInterval); sgTickInterval = null; }
  if (sgLuckyInterval) { clearInterval(sgLuckyInterval); sgLuckyInterval = null; }
  if (sgAutoBuyInterval) { clearInterval(sgAutoBuyInterval); sgAutoBuyInterval = null; }
  sg._luckyActive = false;
  sgSave();
}

function sgSlimeSvg(stage) {
  const glowFilter = stage.glow ? `<filter id="sgGlow"><feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const glowAttr = stage.glow ? 'filter="url(#sgGlow)"' : '';
  const crown = stage.crown ? `
    <g transform="translate(50,8)">
      <path d="M -16,14 L -12,-2 L -5,8 L 0,-8 L 5,8 L 12,-2 L 16,14 Z" fill="#FFD700" stroke="#D4A017" stroke-width="1.2"/>
      <circle cx="-12" cy="-2" r="2" fill="#FF6B6B"/>
      <circle cx="0" cy="-8" r="2.3" fill="#5B9BD5"/>
      <circle cx="12" cy="-2" r="2" fill="#FF6B6B"/>
    </g>` : '';
  const royalSparkle = stage.royal ? `
    <circle cx="20" cy="35" r="2" fill="#FFD700" opacity="0.8"><animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite"/></circle>
    <circle cx="82" cy="45" r="1.6" fill="#FFD700" opacity="0.7"><animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.2s" repeatCount="indefinite"/></circle>
    <circle cx="70" cy="20" r="1.8" fill="#E8761A" opacity="0.6"><animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" repeatCount="indefinite"/></circle>` : '';

  return `
  <svg viewBox="0 0 100 95" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${glowFilter}
      <linearGradient id="sgBodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${stage.body}"/>
        <stop offset="100%" stop-color="${stage.body2}"/>
      </linearGradient>
      <radialGradient id="sgHighlight" cx="35%" cy="28%" r="45%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${crown}
    <g ${glowAttr}>
      <ellipse cx="50" cy="80" rx="34" ry="7" fill="#000000" opacity="0.08"/>
      <path d="M 50 18
               C 72 18, 88 34, 88 55
               C 88 74, 71 86, 50 86
               C 29 86, 12 74, 12 55
               C 12 34, 28 18, 50 18 Z"
            fill="url(#sgBodyGrad)" stroke="${stage.body2}" stroke-width="2"/>
      <path d="M 50 18 C 72 18, 88 34, 88 55 C 88 74, 71 86, 50 86 C 29 86, 12 74, 12 55 C 12 34, 28 18, 50 18 Z"
            fill="url(#sgHighlight)"/>
      ${royalSparkle}
      <g class="sg-eye-blink" style="transform-origin:38px 52px;">
        <ellipse cx="38" cy="52" rx="4.2" ry="5.5" fill="${stage.eye}"/>
        <circle cx="39.3" cy="49.5" r="1.3" fill="#fff"/>
      </g>
      <g class="sg-eye-blink" style="transform-origin:62px 52px;">
        <ellipse cx="62" cy="52" rx="4.2" ry="5.5" fill="${stage.eye}"/>
        <circle cx="63.3" cy="49.5" r="1.3" fill="#fff"/>
      </g>
      <path d="M 42 63 Q 50 69 58 63" stroke="${stage.eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="27" cy="60" rx="5" ry="3" fill="#FF9E9E" opacity="0.55"/>
      <ellipse cx="73" cy="60" rx="5" ry="3" fill="#FF9E9E" opacity="0.55"/>
    </g>
  </svg>`;
}

function sgAddXp(amount) {
  sg.xp += amount;
  sg.totalXp += amount;
  sg.lifetimeXp = (sg.lifetimeXp||0) + amount;
}

function sgFormatNum(n) {
  n = Math.floor(n);
  if (n >= 1000000) return (n/1000000).toFixed(2)+'M';
  if (n >= 1000) return (n/1000).toFixed(1)+'K';
  return String(n);
}

function sgRender() {
  const stage = sgGetStage();
  const effRate = sgEffRate();
  const effClick = sgEffClickPower();

  const offlineDrops = sg._offlineDrops || [];
  const showWelcome = sg._offlineGain > 0 || offlineDrops.length > 0 || sg._offlineChecked;
  const canDouble = sg._offlineGain > 0 && !sg._offlineDoubled && sg.dailyDoubleDate !== sgTodayStr();

  const dropsBoxHtml = offlineDrops.length ? `
    <div class="sg-welcome-drops-box">
      <div class="sg-welcome-drops-title">🎁 期間自動開啟了 ${offlineDrops.length} 個寶箱！</div>
      ${offlineDrops.map(r => {
        const meta = SG_RARITY_META[r.itemDef.rarity];
        const suffix = r.duplicate ? `<span style="color:#FFD700;">重複+${r.manNiuGain}🐂</span>` : `<span style="color:#7ED9A8;">新獲得</span>`;
        return `<div class="sg-welcome-drop-row"><span style="color:${meta.color==='#8B9AA8'?'#C8CDD2':meta.color};">[${meta.label}] ${r.itemDef.name}</span>${suffix}</div>`;
      }).join('')}
    </div>` : (sg._offlineChecked ? `
    <div class="sg-welcome-drops-box" style="text-align:center;">
      <div class="sg-welcome-drops-title">📦 本次冒險未取得寶箱，需再接再厲！</div>
      <div style="font-size:10px;opacity:0.75;line-height:1.6;">
        寶箱有機會在<b>點擊</b>、<b>放置</b>、<b>離線</b>時隨機出現，<br>
        持續遊玩就有機會開到更多稀有道具 🍀
      </div>
    </div>` : '');

  const offlineHtml = showWelcome ? `
    <div class="sg-welcome-panel">
      <div class="sg-welcome-title">💤 歡迎回來，守護者！</div>
      <div class="sg-welcome-duration">在你離線的 ${sgFormatDuration(sg._offlineSec)} 裡…</div>
      ${sg._offlineGain > 0 ? `
      <div class="sg-welcome-xp-box">
        <div class="sg-welcome-xp-label">史萊姆們默默工作，產出了</div>
        <div class="sg-welcome-xp-num">+${sgFormatNum(sg._offlineGain)} XP</div>
      </div>` : ''}
      ${dropsBoxHtml}
      <div class="sg-welcome-btn-row">
        ${canDouble ? `<button class="sg-welcome-btn primary" onclick="sgDoubleOffline()">🎬 雙倍領取（每日一次）</button>` : ''}
        <button class="sg-welcome-btn secondary" onclick="sgDismissWelcome()">${canDouble ? '直接收下' : '收下獎勵'}</button>
      </div>
    </div>` : '';

  document.getElementById('sgBody').innerHTML = `
    ${offlineHtml}
    <div class="sg-stage" id="sgStage">
      <div class="sg-toast" id="sgToast"></div>
      <div class="sg-slime-wrap idle" id="sgSlimeWrap" onclick="sgClick(event)">${sgJobAuraHtml()}${sgSlimeSvg(stage)}${sgEquipOverlayHtml(stage)}</div>
      <div class="sg-stage-name">${stage.name}</div>
      <div class="sg-job-rank" id="sgJobRank">${sgJobRankHtml()}</div>
      <div class="sg-xp-row">
        <span class="sg-xp-num" id="sgXpNum">${sgFormatNum(sg.xp)}</span>
        <span class="sg-xp-label">薪水</span>
      </div>
      <div class="sg-secondary-stats" id="sgSecondaryStats">
        <span>🧠 技術力 <b id="sgTechNum">${sgFormatNum(sg.techPower||0)}</b></span>
        <span>🪑 辦公家具 <b id="sgAuraNum">${sgFormatNum(sg.auraEnergy||0)}</b></span>
        <span>🏦 資產 <b id="sgAssetNum">${sgFormatNum(sg.assets||0)}</b></span>
      </div>
      <div class="sg-xp-rate" id="sgXpRate">+${sgFormatNum(effRate)}/秒　｜　點擊 +${sgFormatNum(effClick)}</div>
      <div class="sg-combo-bar"><div class="sg-combo-fill" id="sgComboFill"></div></div>
      <div class="sg-combo-label" id="sgComboLabel"></div>
    </div>
    <div class="sg-tabs">
      <button class="sg-tab-btn${sgActiveTab==='shop'?' active':''}" onclick="sgSwitchTab('shop',this)">🏢 公司</button>
      <button class="sg-tab-btn${sgActiveTab==='prestige'?' active':''}" onclick="sgSwitchTab('prestige',this)">🔮 重新入職</button>
      <button class="sg-tab-btn${sgActiveTab==='colleague'?' active':''}" onclick="sgSwitchTab('colleague',this)">📖 同事</button>
      <button class="sg-tab-btn${sgActiveTab==='stock'?' active':''}" onclick="sgSwitchTab('stock',this)">📈 股票</button>
      <button class="sg-tab-btn${sgActiveTab==='equip'?' active':''}" onclick="sgSwitchTab('equip',this)">🎽 裝備</button>
      <button class="sg-tab-btn${sgActiveTab==='realestate'?' active':''}" onclick="sgSwitchTab('realestate',this)">🏠 房地產</button>
      <button class="sg-tab-btn${sgActiveTab==='inventory'?' active':''}" onclick="sgSwitchTab('inventory',this)">🎒 道具</button>
      <button class="sg-tab-btn${sgActiveTab==='daily'?' active':''}" onclick="sgSwitchTab('daily',this)">📅 每日</button>
      <button class="sg-tab-btn${sgActiveTab==='achv'?' active':''}" onclick="sgSwitchTab('achv',this)">🏆 成就</button>
      <button class="sg-tab-btn${sgActiveTab==='raid'?' active':''}" onclick="sgSwitchTab('raid',this)">🗡️ 巡邏</button>
    </div>
    <div id="sgTabContent">${sgTabContentHtml()}</div>
    <div class="sg-reset-btn" onclick="sgConfirmReset()">重新開始遊戲（清除全部進度）</div>
  `;
}

function sgSwitchTab(tab, btn) {
  sgActiveTab = tab;
  document.querySelectorAll('.sg-tab-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgTabContentHtml() {
  if (sgActiveTab === 'shop') return sgShopTabHtml();
  if (sgActiveTab === 'prestige') return sgPrestigeTabHtml();
  if (sgActiveTab === 'colleague') return sgColleagueTabHtml();
  if (sgActiveTab === 'stock') return sgStockTabHtml();
  if (sgActiveTab === 'equip') return sgEquipTabHtml();
  if (sgActiveTab === 'realestate') return sgRealEstateTabHtml();
  if (sgActiveTab === 'inventory') return sgInventoryTabHtml();
  if (sgActiveTab === 'daily') return sgDailyTabHtml();
  if (sgActiveTab === 'achv') return sgAchvTabHtml();
  if (sgActiveTab === 'raid') return sgRaidTabHtml();
  return '';
}

function sgInventoryTabHtml() {
  const owned = SG_ITEMS.filter(it => (sg.itemInventory[it.id]||0) > 0);
  const manNiuBar = `<div class="sg-colleague-crystal-bar">🐂 目前蠻牛：${sgFormatNum(sg.manNiu||0)}</div>`;
  if (!owned.length) {
    return manNiuBar + `<div class="empty-state" style="padding:30px 0;color:#ccc;">尚未獲得任何道具<br>點擊、放置或離線都有機會開到寶箱 🎁</div>`;
  }
  const sorted = owned.sort((a,b) => {
    const order = {legendary:0, rare:1, common:2};
    return order[a.rarity]-order[b.rarity];
  });
  const html = sorted.map(it => {
    const meta = SG_RARITY_META[it.rarity];
    const count = sg.itemInventory[it.id];
    const upgradeable = sgIsItemUpgradeable(it);
    const lv = (sg.itemLv && sg.itemLv[it.id]) || 0;
    const cost = upgradeable ? sgItemUpgradeCost(it.id) : 0;
    const canAfford = upgradeable && (sg.manNiu||0) >= cost;
    return `
      <div class="sg-inventory-item" style="border-left-color:${meta.color};">
        <div style="flex:1;min-width:0;">
          <div class="sg-inv-name">${it.name} <span style="font-size:9px;color:${meta.color};font-weight:800;">[${meta.label}]</span>${lv>0?` <span style="font-size:9px;color:#8B5CF6;font-weight:800;">Lv.${lv}</span>`:''}</div>
          <div class="sg-inv-desc">${it.desc}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <div class="sg-inv-count" style="color:${meta.color};">x${count}</div>
          ${upgradeable ? `<button class="sg-colleague-buy" style="font-size:10px;padding:5px 10px;" ${canAfford?'':'disabled'} onclick="sgUpgradeItem('${it.id}')">升級 ${cost}🐂</button>` : ''}
        </div>
      </div>`;
  }).join('');
  return manNiuBar + `<div style="font-size:11px;color:#999;margin-bottom:10px;text-align:center;">已收集 ${owned.length} / ${SG_ITEMS.length} 種道具　｜　重複道具會轉換成蠻牛，用來升級已擁有的道具</div>${html}`;
}

let sgShopSubCat = 'maintenance'; // 公司分頁目前顯示的子分類(不儲存,每次開啟預設維修類)

function sgShopTabHtml() {
  const catMeta = {
    maintenance: { label:'🔧 維修', color:'#8B5CF6' },
    admin:       { label:'🏛️ 行政', color:'#B08968' },
    hotel:       { label:'🏨 旅館', color:'#2D9E5F' },
  };
  const subTabs = Object.keys(catMeta).map(cat => `
    <button class="sg-shop-subtab${sgShopSubCat===cat?' active':''}" onclick="sgSwitchShopSubCat('${cat}')">${catMeta[cat].label}</button>
  `).join('');

  const itemsInCat = SG_SHOP.filter(i=>i.category===sgShopSubCat);
  const shopHtml = itemsInCat.map(item => {
    const unlocked = sgIsShopItemUnlocked(item);
    if (!unlocked) {
      const reqItem = SG_SHOP.find(s=>s.id===item.unlockReq.itemId);
      const reqOwned = sg.owned[item.unlockReq.itemId] || 0;
      return `
      <div class="sg-shop-item sg-shop-locked">
        <div class="sg-shop-info">
          <div class="sg-shop-name">🔒 未解鎖</div>
          <div class="sg-shop-desc">擁有 ${item.unlockReq.count} 個「${reqItem?reqItem.name.replace(/^\S+\s/,''):'?'}」即可解鎖（目前 ${reqOwned}）</div>
        </div>
      </div>`;
    }
    const owned = sg.owned[item.id] || 0;
    const cost = sgShopCost(item);
    const canAfford = sg.xp >= cost;
    return `
      <div class="sg-shop-item">
        <div class="sg-shop-info">
          <div class="sg-shop-name">${item.name}</div>
          <div class="sg-shop-desc">${item.desc}</div>
          ${owned>0?`<div class="sg-shop-owned">已擁有 ${owned}</div>`:''}
        </div>
        <div class="sg-buy-row">
          <button class="sg-buy-btn" data-item="${item.id}" ${canAfford?'':'disabled'} onclick="sgBuyBatch('${item.id}',1)">x1<br>✨${sgFormatNum(cost)}</button>
          <button class="sg-buy-btn" onclick="sgBuyBatch('${item.id}',10)">x10</button>
          <button class="sg-buy-btn" onclick="sgBuyBatch('${item.id}',100)">x100</button>
          <button class="sg-buy-btn" onclick="sgBuyBatch('${item.id}',Infinity)">MAX</button>
        </div>
      </div>`;
  }).join('');

  return `
    <label style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;font-weight:700;color:#666;box-shadow:0 1px 6px rgba(0,0,0,0.05);">
      🤖 自動購買CP值最高升級（每10秒觸發一次）
      <input type="checkbox" ${sg.autoBuy?'checked':''} onchange="sgToggleAutoBuy(this.checked)" style="width:18px;height:18px;accent-color:#E8761A;">
    </label>
    ${sgSetBonusMiniHintHtml()}
    <div class="sg-shop-subtabs">${subTabs}</div>
    ${shopHtml}`;
}

// 極簡套裝提示：只顯示一行摘要，完整面板移到成就分頁查看
function sgSetBonusMiniHintHtml() {
  const cats = ['maintenance','hotel','admin'];
  const activeCount = cats.filter(cat => sgSetBonusSum(cat) > 0).length;
  const totalCats = SG_SET_BONUSES.length;
  return `<div class="sg-setbonus-mini" onclick="sgGoToAchvTab()">
    🎖️ 套裝效果：已啟動 ${activeCount}/3 個分類，共 ${SG_SET_BONUSES.filter(b=>sgCategoryOwnedTotal(b.category)>=b.threshold).length}/${totalCats} 階　<span style="opacity:0.6;">前往成就查看詳情 ›</span>
  </div>`;
}

function sgGoToAchvTab() {
  sgActiveTab = 'achv';
  sgRender();
}

function sgSwitchShopSubCat(cat) {
  sgShopSubCat = cat;
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgToggleAutoBuy(checked) {
  sg.autoBuy = checked;
  sgSave();
}

// 套裝加成面板：顯示各分類目前持有總數、已產生的實際效果、下一階門檻與效果預告
function sgSetBonusPanelHtml() {
  const cats = ['maintenance','hotel','admin'];
  const catLabel = { maintenance:'🔧 維修天團', hotel:'🏨 五星服務', admin:'🏛️ 行政效率' };
  const catName = { maintenance:'維修', hotel:'旅館', admin:'行政' };
  const rows = cats.map(cat => {
    const total = sgCategoryOwnedTotal(cat);
    const bonuses = SG_SET_BONUSES.filter(b=>b.category===cat);
    const activeBonuses = bonuses.filter(b=>total>=b.threshold);
    const nextBonus = bonuses.find(b=>total<b.threshold);
    const activeSum = activeBonuses.reduce((s,b)=>s+b.bonus,0);
    const effectDesc = activeSum>0
      ? `目前效果：${catName[cat]}類全部商品產出額外 <b>+${Math.round(activeSum*100)}%</b>`
      : `尚未啟動任何套裝效果`;
    return `
      <div class="sg-setbonus-row">
        <div class="sg-setbonus-name">${catLabel[cat]}　<span style="font-weight:400;opacity:0.85;">持有 ${sgFormatNum(total)} 件</span></div>
        <div class="sg-setbonus-info" style="color:${activeSum>0?'#7ED9A8':'rgba(255,255,255,0.7)'};">${effectDesc}</div>
        ${nextBonus?`<div class="sg-setbonus-info" style="opacity:0.75;">再持有 ${sgFormatNum(nextBonus.threshold-total)} 件可再+${Math.round(nextBonus.bonus*100)}%（門檻 ${sgFormatNum(nextBonus.threshold)}）</div>`:''}
      </div>`;
  }).join('');
  return `<div class="sg-setbonus-panel"><div class="sg-setbonus-title">🎖️ 套裝效果（同分類商品持有總數達門檻即生效）</div>${rows}</div>`;
}

function sgCalcBuyQty(item, qty) {
  const owned = sg.owned[item.id] || 0;
  let cost = 0, count = 0;
  const budget = sg.xp;
  const limit = qty === Infinity ? 100000 : qty;
  while (count < limit) {
    const c = Math.floor(item.baseCost * Math.pow(item.costMul, owned + count));
    if (cost + c > budget) break;
    cost += c;
    count++;
  }
  return { count, cost };
}

function sgBuyBatch(itemId, qty) {
  const item = SG_SHOP.find(s=>s.id===itemId);
  if (!item) return;
  const { count, cost } = sgCalcBuyQty(item, qty);
  if (count <= 0) { showToast('薪水不足'); return; }
  sg.xp -= cost;
  sg.owned[itemId] = (sg.owned[itemId]||0) + count;
  sgEnsureDailyReset();
  sg.daily.buys++;
  const tierUps = sgCheckAchvTierUps();
  const setBonusUps = sgCheckSetBonusUnlocks();
  sgSave();
  sgRender();
  showToast(`✓ 購買「${item.name.replace(/^\S+\s/,'')}」x${count}`);
  tierUps.forEach(u => showToast(`🏆 ${u.cat.icon} ${u.cat.name} 達成 Lv.${u.tier}！`));
  setBonusUps.forEach(b => showToast(`🎖️ 套裝效果啟動：${b.name}！${({maintenance:'維修',hotel:'旅館',admin:'行政'})[b.category]}類產能額外+${Math.round(b.bonus*100)}%`));
}

function sgPrestigeTabHtml() {
  const threshold = sgPrestigeThreshold();
  const canPrestige = sg.totalXp >= threshold;
  const crystalGain = sgPrestigeCrystalGain();
  const progress = Math.min(100, Math.round(sg.totalXp/threshold*100));

  const clickCost = sgCrystalUpgradeCost('crystalClick');
  const rateCost = sgCrystalUpgradeCost('crystalRate');
  const autoClickCost = sgCrystalUpgradeCost('crystalAutoClick');

  return `
    <div class="sg-prestige-box">
      <div style="font-size:11px;opacity:0.8;">💎 目前水晶</div>
      <div class="sg-prestige-crystal">${sg.crystals} 💠</div>
      <div style="font-size:12px;color:#7ED9A8;font-weight:700;margin-top:2px;">持有加成：全體薪水/點擊力 +${Math.round(sgCrystalHoldBonus()*100)}%（無需花費，光是持有即生效，上限50%）</div>
      <div class="sg-prestige-desc">
        重新入職會重置薪水、點擊力、產能與已購買升級，換取「水晶」。<br>
        累積薪水達 <b>${sgFormatNum(threshold)}</b> 才能重新入職（目前進度 ${progress}%）。<br>
        本次重新入職預計可獲得 <b>${crystalGain} 💠</b>
      </div>
      <button class="sg-prestige-btn" ${canPrestige?'':'disabled'} onclick="sgDoPrestige()">
        ${canPrestige ? '✨ 立即重新入職' : `尚未達成（${progress}%）`}
      </button>

      <div class="sg-talent-current" style="margin-top:14px; text-align:left;">
        <div style="font-weight:800;margin-bottom:8px;text-align:center;">💎 永久水晶強化（無上限）</div>
        <div class="sg-crystal-lv-card">
          <div class="sg-crystal-lv-info">
            <div class="sg-crystal-lv-name">👆 永久點擊強化 Lv.${sg.crystalClickLv||0}</div>
            <div class="sg-crystal-lv-desc">點擊力額外 +${(sg.crystalClickLv||0)*8}%</div>
          </div>
          <button class="sg-crystal-lv-btn" ${sg.crystals>=clickCost?'':'disabled'} onclick="sgBuyCrystalUpgrade('crystalClick')">${clickCost} 💠</button>
        </div>
        <div class="sg-crystal-lv-card">
          <div class="sg-crystal-lv-info">
            <div class="sg-crystal-lv-name">⏳ 永久產能強化 Lv.${sg.crystalRateLv||0}</div>
            <div class="sg-crystal-lv-desc">產能額外 +${(sg.crystalRateLv||0)*8}%</div>
          </div>
          <button class="sg-crystal-lv-btn" ${sg.crystals>=rateCost?'':'disabled'} onclick="sgBuyCrystalUpgrade('crystalRate')">${rateCost} 💠</button>
        </div>
        <div class="sg-crystal-lv-card">
          <div class="sg-crystal-lv-info">
            <div class="sg-crystal-lv-name">🐿️ 永久自動點擊強化 Lv.${sg.crystalAutoClickLv||0}</div>
            <div class="sg-crystal-lv-desc">自動點擊額外 +${((sg.crystalAutoClickLv||0)*0.1).toFixed(1)}次/秒</div>
          </div>
          <button class="sg-crystal-lv-btn" ${sg.crystals>=autoClickCost?'':'disabled'} onclick="sgBuyCrystalUpgrade('crystalAutoClick')">${autoClickCost} 💠</button>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:#aaa;text-align:center;">已重新入職 ${sg.prestigeCount} 次</div>
  `;
}

function sgUpdateStageDisplay() {
  const rateEl = document.getElementById('sgXpRate');
  if (rateEl) rateEl.textContent = `+${sgFormatNum(sgEffRate())}/秒　｜　點擊 +${sgFormatNum(sgEffClickPower())}`;
  const techEl = document.getElementById('sgTechNum');
  if (techEl) techEl.textContent = sgFormatNum(sg.techPower||0);
  const auraEl = document.getElementById('sgAuraNum');
  if (auraEl) auraEl.textContent = sgFormatNum(sg.auraEnergy||0);
  const assetEl = document.getElementById('sgAssetNum');
  if (assetEl) assetEl.textContent = sgFormatNum(sg.assets||0);
  const jobRankEl = document.getElementById('sgJobRank');
  if (jobRankEl) jobRankEl.innerHTML = sgJobRankHtml();
}

function sgDoPrestige() {
  const threshold = sgPrestigeThreshold();
  if (sg.totalXp < threshold) return;
  const gain = sgPrestigeCrystalGain();
  if (!confirm(`確定要重新入職嗎？\n\n將重置薪水、點擊力、產能與商店升級。\n獲得 ${gain} 💠 水晶（永久保留）。\n\n同事、成就、道具、裝備、證照、房地產都不會重置。`)) return;
  sg.crystals += gain;
  sg.prestigeCount++;
  sg.xp = 0; sg.totalXp = 0; sg.clickPower = 1; sg.ratePerSec = 0; sg.owned = {};
  sgSave();
  sgRender();
  showToast(`✨ 重新入職成功！獲得 ${gain} 💠 水晶`);
}

function sgColleagueBonusLabel(bonuses, lv) {
  const meta = {
    rateMult:    { name:'產能加成',     fmt:v=>'+'+(v*100).toFixed(1)+'%' },
    clickMult:   { name:'點擊力加成',   fmt:v=>'+'+(v*100).toFixed(1)+'%' },
    hotelBoost:  { name:'旅館商品加成', fmt:v=>'+'+(v*100).toFixed(1)+'%' },
    maintBoost:  { name:'維修商品加成', fmt:v=>'+'+(v*100).toFixed(1)+'%' },
    adminBoost:  { name:'行政商品加成', fmt:v=>'+'+(v*100).toFixed(1)+'%' },
    shopDiscount:{ name:'採購折扣',     fmt:v=>'-'+(v*100).toFixed(1)+'%' },
    crit:        { name:'會心機率',     fmt:v=>'+'+v.toFixed(1)+'%' },
    autoclick:   { name:'自動點擊/秒',  fmt:v=>'+'+v.toFixed(2) },
    offlinecap:  { name:'離線上限',     fmt:v=>'+'+v.toFixed(1)+'hr' },
  };
  return bonuses.map(b => {
    const m = meta[b.stat];
    const total = lv * b.perLevel;
    return `${m.name}${m.fmt(total)}`;
  }).join('　');
}

function sgColleagueBonusPreview(bonuses) {
  const meta = {
    rateMult:'產能加成', clickMult:'點擊力加成', hotelBoost:'旅館商品加成', maintBoost:'維修商品加成',
    adminBoost:'行政商品加成', shopDiscount:'採購折扣', crit:'會心機率', autoclick:'自動點擊/秒', offlinecap:'離線上限',
  };
  return bonuses.map(b=>meta[b.stat]).join('　');
}

function sgColleagueTabHtml() {
  const items = SG_COLLEAGUES.map(c => {
    const lv = sgColleagueLv(c.id);
    const cost = Math.floor(c.baseCost * Math.pow(c.costMul, lv));
    const canAfford = sg.crystals >= cost;
    const lockedClass = (lv>0 || canAfford) ? '' : ' locked';
    const affordClass = canAfford ? ' can-afford' : '';
    return `
      <div class="sg-colleague-item${lockedClass}${affordClass}">
        <div class="sg-colleague-emoji">${lv>0?c.emoji:'❓'}</div>
        <div class="sg-colleague-name">${lv>0?c.name:'未收集'}${lv>0?' Lv.'+lv:''}</div>
        <div class="sg-colleague-bonus">${lv>0?sgColleagueBonusLabel(c.bonuses, lv):sgColleagueBonusPreview(c.bonuses)}</div>
        <div class="sg-colleague-cost">${cost} 💠</div>
        <button class="sg-colleague-buy" ${canAfford?'':'disabled'} onclick="sgUpgradeColleague('${c.id}')">${lv>0?'升級':'收集'}</button>
      </div>`;
  }).join('');
  return `
    <div class="sg-colleague-crystal-bar">💎 目前水晶：${sg.crystals} 💠　｜　🛒 目前採購折扣：${(sgColleagueShopDiscount()*100).toFixed(1)}%</div>
    <div style="font-size:11px;color:#999;margin-bottom:10px;text-align:center;">用水晶收集並升級永久夥伴，效果不受重新入職影響、無等級上限</div>
    <div class="sg-colleague-grid">${items}</div>
  `;
}

function sgUpgradeColleague(id) {
  const item = SG_COLLEAGUES.find(c=>c.id===id);
  if (!item) return;
  const lv = sgColleagueLv(id);
  const cost = Math.floor(item.baseCost * Math.pow(item.costMul, lv));
  if (sg.crystals < cost) return;
  sg.crystals -= cost;
  sg.colleagueLv[id] = lv + 1;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  showToast(`📖 ${item.name} 升級到 Lv.${lv+1}！`);
}

// ── 🎽 裝備與證照 ──
// 裝備目前等級對應的花費：前10級用薪水，第11級起改用水晶
function sgGearCost(def) {
  const lv = (sg.gearLv && sg.gearLv[def.id]) || 0;
  if (lv < def.salaryPhase.maxLevel) {
    return { currency:'xp', cost: Math.floor(def.salaryPhase.baseCost * Math.pow(def.salaryPhase.costMul, lv)) };
  }
  const crystalLv = lv - def.salaryPhase.maxLevel;
  return { currency:'crystal', cost: Math.floor(def.crystalPhase.baseCost * Math.pow(def.crystalPhase.costMul, crystalLv)) };
}

function sgUpgradeGear(id) {
  const def = SG_GEAR.find(e=>e.id===id);
  if (!def) return;
  const lv = (sg.gearLv[id]||0);
  const targetLevel = lv + 1;
  const techReq = sgGearTechReq(targetLevel);
  if ((sg.techPower||0) < techReq) { showToast(`🔒 技術力不足！升到 Lv.${targetLevel} 需要技術力 ${techReq}`); return; }
  const { currency, cost } = sgGearCost(def);
  const budget = currency==='xp' ? sg.xp : sg.crystals;
  if (budget < cost) { showToast(currency==='xp' ? '薪水不足' : '水晶不足'); return; }
  if (currency==='xp') sg.xp -= cost; else sg.crystals -= cost;
  sg.gearLv[id] = targetLevel;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  sgUpdateNumbers();
  sgRerenderStageVisual();
  showToast(`🎽 「${def.name}」升級到 Lv.${targetLevel}！`);
}

function sgCertCost(def) {
  const lv = (sg.certLv && sg.certLv[def.id]) || 0;
  return Math.floor(def.baseCost * Math.pow(def.costMul, lv));
}

// 各證照等級每升一級所獲得的技術力點數
function sgCertTechGain(tier) {
  return { '甲':3, '乙':2, '丙':1, '特殊':2 }[tier] || 1;
}

// 證照升級的資源門檻：依等級分配需要資產/辦公家具/技術力的組合
function sgCertResourceReq(tier, targetLevel) {
  switch(tier) {
    case '丙':   return { furniture: Math.ceil(targetLevel/4) };
    case '乙':   return { furniture: Math.ceil(targetLevel/3), asset: Math.ceil(targetLevel/5) };
    case '甲':   return { asset: Math.ceil(targetLevel/3), tech: Math.ceil(targetLevel/4) };
    case '特殊': return { asset: Math.ceil(targetLevel/3), furniture: Math.ceil(targetLevel/3) };
    default: return {};
  }
}

function sgCheckResourceReq(req) {
  if (req.tech && (sg.techPower||0) < req.tech) return `技術力不足(需要${req.tech})`;
  if (req.furniture && (sg.auraEnergy||0) < req.furniture) return `辦公家具不足(需要${req.furniture})`;
  if (req.asset && (sg.assets||0) < req.asset) return `資產不足(需要${req.asset})`;
  return null;
}

function sgUpgradeCertification(id) {
  const def = SG_CERTIFICATIONS.find(c=>c.id===id);
  if (!def) return;
  const lv = (sg.certLv[id]||0);
  const targetLevel = lv + 1;
  const req = sgCertResourceReq(def.tier, targetLevel);
  const failMsg = sgCheckResourceReq(req);
  if (failMsg) { showToast(`🔒 ${failMsg}`); return; }
  const cost = sgCertCost(def);
  if (sg.crystals < cost) { showToast('水晶不足'); return; }
  sg.crystals -= cost;
  sg.certLv[id] = targetLevel;
  sg.techPower = (sg.techPower||0) + sgCertTechGain(def.tier);
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  showToast(`📋 「${def.name}」升級到 Lv.${targetLevel}！技術力 +${sgCertTechGain(def.tier)}`);
}

function sgOfficeCost(def) {
  const lv = (sg.officeLv && sg.officeLv[def.id]) || 0;
  return Math.floor(def.baseCost * Math.pow(def.costMul, lv));
}

function sgUpgradeOffice(id) {
  const def = SG_OFFICE_DECOR.find(o=>o.id===id);
  if (!def) return;
  const cost = sgOfficeCost(def);
  if (sg.crystals < cost) return;
  sg.crystals -= cost;
  const lv = (sg.officeLv[id]||0) + 1;
  sg.officeLv[id] = lv;
  sg.auraEnergy = (sg.auraEnergy||0) + 1;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  showToast(`🏢 「${def.name}」升級到 Lv.${lv}！辦公家具 +1`);
}

function sgPropertyCost(def) {
  const lv = (sg.propertyLv && sg.propertyLv[def.id]) || 0;
  return Math.floor(def.baseCost * Math.pow(def.costMul, lv));
}

function sgUpgradeProperty(id) {
  const def = SG_REAL_ESTATE.find(p=>p.id===id);
  if (!def) return;
  const cost = sgPropertyCost(def);
  if (sg.xp < cost) return;
  sg.xp -= cost;
  const lv = (sg.propertyLv[id]||0) + 1;
  sg.propertyLv[id] = lv;
  sg.assets = (sg.assets||0) + def.assetPerLv;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  sgUpdateStageDisplay();
  sgUpdateNumbers();
  showToast(`🏠 「${def.name}」升級到 Lv.${lv}！資產 +${def.assetPerLv}`);
}

// 重新渲染史萊姆本體(含裝備視覺代表)，不整頁重繪
function sgRerenderStageVisual() {
  const wrap = document.getElementById('sgSlimeWrap');
  if (!wrap) return;
  const stage = sgGetStage();
  wrap.innerHTML = sgJobAuraHtml() + sgSlimeSvg(stage) + sgEquipOverlayHtml(stage);
}

// 僅安全帽(頭)與手電筒(手)有實際疊圖視覺，其餘裝備/證照皆為純數值加成
// 裝備疊圖視覺已移除(效果數值不受影響，僅取消emoji疊加顯示)
function sgEquipOverlayHtml(stage) {
  return '';
}

// 職級光環：依目前職級分級(1-4)，投資越多、職級越高，光環越明顯，呈現「越來越厲害」的持續視覺感
function sgJobAuraHtml() {
  const tier = sgJobRankTier(sgGetJobRank().rank);
  if (tier <= 1) return '';
  const auraClass = { 2:'sg-job-aura-t2', 3:'sg-job-aura-t3', 4:'sg-job-aura-t4' }[tier];
  return `<div class="sg-job-aura ${auraClass}"></div>`;
}

let sgEquipSubCat = 'gear'; // 裝備分頁目前顯示的子分類

function sgEquipTabHtml() {
  const bonusLabel = (bonuses) => bonuses.map(b => {
    const name = {rate:'產能', click:'點擊力', autoclick:'自動點擊', offlinehr:'離線上限', crit:'會心機率'}[b.type];
    const val = b.type==='offlinehr' ? '+'+b.value+'hr' : (b.type==='crit' ? '+'+b.value+'%' : '+'+Math.round(b.value*100)+'%');
    return `${name}${val}`;
  }).join('、');

  const renderGearCard = (def) => {
    const lv = (sg.gearLv && sg.gearLv[def.id]) || 0;
    const targetLevel = lv + 1;
    const techReq = sgGearTechReq(targetLevel);
    const techOk = (sg.techPower||0) >= techReq;
    const { currency, cost } = sgGearCost(def);
    const budget = currency==='xp' ? sg.xp : sg.crystals;
    const canAfford = budget >= cost && techOk;
    const costLabel = currency==='xp' ? `${sgFormatNum(cost)} ✨` : `${sgFormatNum(cost)} 💠`;
    const totalBonus = def.bonuses.map(b=>({type:b.type, value:b.value*lv}));
    const phaseLabel = currency==='xp' ? '薪水階段' : '水晶階段';
    return `
      <div class="sg-colleague-item${(lv>0||canAfford)?'':' locked'}${canAfford?' can-afford':''}">
        <div class="sg-colleague-emoji">${lv>0?def.emoji:'❓'}</div>
        <div class="sg-colleague-name">${lv>0?def.name:'未購買'}${lv>0?' Lv.'+lv:''}</div>
        <div class="sg-colleague-bonus">${lv>0?bonusLabel(totalBonus):bonusLabel(def.bonuses)+'/級'}</div>
        <div class="sg-colleague-bonus" style="color:${techOk?'#999':'#C0392B'};">技術力需求 ${techReq}（目前${sg.techPower||0}）</div>
        <div class="sg-colleague-cost">${costLabel}　<span style="opacity:0.6;">${phaseLabel}</span></div>
        ${def.milestone ? `<div class="sg-colleague-bonus" style="color:${lv>=SG_GEAR_MILESTONE_LEVEL?'#2E7D32':'#999'};">${lv>=SG_GEAR_MILESTONE_LEVEL?'✅ 已解鎖':'🔒 Lv.'+SG_GEAR_MILESTONE_LEVEL+'解鎖'}：${def.milestone}</div>` : ''}
        <button class="sg-colleague-buy" ${canAfford?'':'disabled'} onclick="sgUpgradeGear('${def.id}')">${lv>0?'升級':'購買'}</button>
      </div>`;
  };

  const renderCertCard = (def) => {
    const lv = (sg.certLv && sg.certLv[def.id]) || 0;
    const targetLevel = lv + 1;
    const req = sgCertResourceReq(def.tier, targetLevel);
    const reqFailMsg = sgCheckResourceReq(req);
    const cost = sgCertCost(def);
    const canAfford = sg.crystals >= cost && !reqFailMsg;
    const totalBonus = def.bonuses.map(b=>({type:b.type, value:b.value*lv}));
    const reqParts = [];
    if (req.tech) reqParts.push(`技術力${req.tech}`);
    if (req.furniture) reqParts.push(`家具${req.furniture}`);
    if (req.asset) reqParts.push(`資產${req.asset}`);
    return `
      <div class="sg-colleague-item${(lv>0||canAfford)?'':' locked'}${canAfford?' can-afford':''}">
        <div class="sg-colleague-emoji">${lv>0?def.emoji:'❓'}</div>
        <div class="sg-colleague-name">${lv>0?def.name:'未考取'}${lv>0?' Lv.'+lv:''}<span style="font-size:9px;color:#999;font-weight:400;"> [${def.tier}]</span></div>
        <div class="sg-colleague-bonus">${lv>0?bonusLabel(totalBonus):bonusLabel(def.bonuses)+'/級'}</div>
        ${reqParts.length?`<div class="sg-colleague-bonus" style="color:${reqFailMsg?'#C0392B':'#999'};">需求：${reqParts.join('、')}</div>`:''}
        <div class="sg-colleague-cost">${sgFormatNum(cost)} 💠</div>
        <button class="sg-colleague-buy" ${canAfford?'':'disabled'} onclick="sgUpgradeCertification('${def.id}')">${lv>0?'升級':'考取'}</button>
      </div>`;
  };

  const certByTier = (tier) => SG_CERTIFICATIONS.filter(c=>c.tier===tier);

  const subTabMeta = {
    gear: { label:'🎽 裝備', render: () => `<div class="sg-colleague-grid">${SG_GEAR.map(renderGearCard).join('')}</div>` },
    certA:{ label:'📋 甲級', render: () => `<div class="sg-colleague-grid">${certByTier('甲').map(renderCertCard).join('')}</div>` },
    certB:{ label:'📋 乙級', render: () => `<div class="sg-colleague-grid">${certByTier('乙').map(renderCertCard).join('')}</div>` },
    certC:{ label:'📋 丙級', render: () => `<div class="sg-colleague-grid">${certByTier('丙').map(renderCertCard).join('')}</div>` },
    certS:{ label:'📋 專業', render: () => `<div class="sg-colleague-grid">${certByTier('特殊').map(renderCertCard).join('')}</div>` },
  };
  const subTabs = Object.keys(subTabMeta).map(key => `
    <button class="sg-shop-subtab${sgEquipSubCat===key?' active':''}" onclick="sgSwitchEquipSubCat('${key}')">${subTabMeta[key].label}</button>
  `).join('');

  return `
    <div class="sg-colleague-crystal-bar">💎 水晶：${sg.crystals} 💠　｜　✨ 薪水：${sgFormatNum(sg.xp)}　｜　🧠 技術力：${sgFormatNum(sg.techPower||0)}</div>
    <div style="font-size:11px;color:#999;margin-bottom:10px;text-align:center;">裝備前期用薪水、後期用水晶購買；證照升級需同時滿足水晶與資產／辦公家具／技術力門檻</div>
    <div class="sg-shop-subtabs">${subTabs}</div>
    ${subTabMeta[sgEquipSubCat].render()}
  `;
}

function sgSwitchEquipSubCat(key) {
  sgEquipSubCat = key;
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRealEstateTabHtml() {
  const bonusLabel = (bonuses) => bonuses.map(b => {
    const name = {rate:'產能', click:'點擊力', autoclick:'自動點擊', offlinehr:'離線上限', crit:'會心機率'}[b.type];
    const val = b.type==='offlinehr' ? '+'+b.value+'hr' : (b.type==='crit' ? '+'+b.value+'%' : '+'+Math.round(b.value*100)+'%');
    return `${name}${val}`;
  }).join('、');

  const renderOfficeCard = (def) => {
    const lv = (sg.officeLv && sg.officeLv[def.id]) || 0;
    const cost = sgOfficeCost(def);
    const canAfford = sg.crystals >= cost;
    const totalBonus = def.bonuses.map(b=>({type:b.type, value:b.value*lv}));
    return `
      <div class="sg-colleague-item${(lv>0||canAfford)?'':' locked'}${canAfford?' can-afford':''}">
        <div class="sg-colleague-emoji">${lv>0?def.emoji:'❓'}</div>
        <div class="sg-colleague-name">${lv>0?def.name:'未購買'}${lv>0?' Lv.'+lv:''}</div>
        <div class="sg-colleague-bonus">${lv>0?bonusLabel(totalBonus):bonusLabel(def.bonuses)+'/級'}</div>
        <div class="sg-colleague-cost">${cost} 💠</div>
        <button class="sg-colleague-buy" ${canAfford?'':'disabled'} onclick="sgUpgradeOffice('${def.id}')">${lv>0?'升級':'購買'}</button>
      </div>`;
  };

  const renderPropertyCard = (def) => {
    const lv = (sg.propertyLv && sg.propertyLv[def.id]) || 0;
    const cost = sgPropertyCost(def);
    const canAfford = sg.xp >= cost;
    const totalBonus = def.bonuses.map(b=>({type:b.type, value:b.value*lv}));
    return `
      <div class="sg-colleague-item${(lv>0||canAfford)?'':' locked'}${canAfford?' can-afford':''}">
        <div class="sg-colleague-emoji">${lv>0?def.emoji:'❓'}</div>
        <div class="sg-colleague-name">${lv>0?def.name:'未購買'}${lv>0?' Lv.'+lv:''}</div>
        <div class="sg-colleague-bonus">${lv>0?bonusLabel(totalBonus):bonusLabel(def.bonuses)+'/級'}</div>
        <div class="sg-colleague-bonus" style="color:#B8860B;">${lv>0?`資產 ${lv*def.assetPerLv}`:`+${def.assetPerLv} 資產/級`}</div>
        <div class="sg-colleague-cost">✨${sgFormatNum(cost)}</div>
        <button class="sg-colleague-buy" ${canAfford?'':'disabled'} onclick="sgUpgradeProperty('${def.id}')">${lv>0?'升級':'購買'}</button>
      </div>`;
  };

  return `
    <div class="sg-colleague-crystal-bar">💎 水晶：${sg.crystals} 💠　｜　✨ 薪水：${sgFormatNum(sg.xp)}　｜　🏦 資產：${sgFormatNum(sg.assets||0)}</div>
    <div style="font-size:11px;color:#999;margin-bottom:10px;text-align:center;">房地產非常昂貴，用薪水購買，累積的「資產」不受轉生影響，也是職級晉升的必要條件之一</div>
    <div class="sg-section-label">🏠 房地產（薪水購買，非常昂貴）</div>
    <div class="sg-colleague-grid">${SG_REAL_ESTATE.map(renderPropertyCard).join('')}</div>
    <div class="sg-section-label">🏢 辦公室裝潢（水晶升級，無上限）</div>
    <div class="sg-colleague-grid">${SG_OFFICE_DECOR.map(renderOfficeCard).join('')}</div>
  `;
}

function sgDailyTabHtml() {
  sgEnsureDailyReset();
  const items = SG_DAILY_TEMPLATES.map(q => {
    const target = q.dynamicTarget ? (sg.daily.xpTarget||200) : q.target;
    const progress = sg.daily[q.type] || 0;
    const done = progress >= target;
    const claimed = sg.daily.claimed.includes(q.id);
    const pct = Math.min(100, Math.round(progress/target*100));
    return `
      <div class="sg-daily-item">
        <div class="sg-daily-top">
          <div class="sg-daily-name">${q.name}${q.dynamicTarget?`（${sgFormatNum(target)}）`:''}</div>
          <div class="sg-daily-reward">+${q.rewardCrystal} 💠</div>
        </div>
        <div class="sg-daily-track"><div class="sg-daily-fill" style="width:${pct}%;"></div></div>
        <div class="sg-daily-prog">${sgFormatNum(Math.min(progress,target))} / ${sgFormatNum(target)}</div>
        <button class="sg-daily-claim" ${(done && !claimed)?'':'disabled'} onclick="sgClaimDaily('${q.id}')">
          ${claimed ? '✓ 已領取' : (done ? '領取獎勵' : '尚未達成')}
        </button>
      </div>`;
  }).join('');
  return `<div style="font-size:11px;color:#999;margin-bottom:10px;text-align:center;">每日 00:00 重置，薪水目標依你目前產能自動調整</div>${items}`;
}

function sgClaimDaily(id) {
  const q = SG_DAILY_TEMPLATES.find(d=>d.id===id);
  if (!q) return;
  const target = q.dynamicTarget ? (sg.daily.xpTarget||200) : q.target;
  const progress = sg.daily[q.type] || 0;
  if (progress < target || sg.daily.claimed.includes(id)) return;
  sg.daily.claimed.push(id);
  const reward = Math.floor(q.rewardCrystal * (1 + (sg.itemDailyRewardBonus||0)));
  sg.crystals += reward;
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
  showToast(`✅ 完成每日任務！+${reward} 💠`);
}

function sgAchvTabHtml() {
  const rewardLabel = { click:'點擊力', rate:'產能', crit:'會心機率', crystalGain:'轉生水晶量' };
  const rows = SG_ACHV_CATEGORIES.map(cat => {
    const tier = sgAchvTier(cat);
    const val = cat.statFn(sg);
    const prevThreshold = tier===0 ? 0 : cat.base*Math.pow(cat.ratio, tier-1);
    const nextThreshold = cat.base*Math.pow(cat.ratio, tier);
    const pct = Math.min(100, Math.max(0, Math.round((val-prevThreshold)/(nextThreshold-prevThreshold)*100)));
    const totalBonus = tier*cat.rewardPerTier;
    const bonusDisplay = cat.rewardType==='crit' ? `+${totalBonus.toFixed(0)}%` : `+${Math.round(totalBonus*100)}%`;
    return `
      <div class="sg-achv-item">
        <div class="sg-achv-icon">${cat.icon}</div>
        <div class="sg-achv-info">
          <div class="sg-achv-name">${cat.name} Lv.${tier}</div>
          <div class="sg-achv-desc">${sgFormatNum(val)} / ${sgFormatNum(nextThreshold)}</div>
          <div class="sg-daily-track" style="margin-top:4px;"><div class="sg-daily-fill" style="width:${pct}%;"></div></div>
        </div>
        <div class="sg-achv-reward">${rewardLabel[cat.rewardType]}<br>${bonusDisplay}</div>
      </div>`;
  }).join('');
  const totalTiers = SG_ACHV_CATEGORIES.reduce((s,c)=>s+sgAchvTier(c),0);
  return `
    <div style="font-size:11px;color:#999;text-align:center;margin-bottom:10px;">成就無上限，數值越高加成越強</div>
    ${rows}
    <div style="font-size:11px;color:#aaa;text-align:center;margin:8px 0 14px;">總計已達成 ${totalTiers} 階</div>
    ${sgSetBonusPanelHtml()}
  `;
}

function sgDismissWelcome() {
  sg._offlineGain = 0;
  sg._offlineDrops = [];
  sg._offlineChecked = false;
  sgSave();
  sgRender();
}

function sgDoubleOffline() {
  if (sg._offlineDoubled || sg.dailyDoubleDate === sgTodayStr()) return;
  sgAddXp(sg._offlineGain);
  sg.dailyDoubleDate = sgTodayStr();
  sg._offlineDoubled = true;
  sgSave();
  sgRender();
  showToast(`🎬 雙倍領取成功！再 +${sgFormatNum(sg._offlineGain)} 薪水`);
}

function sgSpawnLucky() {
  const stageBox = document.getElementById('sgStage');
  if (!stageBox) return;
  sg._luckyActive = true;
  const el = document.createElement('div');
  el.className = 'sg-lucky';
  el.textContent = '🍀';
  const x = 20 + Math.random()*60;
  const y = 15 + Math.random()*20;
  el.style.left = x + '%';
  el.style.top = y + '%';
  el.onclick = (e) => { e.stopPropagation(); sgClickLucky(el); };
  stageBox.appendChild(el);
  const luckyDuration = sgGearMS('g4') ? 9000 : 5000; // 👢鋼頭安全鞋里程碑：停留時間5秒→9秒
  el._timeout = setTimeout(()=>{ el.remove(); sg._luckyActive = false; }, luckyDuration);
}

function sgClickLucky(el) {
  if (el._timeout) clearTimeout(el._timeout);
  el.remove();
  sg._luckyActive = false;
  const reward = Math.max(20, Math.floor(sgEffRate()*30 + sgEffClickPower()*20));
  sgAddXp(reward);
  sg.luckyClickCount = (sg.luckyClickCount||0) + 1;
  sgUpdateNumbers();
  sgSave();
  showToast(`🍀 幸運史萊姆！+${sgFormatNum(reward)} 薪水`);
}

function sgUpdateNumbers() {
  const xpEl = document.getElementById('sgXpNum');
  if (xpEl) xpEl.textContent = sgFormatNum(sg.xp);
  // 更新商店 x1 按鈕可購買狀態（不整個重繪，避免閃爍）
  document.querySelectorAll('#sgTabContent .sg-buy-btn[data-item]').forEach(btn => {
    const item = SG_SHOP.find(s=>s.id===btn.dataset.item);
    if (!item) return;
    const cost = sgShopCost(item);
    btn.disabled = sg.xp < cost;
  });
}

// 點擊核心邏輯（手動與自動點擊共用）：計算會心、道具爆發、薪水、每日任務、寶箱掉落
// isAuto=true 時不消耗狂暴符文次數（狂暴符文僅限手動點擊觸發的爆發感）
function sgPerformClick(opts) {
  const isAuto = !!(opts && opts.isAuto);
  const comboMult = (opts && opts.comboMult) || 1;
  const silentDrop = !!(opts && opts.silentDrop);
  const now = Date.now();

  const critChance = 0.08 + sgColleagueCritBonus()/100 + (sg.itemCritBonus||0)/100 + sgAchvBonusSum('crit')/100;
  let isCrit = Math.random() < critChance;
  if (sg.guaranteedCritUntil && now < sg.guaranteedCritUntil) isCrit = true;
  // 🧤絕緣工作手套里程碑：每20次手動點擊，第20次必定會心
  if (!isAuto && sgGearMS('g2') && ((sg.manualClicks||0) + 1) % 20 === 0) isCrit = true;
  // 🥽護目鏡里程碑：會心倍率額外+1(3倍→4倍)；📏捲尺里程碑：未會心時安慰獎+8%
  const critMult = isCrit ? (3 + (sg.itemCritMultBonus||0) + (sgGearMS('g5') ? 1 : 0))
                          : (1 + (sgGearMS('g9') ? 0.08 : 0));

  let burstMult = 1;
  if (!isAuto && sg.burstClicksRemaining > 0) {
    burstMult = sg.burstMult;
    sg.burstClicksRemaining--;
  }

  const gain = Math.round(sgEffClickPower() * comboMult * critMult * burstMult);
  sgAddXp(gain);
  sg.totalClicks++;
  if (isAuto) sg.autoClicks = (sg.autoClicks||0) + 1;
  else sg.manualClicks = (sg.manualClicks||0) + 1;
  if (isCrit) sg.critCount++;

  sgEnsureDailyReset();
  sg.daily.clicks++;
  sg.daily.xpEarned += gain;

  // 寶箱只由「真人手動點擊」觸發；🎒工具腰帶里程碑解鎖後，自動點擊也能以一半機率參與寶箱池
  let dropResult = isAuto ? null : sgTryDropItem('click', silentDrop);
  if (isAuto && sgGearMS('g7')) {
    dropResult = sgTryDropItem('click_auto_half', silentDrop);
  }

  return { gain, isCrit, dropResult };
}

function sgClick(evt) {
  const now = Date.now();
  // 連擊：1.2秒內連續點擊則連擊數+1，否則重置（僅手動點擊才會累積連擊）
  const comboWindow = 1200 + (sg.itemComboWindowBonus||0);
  if (now - sg.lastClickTime < comboWindow) { sg.combo++; } else { sg.combo = 1; }
  sg.lastClickTime = now;
  if (sg.combo > sg.maxCombo) sg.maxCombo = sg.combo;

  // 連擊加成：每5連擊 +10% 加成，上限100%
  const comboCap = 1.0 + (sg.itemComboCapBonus||0);
  const comboMult = 1 + Math.min(Math.floor(sg.combo/5)*0.1, comboCap);

  const { gain, isCrit } = sgPerformClick({ isAuto:false, comboMult });

  sgUpdateNumbers();

  const wrap = document.getElementById('sgSlimeWrap');
  wrap.classList.remove('squish', 'idle');
  void wrap.offsetWidth;
  wrap.classList.add('squish');
  clearTimeout(wrap._idleTimer);
  wrap._idleTimer = setTimeout(()=>{ wrap.classList.remove('squish'); wrap.classList.add('idle'); }, 400);

  // 浮動 +N 文字
  const stageBox = document.getElementById('sgStage');
  const float = document.createElement('div');
  float.className = 'sg-float' + (isCrit ? ' sg-crit-float' : '');
  float.textContent = (isCrit ? '💥 會心 ' : '+') + gain;
  const rect = evt.currentTarget.getBoundingClientRect();
  const boxRect = stageBox.getBoundingClientRect();
  float.style.left = (rect.left - boxRect.left + rect.width/2 + (Math.random()*30-15)) + 'px';
  float.style.top = (rect.top - boxRect.top + 20) + 'px';
  stageBox.appendChild(float);
  setTimeout(()=>float.remove(), 800);

  // 星星閃爍粒子（高階史萊姆才有）
  const stage = sgGetStage();
  if (stage.glow) {
    for (let i=0; i<3; i++) {
      const sp = document.createElement('div');
      sp.className = 'sg-sparkle';
      sp.textContent = ['✨','⭐','💫'][i%3];
      sp.style.left = (rect.left - boxRect.left + rect.width/2) + 'px';
      sp.style.top = (rect.top - boxRect.top + rect.height/2) + 'px';
      sp.style.setProperty('--sx', (Math.random()*60-30)+'px');
      sp.style.setProperty('--sy', (Math.random()*-50-10)+'px');
      stageBox.appendChild(sp);
      setTimeout(()=>sp.remove(), 700);
    }
  }

  // 職級點擊特效：依目前職級分4組(基層無額外特效／中階星星／高階金幣／集團高層光環)
  const jobTier = sgJobRankTier(sgGetJobRank().rank);
  const fxCx = rect.left - boxRect.left + rect.width/2;
  const fxCy = rect.top - boxRect.top + rect.height/2;
  if (jobTier === 2) {
    for (let i=0; i<2; i++) {
      const sp = document.createElement('div');
      sp.className = 'sg-click-fx-tier2';
      sp.textContent = '⭐';
      sp.style.left = fxCx + 'px';
      sp.style.top = fxCy + 'px';
      sp.style.setProperty('--sx', (Math.random()*50-25)+'px');
      sp.style.setProperty('--sy', (Math.random()*-45-10)+'px');
      stageBox.appendChild(sp);
      setTimeout(()=>sp.remove(), 700);
    }
  } else if (jobTier === 3) {
    for (let i=0; i<3; i++) {
      const sp = document.createElement('div');
      sp.className = 'sg-click-fx-tier3';
      sp.textContent = '💰';
      sp.style.left = fxCx + 'px';
      sp.style.top = fxCy + 'px';
      sp.style.setProperty('--sx', (Math.random()*70-35)+'px');
      sp.style.setProperty('--sy', (Math.random()*-60-15)+'px');
      stageBox.appendChild(sp);
      setTimeout(()=>sp.remove(), 800);
    }
  } else if (jobTier === 4) {
    const ring = document.createElement('div');
    ring.className = 'sg-click-fx-tier4-ring';
    ring.style.left = fxCx + 'px';
    ring.style.top = fxCy + 'px';
    stageBox.appendChild(ring);
    setTimeout(()=>ring.remove(), 600);
    const sp = document.createElement('div');
    sp.className = 'sg-click-fx-tier3';
    sp.textContent = '👑';
    sp.style.left = fxCx + 'px';
    sp.style.top = fxCy + 'px';
    sp.style.setProperty('--sx', '0px');
    sp.style.setProperty('--sy', '-40px');
    stageBox.appendChild(sp);
    setTimeout(()=>sp.remove(), 800);
  }

  // 連擊條更新
  const comboFill = document.getElementById('sgComboFill');
  const comboLabel = document.getElementById('sgComboLabel');
  if (comboFill) {
    const pct = Math.min((sg.combo/20)*100, 100);
    comboFill.style.width = pct+'%';
    comboLabel.textContent = sg.combo>=3 ? `🔥 連擊 x${sg.combo}（+${Math.round((comboMult-1)*100)}%）` : '';
  }

  // 檢查升級進化
  const newStage = sgGetStage();
  const stageNameEl = document.querySelector('.sg-stage-name');
  let stageChanged = false;
  if (stageNameEl && stageNameEl.textContent !== newStage.name) stageChanged = true;

  // 檢查成就階層提升
  const tierUps = sgCheckAchvTierUps();

  // 檢查職級升遷
  const promotion = sgCheckJobPromotion();

  if (stageChanged) {
    sgRender();
    showToast('✨ 史萊姆進化成「'+newStage.name+'」了！');
  } else if (promotion) {
    sgRender();
    showToast(`🎉 恭喜升職！你現在是「${promotion.name}」了！`);
  } else if (tierUps.length) {
    sgRender();
    tierUps.forEach(u => showToast(`🏆 ${u.cat.icon} ${u.cat.name} 達成 Lv.${u.tier}！`));
  } else {
    const jobRankEl = document.getElementById('sgJobRank');
    if (jobRankEl) jobRankEl.innerHTML = sgJobRankHtml();
  }

  if (sg.totalClicks % 5 === 0) sgSave();
}

// 自動點擊（松鼠快手/水晶強化/道具）：模擬真實點擊但不參與連擊
function sgAutoClickTick() {
  const perSec = sgTotalAutoClickPerSec();
  if (perSec <= 0) return;

  sg._autoClickAcc = (sg._autoClickAcc||0) + perSec;
  let n = Math.floor(sg._autoClickAcc);
  sg._autoClickAcc -= n;
  if (n <= 0) return;

  const CAP = 500; // 單次tick模擬上限，超過改用統計估算避免效能問題
  let totalGain = 0, anyCrit = false;
  const simN = Math.min(n, CAP);
  for (let i=0; i<simN; i++) {
    const { gain, isCrit } = sgPerformClick({ isAuto:true }); // 自動點擊不觸發寶箱掉落
    totalGain += gain;
    if (isCrit) anyCrit = true;
  }
  if (n > CAP) {
    // 極端數值下的統計估算，避免單一tick跑上萬次迴圈
    const remain = n - CAP;
    const critChance = 0.08 + sgColleagueCritBonus()/100 + (sg.itemCritBonus||0)/100 + sgAchvBonusSum('crit')/100;
    const avgMult = 1 + critChance*2; // 期望值近似：(1-p)*1 + p*3
    const gain = Math.round(remain * sgEffClickPower() * avgMult);
    sgAddXp(gain);
    sg.totalClicks += remain;
    sg.autoClicks = (sg.autoClicks||0) + remain;
    sgEnsureDailyReset();
    sg.daily.clicks += remain;
    sg.daily.xpEarned += gain;
    totalGain += gain;
  }

  if (totalGain > 0) {
    sgTriggerAutoClickVisual(totalGain, anyCrit);
    sgUpdateNumbers();
    const tierUps = sgCheckAchvTierUps();
    tierUps.forEach(u => showToast(`🏆 ${u.cat.icon} ${u.cat.name} 達成 Lv.${u.tier}！`));
    const promotion = sgCheckJobPromotion();
    if (promotion) {
      showToast(`🎉 恭喜升職！你現在是「${promotion.name}」了！`);
      sgRender();
    } else {
      const jobRankEl = document.getElementById('sgJobRank');
      if (jobRankEl) jobRankEl.innerHTML = sgJobRankHtml();
    }
  }
}

// 自動點擊視覺效果：與手動點擊相同的Q彈動畫，但浮動文字標示為自動、置中顯示避免無事件座標
function sgTriggerAutoClickVisual(totalGain, isCrit) {
  const wrap = document.getElementById('sgSlimeWrap');
  const stageBox = document.getElementById('sgStage');
  if (!wrap || !stageBox) return;

  wrap.classList.remove('squish', 'idle');
  void wrap.offsetWidth;
  wrap.classList.add('squish');
  clearTimeout(wrap._idleTimer);
  wrap._idleTimer = setTimeout(()=>{ wrap.classList.remove('squish'); wrap.classList.add('idle'); }, 400);

  const float = document.createElement('div');
  float.className = 'sg-float' + (isCrit ? ' sg-crit-float' : '');
  float.style.color = isCrit ? '' : '#8B9AA8';
  float.textContent = '🐿️ +' + sgFormatNum(totalGain);
  const boxRect = stageBox.getBoundingClientRect();
  float.style.left = (boxRect.width/2 + (Math.random()*30-15)) + 'px';
  float.style.top = '14px';
  stageBox.appendChild(float);
  setTimeout(()=>float.remove(), 800);
}

function sgBuy(itemId, silent) {
  const item = SG_SHOP.find(s=>s.id===itemId);
  if (!item) return;
  const cost = sgShopCost(item);
  if (sg.xp < cost) return;
  sg.xp -= cost;
  sg.owned[itemId] = (sg.owned[itemId]||0) + 1;
  sgEnsureDailyReset();
  sg.daily.buys++;
  const tierUps = sgCheckAchvTierUps();
  sgSave();
  if (!silent) {
    sgRender();
    tierUps.forEach(u => showToast(`🏆 ${u.cat.icon} ${u.cat.name} 達成 Lv.${u.tier}！`));
  } else {
    sgUpdateNumbers();
  }
}

function sgFormatDuration(sec) {
  if (sec < 60) return sec+'秒';
  if (sec < 3600) return Math.floor(sec/60)+'分鐘';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  return h+'小時'+(m>0?m+'分':'');
}

function sgConfirmReset() {
  if (confirm('確定要重新開始嗎？所有進度將會消失，此操作無法復原。')) {
    sg = sgDefaultState();
    sgSave();
    sgRender();
    showToast('🔄 史萊姆重新開始了！');
  }
}

// ══════════════════════════════════════════════
// 🗡️ 巡邏系統(肉鴿MVP) 核心邏輯
// ══════════════════════════════════════════════

function sgRaidLog(msg) {
  sg.raid.log.unshift(msg);
  if (sg.raid.log.length > 6) sg.raid.log.length = 6;
}

function sgRaidPlayerAtk() {
  let atk = 7;
  if (sg.raid.skills.includes('r5')) atk += 3;
  return atk;
}

// 出發：扣薪水、初始化本局狀態
function sgRaidStart() {
  const cost = sgRaidEntryCost();
  if (sg.xp < cost) { showToast('薪水不夠支付這次出勤費用'); return; }
  sg.xp -= cost;
  sg.raid.inRun = true;
  sg.raid.floor = 1;
  sg.raid.playerMaxHp = 60;
  sg.raid.playerHp = 60;
  sg.raid.skills = [];
  sg.raid.turnCount = 0;
  sg.raid.burnStacks = 0;
  sg.raid.log = [];
  sgRaidSpawnEnemy();
  sgRaidLog(`🚪 出發巡邏，支付了 ${sgFormatNum(cost)} 薪水`);
  sgSave();
  sgUpdateNumbers();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidSpawnEnemy() {
  const def = SG_RAID_ENEMIES[sg.raid.floor - 1];
  sg.raid.enemyHp = def.hp;
  sg.raid.enemyMaxHp = def.hp;
}

// 玩家攻擊一次，然後(若敵人未死)換敵人回合
function sgRaidAttack() {
  if (!sg.raid.inRun) return;
  const enemyDef = SG_RAID_ENEMIES[sg.raid.floor - 1];
  sg.raid.turnCount++;

  // 每回合開始：🩹補漏貼片回血
  if (sg.raid.skills.includes('r2')) {
    sg.raid.playerHp = Math.min(sg.raid.playerMaxHp, sg.raid.playerHp + 2);
  }

  // 計算本次攻擊傷害
  let dmg = sgRaidPlayerAtk();
  let isCrit = false;
  if (sg.raid.skills.includes('r1') && Math.random() < 0.25) { dmg *= 2; isCrit = true; }
  // ⏱️超時工作：每3回合一次雙倍
  let isPeriodic = false;
  if (sg.raid.skills.includes('r4') && sg.raid.turnCount % 3 === 0) { dmg *= 2; isPeriodic = true; }
  // 🧯灼燒附加(套用一次，之後每回合額外扣血，直到stacks歸零)
  if (sg.raid.skills.includes('r3')) sg.raid.burnStacks = 2;

  sg.raid.enemyHp -= dmg;
  sgRaidLog(`🔨 你造成 ${dmg} 傷害${isCrit?'(會心！)':''}${isPeriodic?'(超時加倍！)':''}`);

  // 灼燒傷害結算(若有剩餘層數)
  if (sg.raid.burnStacks > 0 && sg.raid.enemyHp > 0) {
    sg.raid.enemyHp -= 3;
    sg.raid.burnStacks--;
    sgRaidLog(`🔥 灼燒造成 3 傷害`);
  }

  if (sg.raid.enemyHp <= 0) {
    sgRaidWinFloor(enemyDef);
    return;
  }

  // 敵人反擊
  sg.raid.playerHp -= enemyDef.atk;
  sgRaidLog(`${enemyDef.emoji} ${enemyDef.name} 反擊造成 ${enemyDef.atk} 傷害`);

  if (sg.raid.playerHp <= 0) {
    sgRaidLose();
    return;
  }

  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidWinFloor(enemyDef) {
  if (enemyDef.isBoss) {
    sgRaidWinRun();
    return;
  }
  sgRaidLog(`✅ 擊敗 ${enemyDef.name}！`);
  sg.raid.floor++;
  if (sg.raid.floor > (sg.raid.bestFloor||0)) sg.raid.bestFloor = sg.raid.floor;
  sgRaidSpawnEnemy();
  sg._raidPendingSkillChoice = sgRaidRollSkillChoices();
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

// 從尚未擁有的技能池中隨機挑2個供選擇
function sgRaidRollSkillChoices() {
  const available = SG_RAID_SKILLS.filter(s => !sg.raid.skills.includes(s.id));
  if (available.length === 0) return [];
  const shuffled = [...available].sort(()=>Math.random()-0.5);
  return shuffled.slice(0, Math.min(2, shuffled.length)).map(s=>s.id);
}

function sgRaidPickSkill(skillId) {
  sg.raid.skills.push(skillId);
  sg._raidPendingSkillChoice = null;
  const skill = SG_RAID_SKILLS.find(s=>s.id===skillId);
  sgRaidLog(`🎁 學會了「${skill.name}」`);
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidWinRun() {
  sg.raid.inRun = false;
  sg.raid.runsCompleted = (sg.raid.runsCompleted||0) + 1;
  sg.raid.bestFloor = SG_RAID_ENEMIES.length + 1;
  // 獎勵：資產貨幣(不會變回薪水/秒，乾淨的職級門檻資源)，不影響薪水生產循環
  const assetReward = 15 + sg.raid.runsCompleted * 3;
  sg.assets = (sg.assets||0) + assetReward;
  sgRaidLog(`🏆 擊退鏽蝕王！巡邏完成，獲得 ${assetReward} 資產`);
  sgSave();
  sgUpdateNumbers();
  showToast(`🏆 巡邏完成！獲得 ${assetReward} 🏦資產`);
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidLose() {
  sg.raid.inRun = false;
  sgRaidLog(`💀 體力耗盡，撤退了……`);
  sgSave();
  showToast('💀 這次巡邏失敗了，出勤費用不會退還');
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidAbandon() {
  if (!confirm('確定要放棄這次巡邏嗎？出勤費用不會退還。')) return;
  sg.raid.inRun = false;
  sgRaidLog('🚪 提早撤退');
  sgSave();
  document.getElementById('sgTabContent').innerHTML = sgTabContentHtml();
}

function sgRaidTabHtml() {
  const r = sg.raid;
  if (sg._raidPendingSkillChoice && sg._raidPendingSkillChoice.length) {
    const choices = sg._raidPendingSkillChoice.map(id => SG_RAID_SKILLS.find(s=>s.id===id));
    return `
      <div class="sg-colleague-crystal-bar">🚪 第 ${r.floor} 層　❤️ ${r.playerHp}/${r.playerMaxHp}</div>
      <div style="text-align:center;padding:14px 0;font-weight:600;">過關了！選一項技能</div>
      <div class="sg-colleague-grid">
        ${choices.map(s => `
          <div class="sg-colleague-card">
            <div class="sg-colleague-emoji">${s.emoji}</div>
            <div class="sg-colleague-name">${s.name}</div>
            <div class="sg-colleague-bonus">${s.desc}</div>
            <button class="sg-colleague-buy" onclick="sgRaidPickSkill('${s.id}')">選擇</button>
          </div>`).join('')}
      </div>`;
  }

  if (!r.inRun) {
    const cost = sgRaidEntryCost();
    const canAfford = sg.xp >= cost;
    return `
      <div class="sg-colleague-crystal-bar">🗡️ 累計完整通關：${r.runsCompleted||0} 次　｜　歷史最高抵達第 ${r.bestFloor||0} 層</div>
      <div style="text-align:center;padding:16px 0;color:#666;line-height:1.7;">
        深入會館地下機房，擊退故障怪，一路打到鏽蝕王。<br>
        出勤要付薪水，<b>失敗或中途放棄都不會退費</b>——這是薪水真正的出口。<br>
        每過一關可以選學一個新技能，技能會保留到這局結束。
      </div>
      <div style="text-align:center;">
        <button class="sg-colleague-buy" style="max-width:240px;" ${canAfford?'':'disabled'} onclick="sgRaidStart()">
          出發巡邏(💰${sgFormatNum(cost)} 薪水)
        </button>
      </div>`;
  }

  const enemyDef = SG_RAID_ENEMIES[r.floor - 1];
  const playerPct = Math.max(0, Math.round(r.playerHp / r.playerMaxHp * 100));
  const enemyPct = Math.max(0, Math.round(r.enemyHp / r.enemyMaxHp * 100));
  const learnedHtml = r.skills.length
    ? r.skills.map(id => { const s = SG_RAID_SKILLS.find(x=>x.id===id); return `<span title="${s.desc}" style="margin-right:6px;">${s.emoji}</span>`; }).join('')
    : '<span style="opacity:0.5;">尚未學習技能</span>';

  return `
    <div class="sg-colleague-crystal-bar">🚪 第 ${r.floor} / ${SG_RAID_ENEMIES.length} 層　｜　已學技能：${learnedHtml}</div>
    <div class="sg-colleague-card" style="text-align:center;padding:16px;">
      <div style="font-size:40px;">${enemyDef.emoji}</div>
      <div style="font-weight:600;margin:4px 0;">${enemyDef.name}${enemyDef.isBoss?'（BOSS）':''}</div>
      <div style="font-size:12px;color:#999;margin-bottom:6px;">${enemyDef.desc}</div>
      <div class="sg-combo-bar"><div class="sg-combo-fill" style="width:${enemyPct}%;background:linear-gradient(90deg,#E85A4A,#C0392B);"></div></div>
      <div style="font-size:12px;color:#999;margin-top:2px;">HP ${Math.max(0,r.enemyHp)}/${r.enemyMaxHp}</div>
    </div>
    <div class="sg-colleague-card" style="text-align:center;padding:16px;">
      <div style="font-size:32px;">🟢</div>
      <div style="font-weight:600;margin:4px 0;">你（史萊姆工程師）</div>
      <div class="sg-combo-bar"><div class="sg-combo-fill" style="width:${playerPct}%;"></div></div>
      <div style="font-size:12px;color:#999;margin-top:2px;">HP ${Math.max(0,r.playerHp)}/${r.playerMaxHp}</div>
    </div>
    <div style="text-align:center;margin:12px 0;">
      <button class="sg-colleague-buy" style="max-width:200px;" onclick="sgRaidAttack()">⚔️ 攻擊</button>
      <button class="sg-colleague-buy" style="max-width:160px;background:#999;margin-top:8px;" onclick="sgRaidAbandon()">🚪 撤退</button>
    </div>
    <div style="font-size:12px;color:#888;line-height:1.8;max-height:120px;overflow-y:auto;padding:8px;background:#faf8f4;border-radius:8px;">
      ${r.log.map(l=>`<div>${l}</div>`).join('')}
    </div>`;
}
