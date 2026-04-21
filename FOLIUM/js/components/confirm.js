/* FOLIUM v3 — components/confirm.js */

const Confirm = {
  show({ title = 'Tem certeza?', text = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm }) {
    // Remove any existing
    const old = document.getElementById('confirm-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'confirm-overlay';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box scale-in">
        <h3>${title}</h3>
        <p>${text}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" id="conf-cancel">${cancelLabel}</button>
          <button class="btn btn-danger" id="conf-ok">${confirmLabel}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#conf-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#conf-ok').addEventListener('click', () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    });

    // Click outside closes
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
};
