interface Env {
  DB: D1Database;
  AI: Ai;
}

type CardType = 'person' | 'opportunity' | 'intelligence' | 'idea';

type CardInput = {
  card_type?: CardType | 'auto';
  title?: string;
  source_platform?: string;
  source_url?: string;
  source_text?: string;
  importance_reason?: string;
};

const CARD_TYPES: CardType[] = ['person', 'opportunity', 'intelligence', 'idea'];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const page = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="theme-color" content="#111827" />
<title>AICARD｜把看見的價值留下來</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f5f7fb;line-height:1.5}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1040px;margin:auto;padding:22px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:center;margin:10px 0 22px}.brand h1{margin:0;font-size:30px;letter-spacing:-.8px}.brand p{margin:5px 0 0;color:#64748b}.btn{border:0;border-radius:12px;padding:11px 16px;font:inherit;font-weight:750;cursor:pointer;transition:.15s}.btn:hover{transform:translateY(-1px)}.primary{background:#111827;color:#fff}.secondary{background:#e8edf5;color:#172033}.ghost{background:transparent;border:1px solid #dbe3ef;color:#475569}.panel,.card,.stat{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 28px rgba(15,23,42,.045)}.capture{padding:20px;margin-bottom:18px}.capture h2{margin:0 0 4px;font-size:20px}.hint{font-size:13px;color:#64748b;margin-bottom:15px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:block;font-size:13px;font-weight:750;margin-bottom:6px}input,select,textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:11px;font:inherit;background:#fff}textarea{min-height:118px;resize:vertical}.full{grid-column:1/-1}.advanced{display:none;margin-top:12px}.advanced.open{display:grid}.actions{display:flex;gap:9px;justify-content:flex-end;align-items:center;margin-top:14px}.status{font-size:13px;color:#64748b;margin-right:auto}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.stat{padding:14px}.stat strong{display:block;font-size:24px}.stat span{font-size:13px;color:#64748b}.toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:20px 0 12px}.filters{display:flex;gap:7px;flex-wrap:wrap}.filter{border:1px solid #dbe3ef;background:#fff;color:#475569;padding:7px 10px;border-radius:999px;font-size:13px;cursor:pointer}.filter.active{background:#111827;color:#fff;border-color:#111827}.cards{display:grid;gap:12px}.card{padding:17px}.top{display:flex;justify-content:space-between;gap:12px}.title{font-size:17px}.badge{font-size:12px;padding:4px 9px;border-radius:999px;background:#eef2ff;color:#3730a3;white-space:nowrap}.meta{font-size:12px;color:#64748b;margin-top:5px}.summary{margin:12px 0;line-height:1.65}.reason{border-left:3px solid #cbd5e1;padding-left:10px;color:#475569;font-size:14px}.analysis{white-space:pre-wrap;background:#f8fafc;border:1px solid #e8edf5;padding:13px;border-radius:11px;font-size:14px;margin-top:12px;line-height:1.7}.empty{text-align:center;color:#64748b;padding:40px}.loading{opacity:.65;pointer-events:none}.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 15px;border-radius:999px;font-size:14px;display:none;z-index:50}.toast.show{display:block}@media(max-width:720px){.wrap{padding:15px}.hero{align-items:flex-start}.grid{grid-template-columns:1fr}.full{grid-column:auto}.stats{grid-template-columns:1fr 1fr}.toolbar{align-items:flex-start;flex-direction:column}.capture{padding:16px}.hero .secondary{display:none}}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="brand"><h1>AICARD</h1><p>把看見的價值留下來，需要時再深入分析。</p></div>
    <button class="btn secondary" onclick="loadCards()">重新整理</button>
  </header>

  <section class="panel capture" id="capturePanel">
    <h2>＋ 新增收藏</h2>
    <div class="hint">貼上文字、網址或 OCR 結果；系統會先快速整理，不會立即做昂貴的深度分析。</div>
    <div class="grid">
      <div class="full"><label for="source">內容</label><textarea id="source" placeholder="貼上你看到的貼文、商機、人物資料或靈感…"></textarea></div>
      <div><label for="title">標題（可留空）</label><input id="title" placeholder="系統會自動產生" /></div>
      <div><label for="reason">為什麼重要（可留空）</label><input id="reason" placeholder="一句話即可" /></div>
    </div>
    <div id="advanced" class="grid advanced">
      <div><label for="platform">來源平台</label><input id="platform" placeholder="Facebook、Threads、LINE…" /></div>
      <div><label for="type">分類</label><select id="type"><option value="auto">自動判斷</option><option value="opportunity">商機</option><option value="person">人物</option><option value="intelligence">情報</option><option value="idea">靈感</option></select></div>
      <div class="full"><label for="url">來源網址</label><input id="url" type="url" placeholder="https://…" /></div>
    </div>
    <div class="actions"><span id="saveStatus" class="status"></span><button class="btn ghost" onclick="toggleAdvanced()">更多資訊</button><button id="saveButton" class="btn primary" onclick="createCard()">收藏</button></div>
  </section>

  <section id="stats" class="stats"></section>

  <div class="toolbar">
    <strong>最近收藏</strong>
    <div class="filters" id="filters"></div>
  </div>
  <main id="cards" class="cards"><div class="empty">正在載入…</div></main>
</div>
<div id="toast" class="toast"></div>
<script>
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const labels={person:'人物',opportunity:'商機',intelligence:'情報',idea:'靈感'};
const icons={person:'👤',opportunity:'💰',intelligence:'📚',idea:'💡'};
let cards=[];let currentFilter='all';
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function toggleAdvanced(){document.getElementById('advanced').classList.toggle('open')}
function renderStats(){const counts={person:0,opportunity:0,intelligence:0,idea:0};cards.forEach(c=>counts[c.card_type]=(counts[c.card_type]||0)+1);document.getElementById('stats').innerHTML=Object.keys(counts).map(k=>'<div class="stat"><strong>'+counts[k]+'</strong><span>'+icons[k]+' '+labels[k]+'</span></div>').join('')}
function renderFilters(){const root=document.getElementById('filters');root.innerHTML=[['all','全部'],...Object.entries(labels)].map(([k,v])=>'<button class="filter '+(currentFilter===k?'active':'')+'" onclick="setFilter(\''+k+'\')">'+v+'</button>').join('')}
function setFilter(filter){currentFilter=filter;renderFilters();renderCards()}
function renderCards(){const root=document.getElementById('cards');const list=currentFilter==='all'?cards:cards.filter(c=>c.card_type===currentFilter);if(!list.length){root.innerHTML='<div class="panel empty">目前沒有符合條件的卡片</div>';return}root.innerHTML=list.map(c=>'<article class="card" id="card-'+c.id+'"><div class="top"><div><strong class="title">'+esc(c.title)+'</strong><div class="meta">'+esc(c.source_platform||'其他')+' · '+esc(c.created_at)+'</div></div><span class="badge">'+icons[c.card_type]+' '+(labels[c.card_type]||c.card_type)+'</span></div><div class="summary">'+esc(c.summary||'尚未摘要')+'</div>'+(c.importance_reason?'<div class="reason">重要原因：'+esc(c.importance_reason)+'</div>':'')+'<div class="actions"><button class="btn secondary" onclick="analyze(\''+c.id+'\',this)">'+(c.analysis_status==='done'?'重新分析':'深度分析')+'</button></div>'+(c.analysis_result?'<div class="analysis">'+esc(c.analysis_result)+'</div>':'')+'</article>').join('')}
async function loadCards(){const root=document.getElementById('cards');root.innerHTML='<div class="panel empty">正在載入…</div>';try{const r=await fetch('/api/cards');if(!r.ok)throw new Error();const data=await r.json();cards=data.cards||[];renderStats();renderFilters();renderCards()}catch{root.innerHTML='<div class="panel empty">讀取失敗，請確認資料庫已建立並套用 migration。</div>'}}
async function createCard(){const source=document.getElementById('source').value.trim();if(!source){toast('請先貼上內容');return}const button=document.getElementById('saveButton');const panel=document.getElementById('capturePanel');button.textContent='收藏中…';panel.classList.add('loading');const body={card_type:document.getElementById('type').value,title:document.getElementById('title').value,source_platform:document.getElementById('platform').value,source_url:document.getElementById('url').value,source_text:source,importance_reason:document.getElementById('reason').value};try{const r=await fetch('/api/cards',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'建立失敗')}['source','title','reason','url'].forEach(id=>document.getElementById(id).value='');toast('已收藏');await loadCards()}catch(e){toast(e.message||'建立失敗')}finally{button.textContent='收藏';panel.classList.remove('loading')}}
async function analyze(id,button){button.textContent='分析中…';button.disabled=true;try{const r=await fetch('/api/cards/'+encodeURIComponent(id)+'/analyze',{method:'POST'});if(!r.ok)throw new Error();toast('深度分析完成');await loadCards();document.getElementById('card-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})}catch{toast('分析失敗，請稍後再試')}finally{button.disabled=false}}
loadCards();
</script>
</body></html>`;

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function quickSummary(text: string): string {
  const clean = cleanText(text);
  return clean ? clean.slice(0, 140) : '尚未提供原始內容';
}

function inferCardType(text: string): CardType {
  const content = text.toLowerCase();
  if (/(徵求|尋找|推薦|需要|合作|報價|購買|想找|請問有沒有|商機|客戶)/.test(content)) return 'opportunity';
  if (/(姓名|公司|職稱|電話|手機|email|e-mail|聯絡人|名片)/.test(content)) return 'person';
  if (/(我想到|點子|構想|如果可以|可以做成|新產品|靈感)/.test(content)) return 'idea';
  return 'intelligence';
}

function inferTitle(text: string): string {
  const clean = cleanText(text);
  if (!clean) return '未命名收藏';
  const firstSentence = clean.split(/[。！？!?\n]/)[0];
  return firstSentence.slice(0, 42) || clean.slice(0, 42);
}

function normalizePlatform(value: string | undefined, sourceUrl: string | undefined): string {
  const explicit = cleanText(value);
  if (explicit) return explicit;
  const url = cleanText(sourceUrl).toLowerCase();
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('threads.net')) return 'Threads';
  if (url.includes('line.me') || url.includes('liff.line.me')) return 'LINE';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return '其他';
}

async function deepAnalyze(env: Env, card: Record<string, unknown>): Promise<string> {
  const typeInstructions: Record<CardType, string> = {
    person: '整理人物背景、可能需求、關係切入點與下一次聯絡建議。',
    opportunity: '判斷需求訊號、商機強度、適合的產品或服務、自然開場方式與下一步。',
    intelligence: '拆解核心主張、可信度、可借鏡之處、風險，以及對使用者事業的應用。',
    idea: '評估目標客群、解決痛點、最小驗證方式、可能收費模式與下一步。',
  };
  const cardType = CARD_TYPES.includes(card.card_type as CardType) ? card.card_type as CardType : 'intelligence';
  const prompt = `你是繁體中文的商業情報與商機顧問。${typeInstructions[cardType]}\n\n請固定輸出以下四段，每段簡短具體：\n【核心判斷】\n【為何重要】\n【機會與風險】\n【下一步行動】\n\n卡片類型：${cardType}\n標題：${card.title}\n來源：${card.source_platform}\n原始內容：${card.source_text || ''}\n使用者備註：${card.importance_reason || ''}`;
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: '避免空泛鼓勵與誇大承諾；回覆必須具體、簡潔、可執行。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 700,
    }) as { response?: string };
    return result.response || '分析完成，但模型沒有回傳內容。';
  } catch {
    return `【核心判斷】\n${quickSummary(String(card.source_text || ''))}\n\n【下一步行動】\n補充目標對象與預期用途，再決定是否列入追蹤。`;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json({ ok: true, service: 'AICARD' });
    }

    if (request.method === 'GET' && url.pathname === '/api/cards') {
      const result = await env.DB.prepare('SELECT * FROM cards ORDER BY created_at DESC LIMIT 100').all();
      return json({ cards: result.results });
    }

    if (request.method === 'POST' && url.pathname === '/api/cards') {
      let input: CardInput;
      try {
        input = await request.json<CardInput>();
      } catch {
        return json({ error: '請提供正確的 JSON 資料' }, 400);
      }

      const sourceText = cleanText(input.source_text);
      const sourceUrl = cleanText(input.source_url);
      if (!sourceText && !sourceUrl) return json({ error: '內容或來源網址至少要填一項' }, 400);
      if (sourceText.length > 20000) return json({ error: '內容過長，請縮短至 20,000 字以內' }, 413);

      const id = crypto.randomUUID();
      const combined = [sourceText, sourceUrl, input.title, input.importance_reason].filter(Boolean).join(' ');
      const requestedType = input.card_type;
      const cardType: CardType = requestedType && CARD_TYPES.includes(requestedType as CardType)
        ? requestedType as CardType
        : inferCardType(combined);
      const title = cleanText(input.title) || inferTitle(sourceText || sourceUrl);
      const summary = quickSummary(sourceText || sourceUrl);
      const platform = normalizePlatform(input.source_platform, sourceUrl);

      await env.DB.prepare(`INSERT INTO cards
        (id, card_type, title, summary, source_platform, source_url, source_text, importance_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, cardType, title, summary, platform, sourceUrl || null, sourceText || null, cleanText(input.importance_reason) || null)
        .run();

      return json({ id, card_type: cardType, summary }, 201);
    }

    const analyzeMatch = url.pathname.match(/^\/api\/cards\/([^/]+)\/analyze$/);
    if (request.method === 'POST' && analyzeMatch) {
      const id = decodeURIComponent(analyzeMatch[1]);
      const card = await env.DB.prepare('SELECT * FROM cards WHERE id = ?').bind(id).first<Record<string, unknown>>();
      if (!card) return json({ error: '找不到卡片' }, 404);

      await env.DB.prepare("UPDATE cards SET analysis_status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
      try {
        const analysis = await deepAnalyze(env, card);
        await env.DB.prepare("UPDATE cards SET analysis_status = 'done', analysis_result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(analysis, id).run();
        return json({ analysis });
      } catch (error) {
        await env.DB.prepare("UPDATE cards SET analysis_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
        return json({ error: error instanceof Error ? error.message : '分析失敗' }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};