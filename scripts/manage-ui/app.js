// Gestor de fotos · UI cliente.
// Renderiza el grid, gestiona el panel de edición, drag&drop, y publicación.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  photos: [], // [{slug, data: {...}}]
  filter: 'all',
  search: '',
  selectedSlug: null,
  reorderDirty: false, // true cuando se arrastró pero no se publicó
};

const grid = $('#grid');
const panel = $('#panel');
const editForm = $('#editForm');
const speciesBlock = $('#speciesBlock');
const formStatus = $('#formStatus');
const publishBtn = $('#publish');
const pendingEl = $('#pending');
const countEl = $('#count');

// ── Render ──────────────────────────────────────────────────────────────

function visiblePhotos() {
  const q = state.search.trim().toLowerCase();
  return state.photos.filter((p) => {
    if (state.filter === 'aves' && p.data.category !== 'aves') return false;
    if (state.filter === 'paisajes' && p.data.category !== 'paisajes') return false;
    if (state.filter === 'featured' && !p.data.featured) return false;
    if (q) {
      const haystack = `${p.slug} ${p.data.title_es || ''} ${(p.data.tags || []).join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const visible = visiblePhotos();
  countEl.textContent = `${visible.length} de ${state.photos.length} fotos`;
  grid.innerHTML = '';
  for (const p of visible) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.slug = p.slug;
    card.innerHTML = `
      <button class="drag-handle" title="Arrastrar para reordenar" aria-label="Arrastrar">⋮⋮</button>
      <img class="card-thumb" loading="lazy" src="/thumb/${p.slug}" alt="" />
      <div class="card-body">
        <p class="card-title">${escapeHtml(p.data.title_es || p.slug)}</p>
        <div class="card-meta">
          <span class="tag-cat">${p.data.category}</span>
          ${p.data.featured ? '<span class="star" title="Destacada">★</span>' : ''}
          ${p.data.order != null ? `<span class="has-order">#${p.data.order}</span>` : ''}
        </div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      // ignoramos clicks en el handle (Sortable se encarga del drag).
      if (e.target.closest('.drag-handle')) return;
      openPanel(p.slug);
    });
    grid.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Filtros / búsqueda ─────────────────────────────────────────────────

$$('.chip').forEach((chip) =>
  chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.filter = chip.dataset.filter;
    renderGrid();
    setupSortable();
  }),
);

$('#search').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderGrid();
  setupSortable();
});

// ── Panel ─────────────────────────────────────────────────────────────

function openPanel(slug) {
  const p = state.photos.find((x) => x.slug === slug);
  if (!p) return;
  state.selectedSlug = slug;
  panel.hidden = false;
  $('#panelSlug').textContent = slug;
  $('#panelImg').src = `/img/${slug}`;
  $('#panelImg').alt = p.data.title_es || slug;
  $('input[name="title_es"]', editForm).value = p.data.title_es || '';
  $$('input[name="category"]', editForm).forEach((r) => {
    r.checked = r.value === p.data.category;
  });
  $('input[name="tags"]', editForm).value = (p.data.tags || []).join(', ');
  $('input[name="species_common_es"]', editForm).value = p.data.species_common_es || '';
  $('input[name="species_common_en"]', editForm).value = p.data.species_common_en || '';
  $('input[name="species_scientific"]', editForm).value = p.data.species_scientific || '';
  const loc = p.data.location || {};
  $('input[name="city"]', editForm).value = loc.city || '';
  $('input[name="region"]', editForm).value = loc.region || '';
  $('input[name="country"]', editForm).value = loc.country || 'Chile';
  $('textarea[name="description_es"]', editForm).value = p.data.description_es || '';
  $('input[name="featured"]', editForm).checked = !!p.data.featured;
  toggleSpeciesBlock();
  formStatus.textContent = '';
  formStatus.classList.remove('error');
}

function closePanel() {
  panel.hidden = true;
  state.selectedSlug = null;
}

$('#closePanel').addEventListener('click', closePanel);

function toggleSpeciesBlock() {
  const cat = ($('input[name="category"]:checked', editForm) || {}).value;
  speciesBlock.classList.toggle('hidden', cat !== 'aves');
}

$$('input[name="category"]', editForm).forEach((r) =>
  r.addEventListener('change', toggleSpeciesBlock),
);

