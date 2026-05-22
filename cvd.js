const input = document.getElementById('file');
const dropzone = document.getElementById('dropzone');
const info = document.getElementById('info');
const list = document.getElementById('list');
const mergeAll = document.getElementById('mergeAll');
const errorBox = document.getElementById('error');

let entries = [];

async function handleFile(file) {
  errorBox.textContent = ""; // 清空錯誤訊息
  const buf = new Uint8Array(await file.arrayBuffer());

  // 1) 解析 header
  const header = new TextDecoder().decode(buf.slice(0, 512));
  console.log("CVD Header:", header.split('\n')[0]);
  info.textContent = "CVD Header: " + header.split('\n')[0];

  // 2) 嘗試 gzip 解壓縮
  let decompressed;
  try {
    decompressed = window.pako.ungzip(buf.slice(512));
    console.log("ungzip 成功, size =", decompressed.length);
  } catch (e) {
    console.warn("ungzip 失敗，改用原始資料");
    errorBox.textContent = "⚠️ gzip 解壓縮失敗，嘗試直接解析 tar";
    decompressed = buf.slice(512);
  }

  // 3) 用 untar.js 解析
  let files = [];
  try {
    files = await window.untar(decompressed.buffer);
    console.log("untar files:", files.map(f => f.name));
  } catch (e) {
    console.error("untar 解析失敗:", e);
    errorBox.textContent = "❌ 無法解析 tar，請確認檔案格式";
    return;
  }

  // 4) 過濾出文字檔
  entries = files.filter(f => /\.(ndb|hdb|ldb|yar|txt)$/i.test(f.name));

  if (entries.length === 0) {
    errorBox.textContent = "⚠️ 沒有找到任何簽名檔 (.ndb/.hdb/.ldb)";
  }

  // 5) 顯示清單
  list.innerHTML = '';
  entries.forEach(f => {
    const div = document.createElement('div');
    div.className = 'file';
    div.innerHTML = `<span>${f.name}</span><button>下載</button>`;
    div.querySelector('button').onclick = () => download(f);
    list.appendChild(div);
  });

  mergeAll.disabled = entries.length === 0;
}

function download(f) {
  const blob = new Blob([f.buffer], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = f.name + ".txt";
  a.click();
}

mergeAll.onclick = () => {
  const merged = entries.map(f => `# ${f.name}\n${new TextDecoder().decode(f.buffer)}`).join('\n');
  const blob = new Blob([merged], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rules.txt';
  a.click();
};

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dropzone.addEventListener('dragover', e => e.preventDefault());
input.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});