const canvas = document.getElementById('result-canvas');
const ctx = canvas.getContext('2d');

const imgBaseInput = document.getElementById('img-base');
const imgTargetInput = document.getElementById('img-target');
const btnGenerate = document.getElementById('btn-generate');
const btnDownload = document.getElementById('btn-download');
const notePasswordInput = document.getElementById('note-password');

const countGenText = document.getElementById('count-generate');
const countDlText = document.getElementById('count-download');
const premiumBadge = document.getElementById('premium-badge');

// 有料版状態はサーバー認証後にブラウザへ保存します。
// ライセンスキー本体はこのファイルには書きません。Vercelの環境変数 LICENSE_KEY に置きます。
const btnUnlock = document.getElementById('btn-unlock');
const licenseMessage = document.getElementById('license-message');
let premiumUnlocked = localStorage.getItem('sagase_premium_unlocked') === 'true';

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

let today = getTodayString();

if (localStorage.getItem('sagase_date') !== today) {
  localStorage.setItem('sagase_date', today);
  localStorage.setItem('sagase_gen_count', '0');
  localStorage.setItem('sagase_dl_count', '0');
}

let genCount = parseInt(localStorage.getItem('sagase_gen_count') || '0');
let dlCount = parseInt(localStorage.getItem('sagase_dl_count') || '0');

function isPremium() {
  return premiumUnlocked;
}

function setLicenseMessage(message, type = '') {
  if (!licenseMessage) return;
  licenseMessage.textContent = message;
  licenseMessage.className = `license-message ${type}`.trim();
}

async function verifyLicense() {
  const licenseKey = notePasswordInput.value.trim();
  if (!licenseKey) {
    setLicenseMessage('note記事にある合言葉を入力してください。', 'error');
    return;
  }

  btnUnlock.disabled = true;
  setLicenseMessage('確認中...', '');

  try {
    const res = await fetch('/api/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      premiumUnlocked = false;
      localStorage.removeItem('sagase_premium_unlocked');
      setLicenseMessage('合言葉が違うようです。note記事の内容をもう一度ご確認ください。', 'error');
      updateUIState();
      return;
    }

    premiumUnlocked = true;
    localStorage.setItem('sagase_premium_unlocked', 'true');
    notePasswordInput.value = '';
    setLicenseMessage('有料版を解放しました。', 'success');
    updateUIState();
  } catch (error) {
    setLicenseMessage('通信エラーです。少し時間をおいて再試行してください。', 'error');
  } finally {
    btnUnlock.disabled = false;
  }
}

function updateUIState() {
  const premium = isPremium();
  
  countGenText.innerText = premium ? "∞" : (20 - genCount);
  countDlText.innerText = premium ? "∞" : (3 - dlCount);
  premiumBadge.style.display = premium ? "block" : "none";

  document.querySelectorAll('.color-locked, .difficulty-locked').forEach(el => {
    el.style.opacity = premium ? "1" : "0.4";
    el.style.background = premium ? "#edf0f2" : "#cbd5e1";
    el.style.cursor = premium ? "pointer" : "not-allowed";
  });
  
  document.querySelectorAll('.color-locked input[type="radio"]').forEach(radio => {
    radio.disabled = !premium;
  });

  const oniRadio = document.querySelector('input[value="oni"]');
  if (oniRadio) oniRadio.disabled = !premium;
}

if (btnUnlock) btnUnlock.addEventListener('click', verifyLicense);
updateUIState();

let loadedBaseImg = null;
let loadedTargetImg = null;

