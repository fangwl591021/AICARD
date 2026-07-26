export const iphonePage = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#111827">
  <title>iPhone 收集端｜AICARD</title>
  <style>
    :root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#172033;background:#f5f7fb;line-height:1.55}
    *{box-sizing:border-box}body{margin:0}.wrap{max-width:760px;margin:auto;padding:18px 16px 96px}
    .bar{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:12px 0;background:rgba(245,247,251,.94);backdrop-filter:blur(14px)}
    h1{font-size:28px;margin:14px 0 4px}h2{font-size:20px;margin:0 0 8px}h3{font-size:16px;margin:18px 0 6px}
    .muted{color:#64748b}.panel{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin:14px 0;box-shadow:0 8px 28px rgba(15,23,42,.045)}
    .btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:11px 15px;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}
    .primary{background:#111827;color:#fff}.secondary{background:#e8edf5;color:#172033}.copy{background:#eef2ff;color:#3730a3}
    label{display:block;font-size:13px;font-weight:750;margin:12px 0 5px}textarea,input,select{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:12px;font:inherit;background:#fff}
    textarea{min-height:130px;resize:vertical}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.step{display:flex;gap:12px;margin:14px 0}.num{flex:0 0 28px;height:28px;border-radius:50%;background:#111827;color:#fff;text-align:center;line-height:28px;font-weight:800}
    code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#f1f5f9;padding:2px 5px;border-radius:6px;overflow-wrap:anywhere}
    .ok{color:#166534}.error{color:#991b1b}.result{display:none;margin-top:12px;padding:12px;border-radius:11px;background:#f8fafc}.note{border-left:3px solid #6366f1;padding-left:12px}.endpoint{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#f8fafc}.feedback{min-height:24px;margin-top:8px;font-size:14px}.setup{margin-top:14px;padding:16px;border:2px solid #6366f1;border-radius:14px;background:#f5f3ff}.setup[hidden]{display:none}.setup h3{margin-top:0}.connection{display:flex;align-items:center;justify-content:space-between;gap:12px}.connection strong{display:block}.successBox{border:2px solid #22c55e;background:#f0fdf4;font-size:16px}.successMark{font-size:28px;display:block}.wide{width:100%}
  </style>
</head>
<body><main class="wrap">
  <nav class="bar"><strong>AICARD · iPhone</strong><a class="btn secondary" href="/">返回卡片庫</a></nav>
  <h1>觀看社群時，一鍵收集</h1>
  <p class="muted">支援「分享表單」與「背面輕點截圖 OCR」。只傳文字、網址與備註到 AICARD，不上傳截圖。</p>
  <section class="panel connection"><div><strong>收集服務狀態</strong><span id="connectionStatus" class="muted" role="status">正在確認…</span></div><button type="button" id="testConnection" class="btn secondary">重新測試</button></section>

  <section class="panel">
    <h2>先測試收集端</h2>
    <label for="text">貼文文字或 OCR 文字</label>
    <textarea id="text" placeholder="貼上剛看到的社群內容…"></textarea>
    <label for="url">來源網址（可留空）</label>
    <input id="url" type="url" inputmode="url" placeholder="https://…">
    <label for="platform">來源平台</label>
    <select id="platform"><option value="">自動判斷</option><option>Facebook</option><option>Threads</option><option>LINE</option><option>Instagram</option><option>YouTube</option><option>其他</option></select>
    <label for="note">為什麼重要（可留空）</label>
    <input id="note" maxlength="1000" placeholder="一句話即可">
    <div class="actions"><button id="send" class="btn primary">收進 AICARD</button></div>
    <div id="result" class="result"></div>
  </section>

  <section class="panel">
    <h2>捷徑 A：社群的分享按鈕</h2>
    <div class="step"><span class="num">1</span><div>在「捷徑」新增 <strong>AICARD 收藏</strong>，開啟「在分享表單中顯示」，接受<strong>文字與 URL</strong>。</div></div>
    <div class="step"><span class="num">2</span><div>加入「詢問輸入」，提示文字填入「為什麼重要？（可略過）」。</div></div>
    <div class="step"><span class="num">3</span><div>加入「取得 URL 的內容」，網址使用下面端點，方法選 <strong>POST</strong>，要求本文選 <strong>JSON</strong>。</div></div>
    <label for="endpoint">API 端點</label>
    <input id="endpoint" class="endpoint" readonly>
    <div class="actions"><button type="button" class="btn copy" id="copyEndpoint">複製 API 端點</button><button type="button" class="btn primary" id="startSetup">開始設定捷徑</button></div>
    <div id="copyStatus" class="feedback" role="status" aria-live="polite"></div>
    <div id="setupGuide" class="setup" hidden>
      <h3>設定畫面已開啟</h3>
      <p><strong>先不要離開這頁。</strong>請先複製上面的 API 端點，再按下面按鈕開啟捷徑。</p>
      <ol>
        <li>在新捷徑加入「取得 URL 的內容」。</li>
        <li>貼上 API 端點，方法選 POST，本文選 JSON。</li>
        <li>加入欄位 <code>text</code>＝捷徑輸入、<code>capture_method</code>＝<code>share_sheet</code>。</li>
        <li>最後一定加入「顯示結果」，內容選「取得 URL 的內容」；成功時才會在手機顯示結果。</li>
      </ol>
      <a id="openShortcuts" class="btn primary wide" href="shortcuts://create-shortcut">我已複製，現在開啟捷徑 App</a>
      <div id="openStatus" class="feedback" role="status" aria-live="polite"></div>
    </div>
    <h3>JSON 欄位</h3>
    <p><code>text</code>＝捷徑輸入、<code>url</code>＝從捷徑輸入取得的 URL、<code>note</code>＝詢問結果、<code>capture_method</code>＝<code>share_sheet</code>。</p>
    <div class="step"><span class="num">4</span><div>加入「顯示通知」，內容使用 API 回傳的 <code>title</code>。之後在 Facebook、Threads、Safari 等 App 點「分享」即可收集。</div></div>
  </section>

  <section class="panel">
    <h2>捷徑 B：背面輕點截圖 OCR</h2>
    <div class="step"><span class="num">1</span><div>新增 <strong>AICARD 截圖收集</strong>：依序加入「拍攝截圖」→「從影像擷取文字」→「詢問輸入」。</div></div>
    <div class="step"><span class="num">2</span><div>以同一 API 端點 POST JSON：<code>ocr_text</code>＝擷取的文字、<code>note</code>＝詢問結果、<code>capture_method</code>＝<code>back_tap</code>。</div></div>
    <div class="step"><span class="num">3</span><div>到 iPhone「設定 → 輔助使用 → 觸控 → 背面輕點」，把點兩下或三下指定給這個捷徑。</div></div>
    <p class="note">某些社群不會把完整文字交給分享表單，此時用截圖 OCR。AICARD 只保存辨識後文字，截圖仍留在手機端。</p>
  </section>
</main>
<script>
const result=document.getElementById('result');
const endpointField=document.getElementById('endpoint');
const copyStatus=document.getElementById('copyStatus');
const connectionStatus=document.getElementById('connectionStatus');
endpointField.value=location.origin+'/api/capture';
async function testConnection(){
  connectionStatus.className='muted';connectionStatus.textContent='正在確認…';
  try{
    const response=await fetch('/api/health',{cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error('service unavailable');
    connectionStatus.className='ok';connectionStatus.textContent='● 正常，可接收收藏（版本 '+data.version+'）';
  }catch{
    connectionStatus.className='error';connectionStatus.textContent='● 無法連線，請改用 Safari 後重試';
  }
}
document.getElementById('testConnection').addEventListener('click',testConnection);
testConnection();
document.getElementById('copyEndpoint').addEventListener('click',async event=>{
  const button=event.currentTarget;
  copyStatus.className='feedback';
  copyStatus.textContent='正在複製…';
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(endpointField.value);
    }else{
      endpointField.focus();endpointField.select();
      if(!document.execCommand('copy'))throw new Error('copy unavailable');
    }
    button.textContent='已複製';
    copyStatus.className='feedback ok';
    copyStatus.textContent='已複製，可以回到捷徑貼上。';
  }catch{
    endpointField.focus();endpointField.select();
    copyStatus.className='feedback error';
    copyStatus.textContent='iPhone 未允許自動複製，網址已反白；請長按後選「拷貝」。';
  }
});
document.getElementById('startSetup').addEventListener('click',()=>{
  const guide=document.getElementById('setupGuide');
  guide.hidden=false;
  guide.scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('openStatus').textContent='已顯示設定步驟；完成複製後再開啟捷徑 App。';
});
document.getElementById('openShortcuts').addEventListener('click',()=>{
  const status=document.getElementById('openStatus');
  status.className='feedback';
  status.textContent='正在要求 iPhone 開啟捷徑 App…';
  setTimeout(()=>{
    status.className='feedback error';
    status.textContent='若沒有跳到捷徑 App，代表目前是 LINE／Facebook 內建瀏覽器；請用 Safari 開啟本頁。';
  },1200);
});
document.getElementById('send').addEventListener('click',async()=>{
  const button=document.getElementById('send');
  const body={text:document.getElementById('text').value.trim(),url:document.getElementById('url').value.trim(),platform:document.getElementById('platform').value,note:document.getElementById('note').value.trim(),capture_method:'iphone_web'};
  button.disabled=true;button.textContent='收集中…';result.style.display='block';result.className='result';result.textContent='正在送出';
  try{
    const response=await fetch('/api/capture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'收集失敗');
    result.className='result successBox ok';
    result.textContent='';
    const mark=document.createElement('span');mark.className='successMark';mark.textContent='✅';
    const title=document.createElement('strong');title.textContent='收藏成功：'+data.title;
    const br=document.createElement('br');
    const link=document.createElement('a');link.href=data.card_url;link.textContent='立即查看這張卡片';
    result.append(mark,title,br,link);
    document.getElementById('text').value='';document.getElementById('url').value='';document.getElementById('note').value='';
  }catch(error){result.className='result error';result.textContent=error instanceof Error?error.message:'收集失敗'}
  finally{button.disabled=false;button.textContent='收進 AICARD'}
});
</script></body></html>`;
