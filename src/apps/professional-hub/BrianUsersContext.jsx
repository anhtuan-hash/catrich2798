import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as BrianSupabaseModule from '../../utils/supabase.js';

const BrianUsersContext = createContext({
  users: [],
  people: [],
  loading: true,
  error: '',
  currentUser: null,
  refresh: async () => {},
  getUserById: () => null,
  getUserByName: () => null,
});

const REJECTED_STATUSES = new Set([
  'pending',
  'waiting',
  'unverified',
  'rejected',
  'blocked',
  'disabled',
  'suspended',
  'inactive',
  'deleted',
]);

function getSupabaseClient() {
  return (
    BrianSupabaseModule.supabase
    || BrianSupabaseModule.default
    || BrianSupabaseModule.client
    || null
  );
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values) {
  for (const value of values) {
    const candidate = clean(value);
    if (candidate) return candidate;
  }
  return '';
}

function initialsFrom(name, email) {
  const source = firstText(name, email);
  if (!source) return 'GV';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'GV';
}

function isApprovedProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;

  if (
    profile.approved === false
    || profile.is_approved === false
    || profile.isApproved === false
    || profile.active === false
    || profile.is_active === false
    || profile.isActive === false
    || profile.disabled === true
    || profile.is_disabled === true
    || profile.blocked === true
    || profile.is_blocked === true
  ) {
    return false;
  }

  const status = firstText(
    profile.approval_status,
    profile.account_status,
    profile.status,
    profile.state,
  ).toLowerCase();

  return !REJECTED_STATUSES.has(status);
}

function normalizeProfile(profile, authUser = null) {
  const metadata = profile?.user_metadata || authUser?.user_metadata || {};
  const id = firstText(
    profile?.id,
    profile?.user_id,
    profile?.profile_id,
    authUser?.id,
  );

  const email = firstText(
    profile?.email,
    profile?.user_email,
    authUser?.email,
  );

  const fullName = firstText(
    profile?.full_name,
    profile?.display_name,
    profile?.displayName,
    profile?.name,
    profile?.teacher_name,
    profile?.username,
    metadata?.full_name,
    metadata?.display_name,
    metadata?.name,
    email,
  );

  if (!id || !fullName) return null;

  return {
    id,
    fullName,
    email,
    role: firstText(
      profile?.role,
      profile?.user_role,
      profile?.account_role,
      metadata?.role,
      'teacher',
    ),
    avatarUrl: firstText(
      profile?.avatar_url,
      profile?.avatarUrl,
      metadata?.avatar_url,
      metadata?.picture,
    ),
    initials: initialsFrom(fullName, email),
    raw: profile,
  };
}

function extractRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.profiles)) return value.profiles;
  if (Array.isArray(value?.users)) return value.users;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function uniqueUsers(users) {
  const byId = new Map();

  users.forEach((user) => {
    if (!user?.id) return;
    const previous = byId.get(user.id);
    byId.set(user.id, previous ? { ...previous, ...user } : user);
  });

  return [...byId.values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName, 'vi', {
      sensitivity: 'base',
    }),
  );
}

export function BrianUsersProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setUsers([]);
      setCurrentUser(null);
      setError('Không tìm thấy kết nối tài khoản Brian.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const {
        data: { user: authUser } = {},
      } = await supabase.auth.getUser();

      let rows = [];

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'bes_admin_list_profiles',
        );

        if (!rpcError) rows = extractRows(data);
      } catch {
        // The RPC is restricted on some accounts. The profiles query below
        // remains the supported fallback under the active RLS policy.
      }

      if (rows.length === 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(500);

        if (profilesError) throw profilesError;
        rows = extractRows(data);
      }

      const normalized = rows
        .filter(isApprovedProfile)
        .map((profile) => normalizeProfile(profile))
        .filter(Boolean);

      const normalizedCurrent = authUser
        ? normalizeProfile(
            rows.find((profile) =>
              [
                profile?.id,
                profile?.user_id,
                profile?.profile_id,
              ].includes(authUser.id),
            ) || {},
            authUser,
          )
        : null;

      const nextUsers = uniqueUsers([
        ...normalized,
        ...(normalizedCurrent ? [normalizedCurrent] : []),
      ]);

      setUsers(nextUsers);
      setCurrentUser(normalizedCurrent);
    } catch (loadError) {
      setError(
        loadError?.message
        || 'Không thể tải danh sách tài khoản Brian.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (users.length === 0) return undefined;

    const syncAccountSelects = () => {
      const hub = document.querySelector('.professional-hub-native-app');
      if (!hub) return;

      const accountFieldPattern = /người nhận|người phụ trách|phụ trách|chủ trì|thư ký|người nộp|assignee|recipient|owner|teacher|giáo viên/i;
      const protectedOptions = new Set([
        'Tất cả',
        'Toàn tổ',
        'Chưa phân công',
        '',
      ]);

      hub.querySelectorAll('select').forEach((select) => {
        const descriptor = [
          select.name,
          select.id,
          select.getAttribute('aria-label'),
          select.closest('label')?.textContent,
          select.parentElement?.textContent?.slice(0, 180),
        ]
          .filter(Boolean)
          .join(' ');

        if (!accountFieldPattern.test(descriptor)) return;

        const existingLabels = new Set(
          [...select.options].map((option) => option.textContent?.trim() || ''),
        );

        users.forEach((user) => {
          if (existingLabels.has(user.fullName)) return;

          const option = document.createElement('option');
          option.value = user.fullName;
          option.textContent = user.fullName;
          option.dataset.brianUserId = user.id;
          select.appendChild(option);
        });

        [...select.options].forEach((option) => {
          const label = option.textContent?.trim() || '';
          if (
            option.dataset.brianUserId
            || protectedOptions.has(label)
            || users.some((user) => user.fullName === label)
          ) {
            return;
          }

          if (
            /Chưa phân công|Chưa phân công|Chưa phân công|Chưa phân công|Chưa phân công/.test(label)
          ) {
            option.remove();
          }
        });

        select.dataset.brianAccountsSynced = 'true';
      });
    };

    syncAccountSelects();

    const observer = new MutationObserver(syncAccountSelects);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [users]);

  useEffect(() => {
    loadUsers();

    const supabase = getSupabaseClient();
    const authSubscription = supabase?.auth
      ?.onAuthStateChange?.(() => loadUsers())
      ?.data?.subscription;

    const handleFocus = () => loadUsers();
    window.addEventListener('focus', handleFocus);

    return () => {
      authSubscription?.unsubscribe?.();
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadUsers]);

  const value = useMemo(() => {
    const getUserById = (id) =>
      users.find((user) => user.id === id) || null;

    const getUserByName = (name) => {
      const normalizedName = clean(name).toLocaleLowerCase('vi');
      return (
        users.find(
          (user) =>
            user.fullName.toLocaleLowerCase('vi') === normalizedName,
        ) || null
      );
    };

    return {
      users,
      people: users.map((user) => user.fullName),
      loading,
      error,
      currentUser,
      refresh: loadUsers,
      getUserById,
      getUserByName,
    };
  }, [users, loading, error, currentUser, loadUsers]);

  return (
    <BrianUsersContext.Provider value={value}>
      {children}
    </BrianUsersContext.Provider>
  );
}

export function useBrianUsers() {
  return useContext(BrianUsersContext);
}