function handleImageUpload(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

imgBaseInput.addEventListener('change', async (e) => { loadedBaseImg = await handleImageUpload(e.target.files[0]); });
imgTargetInput.addEventListener('change', async (e) => { loadedTargetImg = await handleImageUpload(e.target.files[0]); });

function drawMaskedImage(image, x, y, size, shape) {
  ctx.save();
  ctx.translate(x, y);
  if (shape !== 'none') {
    ctx.beginPath();
    if (shape === 'circle') { ctx.arc(0, 0, size / 2, 0, Math.PI * 2); }
    else if (shape === 'square') { ctx.rect(-size / 2, -size / 2, size, size); }
    else if (shape === 'heart') {
      const d = size;
//      ctx.moveTo(0, -d * 0.05);
//      ctx.bezierCurveTo(-d * 0.8, -d * 0.5, -d, d * 0.15, 0, d * 0.45);
//      ctx.bezierCurveTo(d, d * 0.15, d * 0.8, -d * 0.5, 0, -d * 0.05);
      ctx.moveTo(0, -d * 0.12);
      ctx.bezierCurveTo(-d * 0.65, -d * 0.55, -d * 0.85, d * 0.05, 0, d * 0.52);
      ctx.bezierCurveTo(d * 0.85, d * 0.05, d * 0.65, -d * 0.55, 0, -d * 0.12);
    } else if (shape === 'star') {
      const spikes = 5; const outerRadius = size / 2; const innerRadius = size / 4;
      let rot = (Math.PI / 2) * 3; let step = Math.PI / spikes;
      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        let cx = Math.cos(rot) * outerRadius; let cy = Math.sin(rot) * outerRadius;
        ctx.lineTo(cx, cy); rot += step;
        cx = Math.cos(rot) * innerRadius; cy = Math.sin(rot) * innerRadius;
        ctx.lineTo(cx, cy); rot += step;
      }
      ctx.lineTo(0, -outerRadius);
    }
    ctx.closePath();
    ctx.clip();
  }
  const scale = size / Math.min(image.width, image.height);
  const drawWidth = image.width * scale; const drawHeight = image.height * scale;
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function generatePuzzle() {
  const premium = isPremium();

  if (!premium && genCount >= 20) {
    alert('本日の無料生成制限（20回）に達しました。\n\nnote記事の合言葉を入力すると\n👹鬼モード・🎨限定カラー・📄A4サイズが使い放題になります✨');
    return;
  }

  if (!loadedBaseImg || !loadedTargetImg) {
    alert('ベース画像とターゲット画像の両方をアップロードしてください！');
    return;
  }

  const ratioType = document.getElementById('aspect-ratio').value;
  
  if ((ratioType === 'A4-yoko' || ratioType === 'A4-tate') && !premium) {
    alert('📄 A4印刷サイズは有料版限定です！\n\nnote記事の合言葉を入力すると\n👹鬼モード・🎨限定カラー・📄A4サイズが使えるようになります✨');
    return;
  }

  let width = 1920; let height = 1080;
  if (ratioType === '1-1') { width = 1200; height = 1200; }
  else if (ratioType === '9-16') { width = 1080; height = 1920; }
  else if (ratioType === 'A4-yoko') { width = 3508; height = 2480; } 
  else if (ratioType === 'A4-tate') { width = 2480; height = 3508; }

  canvas.width = width; canvas.height = height;

  const checkedBg = document.querySelector('input[name="bg-color"]:checked');
  let bgColor = checkedBg ? checkedBg.value : "#ffffff";
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  let baseCount = 80; let imgSize = width * 0.08; 

  if (difficulty === 'hard') {
    baseCount = 380; imgSize = width * 0.052;
  } else if (difficulty === 'oni') {
    baseCount = 650; imgSize = width * 0.045; 
  }

  const maskShape = document.getElementById('mask-shape').value;
  const collisionRadius = imgSize * 0.42;
  const placedItems = [];

  function calcPosition() {
    let x, y; let attempts = 0;
    while (attempts < 600) {
      x = Math.random() * (width - imgSize) + imgSize / 2;
      y = Math.random() * (height - imgSize) + imgSize / 2;
      let isColliding = false;
      for (const item of placedItems) {
        if (Math.sqrt((x - item.x)**2 + (y - item.y)**2) < collisionRadius * (difficulty === 'oni' ? 1.2 : 2)) {
          isColliding = true; break;
        }
      }
      if (!isColliding) return { x, y };
      attempts++;
    }
    return { x, y };
  }

  const tPos = calcPosition();
  const targetX = tPos.x; const targetY = tPos.y;

  const underCount = Math.floor(baseCount * 0.75);
  for (let i = 0; i < underCount; i++) {
    const pos = calcPosition(); placedItems.push({ x: pos.x, y: pos.y, img: loadedBaseImg });
  }

  for (const item of placedItems) { drawMaskedImage(item.img, item.x, item.y, imgSize, maskShape); }
  drawMaskedImage(loadedTargetImg, targetX, targetY, imgSize, maskShape);

  const overCount = baseCount - underCount;
  let spawnedOver = 0; let overAttempts = 0;
  while (spawnedOver < overCount && overAttempts < 1500) {
    const pos = calcPosition();
    if (Math.sqrt((pos.x - targetX)**2 + (pos.y - targetY)**2) > imgSize * 0.55) {
      drawMaskedImage(loadedBaseImg, pos.x, pos.y, imgSize, maskShape);
      spawnedOver++;
    }
    overAttempts++;
  }

  if (!premium) {
    ctx.save();
    const fontSize = Math.floor(width * 0.022); 
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
    const watermarkText = "さがせ！画像ジェネレーター @tsubuo";
    ctx.fillText(watermarkText, width / 2, height - (height * 0.04));
    ctx.restore();
  }

  if (!premium) {
    genCount++;
    localStorage.setItem('sagase_gen_count', genCount.toString());
    updateUIState();
  }

  btnDownload.disabled = false;
}

btnGenerate.addEventListener('click', generatePuzzle);

btnDownload.addEventListener('click', () => {
  const premium = isPremium();
  
  if (!premium && dlCount >= 3) {
    alert('本日の無料ダウンロード制限（3回）に達しました。\n\nnote記事にある合言葉を手に入れると、\n制限なしで何枚でも保存できるようになります！');
    return;
  }

  const link = document.createElement('a');
  link.download = 'sagase_game.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  if (!premium) {
    dlCount++;
    localStorage.setItem('sagase_dl_count', dlCount.toString());
    updateUIState();
  }
});
