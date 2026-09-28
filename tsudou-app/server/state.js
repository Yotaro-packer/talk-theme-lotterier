const WEEKDAYS = ['月', '火', '水', '木', '金'];

// 「今日」を水曜日とみなして初期化する（仕様の例と揃える）
const TODAY_WEEKDAY_INDEX = 2;

let today = {
  text: '(仮) 最近ハマっていることは？',
};

let upcoming = [
  '(仮) おすすめのランチスポットは？',
  '(仮) 休日の過ごし方について教えてください',
  '(仮) 最近読んだ本・観た映画は？',
  '(仮) 出身地のおすすめスポットは？',
  '(仮) 今チャレンジしていることは？',
].map((text, i) => ({
  weekday: WEEKDAYS[(TODAY_WEEKDAY_INDEX + 1 + i) % 5],
  text,
  isPlaceholder: false,
}));

// 未抽選のトークテーマ（社員からの投稿プール）
let pool = [];

// 次に upcoming の末尾へ追加する際の曜日インデックス
let nextWeekdayIndex = (TODAY_WEEKDAY_INDEX + 1) % 5;

export function getState() {
  return {
    today: { ...today },
    upcoming: upcoming.map((item) => ({ ...item })),
  };
}

export function submitTheme(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('トークテーマを入力してください');
  }

  // 「トークテーマ応募中！」の枠は実質空欄なので、抽選を経由せず直接そこへ埋める
  const placeholderIndex = upcoming.findIndex((item) => item.isPlaceholder);
  if (placeholderIndex !== -1) {
    upcoming[placeholderIndex] = {
      ...upcoming[placeholderIndex],
      text: trimmed,
      isPlaceholder: false,
    };
    return;
  }

  pool.push({ text: trimmed });
}

export function endBusinessDay() {
  today = upcoming.shift();

  let newEntry;
  if (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(index, 1);
    newEntry = {
      weekday: WEEKDAYS[nextWeekdayIndex],
      text: picked.text,
      isPlaceholder: false,
    };
  } else {
    newEntry = {
      weekday: WEEKDAYS[nextWeekdayIndex],
      text: 'トークテーマ応募中！',
      isPlaceholder: true,
    };
  }

  upcoming.push(newEntry);
  nextWeekdayIndex = (nextWeekdayIndex + 1) % 5;

  return getState();
}
