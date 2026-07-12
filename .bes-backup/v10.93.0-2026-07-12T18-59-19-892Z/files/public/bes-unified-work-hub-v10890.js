(function bootstrapBESUnifiedWorkHub() {
  'use strict';

  var VERSION = '10.89.0';
  var ROUTE = '#/work-hub';
  var ROOT_ID = 'beswh-root';
  var CACHE_KEY = 'bes-work-hub-public-config-v10890';
  var PREF_KEY = 'bes-work-hub-prefs-v10890';
  var POLL_MS = 30000;

  var STATUS = {
    draft: 'Nháp',
    assigned: 'Đã giao',
    accepted: 'Đã tiếp nhận',
    in_progress: 'Đang thực hiện',
    submitted: 'Đã nộp',
    changes_requested: 'Cần chỉnh sửa',
    approved: 'Đã phê duyệt',
    completed: 'Hoàn thành',
    archived: 'Đã lưu trữ',
    cancelled: 'Đã huỷ'
  };

  var TYPE = {
    task: 'Nhiệm vụ',
    approval: 'Phê duyệt',
    meeting: 'Cuộc họp',
    document: 'Hồ sơ',
    reminder: 'Nhắc việc',
    announcement: 'Thông báo'
  };

  var PRIORITY = {
    low: 'Thấp',
    normal: 'Bình thường',
    high: 'Cao',
    urgent: 'Khẩn'
  };

  var state = {
    open: false,
    view: 'inbox',
    previousHash: '#/',
    adapter: null,
    adapterError: '',
    loading: false,
    saving: false,
    context: null,
    people: [],
    items: [],
    comments: [],
    activity: [],
    notifications: [],
    dashboard: {},
    selectedId: '',
    createOpen: false,
    filterStatus: 'active',
    filterPriority: 'all',
    search: '',
    refreshTimer: null,
    pollTimer: null,
    channel: null,
    navEntry: null,
    lastLoadedAt: 0
  };

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function uniq(values) {
    var out = [];
    (values || []).forEach(function (value) {
      if (value && out.indexOf(value) < 0) out.push(value);
    });
    return out;
  }

  function formatDate(value, withTime) {
    if (!value) return 'Chưa đặt';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: withTime ? '2-digit' : undefined,
        minute: withTime ? '2-digit' : undefined
      }).format(date);
    } catch (_) {
      return date.toLocaleString();
    }
  }

  function relativeDue(value, status) {
    if (!value) return { label: 'Không có hạn', tone: 'muted' };
    if (['approved', 'completed', 'archived', 'cancelled'].indexOf(status) >= 0) {
      return { label: formatDate(value, true), tone: 'muted' };
    }
    var diff = new Date(value).getTime() - Date.now();
    var hours = Math.round(Math.abs(diff) / 3600000);
    if (diff < 0) return { label: 'Quá hạn ' + (hours < 24 ? hours + ' giờ' : Math.ceil(hours / 24) + ' ngày'), tone: 'danger' };
    if (diff < 86400000) return { label: 'Còn ' + Math.max(1, hours) + ' giờ', tone: 'urgent' };
    if (diff < 259200000) return { label: 'Còn ' + Math.ceil(diff / 86400000) + ' ngày', tone: 'warn' };
    return { label: formatDate(value, true), tone: 'muted' };
  }

  function personName(id) {
    if (!id) return 'Chưa phân công';
    var person = state.people.find(function (entry) { return entry.user_id === id; });
    if (person) return person.display_name || person.email || id.slice(0, 8);
    if (state.context && state.context.user_id === id) return state.context.display_name || state.context.email || 'Tôi';
    return String(id).slice(0, 8);
  }

  function isLeader() {
    return !!(state.context && state.context.is_leader);
  }

  function currentUserId() {
    return state.context && state.context.user_id ? state.context.user_id : '';
  }

  function decodeJwt(token) {
    try {
      var part = String(token || '').split('.')[1];
      if (!part) return null;
      part = part.replace(/-/g, '+').replace(/_/g, '/');
      while (part.length % 4) part += '=';
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(part), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (_) { return null; }
  }

  function findSessionValue(value, depth, seen) {
    if (!value || depth > 8) return null;
    if (typeof value === 'string') {
      var parsed = safeParse(value, null);
      return parsed ? findSessionValue(parsed, depth + 1, seen) : null;
    }
    if (typeof value !== 'object') return null;
    if (seen.indexOf(value) >= 0) return null;
    seen.push(value);

    if (typeof value.access_token === 'string' && value.access_token.split('.').length === 3) {
      return {
        access_token: value.access_token,
        refresh_token: value.refresh_token || '',
        user: value.user || (value.session && value.session.user) || null
      };
    }

    var keys = ['currentSession', 'session', 'data', 'value', 'auth', 'persistedSession'];
    for (var i = 0; i < keys.length; i += 1) {
      if (value[keys[i]]) {
        var direct = findSessionValue(value[keys[i]], depth + 1, seen);
        if (direct) return direct;
      }
    }

    var names = Object.keys(value).slice(0, 80);
    for (var j = 0; j < names.length; j += 1) {
      var found = findSessionValue(value[names[j]], depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  function discoverSession() {
    var preferred = [];
    var fallback = [];
    try {
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var key = window.localStorage.key(i);
        if (!key) continue;
        if (/^sb-[a-z0-9-]+-auth-token$/i.test(key)) preferred.push(key);
        else if (/(auth|session|current.?user)/i.test(key)) fallback.push(key);
      }
      var keys = preferred.concat(fallback);
      for (var j = 0; j < keys.length; j += 1) {
        var raw = window.localStorage.getItem(keys[j]);
        if (!raw || raw.length > 2000000) continue;
        var session = findSessionValue(raw, 0, []);
        if (session) {
          session.storageKey = keys[j];
          var match = keys[j].match(/^sb-([a-z0-9-]+)-auth-token$/i);
          if (match) session.projectRef = match[1];
          return session;
        }
      }
    } catch (_) {}
    return null;
  }

  function isSupabaseClient(candidate) {
    return !!(candidate && typeof candidate.from === 'function' && candidate.auth && typeof candidate.auth.getSession === 'function');
  }

  function discoverClient() {
    var candidates = [
      window.supabaseClient,
      window.__supabaseClient,
      window.BES_SUPABASE,
      window.besSupabase,
      window.supabase,
      window.__SUPABASE__
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      if (isSupabaseClient(candidates[i])) return candidates[i];
      if (candidates[i] && isSupabaseClient(candidates[i].client)) return candidates[i].client;
    }
    return null;
  }

  function scanObjectForConfig(value, depth, seen, result) {
    if (!value || depth > 4 || typeof value !== 'object') return;
    if (seen.indexOf(value) >= 0) return;
    seen.push(value);
    Object.keys(value).slice(0, 100).forEach(function (key) {
      var item;
      try { item = value[key]; } catch (_) { return; }
      if (typeof item === 'string') {
        if (!result.url && /https:\/\/[a-z0-9-]+\.supabase\.co/i.test(item)) {
          result.url = item.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)[0];
        }
        if (!result.key && /^sb_publishable_/i.test(item)) result.key = item;
        if (!result.key && item.split('.').length === 3) {
          var payload = decodeJwt(item);
          if (payload && payload.role === 'anon') result.key = item;
        }
      } else if (item && typeof item === 'object') {
        scanObjectForConfig(item, depth + 1, seen, result);
      }
    });
  }

  async function discoverPublicConfig(session) {
    var cached = safeParse(safeGet(CACHE_KEY), null);
    if (cached && cached.url && cached.key && cached.savedAt && Date.now() - cached.savedAt < 604800000) {
      return cached;
    }

    var result = { url: '', key: '' };
    var known = [window.__ENV__, window.ENV, window.__APP_CONFIG__, window.BES_CONFIG, window.__VITE_ENV__];
    known.forEach(function (item) { scanObjectForConfig(item, 0, [], result); });

    if (!result.url && session && session.projectRef) {
      result.url = 'https://' + session.projectRef + '.supabase.co';
    }

    var scriptUrls = Array.prototype.map.call(document.scripts || [], function (script) { return script.src; })
      .filter(function (src) {
        if (!src) return false;
        try { return new URL(src, location.href).origin === location.origin; } catch (_) { return false; }
      })
      .slice(-14);

    for (var i = 0; i < scriptUrls.length && (!result.url || !result.key); i += 1) {
      try {
        var response = await fetch(scriptUrls[i], { credentials: 'same-origin', cache: 'force-cache' });
        if (!response.ok) continue;
        var text = await response.text();
        if (text.length > 10000000) continue;
        if (!result.url) {
          var urlMatch = text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/ig);
          if (urlMatch && urlMatch[0]) result.url = urlMatch[0];
        }
        if (!result.key) {
          var publishable = text.match(/sb_publishable_[A-Za-z0-9._-]{20,}/g);
          if (publishable && publishable[0]) result.key = publishable[0];
        }
        if (!result.key) {
          var tokens = text.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) || [];
          for (var t = 0; t < Math.min(tokens.length, 50); t += 1) {
            var payload = decodeJwt(tokens[t]);
            if (payload && payload.role === 'anon') {
              result.key = tokens[t];
              break;
            }
          }
        }
      } catch (_) {}
    }

    if (result.url && result.key) {
      result.savedAt = Date.now();
      safeSet(CACHE_KEY, JSON.stringify(result));
      return result;
    }
    return null;
  }

  function clientAdapter(client) {
    function unwrap(result) {
      if (result && result.error) throw result.error;
      return result ? result.data : null;
    }
    return {
      mode: 'client',
      client: client,
      async context() { return unwrap(await client.rpc('work_hub_my_context')); },
      async people() { return unwrap(await client.rpc('work_hub_people')) || []; },
      async dashboard() { return unwrap(await client.rpc('work_hub_dashboard')) || {}; },
      async items() {
        return unwrap(await client.from('work_hub_items').select('*').order('updated_at', { ascending: false }).limit(400)) || [];
      },
      async activity() {
        return unwrap(await client.from('work_hub_activity').select('*').order('created_at', { ascending: false }).limit(160)) || [];
      },
      async notifications(uid) {
        return unwrap(await client.from('work_hub_notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(120)) || [];
      },
      async comments(itemId) {
        return unwrap(await client.from('work_hub_comments').select('*').eq('item_id', itemId).order('created_at', { ascending: true }).limit(250)) || [];
      },
      async createItem(payload) {
        var data = unwrap(await client.from('work_hub_items').insert(payload).select('*').single());
        return data;
      },
      async updateItem(id, payload) {
        return unwrap(await client.from('work_hub_items').update(payload).eq('id', id).select('*').single());
      },
      async deleteItem(id) {
        unwrap(await client.from('work_hub_items').delete().eq('id', id));
        return true;
      },
      async transition(id, nextStatus, note) {
        return unwrap(await client.rpc('work_hub_transition_item', {
          target_item: id,
          next_status: nextStatus,
          transition_note: note || ''
        }));
      },
      async addComment(itemId, body, type) {
        return unwrap(await client.from('work_hub_comments').insert({
          item_id: itemId, body: body, comment_type: type || 'comment'
        }).select('*').single());
      },
      async markNotification(id) {
        return unwrap(await client.from('work_hub_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).select('*'));
      }
    };
  }

  function restAdapter(config, session) {
    var base = config.url.replace(/\/$/, '') + '/rest/v1/';
    var headers = {
      apikey: config.key,
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json'
    };

    async function request(path, options) {
      var response = await fetch(base + path, Object.assign({ headers: headers }, options || {}));
      var text = await response.text();
      var data = text ? safeParse(text, text) : null;
      if (!response.ok) {
        var message = data && (data.message || data.hint || data.details) ? [data.message, data.hint, data.details].filter(Boolean).join(' · ') : String(data || response.statusText);
        var error = new Error(message);
        error.status = response.status;
        error.payload = data;
        throw error;
      }
      return data;
    }

    function rpc(name, body) {
      return request('rpc/' + name, { method: 'POST', body: JSON.stringify(body || {}) });
    }

    return {
      mode: 'rest',
      config: config,
      session: session,
      context: function () { return rpc('work_hub_my_context'); },
      people: function () { return rpc('work_hub_people') || []; },
      dashboard: function () { return rpc('work_hub_dashboard') || {}; },
      items: function () { return request('work_hub_items?select=*&order=updated_at.desc&limit=400'); },
      activity: function () { return request('work_hub_activity?select=*&order=created_at.desc&limit=160'); },
      notifications: function (uid) { return request('work_hub_notifications?select=*&user_id=eq.' + encodeURIComponent(uid) + '&order=created_at.desc&limit=120'); },
      comments: function (itemId) { return request('work_hub_comments?select=*&item_id=eq.' + encodeURIComponent(itemId) + '&order=created_at.asc&limit=250'); },
      createItem: function (payload) {
        return request('work_hub_items', {
          method: 'POST',
          headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
          body: JSON.stringify(payload)
        }).then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
      },
      updateItem: function (id, payload) {
        return request('work_hub_items?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
          body: JSON.stringify(payload)
        }).then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
      },
      deleteItem: function (id) {
        return request('work_hub_items?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { return true; });
      },
      transition: function (id, nextStatus, note) {
        return rpc('work_hub_transition_item', {
          target_item: id,
          next_status: nextStatus,
          transition_note: note || ''
        });
      },
      addComment: function (itemId, body, type) {
        return request('work_hub_comments', {
          method: 'POST',
          headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
          body: JSON.stringify({ item_id: itemId, body: body, comment_type: type || 'comment' })
        }).then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
      },
      markNotification: function (id) {
        return request('work_hub_notifications?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
          body: JSON.stringify({ read_at: new Date().toISOString() })
        });
      }
    };
  }

  async function resolveAdapter() {
    if (state.adapter) return state.adapter;
    var client = discoverClient();
    if (client) {
      state.adapter = clientAdapter(client);
      return state.adapter;
    }
    var session = discoverSession();
    if (!session) throw new Error('Không tìm thấy phiên đăng nhập Supabase. Hãy đăng xuất và đăng nhập lại.');
    var config = await discoverPublicConfig(session);
    if (!config) throw new Error('Không tìm thấy Supabase URL hoặc public key trong runtime của ứng dụng.');
    state.adapter = restAdapter(config, session);
    return state.adapter;
  }

  function computeDashboard(items) {
    var now = Date.now();
    return (items || []).reduce(function (acc, item) {
      acc.total += 1;
      if (['assigned', 'accepted', 'in_progress', 'changes_requested'].indexOf(item.status) >= 0) acc.active += 1;
      if (item.status === 'submitted') acc.submitted += 1;
      if (['approved', 'completed'].indexOf(item.status) >= 0) acc.completed += 1;
      if (item.due_at && new Date(item.due_at).getTime() < now && ['approved', 'completed', 'archived', 'cancelled'].indexOf(item.status) < 0) acc.overdue += 1;
      if (item.due_at) {
        var diff = new Date(item.due_at).getTime() - now;
        if (diff >= 0 && diff < 259200000 && ['approved', 'completed', 'archived', 'cancelled'].indexOf(item.status) < 0) acc.due_soon += 1;
      }
      return acc;
    }, { total: 0, active: 0, submitted: 0, overdue: 0, due_soon: 0, completed: 0 });
  }

  async function loadAll(silent) {
    if (state.loading) return;
    state.loading = true;
    if (!silent) state.adapterError = '';
    render();
    try {
      var adapter = await resolveAdapter();
      var context = await adapter.context();
      if (!context || context.authenticated === false) throw new Error('Phiên đăng nhập không hợp lệ.');
      state.context = context;
      var results = await Promise.all([
        adapter.people().catch(function () { return []; }),
        adapter.items(),
        adapter.activity().catch(function () { return []; }),
        adapter.notifications(context.user_id).catch(function () { return []; }),
        adapter.dashboard().catch(function () { return null; })
      ]);
      state.people = Array.isArray(results[0]) ? results[0] : [];
      state.items = Array.isArray(results[1]) ? results[1] : [];
      state.activity = Array.isArray(results[2]) ? results[2] : [];
      state.notifications = Array.isArray(results[3]) ? results[3] : [];
      state.dashboard = results[4] && typeof results[4] === 'object' ? results[4] : computeDashboard(state.items);
      state.lastLoadedAt = Date.now();
      state.adapterError = '';
      refreshNavBadge();
      setupRealtime();
      if (state.selectedId && !state.items.some(function (item) { return item.id === state.selectedId; })) {
        state.selectedId = '';
        state.comments = [];
      }
    } catch (error) {
      state.adapterError = error && error.message ? error.message : String(error);
      if (/work_hub_|relation .* does not exist|function .* does not exist/i.test(state.adapterError)) {
        state.adapterError = 'Chưa chạy migration Supabase V10.89.0 hoặc schema chưa được tải lại. Chạy supabase/work_hub_v10_89_0.sql trong SQL Editor, sau đó đăng nhập lại.';
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  function scheduleRefresh() {
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(function () { loadAll(true); }, 450);
  }

  function setupRealtime() {
    if (state.channel || !state.adapter || state.adapter.mode !== 'client') return;
    var client = state.adapter.client;
    if (!client || typeof client.channel !== 'function') {
      startPolling();
      return;
    }
    try {
      state.channel = client.channel('bes-work-hub-v10890')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_hub_items' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_hub_comments' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_hub_notifications' }, scheduleRefresh)
        .subscribe();
    } catch (_) {
      state.channel = null;
      startPolling();
    }
  }

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(function () {
      if (state.open && !document.hidden) loadAll(true);
    }, POLL_MS);
  }

  function selectedItem() {
    return state.items.find(function (item) { return item.id === state.selectedId; }) || null;
  }

  function itemMatches(item) {
    var text = normalize([item.title, item.description, TYPE[item.item_type], STATUS[item.status], personName(item.owner_id)].join(' '));
    if (state.search && text.indexOf(normalize(state.search)) < 0) return false;
    if (state.filterPriority !== 'all' && item.priority !== state.filterPriority) return false;
    if (state.filterStatus === 'active' && ['draft', 'assigned', 'accepted', 'in_progress', 'submitted', 'changes_requested'].indexOf(item.status) < 0) return false;
    if (state.filterStatus !== 'all' && state.filterStatus !== 'active' && item.status !== state.filterStatus) return false;
    return true;
  }

  function filteredItems() {
    return state.items.filter(itemMatches);
  }

  function statusBadge(status) {
    return '<span class="beswh-badge" data-status="' + escapeHtml(status) + '">' + escapeHtml(STATUS[status] || status) + '</span>';
  }

  function priorityBadge(priority) {
    return '<span class="beswh-priority" data-priority="' + escapeHtml(priority) + '">' + escapeHtml(PRIORITY[priority] || priority) + '</span>';
  }

  function statCard(label, value, note, tone) {
    return '<article class="beswh-stat" data-tone="' + escapeHtml(tone || 'info') + '">' +
      '<span class="beswh-stat-label">' + escapeHtml(label) + '</span>' +
      '<strong class="beswh-stat-value">' + escapeHtml(value) + '</strong>' +
      '<small class="beswh-stat-note">' + escapeHtml(note || '') + '</small>' +
    '</article>';
  }

  function renderHeader() {
    var name = state.context ? (state.context.display_name || state.context.email || 'Người dùng') : 'Đang kết nối';
    var unread = state.notifications.filter(function (n) { return !n.read_at; }).length;
    return '<header class="beswh-header">' +
      '<div class="beswh-brand"><span class="beswh-brand-mark">WH</span><div><h1>Trung tâm công việc</h1><p>V10.89 · Nhiệm vụ, lịch, phê duyệt và phản hồi trong một nơi</p></div></div>' +
      '<div class="beswh-header-meta"><span class="beswh-live" data-online="' + (navigator.onLine ? 'true' : 'false') + '"><i></i>' + (navigator.onLine ? 'Đồng bộ' : 'Ngoại tuyến') + '</span>' +
      '<span class="beswh-user">' + escapeHtml(name) + (unread ? '<b>' + unread + '</b>' : '') + '</span>' +
      '<button type="button" class="beswh-icon-btn" data-action="refresh" aria-label="Làm mới">↻</button>' +
      '<button type="button" class="beswh-icon-btn" data-action="close" aria-label="Đóng">×</button></div>' +
    '</header>';
  }

  function renderSidebar() {
    var unread = state.notifications.filter(function (n) { return !n.read_at; }).length;
    var tabs = [
      ['inbox', '⌂', 'Hộp việc', unread],
      ['board', '▦', 'Bảng tiến độ', ''],
      ['calendar', '◷', 'Lịch 14 ngày', ''],
      ['approvals', '✓', 'Chờ phê duyệt', state.items.filter(function (i) { return i.status === 'submitted'; }).length],
      ['activity', '≋', 'Nhật ký', '']
    ];
    return '<aside class="beswh-sidebar"><div class="beswh-sidebar-label">Không gian làm việc</div><nav>' +
      tabs.filter(function (tab) { return tab[0] !== 'approvals' || isLeader(); }).map(function (tab) {
        return '<button type="button" class="beswh-tab" data-view="' + tab[0] + '" data-active="' + (state.view === tab[0]) + '">' +
          '<span>' + tab[1] + '</span><b>' + tab[2] + '</b>' + (tab[3] !== '' ? '<i>' + tab[3] + '</i>' : '') + '</button>';
      }).join('') + '</nav>' +
      '<div class="beswh-side-card"><strong>' + (isLeader() ? 'Chế độ Admin/TTCM' : 'Không gian giáo viên') + '</strong><p>' +
      (isLeader() ? 'Theo dõi toàn tổ, duyệt sản phẩm và phân công công việc.' : 'Chỉ hiển thị công việc liên quan đến tài khoản của thầy/cô.') +
      '</p></div>' +
      '<button type="button" class="beswh-create-side" data-action="create">＋ Tạo công việc</button>' +
    '</aside>';
  }

  function renderToolbar(title, description) {
    return '<div class="beswh-page-head"><div><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(description) + '</p></div>' +
      '<div class="beswh-toolbar"><label class="beswh-search"><span>⌕</span><input data-field="search" value="' + escapeHtml(state.search) + '" placeholder="Tìm công việc..."></label>' +
      '<select data-field="status"><option value="active"' + (state.filterStatus === 'active' ? ' selected' : '') + '>Đang xử lý</option><option value="all"' + (state.filterStatus === 'all' ? ' selected' : '') + '>Tất cả trạng thái</option>' +
      Object.keys(STATUS).map(function (key) { return '<option value="' + key + '"' + (state.filterStatus === key ? ' selected' : '') + '>' + STATUS[key] + '</option>'; }).join('') + '</select>' +
      '<select data-field="priority"><option value="all">Mọi ưu tiên</option>' + Object.keys(PRIORITY).map(function (key) { return '<option value="' + key + '"' + (state.filterPriority === key ? ' selected' : '') + '>' + PRIORITY[key] + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="beswh-button" data-variant="primary" data-action="create">＋ Tạo mới</button></div></div>';
  }

  function renderItemCard(item, compact) {
    var due = relativeDue(item.due_at, item.status);
    var assignees = (item.assignee_ids || []).slice(0, 3).map(personName);
    return '<article class="beswh-item-card" data-item-id="' + escapeHtml(item.id) + '" data-selected="' + (state.selectedId === item.id) + '">' +
      '<div class="beswh-item-top"><span class="beswh-type">' + escapeHtml(TYPE[item.item_type] || item.item_type) + '</span>' + priorityBadge(item.priority) + '</div>' +
      '<h3>' + escapeHtml(item.title) + '</h3>' +
      (!compact && item.description ? '<p>' + escapeHtml(item.description.slice(0, 180)) + (item.description.length > 180 ? '…' : '') + '</p>' : '') +
      '<div class="beswh-item-meta">' + statusBadge(item.status) + '<span class="beswh-due" data-tone="' + due.tone + '">◷ ' + escapeHtml(due.label) + '</span></div>' +
      '<div class="beswh-item-footer"><span>Phụ trách: ' + escapeHtml(assignees.length ? assignees.join(', ') : personName(item.owner_id)) + '</span><button type="button" data-action="open-item" data-id="' + escapeHtml(item.id) + '">Mở</button></div>' +
    '</article>';
  }

  function renderNotifications() {
    var notices = state.notifications.slice(0, 6);
    if (!notices.length) return '<div class="beswh-empty compact">Không có thông báo công việc mới.</div>';
    return '<div class="beswh-notice-list">' + notices.map(function (notice) {
      return '<button type="button" class="beswh-notice" data-action="open-notification" data-id="' + notice.id + '" data-item-id="' + escapeHtml(notice.item_id || '') + '" data-unread="' + (!notice.read_at) + '">' +
        '<span class="beswh-notice-dot"></span><span><strong>' + escapeHtml(notice.title) + '</strong><small>' + escapeHtml(notice.body || '') + '</small></span><time>' + escapeHtml(formatDate(notice.created_at, true)) + '</time></button>';
    }).join('') + '</div>';
  }

  function renderInbox() {
    var items = filteredItems();
    var mine = items.filter(function (item) {
      var uid = currentUserId();
      return item.owner_id === uid || item.created_by === uid || (item.assignee_ids || []).indexOf(uid) >= 0;
    });
    return renderToolbar('Hộp việc cần xử lý', 'Ưu tiên công việc quá hạn, sắp đến hạn và đang chờ phản hồi.') +
      '<section class="beswh-stats">' +
        statCard('Đang xử lý', state.dashboard.active || 0, 'Đã giao, đang làm hoặc cần sửa', 'info') +
        statCard('Chờ duyệt', state.dashboard.submitted || 0, isLeader() ? 'Sản phẩm giáo viên đã nộp' : 'Sản phẩm đã gửi TTCM', 'warn') +
        statCard('Quá hạn', state.dashboard.overdue || 0, 'Cần ưu tiên xử lý', state.dashboard.overdue ? 'danger' : 'good') +
        statCard('Hoàn thành', state.dashboard.completed || 0, 'Đã duyệt hoặc kết thúc', 'good') +
      '</section>' +
      '<div class="beswh-two-col"><section class="beswh-section"><div class="beswh-section-head"><h3>Việc của tôi</h3><span>' + mine.length + ' mục</span></div>' +
        (mine.length ? '<div class="beswh-list">' + mine.slice(0, 12).map(function (item) { return renderItemCard(item, false); }).join('') + '</div>' : '<div class="beswh-empty">Chưa có công việc phù hợp với bộ lọc.</div>') +
      '</section><section class="beswh-section"><div class="beswh-section-head"><h3>Thông báo gần đây</h3><span>' + state.notifications.filter(function (n) { return !n.read_at; }).length + ' chưa đọc</span></div>' + renderNotifications() + '</section></div>';
  }

  function renderBoard() {
    var columns = ['assigned', 'accepted', 'in_progress', 'submitted', 'changes_requested', 'approved'];
    var items = filteredItems();
    return renderToolbar('Bảng tiến độ', 'Quan sát toàn bộ chu trình từ giao việc đến phê duyệt.') +
      '<div class="beswh-board">' + columns.map(function (status) {
        var group = items.filter(function (item) { return item.status === status; });
        return '<section class="beswh-column" data-status="' + status + '"><header><span>' + STATUS[status] + '</span><b>' + group.length + '</b></header><div>' +
          (group.length ? group.map(function (item) { return renderItemCard(item, true); }).join('') : '<div class="beswh-column-empty">Chưa có mục</div>') +
        '</div></section>';
      }).join('') + '</div>';
  }

  function renderCalendar() {
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var end = new Date(start.getTime() + 14 * 86400000);
    var items = filteredItems().filter(function (item) {
      if (!item.due_at && !item.start_at) return false;
      var time = new Date(item.due_at || item.start_at).getTime();
      return time >= start.getTime() && time < end.getTime();
    }).sort(function (a, b) { return new Date(a.due_at || a.start_at) - new Date(b.due_at || b.start_at); });
    var byDay = {};
    items.forEach(function (item) {
      var date = new Date(item.due_at || item.start_at);
      var key = date.toISOString().slice(0, 10);
      (byDay[key] || (byDay[key] = [])).push(item);
    });
    return renderToolbar('Lịch công việc 14 ngày', 'Các mốc bắt đầu, hạn nộp, cuộc họp và lịch cần theo dõi.') +
      '<div class="beswh-calendar">' + Array.from({ length: 14 }).map(function (_, index) {
        var date = new Date(start.getTime() + index * 86400000);
        var key = date.toISOString().slice(0, 10);
        var dayItems = byDay[key] || [];
        return '<section class="beswh-day" data-today="' + (index === 0) + '"><header><strong>' + date.toLocaleDateString('vi-VN', { weekday: 'short' }) + '</strong><span>' + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + '</span></header><div>' +
          (dayItems.length ? dayItems.map(function (item) {
            return '<button type="button" class="beswh-calendar-item" data-action="open-item" data-id="' + item.id + '" data-priority="' + item.priority + '"><time>' + new Date(item.due_at || item.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + '</time><span>' + escapeHtml(item.title) + '</span></button>';
          }).join('') : '<small>Trống</small>') + '</div></section>';
      }).join('') + '</div>';
  }

  function renderApprovals() {
    var submitted = filteredItems().filter(function (item) { return item.status === 'submitted'; });
    return renderToolbar('Hàng chờ phê duyệt', 'Duyệt, yêu cầu chỉnh sửa hoặc hoàn tất sản phẩm giáo viên đã nộp.') +
      '<section class="beswh-approval-grid">' + (submitted.length ? submitted.map(function (item) {
        var due = relativeDue(item.due_at, item.status);
        return '<article class="beswh-approval"><div><span class="beswh-type">' + escapeHtml(TYPE[item.item_type] || item.item_type) + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description || 'Không có mô tả.') + '</p><small>Người nộp: ' + escapeHtml(personName((item.assignee_ids || [])[0] || item.owner_id)) + ' · ' + escapeHtml(due.label) + '</small></div>' +
          '<div class="beswh-approval-actions"><button type="button" class="beswh-button" data-action="transition" data-id="' + item.id + '" data-status="changes_requested">Yêu cầu sửa</button><button type="button" class="beswh-button" data-variant="primary" data-action="transition" data-id="' + item.id + '" data-status="approved">Phê duyệt</button><button type="button" class="beswh-button" data-action="open-item" data-id="' + item.id + '">Chi tiết</button></div></article>';
      }).join('') : '<div class="beswh-empty">Không có sản phẩm đang chờ phê duyệt.</div>') + '</section>';
  }

  function renderActivity() {
    return '<div class="beswh-page-head"><div><h2>Nhật ký hoạt động</h2><p>Lịch sử thay đổi trạng thái, phản hồi và cập nhật trong phạm vi thầy/cô được phép xem.</p></div><button type="button" class="beswh-button" data-action="refresh">Làm mới</button></div>' +
      '<div class="beswh-timeline">' + (state.activity.length ? state.activity.map(function (entry) {
        return '<article><i></i><div><strong>' + escapeHtml(entry.message || entry.event_type) + '</strong><p>' + escapeHtml(personName(entry.actor_id)) + (entry.from_status || entry.to_status ? ' · ' + escapeHtml((entry.from_status ? STATUS[entry.from_status] : '') + (entry.to_status ? ' → ' + STATUS[entry.to_status] : '')) : '') + '</p><time>' + escapeHtml(formatDate(entry.created_at, true)) + '</time></div><button type="button" data-action="open-item" data-id="' + escapeHtml(entry.item_id) + '">Mở</button></article>';
      }).join('') : '<div class="beswh-empty">Chưa có hoạt động nào.</div>') + '</div>';
  }

  function transitionButtons(item) {
    if (!item || !state.context) return '';
    var uid = currentUserId();
    var leader = isLeader();
    var owner = item.owner_id === uid || item.created_by === uid;
    var assignee = (item.assignee_ids || []).indexOf(uid) >= 0;
    var actions = [];
    if (leader || owner) {
      if (item.status === 'draft') actions.push(['assigned', 'Giao việc']);
      if (item.status === 'submitted') actions.push(['changes_requested', 'Yêu cầu sửa'], ['approved', 'Phê duyệt']);
      if (['approved', 'in_progress', 'assigned'].indexOf(item.status) >= 0) actions.push(['completed', 'Hoàn thành']);
      if (item.status !== 'archived') actions.push(['archived', 'Lưu trữ']);
    }
    if (assignee && item.status === 'assigned') actions.push(['accepted', 'Tiếp nhận'], ['in_progress', 'Bắt đầu']);
    if (assignee && ['accepted', 'changes_requested'].indexOf(item.status) >= 0) actions.push(['in_progress', 'Tiếp tục']);
    if (assignee && ['assigned', 'accepted', 'in_progress', 'changes_requested'].indexOf(item.status) >= 0) actions.push(['submitted', 'Nộp sản phẩm']);
    return actions.map(function (action) {
      return '<button type="button" class="beswh-button" data-variant="' + (action[0] === 'approved' || action[0] === 'submitted' ? 'primary' : 'default') + '" data-action="transition" data-id="' + item.id + '" data-status="' + action[0] + '">' + action[1] + '</button>';
    }).join('');
  }

  function renderDetail() {
    var item = selectedItem();
    if (!item) return '';
    var due = relativeDue(item.due_at, item.status);
    return '<div class="beswh-drawer-backdrop" data-action="close-item"></div><aside class="beswh-drawer"><header><div><span>' + escapeHtml(TYPE[item.item_type] || item.item_type) + '</span><h2>' + escapeHtml(item.title) + '</h2></div><button type="button" class="beswh-icon-btn dark" data-action="close-item">×</button></header>' +
      '<div class="beswh-drawer-scroll"><section class="beswh-detail-summary"><div>' + statusBadge(item.status) + priorityBadge(item.priority) + '</div><p>' + escapeHtml(item.description || 'Không có mô tả.') + '</p><dl><div><dt>Người phụ trách</dt><dd>' + escapeHtml(personName(item.owner_id)) + '</dd></div><div><dt>Người thực hiện</dt><dd>' + escapeHtml((item.assignee_ids || []).map(personName).join(', ') || 'Chưa phân công') + '</dd></div><div><dt>Hạn hoàn thành</dt><dd data-tone="' + due.tone + '">' + escapeHtml(due.label) + '</dd></div><div><dt>Ngày tạo</dt><dd>' + escapeHtml(formatDate(item.created_at, true)) + '</dd></div></dl></section>' +
      '<section class="beswh-detail-actions"><h3>Thao tác quy trình</h3><div>' + transitionButtons(item) + (isLeader() || item.created_by === currentUserId() ? '<button type="button" class="beswh-button" data-action="edit-item" data-id="' + item.id + '">Chỉnh sửa</button>' : '') + '</div></section>' +
      '<section class="beswh-comments"><div class="beswh-section-head"><h3>Trao đổi & phản hồi</h3><span>' + state.comments.length + ' phản hồi</span></div><div class="beswh-comment-list">' +
        (state.comments.length ? state.comments.map(function (comment) {
          return '<article data-type="' + escapeHtml(comment.comment_type) + '"><strong>' + escapeHtml(personName(comment.author_id)) + '</strong><p>' + escapeHtml(comment.body) + '</p><time>' + escapeHtml(formatDate(comment.created_at, true)) + '</time></article>';
        }).join('') : '<div class="beswh-empty compact">Chưa có phản hồi.</div>') + '</div>' +
        '<form class="beswh-comment-form" data-form="comment"><textarea name="body" rows="3" placeholder="Nhập phản hồi hoặc ghi chú..."></textarea><button type="submit" class="beswh-button" data-variant="primary">Gửi phản hồi</button></form></section></div></aside>';
  }

  function personOptions(selected) {
    var availablePeople = isLeader() ? state.people : state.people.filter(function (person) { return person.user_id === currentUserId(); });
    return availablePeople.map(function (person) {
      return '<option value="' + escapeHtml(person.user_id) + '"' + (selected === person.user_id ? ' selected' : '') + '>' + escapeHtml((person.display_name || person.email) + (person.role ? ' · ' + person.role : '')) + '</option>';
    }).join('');
  }

  function renderCreateModal() {
    if (!state.createOpen) return '';
    var edit = selectedItem();
    var editing = !!(edit && edit.__editing);
    var item = editing ? edit : null;
    var assignee = item && item.assignee_ids && item.assignee_ids[0] ? item.assignee_ids[0] : '';
    return '<div class="beswh-modal-backdrop" data-action="close-create"></div><section class="beswh-modal"><header><div><span>' + (editing ? 'Chỉnh sửa' : 'Tạo mới') + '</span><h2>' + (editing ? escapeHtml(item.title) : 'Công việc mới') + '</h2></div><button type="button" class="beswh-icon-btn dark" data-action="close-create">×</button></header>' +
      '<form data-form="item"><div class="beswh-form-grid"><label class="span-2"><span>Tiêu đề</span><input name="title" required maxlength="220" value="' + escapeHtml(item ? item.title : '') + '" placeholder="Ví dụ: Nộp kế hoạch ôn thi THPT"></label>' +
      '<label><span>Loại công việc</span><select name="item_type">' + Object.keys(TYPE).map(function (key) { return '<option value="' + key + '"' + (item && item.item_type === key ? ' selected' : '') + '>' + TYPE[key] + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Mức ưu tiên</span><select name="priority">' + Object.keys(PRIORITY).map(function (key) { return '<option value="' + key + '"' + ((item ? item.priority : 'normal') === key ? ' selected' : '') + '>' + PRIORITY[key] + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Người thực hiện</span><select name="assignee_id"><option value="">Chưa phân công</option>' + personOptions(assignee) + '</select></label>' +
      '<label><span>Hạn hoàn thành</span><input name="due_at" type="datetime-local" value="' + escapeHtml(item && item.due_at ? new Date(new Date(item.due_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '') + '"></label>' +
      '<label><span>Trạng thái ban đầu</span><select name="status"><option value="draft"' + (!item || item.status === 'draft' ? ' selected' : '') + '>Nháp</option><option value="assigned"' + (item && item.status === 'assigned' ? ' selected' : '') + '>Đã giao</option></select></label>' +
      '<label><span>Phạm vi</span><select name="visibility"><option value="restricted"' + (!item || item.visibility === 'restricted' ? ' selected' : '') + '>Người liên quan</option><option value="private"' + (item && item.visibility === 'private' ? ' selected' : '') + '>Cá nhân</option>' + (isLeader() ? '<option value="department"' + (item && item.visibility === 'department' ? ' selected' : '') + '>Toàn tổ</option>' : '') + '</select></label>' +
      '<label class="span-2"><span>Mô tả</span><textarea name="description" rows="5" maxlength="6000" placeholder="Yêu cầu, tiêu chí hoàn thành và thông tin cần thiết...">' + escapeHtml(item ? item.description : '') + '</textarea></label></div>' +
      '<footer><button type="button" class="beswh-button" data-action="close-create">Huỷ</button><button type="submit" class="beswh-button" data-variant="primary"' + (state.saving ? ' disabled' : '') + '>' + (state.saving ? 'Đang lưu...' : (editing ? 'Lưu thay đổi' : 'Tạo công việc')) + '</button></footer></form></section>';
  }

  function renderError() {
    return '<div class="beswh-error"><span>!</span><div><h2>Chưa thể kết nối Trung tâm công việc</h2><p>' + escapeHtml(state.adapterError) + '</p><ol><li>Chạy toàn bộ file <code>supabase/work_hub_v10_89_0.sql</code> trong Supabase SQL Editor.</li><li>Đăng xuất và đăng nhập lại để làm mới session.</li><li>Tải lại trang bằng Command + Shift + R.</li></ol><button type="button" class="beswh-button" data-variant="primary" data-action="refresh">Thử lại</button></div></div>';
  }

  function renderMain() {
    if (state.loading && !state.context) return '<div class="beswh-loading"><i></i><strong>Đang đồng bộ Trung tâm công việc...</strong><span>Đang đọc quyền, nhiệm vụ và thông báo.</span></div>';
    if (state.adapterError) return renderError();
    if (state.view === 'board') return renderBoard();
    if (state.view === 'calendar') return renderCalendar();
    if (state.view === 'approvals' && isLeader()) return renderApprovals();
    if (state.view === 'activity') return renderActivity();
    return renderInbox();
  }

  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.setAttribute('data-open', String(state.open));
    if (!state.open) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = '<div class="beswh-shell">' + renderHeader() + renderSidebar() + '<main class="beswh-main">' + renderMain() + '</main></div>' + renderDetail() + renderCreateModal() + '<div class="beswh-toast-host" id="beswh-toast-host"></div>';
  }

  function toast(message, tone) {
    var host = document.getElementById('beswh-toast-host');
    if (!host) return;
    var node = document.createElement('div');
    node.className = 'beswh-toast';
    node.setAttribute('data-tone', tone || 'info');
    node.textContent = message;
    host.appendChild(node);
    requestAnimationFrame(function () { node.setAttribute('data-show', 'true'); });
    setTimeout(function () {
      node.setAttribute('data-show', 'false');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 250);
    }, 3200);
  }

  async function openItem(id) {
    state.selectedId = id;
    state.comments = [];
    render();
    try {
      var adapter = await resolveAdapter();
      state.comments = await adapter.comments(id);
    } catch (error) {
      toast(error.message || String(error), 'danger');
    }
    render();
  }

  async function transitionItem(id, status) {
    var labels = { approved: 'Ghi chú phê duyệt (không bắt buộc):', changes_requested: 'Nội dung cần chỉnh sửa:', submitted: 'Ghi chú khi nộp (không bắt buộc):' };
    var note = '';
    if (labels[status]) {
      note = window.prompt(labels[status], '') || '';
      if (status === 'changes_requested' && !note.trim()) {
        toast('Cần nhập nội dung yêu cầu chỉnh sửa.', 'warn');
        return;
      }
    }
    try {
      state.saving = true;
      render();
      var adapter = await resolveAdapter();
      await adapter.transition(id, status, note);
      toast('Đã chuyển trạng thái sang “' + (STATUS[status] || status) + '”.', 'good');
      await loadAll(true);
      if (state.selectedId === id) await openItem(id);
    } catch (error) {
      toast(error.message || String(error), 'danger');
    } finally {
      state.saving = false;
      render();
    }
  }

  async function submitItemForm(form) {
    var fd = new FormData(form);
    var title = String(fd.get('title') || '').trim();
    if (!title) {
      toast('Vui lòng nhập tiêu đề.', 'warn');
      return;
    }
    var assignee = String(fd.get('assignee_id') || '');
    var dueRaw = String(fd.get('due_at') || '');
    var payload = {
      title: title,
      description: String(fd.get('description') || '').trim(),
      item_type: String(fd.get('item_type') || 'task'),
      priority: String(fd.get('priority') || 'normal'),
      status: String(fd.get('status') || 'draft'),
      visibility: String(fd.get('visibility') || 'restricted'),
      due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
      assignee_ids: assignee ? [assignee] : [],
      owner_id: currentUserId()
    };
    var item = selectedItem();
    var editing = !!(item && item.__editing);
    try {
      state.saving = true;
      render();
      var adapter = await resolveAdapter();
      if (editing) {
        delete item.__editing;
        await adapter.updateItem(item.id, payload);
        toast('Đã lưu thay đổi.', 'good');
      } else {
        await adapter.createItem(payload);
        toast('Đã tạo công việc mới.', 'good');
      }
      state.createOpen = false;
      await loadAll(true);
    } catch (error) {
      toast(error.message || String(error), 'danger');
    } finally {
      state.saving = false;
      render();
    }
  }

  async function submitComment(form) {
    var textarea = form.querySelector('[name="body"]');
    var body = textarea ? textarea.value.trim() : '';
    if (!body || !state.selectedId) return;
    try {
      var adapter = await resolveAdapter();
      await adapter.addComment(state.selectedId, body, 'comment');
      textarea.value = '';
      state.comments = await adapter.comments(state.selectedId);
      toast('Đã gửi phản hồi.', 'good');
      render();
    } catch (error) {
      toast(error.message || String(error), 'danger');
    }
  }

  function handleClick(event) {
    var target = event.target.closest('[data-action], [data-view], [data-item-id]');
    if (!target) return;
    var view = target.getAttribute('data-view');
    if (view) {
      state.view = view;
      var prefs = safeParse(safeGet(PREF_KEY), {});
      prefs.view = view;
      safeSet(PREF_KEY, JSON.stringify(prefs));
      render();
      return;
    }
    var action = target.getAttribute('data-action');
    if (!action && target.getAttribute('data-item-id')) action = 'open-item';
    if (action === 'close') close();
    else if (action === 'refresh') loadAll(false);
    else if (action === 'create') { state.createOpen = true; render(); }
    else if (action === 'close-create') {
      var edit = selectedItem();
      if (edit) delete edit.__editing;
      state.createOpen = false;
      render();
    }
    else if (action === 'open-item') openItem(target.getAttribute('data-id') || target.getAttribute('data-item-id'));
    else if (action === 'close-item') { state.selectedId = ''; state.comments = []; render(); }
    else if (action === 'transition') transitionItem(target.getAttribute('data-id'), target.getAttribute('data-status'));
    else if (action === 'edit-item') {
      var item = selectedItem();
      if (item) item.__editing = true;
      state.createOpen = true;
      render();
    }
    else if (action === 'open-notification') {
      var notificationId = target.getAttribute('data-id');
      var itemId = target.getAttribute('data-item-id');
      resolveAdapter().then(function (adapter) { return adapter.markNotification(notificationId); }).catch(function () {});
      var notice = state.notifications.find(function (n) { return String(n.id) === String(notificationId); });
      if (notice) notice.read_at = new Date().toISOString();
      refreshNavBadge();
      if (itemId) openItem(itemId); else render();
    }
  }

  function handleInput(event) {
    var field = event.target.getAttribute('data-field');
    if (field === 'search') {
      state.search = event.target.value;
      render();
      var input = document.querySelector('#' + ROOT_ID + ' [data-field="search"]');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }
  }

  function handleChange(event) {
    var field = event.target.getAttribute('data-field');
    if (field === 'status') { state.filterStatus = event.target.value; render(); }
    if (field === 'priority') { state.filterPriority = event.target.value; render(); }
  }

  function handleSubmit(event) {
    var formType = event.target.getAttribute('data-form');
    if (!formType) return;
    event.preventDefault();
    if (formType === 'item') submitItemForm(event.target);
    if (formType === 'comment') submitComment(event.target);
  }

  function refreshNavBadge() {
    if (!state.navEntry) return;
    var unread = state.notifications.filter(function (n) { return !n.read_at; }).length;
    var badge = state.navEntry.querySelector('.beswh-nav-badge');
    if (badge) {
      badge.textContent = String(unread);
      badge.hidden = unread === 0;
    }
  }

  function addTopNavEntry() {
    if (state.navEntry || document.querySelector('[data-bes-work-hub-nav]')) return;
    var candidates = Array.prototype.slice.call(document.querySelectorAll('a[href="#/department"], a[href*="#/department"], button, a'));
    var anchor = candidates.find(function (node) {
      var text = normalize(node.textContent);
      return node.getAttribute('href') && node.getAttribute('href').indexOf('#/department') >= 0 || text.indexOf('to chuyen mon') >= 0;
    });
    if (!anchor || !anchor.parentNode) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'beswh-nav-entry';
    button.setAttribute('data-bes-work-hub-nav', 'true');
    button.innerHTML = '<span>✓</span><b>Công việc</b><i class="beswh-nav-badge" hidden>0</i>';
    button.addEventListener('click', function () {
      window.location.hash = '/work-hub';
      open();
    });
    anchor.parentNode.insertBefore(button, anchor.nextSibling);
    state.navEntry = button;
    refreshNavBadge();
  }

  function integrateCommandCenter() {
    function register() {
      if (!window.BES_COMMAND_CENTER || typeof window.BES_COMMAND_CENTER.addRoute !== 'function') return false;
      window.BES_COMMAND_CENTER.addRoute({
        id: 'work-hub',
        label: 'Trung tâm công việc',
        route: ROUTE,
        group: 'Chuyên môn',
        icon: 'WH',
        keywords: 'work hub task nhiệm vụ lịch phê duyệt thông báo công việc TTCM giáo viên'
      });
      return true;
    }
    if (!register()) {
      window.addEventListener('bes-command-center-ready', register, { once: true });
      setTimeout(register, 1600);
    }
  }

  function open() {
    if (state.open) return;
    if (window.location.hash !== ROUTE) state.previousHash = window.location.hash || '#/';
    state.open = true;
    document.documentElement.classList.add('beswh-open');
    render();
    loadAll(false);
    setTimeout(addTopNavEntry, 100);
  }

  function close() {
    state.open = false;
    state.createOpen = false;
    state.selectedId = '';
    state.comments = [];
    document.documentElement.classList.remove('beswh-open');
    render();
    if (window.location.hash === ROUTE) {
      var target = state.previousHash && state.previousHash !== ROUTE ? state.previousHash : '#/';
      window.location.hash = target.replace(/^#/, '');
    }
  }

  function toggle() {
    if (state.open) close(); else open();
  }

  function handleHash() {
    if (window.location.hash === ROUTE) open();
    else if (state.open && window.location.hash !== ROUTE) close();
  }

  function createRoot() {
    if (document.getElementById(ROOT_ID)) return;
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-open', 'false');
    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.addEventListener('submit', handleSubmit);
    document.body.appendChild(root);

    var hidden = document.createElement('a');
    hidden.href = ROUTE;
    hidden.textContent = 'Trung tâm công việc';
    hidden.className = 'beswh-hidden-route';
    hidden.setAttribute('aria-label', 'Trung tâm công việc');
    document.body.appendChild(hidden);
  }

  function installObservers() {
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('online', function () { if (state.open) loadAll(true); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.open && Date.now() - state.lastLoadedAt > 15000) loadAll(true);
    });
    document.addEventListener('keydown', function (event) {
      var modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && String(event.key).toLowerCase() === 'w') {
        event.preventDefault();
        if (!state.open) window.location.hash = '/work-hub';
        toggle();
      }
      if (event.key === 'Escape' && state.open) {
        if (state.createOpen) { state.createOpen = false; render(); }
        else if (state.selectedId) { state.selectedId = ''; state.comments = []; render(); }
        else close();
      }
    }, true);

    var observer = new MutationObserver(function () {
      if (!state.navEntry || !document.documentElement.contains(state.navEntry)) {
        state.navEntry = null;
        addTopNavEntry();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function report() {
    return {
      version: VERSION,
      route: ROUTE,
      open: state.open,
      adapterMode: state.adapter ? state.adapter.mode : null,
      connected: !!state.context,
      role: state.context ? state.context.role : null,
      isLeader: isLeader(),
      itemCount: state.items.length,
      unreadNotifications: state.notifications.filter(function (n) { return !n.read_at; }).length,
      lastLoadedAt: state.lastLoadedAt ? new Date(state.lastLoadedAt).toISOString() : null,
      error: state.adapterError || null
    };
  }

  function init() {
    if (window.BES_WORK_HUB && window.BES_WORK_HUB.version === VERSION) return;
    var prefs = safeParse(safeGet(PREF_KEY), {});
    if (prefs.view) state.view = prefs.view;
    createRoot();
    installObservers();
    integrateCommandCenter();
    addTopNavEntry();
    startPolling();
    handleHash();
    window.BES_WORK_HUB = {
      version: VERSION,
      route: ROUTE,
      open: open,
      close: close,
      toggle: toggle,
      refresh: function () { return loadAll(false); },
      report: report
    };
    try { window.dispatchEvent(new CustomEvent('bes-work-hub-ready', { detail: report() })); } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
