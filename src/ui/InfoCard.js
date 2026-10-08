// Slide-in card with everything about a place.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class InfoCard extends EventTarget {
  constructor(root, { categories }) {
    super();
    this.categories = categories;
    this.el = document.createElement('aside');
    this.el.className = 'panel info';
    this.el.setAttribute('aria-live', 'polite');
    root.appendChild(this.el);
    this.isOpen = false;
    this.current = null;
  }

  open(place, { first = false } = {}) {
    const cat = this.categories[place.category];
    this.current = place;
    this.el.innerHTML = `
      <button class="close-btn" type="button" aria-label="Close">✕</button>
      <div class="head">
        <div class="meta">
          <span class="chip" style="background:${cat.color}">${cat.icon} ${esc(cat.label)}</span>
          <span class="area">${esc(place.area || '')}</span>
        </div>
        <h2>${esc(place.name)}</h2>
        <div class="urdu">${esc(place.urdu || '')}</div>
        <p class="tagline">${esc(place.tagline || '')}</p>
      </div>
      <div class="scroll">
        ${place.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${place.facts?.length ? `<dl class="facts">${place.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
        ${place.didYouKnow ? `<div class="dyk"><strong>Did you know?</strong>${esc(place.didYouKnow)}</div>` : ''}
        <div class="stamp-row">${first ? '🎉 New stamp added to your passport!' : '✅ Stamp collected'}</div>
      </div>`;
    this.el.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.el.querySelector('.scroll').scrollTop = 0;
    requestAnimationFrame(() => this.el.classList.add('open'));
    this.isOpen = true;
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('open');
    this.isOpen = false;
    this.current = null;
    this.dispatchEvent(new Event('close'));
  }
}
