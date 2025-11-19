// Redesigned VMS - app.js
(() => {
  const STORAGE_KEY = 'ses_vms_v2';
  const form = document.getElementById('checkinForm');
  const nameEl = document.getElementById('name');
  const contactEl = document.getElementById('contact');
  const orgEl = document.getElementById('org');
  const purposeEl = document.getElementById('purpose');
  const visitorsTbody = document.querySelector('#visitorsTable tbody');
  const searchEl = document.getElementById('search');

  const startCamBtn = document.getElementById('startCam');
  const stopCamBtn = document.getElementById('stopCam');
  const snapBtn = document.getElementById('snap');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');

  const exportCsvBtn = document.getElementById('exportCsv');
  const printBadgeBtn = document.getElementById('printBadge');
  const clearAllBtn = document.getElementById('clearAll');
  const clearFormBtn = document.getElementById('clearForm');

  let stream = null;
  let lastPhoto = null;

  function loadRecords(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
  function saveRecords(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
  function genId(){ return 'SE' + Date.now().toString().slice(-6); }
  function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function render(filter=''){
    const list = loadRecords();
    visitorsTbody.innerHTML = '';
    const display = list.slice().reverse().filter(r=>{
      if(!filter) return true;
      const q = filter.toLowerCase();
      return (r.name||'').toLowerCase().includes(q) || (r.org||'').toLowerCase().includes(q) || (r.id||'').toLowerCase().includes(q);
    });
    if(display.length === 0){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" style="color:#6b7280;padding:18px">No records found.</td>';
      visitorsTbody.appendChild(tr);
      return;
    }
    display.forEach(rec=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(rec.id)}</td>
        <td>${escapeHtml(rec.name)}</td>
        <td>${escapeHtml(rec.contact||'')}</td>
        <td>${escapeHtml(rec.org||'')}</td>
        <td>${escapeHtml(rec.purpose||'')}</td>
        <td>${escapeHtml(rec.time)}</td>
        <td>${rec.photo?'<img src="'+rec.photo+'" alt="photo">':''}</td>
      `;
      visitorsTbody.appendChild(tr);
    });
  }

  async function startCamera(){
    if(stream) return;
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
      video.srcObject = stream; await video.play();
    } catch(err){ alert('Camera error: ' + (err && err.message ? err.message : err)); stream = null; }
  }
  function stopCamera(){ if(!stream) return; stream.getTracks().forEach(t=>t.stop()); stream=null; video.srcObject=null; }
  function capturePhoto(){
    if(!video || !video.videoWidth){ alert('Start camera first'); return; }
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    lastPhoto = canvas.toDataURL('image/png'); alert('Photo captured');
  }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = nameEl.value.trim(); if(!name){ alert('Enter name'); nameEl.focus(); return; }
    const rec = {
      id: genId(),
      name,
      contact: contactEl.value.trim(),
      org: orgEl.value.trim(),
      purpose: purposeEl.value.trim(),
      time: new Date().toLocaleString(),
      photo: lastPhoto
    };
    const arr = loadRecords(); arr.push(rec); saveRecords(arr);
    lastPhoto = null; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    form.reset(); render(searchEl.value);
    // subtle success feedback
    const el = document.createElement('div'); el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px';
    el.style.background='#0b63ff'; el.style.color='white'; el.style.padding='10px 14px'; el.style.borderRadius='10px';
    el.style.boxShadow='0 8px 20px rgba(11,99,255,0.12)'; el.textContent='Checked in: ' + rec.name; document.body.appendChild(el);
    setTimeout(()=>el.remove(),2300);
  });

  startCamBtn.addEventListener('click', startCamera);
  stopCamBtn.addEventListener('click', stopCamera);
  snapBtn.addEventListener('click', capturePhoto);
  clearFormBtn.addEventListener('click', ()=>{ form.reset(); lastPhoto=null; });

  exportCsvBtn.addEventListener('click', ()=>{
    const arr = loadRecords(); if(!arr.length){ alert('No records to export'); return; }
    const header = ['ID','Name','Contact','Org','Purpose','Time'];
    const rows = [header.join(',')];
    arr.forEach(r=> rows.push([r.id, csvEscape(r.name), csvEscape(r.contact||''), csvEscape(r.org||''), csvEscape(r.purpose||''), csvEscape(r.time)].join(',')));
    const blob = new Blob([rows.join('\n')], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'science_express_visitors.csv'; a.click(); URL.revokeObjectURL(url);
  });

  function csvEscape(s){ if(s==null) return ''; return '"' + String(s).replace(/"/g,'""') + '"'; }

  printBadgeBtn.addEventListener('click', ()=>{
    const arr = loadRecords(); if(!arr.length){ alert('No records'); return; }
    const last = arr[arr.length-1];
    const w = window.open('','_blank','width=420,height=600');
    const photoHtml = last.photo? '<img src="'+last.photo+'" style="height:120px;border-radius:8px;margin-bottom:8px;">' : '';
    w.document.write(`<html><head><title>Badge</title></head><body style="font-family:Arial;padding:18px">
      <div style="border:1px solid #eef6ff;padding:14px;border-radius:10px">
        <h2 style="margin:0 0 8px">Science Express</h2>
        ${photoHtml}
        <div><strong>${escapeHtml(last.name)}</strong></div>
        <div>ID: ${escapeHtml(last.id)}</div>
        <div>Org: ${escapeHtml(last.org||'')}</div>
        <div>Purpose: ${escapeHtml(last.purpose||'')}</div>
        <div>Time: ${escapeHtml(last.time)}</div>
      </div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
    w.document.close();
  });

  clearAllBtn.addEventListener('click', ()=>{
    if(confirm('Clear all saved visitor records?')){ localStorage.removeItem(STORAGE_KEY); render(); }
  });

  searchEl.addEventListener('input', ()=>render(searchEl.value));

  // init
  render();

  window.addEventListener('beforeunload', ()=>{ if(stream) stopCamera(); });
})();
