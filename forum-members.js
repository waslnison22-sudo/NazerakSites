(() => {
  'use strict';
  const state = { client: null, members: [] };
  const qs = (s, r = document) => r.querySelector(s);
  const escapeHtml = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const safeUrl = (v) => { try { const u = new URL(String(v || '')); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const msg = (m, k = 'info') => { const n = qs('[data-members-message]'); if (!n) return; n.textContent = m; n.dataset.kind = k; n.hidden = !m; };
  const load = async () => { if (!state.client) return; const r = await state.client.from('forum_author_directory').select('public_id,display_name,avatar_url,primary_role_name,topic_count,post_count').order('last_seen_at', { ascending: false }).limit(100); if (r.error) { msg('Ошибка загрузки участников', 'error'); return; } state.members = r.data || []; render(); };
  const render = () => { const root = qs('[data-members-list]'); const empty = qs('[data-members-empty]'); const count = qs('[data-members-count]'); if (!root || !empty) return; root.innerHTML = state.members.map(m => { const avatar = safeUrl(m.avatar_url); const av = avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : escapeHtml((m.display_name || 'N').slice(0, 1).toUpperCase()); return `<a href="./forum-user.html?id=${encodeURIComponent(m.public_id)}" class="forum-member-card" data-forum-user="${escapeHtml(m.public_id)}"><div class="forum-avatar">${av}</div><h3>${escapeHtml(m.display_name || 'Игрок')}</h3><small>${Number(m.topic_count || 0)} тем, ${Number(m.post_count || 0)} сообщений</small></a>`; }).join(''); const n = state.members.length; count.textContent = n === 1 ? '1 участник' : n + ' участников'; empty.hidden = n > 0; };
  const init = async () => { state.client = await (async () => { for (let i = 0; i < 100; i++) { if (window.NaZerakAuth?.client) return window.NaZerakAuth.client; await new Promise(r => setTimeout(r, 100)); } return null; })(); if (!state.client) { msg('Не удалось подключиться к форуму', 'error'); return; } await load(); };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => void init(), { once: true }); } else { void init(); }
})();