// ── Guardar edición ────────────────────────────────────────────────────

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = state.selectedSlug;
  if (!slug) return;
  const fd = new FormData(editForm);
  const tags = (fd.get('tags') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const payload = {
    title_es: (fd.get('title_es') || '').trim(),
    category: fd.get('category'),
    tags,
    species_common_es: (fd.get('species_common_es') || '').trim(),
    species_common_en: (fd.get('species_common_en') || '').trim(),
    species_scientific: (fd.get('species_scientific') || '').trim(),
    location: {
      city: (fd.get('city') || '').trim(),
      region: (fd.get('region') || '').trim(),
      country: (fd.get('country') || 'Chile').trim() || 'Chile',
    },
    description_es: (fd.get('description_es') || '').trim(),
    featured: fd.get('featured') === 'on',
  };

  formStatus.textContent = 'Guardando…';
  formStatus.classList.remove('error');
  try {
    const r = await fetch(`/api/photos/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    // actualizar en memoria
    const p = state.photos.find((x) => x.slug === slug);
    Object.assign(p.data, payload);
    renderGrid();
    setupSortable();
    formStatus.textContent = '✓ Guardado.';
    refreshPending();
  } catch (err) {
    formStatus.textContent = `Error: ${err.message}`;
    formStatus.classList.add('error');
  }
});

// ── Borrar ────────────────────────────────────────────────────────────

const deleteDialog = $('#confirmDelete');

$('#deleteBtn').addEventListener('click', () => {
  const slug = state.selectedSlug;
  if (!slug) return;
  const p = state.photos.find((x) => x.slug === slug);
  const title = p?.data?.title_es || slug;
  $('#confirmDeleteMsg').innerHTML =
    `Vas a borrar <strong>${escapeHtml(title)}</strong> (<code>${escapeHtml(slug)}</code>).`;
  deleteDialog.showModal();
});

deleteDialog.addEventListener('close', async () => {
  if (deleteDialog.returnValue !== 'confirm') return;
  const slug = state.selectedSlug;
  try {
    const r = await fetch(`/api/photos/${slug}`, { method: 'DELETE' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    state.photos = state.photos.filter((p) => p.slug !== slug);
    closePanel();
    renderGrid();
    setupSortable();
    toast(`Borrada ${slug}.`);
    refreshPending();
  } catch (err) {
    toast(`Error al borrar: ${err.message}`, true);
  }
});

// ── Drag & drop ────────────────────────────────────────────────────────

let sortable = null;

function setupSortable() {
  if (sortable) sortable.destroy();
  // Sólo dejamos arrastrar si no hay filtros activos (el orden global es ambiguo
  // si lo cambias dentro de un subset).
  const ordering = state.filter === 'all' && !state.search.trim();
  if (!ordering) return;
  sortable = new Sortable(grid, {
    animation: 150,
    // Drag sólo desde el handle ⋮⋮, no desde la card completa. Eso evita
    // que SortableJS intercepte clicks normales que abren el panel.
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: async () => {
      const newOrder = $$('.card', grid).map((c) => c.dataset.slug);
      // actualizar memoria local: respeta nuevo orden y asigna order: i
      const map = new Map(state.photos.map((p) => [p.slug, p]));
      const reordered = newOrder.map((s) => map.get(s)).filter(Boolean);
      // Las que no están en el grid (fotos no visibles) van después, sin order.
      // Como ordering=true sólo cuando filter=all y sin búsqueda, en la práctica
      // newOrder == todas. Pero protegemos por si acaso.
      const rest = state.photos.filter((p) => !newOrder.includes(p.slug));
      state.photos = [...reordered, ...rest];
      state.photos.forEach((p, i) => {
        if (i < newOrder.length) p.data.order = i;
      });
      state.reorderDirty = true;
      renderGrid();
      // sin re-setupSortable: renderGrid ya reemplaza nodos
      setupSortable();
      try {
        const r = await fetch('/api/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugs: newOrder }),
        });
        if (!r.ok) throw new Error('Error al reordenar');
        toast('Orden guardado en disco. Pulsa "Publicar" para aplicarlo al sitio.');
        refreshPending();
      } catch (err) {
        toast(`Error al guardar orden: ${err.message}`, true);
      }
    },
  });
}

// ── Estado de cambios pendientes + countdown auto-publish ─────────────

let pollTimer = null;

async function refreshPending() {
  try {
    const r = await fetch('/api/status');
    const j = await r.json();
    const n = j.pendientes || 0;
    const a = j.auto || {};
    pendingEl.classList.remove('has', 'error', 'publishing');

    if (a.lastError) {
      pendingEl.textContent = `Error al publicar — pulsa para reintentar`;
      pendingEl.classList.add('error');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Reintentar';
    } else if (a.publishing) {
      pendingEl.textContent = 'Publicando al sitio…';
      pendingEl.classList.add('publishing');
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publicando…';
    } else if (n === 0) {
      const recent = a.lastPublishedAt && Date.now() - a.lastPublishedAt < 15_000;
      pendingEl.textContent = recent ? '✓ Publicado al sitio' : 'Sin cambios pendientes';
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publicar ahora';
    } else {
      const secs = a.nextAutoIn != null ? Math.ceil(a.nextAutoIn / 1000) : 30;
      pendingEl.textContent =
        `${n} cambio${n === 1 ? '' : 's'} · auto-publicar en ${secs}s`;
      pendingEl.classList.add('has');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publicar ahora';
    }
  } catch {}
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(refreshPending, 1500);
}

// ── Publicar (ahora — adelanta el auto-publish del batch) ─────────────

publishBtn.addEventListener('click', async () => {
  publishBtn.disabled = true;
  publishBtn.textContent = 'Publicando…';
  try {
    const r = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'manage: cambios desde el gestor' }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    toast(j.message || 'Publicado.');
    state.reorderDirty = false;
    refreshPending();
  } catch (err) {
    toast(`Error al publicar: ${err.message}`, true);
  }
});

// ── Toast ──────────────────────────────────────────────────────────────

let toastTimer = null;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  t.style.background = isError ? 'var(--danger)' : 'var(--text)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

// ── Carga inicial ──────────────────────────────────────────────────────

(async function init() {
  try {
    const r = await fetch('/api/photos');
    const j = await r.json();
    state.photos = j.photos;
    renderGrid();
    setupSortable();
    refreshPending();
    startPolling();
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);padding:20px">Error cargando fotos: ${err.message}</p>`;
  }
})();
