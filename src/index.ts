import { iphonePage } from './iphone-page';

interface Env {
  DB: D1Database;
  AI: Ai;
}

type CardType = 'person' | 'opportunity' | 'intelligence' | 'idea';
type CardStatus = 'inbox' | 'following' | 'done' | 'archived';
type CaptureMethod = 'share_sheet' | 'screenshot_ocr' | 'back_tap' | 'iphone_web';
type ContentKind = 'marketing' | 'technology' | 'person' | 'opportunity' | 'idea' | 'general';

type CardInput = {
  card_type?: CardType | 'auto';
  title?: string;
  source_platform?: string;
  source_url?: string;
  source_text?: string;
  importance_reason?: string;
  status?: CardStatus;
};

type CaptureInput = {
  text?: string;
  url?: string;
  platform?: string;
  note?: string;
  capture_method?: CaptureMethod;
  ocr_text?: string;
};

const TYPES: CardType[] = ['person', 'opportunity', 'intelligence', 'idea'];
const STATUSES: CardStatus[] = ['inbox', 'following', 'done', 'archived'];
const CAPTURE_METHODS: CaptureMethod[] = ['share_sheet', 'screenshot_ocr', 'back_tap', 'iphone_web'];
const LIMITS = { query: 200, title: 120, platform: 80, url: 2048, text: 20000, reason: 1000 } as const;
const INPUT_KEYS = ['card_type', 'title', 'source_platform', 'source_url', 'source_text', 'importance_reason', 'status'] as const;
const CAPTURE_KEYS = ['text', 'url', 'platform', 'note', 'capture_method', 'ocr_text'] as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function inputError(input: unknown, allowed: readonly string[] = INPUT_KEYS): string | undefined {
  if (!isObject(input)) return '請提供 JSON 物件';
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) return `不支援的欄位：${key}`;
  }
  for (const key of ['title', 'source_platform', 'source_url', 'source_text', 'importance_reason']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') return `${key} 必須是字串`;
  }
  return undefined;
}

function captureInputError(input: unknown): string | undefined {
  if (!isObject(input)) return '請提供 JSON 物件';
  for (const key of Object.keys(input)) {
    if (!(CAPTURE_KEYS as readonly string[]).includes(key)) return `不支援的欄位：${key}`;
  }
  for (const key of CAPTURE_KEYS) {
    if (input[key] !== undefined && typeof input[key] !== 'string') return `${key} 必須是字串`;
  }
  return undefined;
}

function lengthError(value: string, key: keyof typeof LIMITS, label: string) {
  return value.length > LIMITS[key] ? `${label}請控制在 ${LIMITS[key].toLocaleString('en-US')} 字內` : undefined;
}

function normalizeUrl(value: string): string | undefined {
  if (!value) return '';
  if (lengthError(value, 'url', '網址')) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

const summary = (value: string) => clean(value).slice(0, 160) || '尚未提供原始內容';

function inferType(value: string): CardType {
  const text = value.toLowerCase();
  if (/(徵求|尋找|推薦|需要|合作|報價|購買|想找|請問有沒有|商機|客戶|預約|約訪)/.test(text)) return 'opportunity';
  if (/(姓名|公司|職稱|電話|手機|email|e-mail|聯絡人|名片)/.test(text)) return 'person';
  if (/(我想到|點子|構想|如果可以|可以做成|新產品|靈感)/.test(text)) return 'idea';
  return 'intelligence';
}

function inferTitle(value: string) {
  const text = clean(value);
  return (text.split(/[。！？!?\n]/)[0] || text).slice(0, 48) || '未命名收藏';
}

function inferPlatform(explicit?: string, url?: string, text?: string) {
  const chosen = clean(explicit);
  if (chosen) return chosen;
  const combined = `${clean(url)} ${clean(text)}`.toLowerCase();
  if (combined.includes('facebook.com') || combined.includes('fb.com')) return 'Facebook';
  if (combined.includes('threads.net')) return 'Threads';
  if (combined.includes('line.me') || combined.includes('liff.line.me')) return 'LINE';
  if (combined.includes('youtube.com') || combined.includes('youtu.be')) return 'YouTube';
  if (combined.includes('instagram.com')) return 'Instagram';
  return '其他';
}

function inferContentKind(card: Record<string, unknown>): ContentKind {
  const text = [card.title, card.source_text, card.ocr_text, card.importance_reason]
    .map(clean)
    .join(' ')
    .toLowerCase();
  const type = TYPES.includes(card.card_type as CardType) ? (card.card_type as CardType) : 'intelligence';

  if (type === 'person') return 'person';
  if (type === 'opportunity') return 'opportunity';
  if (type === 'idea') return 'idea';

  const marketingSignals = /(文案|廣告|標題|行銷|銷售頁|著陸頁|landing page|cta|轉換率|吸引力|成交|促銷|優惠|限時|報名|課程|講座|招生|流量|引流|貼文)/;
  const technologySignals = /(技術|程式|程式碼|開發|api|sdk|github|架構|資料庫|模型|ai agent|automation|自動化|workflow|擴充套件|extension|app|軟體|工具|平台|部署|cloudflare|python|javascript|typescript|skill|mcp)/;

  const marketingScore = (text.match(new RegExp(marketingSignals.source, 'g')) || []).length;
  const technologyScore = (text.match(new RegExp(technologySignals.source, 'g')) || []).length;
  if (technologyScore > marketingScore && technologyScore > 0) return 'technology';
  if (marketingScore > 0) return 'marketing';
  return 'general';
}

function safeLike(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

function extractAiText(value: unknown): string {
  if (!isObject(value)) return '';
  for (const key of ['response', 'output_text', 'text']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  const choices = value.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!isObject(choice)) continue;
      const message = choice.message;
      if (isObject(message) && typeof message.content === 'string' && message.content.trim()) return message.content.trim();
      if (typeof choice.text === 'string' && choice.text.trim()) return choice.text.trim();
    }
  }
  return '';
}

