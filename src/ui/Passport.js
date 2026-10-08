// The passport: a stamp for every place, grouped by category.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Passport extends EventTarget {
  constructor(root, { categories, places }) {
    super();
    this.root = root;
    this.categories = categories;
    this.places = places;
    this.el = null;
  }

  get isOpen() {
    return !!this.el;
  }

  open(discovered) {
    if (this.el) return;
    const groups = Object.entries(this.categories).map(([id, cat]) => ({
      id,
      cat,
      items: this.places.filter((p) => p.category === id),
    }));
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <div class="panel">
        <button class="close-btn" type="button" aria-label="Close passport">✕</button>
        <div class="title-row">
          <h2>📕 Karachi Passport</h2>
          <span class="sub">${discovered.size} of ${this.places.length} stamps collected${discovered.size === this.places.length ? ' · Shabash! You have seen it all 🎉' : ''}</span>
        </div>
        <div class="passport-body">
          ${groups
            .map(
              (g) => `
            <section class="passport-cat">
              <h3><span class="chip" style="background:${g.cat.color}">${g.cat.icon}</span>${g.cat.label}
                <small>${g.items.filter((p) => discovered.has(p.id)).length}/${g.items.length}</small></h3>
              <div class="stamps">
                ${g.items
                  .map((p) => {
                    const got = discovered.has(p.id);
                    return `<div class="stamp ${got ? 'got' : 'locked'}" data-id="${p.id}" role="button" tabindex="0">
                      <div class="seal" style="background:${g.cat.color}">${got ? g.cat.icon : '?'}</div>
                      <strong>${got ? esc(p.name) : esc(p.name)}</strong>
                      ${got ? `<div class="urdu">${esc(p.urdu)}</div>` : `<small style="color:var(--ink-soft)">Find it in ${esc(p.area)}</small>`}
                      <button class="travel" type="button" data-travel="${p.id}">${got ? 'Read again' : 'Show on map'}</button>
                    </div>`;
                  })
                  .join('')}
              </div>
            </section>`,
            )
            .join('')}
        </div>
      </div>`;
    this.root.appendChild(this.el);
    this.el.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.querySelectorAll('.stamp').forEach((s) => {
      const id = s.dataset.id;
      const act = () => {
        const got = discovered.has(id);
        this.dispatchEvent(new CustomEvent(got ? 'read' : 'locate', { detail: { id } }));
      };
      s.addEventListener('click', act);
      s.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') act();
      });
    });
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    this.dispatchEvent(new Event('close'));
  }
}
