(function () {
  const cfg = window.MADDENS_CONFIG;
  const nameSel = document.getElementById('name-select');
  const catsEl = document.getElementById('categories');
  const btn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('status');

  const badge = (text, cls) => `<span class="badge ${cls}">${text}</span>`;

  function render(data) {
    document.getElementById('subtitle').textContent = data.meta.dates;

    for (const p of data.roster) {
      const o = document.createElement('option');
      // value MUST match the Google Form's Name choice exactly, or the whole
      // submission is silently rejected (CreateForm.gs uses "Name (Family)").
      o.value = `${p.name} (${p.family})`;
      o.textContent = `${p.name} (${p.family})`;
      nameSel.appendChild(o);
    }

    for (const cat of data.categories) {
      const sec = document.createElement('section');
      sec.className = 'category';
      sec.dataset.catId = cat.id;
      const rows = cat.items.map(it => {
        const badges = [
          it.age === 'kid' ? badge('kid', 'kid') : '',
          it.age === '21+' ? badge('21+', 'adult') : '',
          it.price ? badge(it.price, 'price') : ''
        ].join('');
        return `<label class="activity">
          <input type="checkbox" value="${it.label.replace(/"/g, '&quot;')}" />
          <span class="label">${it.label}</span>${badges}
        </label>`;
      }).join('');
      sec.innerHTML = `<h2>${cat.label}</h2>${rows}`;
      catsEl.appendChild(sec);
    }

    nameSel.addEventListener('change', () => { btn.disabled = !nameSel.value; });
    btn.addEventListener('click', () => submit(data));
  }

  function collect(data) {
    const body = new URLSearchParams();
    body.append(cfg.ENTRY.name, nameSel.value);
    for (const cat of data.categories) {
      const sec = catsEl.querySelector(`[data-cat-id="${cat.id}"]`);
      sec.querySelectorAll('input:checked').forEach(cb => {
        body.append(cfg.ENTRY[cat.id], cb.value);
      });
    }
    return body;
  }

  function submit(data) {
    if (!nameSel.value) return;
    btn.disabled = true;
    statusEl.className = '';
    statusEl.textContent = 'Sending…';
    const body = collect(data);
    // Google Forms formResponse does not send CORS headers; no-cors means we
    // can't read the response, so we treat a completed POST as success.
    fetch(cfg.FORM_ACTION, { method: 'POST', mode: 'no-cors', body })
      .then(() => {
        statusEl.className = 'ok';
        statusEl.textContent = 'Got it — thanks! You can close this or resubmit to change your picks.';
      })
      .catch(() => {
        statusEl.className = 'err';
        statusEl.textContent = 'Something went wrong — please try again.';
        btn.disabled = false;
      });
  }

  fetch('activities.json')
    .then(r => r.json())
    .then(render)
    .catch(() => {
      statusEl.className = 'err';
      statusEl.textContent = 'Could not load activities.json.';
    });
})();