function analysisTemplate(kind: ContentKind): string {
  if (kind === 'marketing') {
    return `這是一篇行銷或銷售內容。分析重點不是泛談商機，而是拆解它為什麼吸引人。\n\n固定輸出：\n【內容類型】行銷文\n【一句話主張】它真正賣的是什麼結果，而不是表面上的產品名稱。\n【吸引力來源】拆解標題、痛點、好奇心、承諾、證明、稀缺性、情緒與行動呼籲；只列實際存在的元素。\n【目標受眾】哪些人最容易被打中，以及他們當下的心理狀態。\n【文案結構】依閱讀順序拆解鉤子、問題、解法、證據、優惠、CTA。\n【可借鏡寫法】提出 3 個可套用到 LINE 行銷、業務開發或使用者產業的做法。\n【不可照抄之處】指出誇張承諾、證據不足、法規或信任風險。\n【改寫示範】保留原本吸引機制，寫一個較可信、不浮誇的標題與短文案。`;
  }
  if (kind === 'technology') {
    return `這是一篇技術、工具或產品介紹。分析重點不是稱讚概念，而是拆解它怎麼做、需要什麼、是否值得採用。\n\n固定輸出：\n【內容類型】技術文\n【技術在做什麼】用白話描述輸入、處理流程與輸出。\n【可能作法】逐步拆解實作流程；不確定的地方明確標示為推測。\n【使用工具】列出文中明示的工具，以及合理可能需要的 API、模型、框架、資料庫或自動化服務；兩者要分開。\n【導入條件】需要的帳號、權限、資料、設備、技術能力與維護工作。\n【適合誰】分成適合、不適合、需要技術協助才適合三類。\n【可否參考】評估能否納入 AICARD、LINE 行銷、企業客戶或業務開發流程，並說明參考哪一部分。\n【風險限制】平台規則、隱私、安全、成本、穩定性與供應商依賴。\n【最小驗證】提出一個最小、低成本、可在短期內測試的版本。`;
  }
  if (kind === 'person') {
    return `這是一張人物卡。固定輸出：\n【內容類型】人物\n【可確認身分】只整理原文出現的角色、公司、專長與聯絡線索。\n【可能需求】區分明確需求與推測需求。\n【關係價值】說明可能的客戶、合作、引薦或資源價值。\n【自然開場】提供一段不硬銷的開場。\n【下一步】提出三個具體跟進動作。`;
  }
  if (kind === 'opportunity') {
    return `這是一張商機卡。固定輸出：\n【內容類型】商機\n【需求訊號】引用原文中的明確需求與時效。\n【商機強度】以 0～100 分評估需求清楚度、急迫度、適配度與可接觸性。\n【適合方案】指出可提供的服務或產品，不合適也要明說。\n【接觸策略】說明適合留言、私訊、提供資源或暫不接觸。\n【自然開場】提供不冒犯、不硬銷的訊息。\n【下一步】提出三個具體行動。`;
  }
  if (kind === 'idea') {
    return `這是一張產品或商業靈感卡。固定輸出：\n【內容類型】靈感\n【核心假設】這個點子假設誰有什麼問題。\n【使用情境】描述使用者何時會使用。\n【價值與差異】說明相較現有做法好在哪裡。\n【落地難度】拆解技術、資料、營運與法規難度。\n【最小驗證】提出不用先做完整系統的驗證方法。\n【下一步】列出三個優先行動。`;
  }
  return `這是一篇一般情報。固定輸出：\n【內容類型】一般情報\n【核心主張】\n【原文證據】\n【值得注意之處】\n【可信度與缺口】\n【可參考方向】\n【下一步】。`;
}

