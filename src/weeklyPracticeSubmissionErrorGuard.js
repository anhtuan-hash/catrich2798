import { supabase } from './utils/supabase.js';

const nativeAlert = window.alert.bind(window);

function bindValue(target, property) {
  const value = Reflect.get(target, property, target);
  return typeof value === 'function' ? value.bind(target) : value;
}

function minimalInsertSelection(insertBuilder) {
  return {
    single: async () => {
      const response = await insertBuilder;
      return {
        ...response,
        data: response?.error
          ? null
          : { id: null, created_at: new Date().toISOString() },
      };
    },
  };
}

function installWeeklyPracticeInsertWithoutReturning() {
  if (!supabase || supabase.__besWeeklyPracticeInsertWithoutReturning) return;

  const nativeFrom = supabase.from.bind(supabase);
  const patchedFrom = (relation) => {
    const queryBuilder = nativeFrom(relation);
    if (relation !== 'weekly_practice_results') return queryBuilder;

    return new Proxy(queryBuilder, {
      get(target, property) {
        if (property !== 'insert') return bindValue(target, property);

        return (...args) => {
          const insertBuilder = target.insert(...args);
          return new Proxy(insertBuilder, {
            get(insertTarget, insertProperty) {
              if (insertProperty === 'select') {
                return () => minimalInsertSelection(insertTarget);
              }
              return bindValue(insertTarget, insertProperty);
            },
          });
        };
      },
    });
  };

  try {
    Object.defineProperty(supabase, 'from', {
      configurable: true,
      writable: true,
      value: patchedFrom,
    });
    Object.defineProperty(supabase, '__besWeeklyPracticeInsertWithoutReturning', {
      configurable: false,
      value: true,
    });
  } catch {
    // Keep the application usable if a future Supabase client makes methods immutable.
  }
}

function friendlySubmissionMessage(value) {
  const message = String(value ?? '').trim();
  if (/row-level security policy/i.test(message) && /weekly_practice_results/i.test(message)) {
    return 'Bài chưa gửi được do quyền cơ sở dữ liệu chưa đồng bộ. Ảnh xác nhận và tiến độ vẫn được giữ; hãy tải lại website rồi bấm “Gửi cho TTCM” lần nữa.';
  }
  if (/permission denied/i.test(message) && /weekly_practice_results/i.test(message)) {
    return 'Bài chưa gửi được do quyền nhận kết quả chưa đồng bộ. Ảnh xác nhận và tiến độ vẫn được giữ để em thử lại.';
  }
  return message;
}

installWeeklyPracticeInsertWithoutReturning();
window.alert = (value) => nativeAlert(friendlySubmissionMessage(value));
