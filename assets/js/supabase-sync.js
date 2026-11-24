/**
 * 秦朝歷史知識庫 — Supabase 雲端同步與本機無縫雙軌模組
 * 安全規範：純前端環境僅使用公開 SUPABASE_URL 與 publishable key，絕不包含任何 service_role key。
 * 後端權限完全由 PostgreSQL Row Level Security (RLS) 保護（詳見 supabase/schema.sql）。
 */

(function (global) {
  const SUPABASE_URL = 'https://cowljafosekwvxithwjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YP57cbbDJSP7-PvBgtKivA_25uDcp5n';

  const LOCAL_NOTES_KEY = 'qin_hub_local_notes_v1';
  const LOCAL_CHECKINS_KEY = 'qin_hub_local_checkins_v1';

  let sbClient = null;
  let currentUser = null;
  let cloudReady = false;
  let lastCloudError = '';

  function initClient() {
    if (sbClient) return sbClient;
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      sbClient = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return sbClient;
  }

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore storage quota errors
    }
  }

  const QinSync = {
    supabaseUrl: SUPABASE_URL,

    async init(onStateChange) {
      const client = initClient();
      if (!client) {
        if (onStateChange) onStateChange({ user: null, cloudReady: false });
        return;
      }
      try {
        const { data } = await client.auth.getSession();
        currentUser = data?.session?.user || null;
        cloudReady = !!currentUser;
        if (onStateChange) onStateChange({ user: currentUser, cloudReady });

        client.auth.onAuthStateChange((_event, session) => {
          currentUser = session?.user || null;
          cloudReady = !!currentUser;
          if (onStateChange) onStateChange({ user: currentUser, cloudReady });
        });
      } catch (err) {
        lastCloudError = err?.message || 'Supabase 初始化失敗';
        if (onStateChange) onStateChange({ user: null, cloudReady: false });
      }
    },

    getUser() {
      return currentUser;
    },

    isCloudActive() {
      return Boolean(sbClient && currentUser);
    },

    getLastError() {
      return lastCloudError;
    },

    async signIn(email, password) {
      const client = initClient();
      if (!client) throw new Error('Supabase SDK 尚未載入');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      cloudReady = true;
      return data;
    },

    async signUp(email, password) {
      const client = initClient();
      if (!client) throw new Error('Supabase SDK 尚未載入');
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const client = initClient();
      if (!client) return;
      await client.auth.signOut();
      currentUser = null;
      cloudReady = false;
    },

    async listNotes(bookSlug = 'all') {
      if (this.isCloudActive()) {
        try {
          let query = sbClient
            .from('qin_team_notes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (bookSlug && bookSlug !== 'all') {
            query = query.eq('book_slug', bookSlug);
          }
          const { data, error } = await query;
          if (error) throw error;
          lastCloudError = '';
          return { mode: 'cloud', items: data || [] };
        } catch (err) {
          lastCloudError = err?.message || '尚未於 Supabase 執行 schema.sql';
        }
      }
      const localItems = readLocal(LOCAL_NOTES_KEY, []);
      const filtered = bookSlug === 'all' ? localItems : localItems.filter(n => n.book_slug === bookSlug);
      return { mode: 'local', items: filtered, notice: lastCloudError };
    },

    async addNote(payload) {
      const entry = {
        author_name: payload.author_name || (currentUser?.email ? currentUser.email.split('@')[0] : '自己（本機）'),
        book_slug: payload.book_slug || 'qinhan-lectures-nie',
        slide_no: payload.slide_no ? Number(payload.slide_no) : null,
        category: payload.category || '制度洞察',
        title: payload.title.trim(),
        content: payload.content.trim(),
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        is_shared: payload.is_shared !== false
      };

      if (this.isCloudActive()) {
        try {
          const { data, error } = await sbClient
            .from('qin_team_notes')
            .insert([{ ...entry, user_id: currentUser.id }])
            .select();
          if (error) throw error;
          lastCloudError = '';
          return { mode: 'cloud', item: data[0] };
        } catch (err) {
          lastCloudError = err?.message || '雲端寫入失敗，已自動轉存本機';
        }
      }

      const localItem = {
        ...entry,
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      const existing = readLocal(LOCAL_NOTES_KEY, []);
      existing.unshift(localItem);
      writeLocal(LOCAL_NOTES_KEY, existing);
      return { mode: 'local', item: localItem, notice: lastCloudError };
    },

    async deleteNote(id) {
      if (String(id).startsWith('local_')) {
        const existing = readLocal(LOCAL_NOTES_KEY, []).filter(n => n.id !== id);
        writeLocal(LOCAL_NOTES_KEY, existing);
        return true;
      }
      if (this.isCloudActive()) {
        const { error } = await sbClient.from('qin_team_notes').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      return false;
    },

    async getCheckins(bookSlug) {
      if (this.isCloudActive()) {
        try {
          const { data, error } = await sbClient
            .from('qin_action_checkins')
            .select('action_key, completed')
            .eq('book_slug', bookSlug);
          if (error) throw error;
          const map = {};
          (data || []).forEach(r => { map[r.action_key] = !!r.completed; });
          return { mode: 'cloud', map };
        } catch {
          // Fallback gracefully
        }
      }
      const all = readLocal(LOCAL_CHECKINS_KEY, {});
      return { mode: 'local', map: all[bookSlug] || {} };
    },

    async toggleCheckin(bookSlug, actionKey, completed) {
      if (this.isCloudActive()) {
        try {
          const { error } = await sbClient
            .from('qin_action_checkins')
            .upsert({
              user_id: currentUser.id,
              book_slug: bookSlug,
              action_key: actionKey,
              completed: !!completed
            }, { onConflict: 'user_id,book_slug,action_key' });
          if (error) throw error;
          return 'cloud';
        } catch {
          // Fallback gracefully
        }
      }
      const all = readLocal(LOCAL_CHECKINS_KEY, {});
      all[bookSlug] = all[bookSlug] || {};
      all[bookSlug][actionKey] = !!completed;
      writeLocal(LOCAL_CHECKINS_KEY, all);
      return 'local';
    }
  };

  global.QinSync = QinSync;
})(window);