async function analyze(env: Env, card: Record<string, unknown>) {
  const kind = inferContentKind(card);
  const template = analysisTemplate(kind);
  const prompt = `${template}\n\n共同規則：\n1. 只根據提供資料判斷，不補造事實。\n2. 清楚區分原文、合理推論與未知。\n3. 資料不足要直接說明缺什麼。\n4. 使用繁體中文，內容具體、可執行，不要空泛鼓勵。\n\n卡片標題：${clean(card.title)}\n原分類：${clean(card.card_type)}\n來源平台：${clean(card.source_platform)}\n來源網址：${clean(card.source_url)}\n原始內容：${clean(card.source_text || card.ocr_text)}\n使用者備註：${clean(card.importance_reason)}`;

  try {
    const result = (await env.AI.run('@cf/openai/gpt-oss-120b', {
      messages: [
        {
          role: 'system',
          content: '你是嚴謹的繁體中文商業內容分析師。先辨識內容目的，再使用正確分析框架；不要把所有內容都硬套成陌生開發商機。',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1900,
      temperature: 0.2,
    })) as unknown;
    return extractAiText(result) || '分析完成，但模型沒有回傳內容。';
  } catch (error) {
    console.error(
      JSON.stringify({
        message: 'Workers AI analysis failed',
        cardId: card.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return `【內容類型】\n${kind}\n\n【AI 分析暫時無法使用】\n目前先保留原文，請稍後按「重新分析」。\n\n【原文重點】\n${summary(String(card.source_text || card.ocr_text || ''))}`;
  }
}

async function createCapturedCard(env: Env, input: CaptureInput, origin: string) {
  const rawText = clean(input.text);
  const ocrText = clean(input.ocr_text);
  const rawUrl = clean(input.url);
  const platformInput = clean(input.platform);
  const reason = clean(input.note);
  const method = input.capture_method || 'share_sheet';
  if (!CAPTURE_METHODS.includes(method)) return json({ error: '無效的收集方式' }, 400);
  const text = rawText || ocrText;
  if (!text && !rawUrl) return json({ error: '文字、OCR 文字或網址至少填一項' }, 400);
  const tooLong =
    lengthError(text, 'text', '內容') ||
    lengthError(ocrText, 'text', 'OCR 文字') ||
    lengthError(platformInput, 'platform', '來源平台') ||
    lengthError(reason, 'reason', '重要原因');
  if (tooLong) return json({ error: tooLong }, 413);
  const sourceUrl = normalizeUrl(rawUrl);
  if (sourceUrl === undefined) return json({ error: '網址必須是有效的 http 或 https 網址，且不可超過 2,048 字' }, 400);

  const id = crypto.randomUUID();
  const combined = [text, sourceUrl, reason].filter(Boolean).join(' ');
  const type = inferType(combined);
  const title = inferTitle(text || sourceUrl);
  const platform = inferPlatform(platformInput, sourceUrl, text);
  const tags = JSON.stringify(['iphone', method]);

  await env.DB.prepare(
    'INSERT INTO cards (id,card_type,title,summary,source_platform,source_url,source_text,ocr_text,importance_reason,tags,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  )
    .bind(id, type, title, summary(text || sourceUrl), platform, sourceUrl || null, text || null, ocrText || null, reason || null, tags, 'inbox')
    .run();

  return json(
    {
      ok: true,
      id,
      card_type: type,
      title,
      summary: summary(text || sourceUrl),
      card_url: `${origin}/?card=${encodeURIComponent(id)}`,
    },
    201,
  );
}

const page = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111827">
<title>AICARD</title>
<style>
:root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#172033;background:#f5f7fb;line-height:1.5}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1080px;margin:auto;padding:20px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:8px 0 20px}.hero h1{margin:0;font-size:30px}.muted{color:#64748b}.panel,.card,.stat{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 28px rgba(15,23,42,.045)}.panel{padding:18px}.capture{margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.full{grid-column:1/-1}label{display:block;font-size:13px;font-weight:750;margin-bottom:5px}input,select,textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:11px;font:inherit;background:#fff}textarea{min-height:120px;resize:vertical}.advanced{display:none;margin-top:12px}.advanced.open{display:grid}.actions{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:13px}.btn{border:0;border-radius:11px;padding:10px 14px;font:inherit;font-weight:750;cursor:pointer}.primary{background:#111827;color:#fff}.secondary{background:#e8edf5;color:#172033}.danger{background:#fee2e2;color:#991b1b}.ghost{background:#fff;border:1px solid #dbe3ef}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:16px 0}.stat{padding:13px}.stat strong{font-size:23px;display:block}.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin:18px 0 11px}.tools{display:flex;gap:8px;flex-wrap:wrap}.search{min-width:240px}.cards{display:grid;gap:12px}.card{padding:0;overflow:hidden;scroll-margin-top:14px}.card.focused{border-color:#4f46e5;box-shadow:0 0 0 4px rgba(79,70,229,.13),0 14px 38px rgba(15,23,42,.12)}.card-toggle{width:100%;display:flex;gap:12px;align-items:flex-start;border:0;background:#fff;text-align:left;padding:16px;cursor:pointer}.card-toggle:hover{background:#fbfdff}.card-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:#eef2ff;flex:0 0 auto}.card-heading{min-width:0;flex:1}.card-title{display:block;font-size:17px;line-height:1.4;overflow-wrap:anywhere}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.chip{font-size:12px;font-weight:700;padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569}.card-chevron{font-size:20px;color:#94a3b8;transition:transform .2s}.card.expanded .card-chevron{transform:rotate(180deg)}.card-preview{padding:0 16px 15px 68px;color:#475569;font-size:14px;line-height:1.65}.card-body{display:none;border-top:1px solid #e8edf5;padding:16px}.card.expanded .card-body{display:block}.card-summary{padding:14px 15px;border-radius:14px;background:#f8fafc;font-size:15px;line-height:1.75}.section-label{display:block;margin-bottom:5px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.08em}.source-row{margin-top:12px}.link{color:#2563eb;text-decoration:none;font-size:14px;font-weight:750}.source-details{margin-top:12px;border:1px solid #e2e8f0;border-radius:13px}.source-toggle{cursor:pointer;padding:11px 13px;font-size:13px;font-weight:750;color:#475569}.source-body{border-top:1px solid #e2e8f0;padding:13px;color:#475569;font-size:13px;line-height:1.75;white-space:pre-wrap;max-height:280px;overflow:auto}.reason-box{margin-top:12px;padding:12px 14px;border-left:4px solid #f59e0b;background:#fffbeb;color:#78350f;font-size:14px}.card-controls{display:grid;grid-template-columns:minmax(150px,1fr) auto auto;gap:8px;align-items:center;margin-top:15px}.analyze-btn{background:#111827;color:#fff}.delete-btn{background:transparent;color:#991b1b;border:1px solid #fecaca}.analysis-wrap{margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0}.analysis-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.analysis-section{padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.analysis-section h4{margin:0 0 7px;font-size:14px}.analysis-content{font-size:13px;line-height:1.75;color:#475569}.empty{text-align:center;padding:38px;color:#64748b}.loading{opacity:.6;pointer-events:none}.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 15px;border-radius:999px;display:none;z-index:50}.toast.show{display:block}.status{font-size:13px;color:#64748b;margin-right:auto}@media(max-width:760px){.wrap{padding:12px}.grid{grid-template-columns:1fr}.full{grid-column:auto}.stats{grid-template-columns:1fr 1fr}.toolbar{align-items:stretch;flex-direction:column}.search{min-width:0}.hero .secondary{display:none}.card-preview{padding-left:16px}.card-controls{grid-template-columns:1fr 1fr}.card-controls select{grid-column:1/-1}.analysis-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<header class="hero"><div><h1>AICARD</h1><div class="muted">把看見的價值留下來，需要時再深入分析。</div></div><button class="btn secondary" onclick="loadCards()">重新整理</button></header>
<section class="panel capture" id="capture"><div class="actions" style="margin-top:0"><span class="status">在 iPhone 觀看社群時收集</span><a class="btn secondary" href="/iphone">設定 iPhone 收集端</a></div><h2>＋ 新增收藏</h2><div class="muted">貼上文字或網址，系統會快速整理與自動分類。</div><div class="grid" style="margin-top:14px"><div class="full"><label>內容</label><textarea id="source" placeholder="貼上貼文、人物資料、商機或靈感…"></textarea></div><div><label>標題（可留空）</label><input id="title" placeholder="系統自動產生"></div><div><label>為什麼重要（可留空）</label><input id="reason" placeholder="一句話即可"></div></div><div id="advanced" class="grid advanced"><div><label>來源平台</label><input id="platform" placeholder="Facebook、Threads、LINE…"></div><div><label>分類</label><select id="type"><option value="auto">自動判斷</option><option value="opportunity">商機</option><option value="person">人物</option><option value="intelligence">情報</option><option value="idea">靈感</option></select></div><div class="full"><label>來源網址</label><input id="url" type="url" placeholder="https://…"></div></div><div class="actions"><span id="saveStatus" class="status"></span><button class="btn ghost" onclick="toggleAdvanced()">更多資訊</button><button id="saveBtn" class="btn primary" onclick="createCard()">收藏</button></div></section>
<section id="stats" class="stats"></section><div class="toolbar"><strong>卡片庫</strong><div class="tools"><input id="search" class="search" placeholder="搜尋標題、摘要或內容" oninput="debouncedLoad()"><select id="filterType" onchange="loadCards()"><option value="">全部分類</option><option value="person">人物</option><option value="opportunity">商機</option><option value="intelligence">情報</option><option value="idea">靈感</option></select><select id="filterStatus" onchange="loadCards()"><option value="">全部狀態</option><option value="inbox">收件匣</option><option value="following">跟進中</option><option value="done">已完成</option><option value="archived">已封存</option></select></div></div><main id="cards" class="cards"><div class="panel empty">正在載入…</div></main></div><div id="toast" class="toast"></div>
<script>
const E=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const L={person:'人物',opportunity:'商機',intelligence:'情報',idea:'靈感'},I={person:'👤',opportunity:'💰',intelligence:'📚',idea:'💡'},S={inbox:'收件匣',following:'跟進中',done:'已完成',archived:'已封存'};let timer;
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function toggleAdvanced(){document.getElementById('advanced').classList.toggle('open')}
function debouncedLoad(){clearTimeout(timer);timer=setTimeout(loadCards,300)}
async function api(path,opt){const r=await fetch(path,opt);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'操作失敗');return d}
async function loadCards(){const q=new URLSearchParams();const search=document.getElementById('search').value.trim(),type=document.getElementById('filterType').value,status=document.getElementById('filterStatus').value;if(search)q.set('q',search);if(type)q.set('type',type);if(status)q.set('status',status);const root=document.getElementById('cards');root.innerHTML='<div class="panel empty">正在載入…</div>';try{const d=await api('/api/cards?'+q);renderStats(d.stats||{});renderCards(d.cards||[])}catch(e){root.innerHTML='<div class="panel empty">'+E(e.message)+'</div>'}}
function renderStats(s){document.getElementById('stats').innerHTML=Object.keys(L).map(k=>'<div class="stat"><strong>'+(s[k]||0)+'</strong><span>'+I[k]+' '+L[k]+'</span></div>').join('')}
function parseTags(value){try{const tags=JSON.parse(value||'[]');return Array.isArray(tags)?tags.filter(t=>typeof t==='string'):[]}catch{return[]}}
function captureLabel(card){const tags=parseTags(card.tags);if(tags.includes('back_tap'))return'iPhone 浮球';if(tags.includes('screenshot_ocr'))return'iPhone 截圖';if(tags.includes('share_sheet'))return'iPhone 分享';if(tags.includes('iphone_web'))return'iPhone 網頁';return''}
function statusOptions(card){return Object.keys(S).map(key=>'<option value="'+key+'" '+(card.status===key?'selected':'')+'>'+S[key]+'</option>').join('')}
function analysisSections(value){const text=String(value||'').replace(/\\r/g,'').trim();if(!text)return'';const heading=/\\*{0,2}【([^】]+)】\\*{0,2}/g,sections=[];let match,lastTitle='',lastIndex=0;while((match=heading.exec(text))!==null){if(lastTitle)sections.push({title:lastTitle,content:text.slice(lastIndex,match.index).trim()});lastTitle=match[1].replace(/\\*\\*/g,'').trim();lastIndex=heading.lastIndex}if(lastTitle)sections.push({title:lastTitle,content:text.slice(lastIndex).trim()});if(!sections.length)sections.push({title:'分析結果',content:text});return'<div class="analysis-wrap"><h3>✦ 深度分析</h3><div class="analysis-grid">'+sections.map(section=>'<section class="analysis-section"><h4>'+E(section.title)+'</h4><div class="analysis-content">'+E(section.content.replace(/\\*\\*/g,'')).replace(/\\n/g,'<br>')+'</div></section>').join('')+'</div></div>'}
function toggleCard(id){const card=document.getElementById('card-'+id);if(!card)return;card.classList.toggle('expanded');const button=card.querySelector('.card-toggle');if(button)button.setAttribute('aria-expanded',card.classList.contains('expanded')?'true':'false')}
function focusRequestedCard(){const id=new URLSearchParams(location.search).get('card');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;const card=document.getElementById('card-'+id);if(!card)return;card.classList.add('expanded','focused');requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'start'}));setTimeout(()=>card.classList.remove('focused'),5000)}
function renderCards(cards){const root=document.getElementById('cards');if(!cards.length){root.innerHTML='<div class="panel empty">目前沒有符合條件的卡片</div>';return}root.innerHTML=cards.map(c=>{const type=L[c.card_type]?c.card_type:'intelligence',capture=captureLabel(c),raw=c.source_text||c.ocr_text||'',preview=E(c.summary||'尚未產生摘要');return'<article class="card" id="card-'+c.id+'"><button class="card-toggle" aria-expanded="false" onclick="toggleCard(&quot;'+c.id+'&quot;)"><span class="card-icon">'+I[type]+'</span><span class="card-heading"><strong class="card-title">'+E(c.title||'未命名收藏')+'</strong><span class="chips"><span class="chip">'+L[type]+'</span>'+(c.source_platform?'<span class="chip">'+E(c.source_platform)+'</span>':'')+'<span class="chip">'+E(S[c.status]||c.status)+'</span>'+(capture?'<span class="chip">'+capture+'</span>':'')+'</span></span><span class="card-chevron">⌄</span></button><div class="card-preview">'+preview+'</div><div class="card-body"><div class="card-summary"><span class="section-label">AI 摘要</span>'+preview+'</div>'+(c.source_url?'<div class="source-row"><a class="link" href="'+E(c.source_url)+'" target="_blank" rel="noopener noreferrer">↗ 查看原始來源</a></div>':'')+(raw?'<details class="source-details"><summary class="source-toggle">查看擷取原文</summary><div class="source-body">'+E(raw)+'</div></details>':'')+(c.importance_reason?'<div class="reason-box"><span class="section-label">為什麼重要</span>'+E(c.importance_reason)+'</div>':'')+'<div class="card-controls"><select onchange="setStatus(&quot;'+c.id+'&quot;,this.value)">'+statusOptions(c)+'</select><button class="btn analyze-btn" onclick="doAnalyze(&quot;'+c.id+'&quot;,this)">'+(c.analysis_status==='done'?'重新分析':'深度分析')+'</button><button class="btn delete-btn" onclick="removeCard(&quot;'+c.id+'&quot;)">刪除</button></div>'+analysisSections(c.analysis_result)+'</div></article>'}).join('');focusRequestedCard()}
async function createCard(){const source=document.getElementById('source').value.trim(),url=document.getElementById('url').value.trim();if(!source&&!url){toast('請先貼上內容或網址');return}const panel=document.getElementById('capture'),btn=document.getElementById('saveBtn');panel.classList.add('loading');btn.textContent='收藏中…';try{await api('/api/cards',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source_text:source,source_url:url,title:document.getElementById('title').value,importance_reason:document.getElementById('reason').value,source_platform:document.getElementById('platform').value,card_type:document.getElementById('type').value})});['source','url','title','reason','platform'].forEach(id=>document.getElementById(id).value='');document.getElementById('type').value='auto';toast('已收藏');await loadCards()}catch(e){toast(e.message)}finally{panel.classList.remove('loading');btn.textContent='收藏'}}
async function doAnalyze(id,btn){const card=document.getElementById('card-'+id);if(card)card.classList.add('expanded');btn.disabled=true;btn.textContent='分析中…';try{await api('/api/cards/'+encodeURIComponent(id)+'/analyze',{method:'POST'});toast('分析完成');await loadCards();const updated=document.getElementById('card-'+id);if(updated){updated.classList.add('expanded');updated.scrollIntoView({behavior:'smooth',block:'center'})}}catch(e){toast(e.message)}finally{btn.disabled=false}}
async function setStatus(id,status){try{await api('/api/cards/'+encodeURIComponent(id),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});toast('狀態已更新');loadCards()}catch(e){toast(e.message)}}
async function removeCard(id){if(!confirm('確定刪除這張卡片？'))return;try{await api('/api/cards/'+encodeURIComponent(id),{method:'DELETE'});toast('已刪除');loadCards()}catch(e){toast(e.message)}}
loadCards();
</script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(page, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'referrer-policy': 'no-referrer',
          },
        });
      }
      if (request.method === 'GET' && url.pathname === '/iphone') {
        return new Response(iphonePage, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'referrer-policy': 'no-referrer',
          },
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/health') return json({ ok: true, service: 'AICARD', version: '0.5.0' });

      if (request.method === 'POST' && url.pathname === '/api/capture') {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: '請提供正確的 JSON 資料' }, 400);
        }
        const invalid = captureInputError(raw);
        if (invalid) return json({ error: invalid }, 400);
        return createCapturedCard(env, raw as CaptureInput, url.origin);
      }
      if (url.pathname === '/api/capture') return json({ error: 'Method not allowed' }, 405);

      if (request.method === 'GET' && url.pathname === '/api/cards') {
        const q = clean(url.searchParams.get('q'));
        const type = clean(url.searchParams.get('type'));
        const status = clean(url.searchParams.get('status'));
        if (q.length > LIMITS.query) return json({ error: `搜尋關鍵字請控制在 ${LIMITS.query} 字內` }, 400);
        if (type && !TYPES.includes(type as CardType)) return json({ error: '無效的分類' }, 400);
        if (status && !STATUSES.includes(status as CardStatus)) return json({ error: '無效的狀態' }, 400);

        const where: string[] = [];
        const binds: unknown[] = [];
        if (q) {
          where.push('(title LIKE ? ESCAPE "\\" OR summary LIKE ? ESCAPE "\\" OR source_text LIKE ? ESCAPE "\\")');
          const like = safeLike(q);
          binds.push(like, like, like);
        }
        if (type) {
          where.push('card_type = ?');
          binds.push(type);
        }
        if (status) {
          where.push('status = ?');
          binds.push(status);
        }
        const sql = `SELECT * FROM cards ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 200`;
        const result = await env.DB.prepare(sql).bind(...binds).all();
        const statRows = await env.DB.prepare('SELECT card_type, COUNT(*) AS count FROM cards GROUP BY card_type').all<{
          card_type: CardType;
          count: number;
        }>();
        const stats: Record<CardType, number> = { person: 0, opportunity: 0, intelligence: 0, idea: 0 };
        for (const row of statRows.results) stats[row.card_type] = Number(row.count);
        return json({ cards: result.results, stats });
      }

      if (request.method === 'POST' && url.pathname === '/api/cards') {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: '請提供正確的 JSON 資料' }, 400);
        }
        const invalid = inputError(raw);
        if (invalid) return json({ error: invalid }, 400);
        const input = raw as CardInput;
        if (input.card_type !== undefined && input.card_type !== 'auto' && !TYPES.includes(input.card_type as CardType)) {
          return json({ error: '無效的分類' }, 400);
        }
        const text = clean(input.source_text);
        const rawUrl = clean(input.source_url);
        const titleInput = clean(input.title);
        const platformInput = clean(input.source_platform);
        const reason = clean(input.importance_reason);
        if (!text && !rawUrl) return json({ error: '內容或網址至少填一項' }, 400);
        const tooLong =
          lengthError(text, 'text', '內容') ||
          lengthError(titleInput, 'title', '標題') ||
          lengthError(platformInput, 'platform', '來源平台') ||
          lengthError(reason, 'reason', '重要原因');
        if (tooLong) return json({ error: tooLong }, 413);
        const sourceUrl = normalizeUrl(rawUrl);
        if (sourceUrl === undefined) return json({ error: '網址必須是有效的 http 或 https 網址，且不可超過 2,048 字' }, 400);
        const id = crypto.randomUUID();
        const combined = [text, sourceUrl, titleInput, reason].filter(Boolean).join(' ');
        const type = input.card_type && TYPES.includes(input.card_type as CardType) ? (input.card_type as CardType) : inferType(combined);
        const title = titleInput || inferTitle(text || sourceUrl);
        const platform = inferPlatform(platformInput, sourceUrl, text);
        await env.DB.prepare(
          'INSERT INTO cards (id,card_type,title,summary,source_platform,source_url,source_text,importance_reason,status) VALUES (?,?,?,?,?,?,?,?,?)',
        )
          .bind(id, type, title, summary(text || sourceUrl), platform, sourceUrl || null, text || null, reason || null, 'inbox')
          .run();
        return json({ id, card_type: type }, 201);
      }

      const idMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (idMatch) {
        const id = decodeURIComponent(idMatch[1]);
        if (!isUuid(id)) return json({ error: '無效的卡片 ID' }, 400);
        if (request.method === 'GET') {
          const card = await env.DB.prepare('SELECT * FROM cards WHERE id=?').bind(id).first();
          return card ? json({ card }) : json({ error: '找不到卡片' }, 404);
        }
        if (request.method === 'PATCH') {
          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            return json({ error: '請提供正確的 JSON 資料' }, 400);
          }
          const invalid = inputError(raw, ['status', 'title', 'importance_reason']);
          if (invalid) return json({ error: invalid }, 400);
          const body = raw as Partial<CardInput>;
          if (body.status !== undefined && !STATUSES.includes(body.status)) return json({ error: '無效的狀態' }, 400);
          const fields: string[] = [];
          const binds: unknown[] = [];
          if (body.status !== undefined) {
            fields.push('status=?');
            binds.push(body.status);
          }
          if (body.title !== undefined) {
            const value = clean(body.title);
            fields.push('title=?');
            binds.push(value || '未命名收藏');
          }
          if (body.importance_reason !== undefined) {
            const value = clean(body.importance_reason);
            fields.push('importance_reason=?');
            binds.push(value || null);
          }
          if (!fields.length) return json({ error: '沒有可更新欄位' }, 400);
          fields.push('updated_at=CURRENT_TIMESTAMP');
          binds.push(id);
          const result = await env.DB.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id=?`).bind(...binds).run();
          return result.meta.changes ? json({ ok: true }) : json({ error: '找不到卡片' }, 404);
        }
        if (request.method === 'DELETE') {
          const result = await env.DB.prepare('DELETE FROM cards WHERE id=?').bind(id).run();
          return result.meta.changes ? json({ ok: true }) : json({ error: '找不到卡片' }, 404);
        }
        return json({ error: 'Method not allowed' }, 405);
      }

      const analyzeMatch = url.pathname.match(/^\/api\/cards\/([^/]+)\/analyze$/);
      if (analyzeMatch) {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        const id = decodeURIComponent(analyzeMatch[1]);
        if (!isUuid(id)) return json({ error: '無效的卡片 ID' }, 400);
        const card = await env.DB.prepare('SELECT * FROM cards WHERE id=?').bind(id).first<Record<string, unknown>>();
        if (!card) return json({ error: '找不到卡片' }, 404);
        await env.DB.prepare("UPDATE cards SET analysis_status='processing',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
        try {
          const result = await analyze(env, card);
          await env.DB.prepare("UPDATE cards SET analysis_status='done',analysis_result=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(result, id)
            .run();
          return json({ analysis: result });
        } catch (error) {
          await env.DB.prepare("UPDATE cards SET analysis_status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
          return json({ error: error instanceof Error ? error.message : '分析失敗' }, 500);
        }
      }

      if (url.pathname === '/api/cards') return json({ error: 'Method not allowed' }, 405);
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: 'request failed',
          path: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return json({ error: '系統錯誤' }, 500);
    }
  },
};
