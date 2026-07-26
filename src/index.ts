interface Env {
  DB: D1Database;
  AI: Ai;
}

type CardType = 'person' | 'opportunity' | 'intelligence' | 'idea';

type CardInput = {
  card_type?: CardType;
  title?: string;
  source_platform?: string;
  source_url?: string;
  source_text?: string;
  importance_reason?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const page = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>AI CARD</title>
<style>
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f6fb}*{box-sizing:border-box}body{margin:0}.wrap{max-width:980px;margin:auto;padding:24px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:20px}.hero h1{margin:0;font-size:30px}.hero p{margin:6px 0 0;color:#64748b}.panel,.card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 30px rgba(15,23,42,.05)}.panel{padding:18px;margin-bottom:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:block;font-size:13px;font-weight:700;margin-bottom:5px}input,select,textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit;background:#fff}textarea{min-height:92px;resize:vertical}.full{grid-column:1/-1}.actions{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}button{border:0;border-radius:10px;padding:10px 15px;font-weight:700;cursor:pointer}.primary{background:#2563eb;color:white}.secondary{background:#e2e8f0;color:#172033}.cards{display:grid;gap:12px}.card{padding:16px}.top{display:flex;justify-content:space-between;gap:12px}.badge{font-size:12px;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#3730a3}.meta{font-size:12px;color:#64748b;margin-top:6px}.summary{margin:12px 0;line-height:1.6}.analysis{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:10px;font-size:14px}.empty{text-align:center;color:#64748b;padding:32px}@media(max-width:700px){.grid{grid-template-columns:1fr}.full{grid-column:auto}.hero{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero"><div><h1>AI CARD</h1><p>先收藏，之後再深度分析。</p></div><button class="secondary" onclick="loadCards()">重新整理</button></div>
  <section class="panel">
    <div class="grid">
      <div><label>卡片類型</label><select id="type"><option value="opportunity">商機</option><option value="person">人物</option><option value="intelligence">情報</option><option value="idea">靈感</option></select></div>
      <div><label>來源平台</label><input id="platform" placeholder="LINE、Facebook、Threads…" /></div>
      <div class="full"><label>標題</label><input id="title" placeholder="這筆內容的名稱" /></div>
      <div class="full"><label>原始內容</label><textarea id="source" placeholder="貼上文字、網址說明或 OCR 結果"></textarea></div>
      <div class="full"><label>為什麼重要（可留空）</label><input id="reason" placeholder="一句話即可" /></div>
    </div>
    <div class="actions"><button class="primary" onclick="createCard()">新增收藏</button></div>
  </section>
  <main id="cards" class="cards"><div class="empty">正在載入…</div></main>
</div>
<script>
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const labels={person:'人物',opportunity:'商機',intelligence:'情報',idea:'靈感'};
async function loadCards(){
 const r=await fetch('/api/cards'); const data=await r.json(); const root=document.getElementById('cards');
 if(!data.cards?.length){root.innerHTML='<div class="empty">目前還沒有卡片</div>';return}
 root.innerHTML=data.cards.map(c=>`<article class="card"><div class="top"><div><strong>${esc(c.title)}</strong><div class="meta">${esc(c.source_platform)} · ${esc(c.created_at)}</div></div><span class="badge">${labels[c.card_type]||c.card_type}</span></div><div class="summary">${esc(c.summary||'尚未摘要')}</div>${c.importance_reason?`<div class="meta">重要原因：${esc(c.importance_reason)}</div>`:''}<div class="actions"><button class="secondary" onclick="analyze('${c.id}')">深度分析</button></div>${c.analysis_result?`<div class="analysis">${esc(c.analysis_result)}</div>`:''}</article>`).join('');
}
async function createCard(){
 const body={card_type:document.getElementById('type').value,title:document.getElementById('title').value,source_platform:document.getElementById('platform').value,source_text:document.getElementById('source').value,importance_reason:document.getElementById('reason').value};
 const r=await fetch('/api/cards',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); if(!r.ok){alert('建立失敗');return} document.getElementById('title').value='';document.getElementById('source').value='';document.getElementById('reason').value='';await loadCards();
}
async function analyze(id){
 const r=await fetch('/api/cards/'+id+'/analyze',{method:'POST'}); if(!r.ok){alert('分析失敗');return} await loadCards();
}
loadCards();
</script>
</body></html>`;

function quickSummary(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 120) : '尚未提供原始內容';
}

async function deepAnalyze(env: Env, card: Record<string, unknown>): Promise<string> {
  const prompt = `你是商業情報與商機分析助理。請用繁體中文分析以下卡片，輸出：\n1. 核心重點\n2. 為何重要\n3. 潛在商機或風險\n4. 建議下一步\n\n卡片類型：${card.card_type}\n標題：${card.title}\n來源：${card.source_platform}\n內容：${card.source_text || ''}\n使用者備註：${card.importance_reason || ''}`;
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: '回覆務必具體、簡潔、可執行。' },
        { role: 'user', content: prompt },
      ],
    }) as { response?: string };
    return result.response || '分析完成，但模型沒有回傳內容。';
  } catch {
    return `核心重點：${quickSummary(String(card.source_text || ''))}\n\n建議下一步：先確認這筆內容是否值得追蹤，再補充目標對象、預期用途與下一個行動。`;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (request.method === 'GET' && url.pathname === '/api/cards') {
      const result = await env.DB.prepare('SELECT * FROM cards ORDER BY created_at DESC LIMIT 100').all();
      return json({ cards: result.results });
    }

    if (request.method === 'POST' && url.pathname === '/api/cards') {
      const input = await request.json<CardInput>();
      const id = crypto.randomUUID();
      const title = input.title?.trim() || '未命名卡片';
      const sourceText = input.source_text?.trim() || '';
      const summary = quickSummary(sourceText);
      const cardType: CardType = input.card_type || 'intelligence';

      await env.DB.prepare(`INSERT INTO cards
        (id, card_type, title, summary, source_platform, source_url, source_text, importance_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, cardType, title, summary, input.source_platform || 'other', input.source_url || null, sourceText, input.importance_reason || null)
        .run();

      return json({ id }, 201);
    }

    const analyzeMatch = url.pathname.match(/^\/api\/cards\/([^/]+)\/analyze$/);
    if (request.method === 'POST' && analyzeMatch) {
      const id = analyzeMatch[1];
      const card = await env.DB.prepare('SELECT * FROM cards WHERE id = ?').bind(id).first<Record<string, unknown>>();
      if (!card) return json({ error: 'Card not found' }, 404);

      await env.DB.prepare("UPDATE cards SET analysis_status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
      const analysis = await deepAnalyze(env, card);
      await env.DB.prepare("UPDATE cards SET analysis_status = 'done', analysis_result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(analysis, id).run();
      return json({ analysis });
    }

    return json({ error: 'Not found' }, 404);
  },
};
