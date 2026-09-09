/**
 * Comprehensive Japanese Joyo Kanji Dataset (All 2,136 Joyo Kanji)
 * Complete official standard established by the Japanese Ministry of Education.
 * Categorized by JLPT Levels:
 * - N5: 79 characters
 * - N4: 168 characters
 * - N3: 371 characters
 * - N2: 369 characters
 * - N1: 1149 characters
 * Total: 2136 characters
 */

export interface JoyoKanjiEntry {
  kanji: string
  hanViet: string
  meaning: string
  onyomi: string[]
  kunyomi: string[]
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  strokeCount: number
  radical: string
  mnemonic?: string
  grade?: string
  compounds?: Array<{ word: string; reading: string; meaning: string }>
}

export const N5_KANJI: JoyoKanjiEntry[] = [
  {
    "kanji": "一",
    "hanViet": "NHẤT",
    "meaning": "một, 1, bộ nhất",
    "onyomi": [
      "いち",
      "いつ"
    ],
    "kunyomi": [
      "ひと-",
      "ひと.つ"
    ],
    "jlpt": "N5",
    "strokeCount": 1,
    "radical": "nhất 一 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "二",
    "hanViet": "NHỊ",
    "meaning": "hai, 2",
    "onyomi": [
      "に",
      "じ"
    ],
    "kunyomi": [
      "ふた",
      "ふた.つ",
      "ふたたび"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "nhị 二 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "九",
    "hanViet": "CƯU, CỬU",
    "meaning": "chín, 9",
    "onyomi": [
      "きゅう",
      "く"
    ],
    "kunyomi": [
      "ここの",
      "ここの.つ"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "ất 乙 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "七",
    "hanViet": "THẤT",
    "meaning": "bảy, 7",
    "onyomi": [
      "しち"
    ],
    "kunyomi": [
      "なな",
      "なな.つ",
      "なの"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "nhất 一 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "人",
    "hanViet": "NHÂN, NHƠN",
    "meaning": "người, người",
    "onyomi": [
      "じん",
      "にん"
    ],
    "kunyomi": [
      "ひと",
      "-り",
      "-と"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "nhân 人 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "入",
    "hanViet": "NHẬP",
    "meaning": "vào trong",
    "onyomi": [
      "にゅう",
      "じゅ"
    ],
    "kunyomi": [
      "い.る",
      "-い.る",
      "-い.り",
      "い.れる",
      "-い.れ",
      "はい.る"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "nhập 入 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "八",
    "hanViet": "BÁT",
    "meaning": "tám, 8",
    "onyomi": [
      "はち"
    ],
    "kunyomi": [
      "や",
      "や.つ",
      "やっ.つ",
      "よう"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "bát 八 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "十",
    "hanViet": "THẬP",
    "meaning": "mười, 10, đủ hết",
    "onyomi": [
      "じゅう",
      "じっ",
      "じゅっ"
    ],
    "kunyomi": [
      "とお",
      "と"
    ],
    "jlpt": "N5",
    "strokeCount": 2,
    "radical": "thập 十 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "三",
    "hanViet": "TAM, TÁM, TẠM",
    "meaning": "ba, 3",
    "onyomi": [
      "さん",
      "ぞう"
    ],
    "kunyomi": [
      "み",
      "み.つ",
      "みっ.つ"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "上",
    "hanViet": "THƯỚNG, THƯỢNG",
    "meaning": "đi lên, ở phía trên, đi lên",
    "onyomi": [
      "じょう",
      "しょう",
      "しゃん"
    ],
    "kunyomi": [
      "うえ",
      "-うえ",
      "うわ-",
      "かみ",
      "あ.げる",
      "-あ.げる",
      "あ.がる",
      "-あ.がる",
      "あ.がり",
      "-あ.がり",
      "のぼ.る",
      "のぼ.り",
      "のぼ.せる",
      "のぼ.す",
      "たてまつ.る"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "下",
    "hanViet": "HÁ, HẠ",
    "meaning": "đi xuống, ở bên dưới, đi xuống",
    "onyomi": [
      "か",
      "げ"
    ],
    "kunyomi": [
      "した",
      "しも",
      "もと",
      "さ.げる",
      "さ.がる",
      "くだ.る",
      "くだ.り",
      "くだ.す",
      "-くだ.す",
      "くだ.さる",
      "お.ろす",
      "お.りる"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "大",
    "hanViet": "THÁI, ĐẠI",
    "meaning": "to, lớn",
    "onyomi": [
      "だい",
      "たい"
    ],
    "kunyomi": [
      "おお-",
      "おお.きい",
      "-おお.いに"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "đại 大 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "女",
    "hanViet": "NHỮ, NỨ, NỮ, NỰ",
    "meaning": "đàn bà, con gái",
    "onyomi": [
      "じょ",
      "にょ",
      "にょう"
    ],
    "kunyomi": [
      "おんな",
      "め"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "nữ 女 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "山",
    "hanViet": "SAN, SƠN",
    "meaning": "núi, mồ mả, núi",
    "onyomi": [
      "さん",
      "せん"
    ],
    "kunyomi": [
      "やま"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "sơn 山 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "川",
    "hanViet": "XUYÊN",
    "meaning": "dòng nước, sông, cánh đồng",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "かわ"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "xuyên 巛 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "土",
    "hanViet": "THỔ, ĐỖ, ĐỘ",
    "meaning": "đất, sao Thổ",
    "onyomi": [
      "ど",
      "と"
    ],
    "kunyomi": [
      "つち"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "thổ 土 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "千",
    "hanViet": "THIÊN",
    "meaning": "nghìn, 1000, (xem: thu thiên 鞦韆,秋千)",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "ち"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "thập 十 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "子",
    "hanViet": "TÍ, TÝ, TỬ",
    "meaning": "Tý (ngôi thứ nhất hàng Chi), (như: tử 子), con",
    "onyomi": [
      "し",
      "す",
      "つ"
    ],
    "kunyomi": [
      "こ",
      "-こ",
      "ね"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "tử 子 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "小",
    "hanViet": "TIỂU",
    "meaning": "nhỏ bé",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "ちい.さい",
      "こ-",
      "お-",
      "さ-"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "tiểu 小 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "中",
    "hanViet": "TRUNG, TRÚNG",
    "meaning": "ở giữa, ở bên trong, đúng, trúng, tin",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "なか",
      "うち",
      "あた.る"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "cổn 丨 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "五",
    "hanViet": "NGŨ",
    "meaning": "năm, 5",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "いつ",
      "いつ.つ"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "nhị 二 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "六",
    "hanViet": "LỤC",
    "meaning": "sáu, 6",
    "onyomi": [
      "ろく",
      "りく"
    ],
    "kunyomi": [
      "む",
      "む.つ",
      "むっ.つ",
      "むい"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "bát 八 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "円",
    "hanViet": "VIÊN",
    "meaning": "tròn, hình tròn, cầu, hình cầu, tròn (trăng)",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "まる.い",
      "まる",
      "まど",
      "まど.か",
      "まろ.やか"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "quynh 冂 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "天",
    "hanViet": "THIÊN",
    "meaning": "trời, bầu trời, tự nhiên, ngày",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [
      "あまつ",
      "あめ",
      "あま-"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "đại 大 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "日",
    "hanViet": "NHẬT, NHỰT",
    "meaning": "Mặt Trời, ngày",
    "onyomi": [
      "にち",
      "じつ"
    ],
    "kunyomi": [
      "ひ",
      "-び",
      "-か"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "nhật 日 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "月",
    "hanViet": "NGUYỆT",
    "meaning": "Mặt Trăng, tháng",
    "onyomi": [
      "げつ",
      "がつ"
    ],
    "kunyomi": [
      "つき"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "nguyệt 月 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "木",
    "hanViet": "MỘC",
    "meaning": "cây, gỗ, mộc mạc, chất phác, sao Mộc",
    "onyomi": [
      "ぼく",
      "もく"
    ],
    "kunyomi": [
      "き",
      "こ-"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "mộc 木 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "水",
    "hanViet": "THUỶ",
    "meaning": "nước, sao Thuỷ",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "みず",
      "みず-"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "thuỷ 水 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "火",
    "hanViet": "HOẢ",
    "meaning": "lửa",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "ひ",
      "-び",
      "ほ-"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "hoả 火 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "出",
    "hanViet": "XUÝ, XUẤT, XÍCH",
    "meaning": "ra ngoài, đi ra, một tấn (một đoạn) trong vở tuồng, một tấn (một đoạn) trong vở tuồng",
    "onyomi": [
      "しゅつ",
      "すい"
    ],
    "kunyomi": [
      "で.る",
      "-で",
      "だ.す",
      "-だ.す",
      "い.でる",
      "い.だす"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "khảm 凵 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "右",
    "hanViet": "HỮU",
    "meaning": "bên phải",
    "onyomi": [
      "う",
      "ゆう"
    ],
    "kunyomi": [
      "みぎ"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "四",
    "hanViet": "TỨ",
    "meaning": "bốn, 4",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "よ",
      "よ.つ",
      "よっ.つ",
      "よん"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "vi 囗 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "左",
    "hanViet": "TÁ, TẢ",
    "meaning": "bên trái",
    "onyomi": [
      "さ",
      "しゃ"
    ],
    "kunyomi": [
      "ひだり"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "công 工 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "本",
    "hanViet": "BÔN, BẢN, BỔN",
    "meaning": "gốc (cây), vốn có, từ trước, nguồn gốc, mình (từ xưng hô)",
    "onyomi": [
      "ほん"
    ],
    "kunyomi": [
      "もと"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "mộc 木 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "白",
    "hanViet": "BẠCH",
    "meaning": "trắng, màu trắng, bạc (tóc), sạch sẽ",
    "onyomi": [
      "はく",
      "びゃく"
    ],
    "kunyomi": [
      "しろ",
      "しら-",
      "しろ.い"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "bạch 白 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "万",
    "hanViet": "MẶC, VẠN",
    "meaning": "(tên riêng), vạn, mười nghìn",
    "onyomi": [
      "まん",
      "ばん"
    ],
    "kunyomi": [
      "よろず"
    ],
    "jlpt": "N5",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "今",
    "hanViet": "KIM",
    "meaning": "nay, bây giờ",
    "onyomi": [
      "こん",
      "きん"
    ],
    "kunyomi": [
      "いま"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "nhân 人 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "午",
    "hanViet": "NGỌ",
    "meaning": "buổi trưa, Ngọ (ngôi 7 trong hàng Chi)",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "うま"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "thập 十 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "友",
    "hanViet": "HỮU",
    "meaning": "bạn bè",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "とも"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "hựu 又 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "父",
    "hanViet": "PHỤ, PHỦ",
    "meaning": "cha, bố, cha, bố",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "ちち"
    ],
    "jlpt": "N5",
    "strokeCount": 4,
    "radical": "phụ 父 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "北",
    "hanViet": "BẮC, BỐI, BỘI",
    "meaning": "phía bắc, phương bắc, thua trận",
    "onyomi": [
      "ほく"
    ],
    "kunyomi": [
      "きた"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "tỷ 匕 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "半",
    "hanViet": "BÁN",
    "meaning": "một nửa, ở giữa, lưng chừng, nhỏ bé",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "なか.ば"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "thập 十 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "外",
    "hanViet": "NGOẠI",
    "meaning": "bên ngoài",
    "onyomi": [
      "がい",
      "げ"
    ],
    "kunyomi": [
      "そと",
      "ほか",
      "はず.す",
      "はず.れる",
      "と-"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "tịch 夕 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "母",
    "hanViet": "MÔ, MẪU",
    "meaning": "mẹ, con cái, giống cái",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [
      "はは",
      "も"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "vô 毋 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "休",
    "hanViet": "HU, HƯU",
    "meaning": "nghỉ ngơi, thôi, dừng, tốt lành",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "やす.む",
      "やす.まる",
      "やす.める"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "先",
    "hanViet": "TIÊN, TIẾN",
    "meaning": "trước",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "さき",
      "ま.ず"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "nhân 儿 (+4 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "名",
    "hanViet": "DANH",
    "meaning": "tên, danh, danh tiếng",
    "onyomi": [
      "めい",
      "みょう"
    ],
    "kunyomi": [
      "な",
      "-な"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "年",
    "hanViet": "NIÊN",
    "meaning": "năm, tuổi, được mùa",
    "onyomi": [
      "ねん"
    ],
    "kunyomi": [
      "とし"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "can 干 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "気",
    "hanViet": "KHÍ",
    "meaning": "khí, hơi",
    "onyomi": [
      "き",
      "け"
    ],
    "kunyomi": [
      "いき"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "khí 气 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "百",
    "hanViet": "BÁ, BÁCH, MẠCH",
    "meaning": "trăm, 100, rất nhiều",
    "onyomi": [
      "ひゃく",
      "びゃく"
    ],
    "kunyomi": [
      "もも"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "bạch 白 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "男",
    "hanViet": "NAM",
    "meaning": "đàn ông, con trai, tước Nam",
    "onyomi": [
      "だん",
      "なん"
    ],
    "kunyomi": [
      "おとこ",
      "お"
    ],
    "jlpt": "N5",
    "strokeCount": 7,
    "radical": "điền 田 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "見",
    "hanViet": "HIỆN, KIẾN",
    "meaning": "tỏ rõ, hiện ra, gặp, thấy",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "み.る",
      "み.える",
      "み.せる"
    ],
    "jlpt": "N5",
    "strokeCount": 7,
    "radical": "kiến 見 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "車",
    "hanViet": "XA",
    "meaning": "cái xe",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "くるま"
    ],
    "jlpt": "N5",
    "strokeCount": 7,
    "radical": "xa 車 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "毎",
    "hanViet": "MỖI",
    "meaning": "mỗi một",
    "onyomi": [
      "まい"
    ],
    "kunyomi": [
      "ごと",
      "-ごと.に"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "vô 毋 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "行",
    "hanViet": "HÀNG, HÀNH, HÃNG, HẠNG, HẠNH",
    "meaning": "hàng, dòng, đi, làm",
    "onyomi": [
      "こう",
      "ぎょう",
      "あん"
    ],
    "kunyomi": [
      "い.く",
      "ゆ.く",
      "-ゆ.き",
      "-ゆき",
      "-い.き",
      "-いき",
      "おこな.う",
      "おこ.なう"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "hành 行 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "西",
    "hanViet": "TÂY, TÊ",
    "meaning": "phía tây, phương tây",
    "onyomi": [
      "せい",
      "さい",
      "す"
    ],
    "kunyomi": [
      "にし"
    ],
    "jlpt": "N5",
    "strokeCount": 6,
    "radical": "á 襾 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "何",
    "hanViet": "HÀ",
    "meaning": "nào (trong hà nhân, hà xứ, ...)",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "なに",
      "なん",
      "なに-",
      "なん-"
    ],
    "jlpt": "N5",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "来",
    "hanViet": "LAI, LÃI",
    "meaning": "đến nơi",
    "onyomi": [
      "らい",
      "たい"
    ],
    "kunyomi": [
      "く.る",
      "きた.る",
      "きた.す",
      "き.たす",
      "き.たる",
      "き",
      "こ"
    ],
    "jlpt": "N5",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "学",
    "hanViet": "HỌC",
    "meaning": "học hành",
    "onyomi": [
      "がく"
    ],
    "kunyomi": [
      "まな.ぶ"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "tử 子 (+5 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "金",
    "hanViet": "KIM",
    "meaning": "vàng, tiền, sao Kim, nước Kim",
    "onyomi": [
      "きん",
      "こん",
      "ごん"
    ],
    "kunyomi": [
      "かね",
      "かな-",
      "-がね"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "kim 金 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "雨",
    "hanViet": "VÚ, VŨ, VỤ",
    "meaning": "mưa",
    "onyomi": [
      "う"
    ],
    "kunyomi": [
      "あめ",
      "あま-",
      "-さめ"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "vũ 雨 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "国",
    "hanViet": "QUỐC",
    "meaning": "đất nước, quốc gia",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "くに"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "vi 囗 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "東",
    "hanViet": "ĐÔNG",
    "meaning": "phía đông, phương đông",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ひがし"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "長",
    "hanViet": "TRÀNG, TRƯỚNG, TRƯỜNG, TRƯỞNG, TRƯỢNG",
    "meaning": "dài, lâu, dài",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "なが.い",
      "おさ"
    ],
    "jlpt": "N5",
    "strokeCount": 8,
    "radical": "trường 長 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "前",
    "hanViet": "TIỀN, TIỄN",
    "meaning": "trước",
    "onyomi": [
      "ぜん"
    ],
    "kunyomi": [
      "まえ",
      "-まえ"
    ],
    "jlpt": "N5",
    "strokeCount": 9,
    "radical": "đao 刀 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "南",
    "hanViet": "NA, NAM",
    "meaning": "phía nam, phương nam",
    "onyomi": [
      "なん",
      "な"
    ],
    "kunyomi": [
      "みなみ"
    ],
    "jlpt": "N5",
    "strokeCount": 9,
    "radical": "thập 十 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "後",
    "hanViet": "HẤU, HẬU",
    "meaning": "sau, phía sau",
    "onyomi": [
      "ご",
      "こう"
    ],
    "kunyomi": [
      "のち",
      "うし.ろ",
      "うしろ",
      "あと",
      "おく.れる"
    ],
    "jlpt": "N5",
    "strokeCount": 9,
    "radical": "xích 彳 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "食",
    "hanViet": "THỰC, TỰ",
    "meaning": "ăn, đồ ăn, lộc",
    "onyomi": [
      "しょく",
      "じき"
    ],
    "kunyomi": [
      "く.う",
      "く.らう",
      "た.べる",
      "は.む"
    ],
    "jlpt": "N5",
    "strokeCount": 9,
    "radical": "thực 食 (+1 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "校",
    "hanViet": "GIÁO, HIỆU, HÀO",
    "meaning": "kiểm tra, xét, sửa chữa, đính chính, trường học",
    "onyomi": [
      "こう",
      "きょう"
    ],
    "kunyomi": [],
    "jlpt": "N5",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "時",
    "hanViet": "THÌ, THỜI",
    "meaning": "lúc, thời gian, lúc",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "とき",
      "-どき"
    ],
    "jlpt": "N5",
    "strokeCount": 10,
    "radical": "nhật 日 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "高",
    "hanViet": "CAO",
    "meaning": "cao, kiêu, đắt, cao thượng, thanh cao",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "たか.い",
      "たか",
      "-だか",
      "たか.まる",
      "たか.める"
    ],
    "jlpt": "N5",
    "strokeCount": 10,
    "radical": "cao 高 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "間",
    "hanViet": "GIAN, GIÁN, NHÀN",
    "meaning": "khoảng không gian, kẽ hở, lỗ hổng, chia rẽ",
    "onyomi": [
      "かん",
      "けん"
    ],
    "kunyomi": [
      "あいだ",
      "ま",
      "あい"
    ],
    "jlpt": "N5",
    "strokeCount": 12,
    "radical": "môn 門 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "話",
    "hanViet": "THOẠI",
    "meaning": "nói",
    "onyomi": [
      "わ"
    ],
    "kunyomi": [
      "はな.す",
      "はなし"
    ],
    "jlpt": "N5",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "電",
    "hanViet": "ĐIỆN",
    "meaning": "điện, chớp",
    "onyomi": [
      "でん"
    ],
    "kunyomi": [],
    "jlpt": "N5",
    "strokeCount": 13,
    "radical": "vũ 雨 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "聞",
    "hanViet": "VĂN, VẤN, VẶN",
    "meaning": "nghe, tiếng động tới, tiếng truyền tới",
    "onyomi": [
      "ぶん",
      "もん"
    ],
    "kunyomi": [
      "き.く",
      "き.こえる"
    ],
    "jlpt": "N5",
    "strokeCount": 14,
    "radical": "nhĩ 耳 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "語",
    "hanViet": "NGỨ, NGỮ, NGỰ",
    "meaning": "ngôn ngữ, lời lẽ",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "かた.る",
      "かた.らう"
    ],
    "jlpt": "N5",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "読",
    "hanViet": "ĐẬU, ĐỘC",
    "meaning": "Read",
    "onyomi": [
      "どく",
      "とく",
      "とう"
    ],
    "kunyomi": [
      "よ.む",
      "-よ.み"
    ],
    "jlpt": "N5",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "生",
    "hanViet": "SANH, SINH",
    "meaning": "sinh đẻ, sống, sinh đẻ",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "い.きる",
      "い.かす",
      "い.ける",
      "う.まれる",
      "うま.れる",
      "う.まれ",
      "うまれ",
      "う.む",
      "お.う",
      "は.える",
      "は.やす",
      "き",
      "なま",
      "なま-",
      "な.る",
      "な.す",
      "む.す",
      "-う"
    ],
    "jlpt": "N5",
    "strokeCount": 5,
    "radical": "sinh 生 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "書",
    "hanViet": "THƯ",
    "meaning": "sách, thư tín",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "か.く",
      "-が.き",
      "-がき"
    ],
    "jlpt": "N5",
    "strokeCount": 10,
    "radical": "viết 曰 (+6 nét)",
    "grade": "Lớp 2"
  }
]

export const N4_KANJI: JoyoKanjiEntry[] = [
  {
    "kanji": "力",
    "hanViet": "LỰC",
    "meaning": "sức lực",
    "onyomi": [
      "りょく",
      "りき",
      "りい"
    ],
    "kunyomi": [
      "ちから"
    ],
    "jlpt": "N4",
    "strokeCount": 2,
    "radical": "lực 力 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "口",
    "hanViet": "KHẨU",
    "meaning": "mồm, miệng, cửa",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "くち"
    ],
    "jlpt": "N4",
    "strokeCount": 3,
    "radical": "khẩu 口 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "工",
    "hanViet": "CÔNG",
    "meaning": "công việc, người thợ",
    "onyomi": [
      "こう",
      "く",
      "ぐ"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 3,
    "radical": "công 工 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "夕",
    "hanViet": "TỊCH",
    "meaning": "buổi chiều, buổi tối, bóng tối",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "ゆう"
    ],
    "jlpt": "N4",
    "strokeCount": 3,
    "radical": "tịch 夕 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "手",
    "hanViet": "THỦ",
    "meaning": "cái tay",
    "onyomi": [
      "しゅ",
      "ず"
    ],
    "kunyomi": [
      "て",
      "て-",
      "-て",
      "た-"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "thủ 手 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "文",
    "hanViet": "VĂN, VẤN",
    "meaning": "văn, vẻ",
    "onyomi": [
      "ぶん",
      "もん"
    ],
    "kunyomi": [
      "ふみ",
      "あや"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "văn 文 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "犬",
    "hanViet": "KHUYỂN",
    "meaning": "con chó",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "いぬ",
      "いぬ-"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "khuyển 犬 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "正",
    "hanViet": "CHINH, CHÁNH, CHÍNH",
    "meaning": "giữa, chính, ngay thẳng, giữa",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "ただ.しい",
      "ただ.す",
      "まさ",
      "まさ.に"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "chỉ 止 (+1 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "田",
    "hanViet": "ĐIỀN",
    "meaning": "ruộng, đồng",
    "onyomi": [
      "でん"
    ],
    "kunyomi": [
      "た"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "điền 田 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "目",
    "hanViet": "MỤC",
    "meaning": "mắt, khoản mục",
    "onyomi": [
      "もく",
      "ぼく"
    ],
    "kunyomi": [
      "め",
      "-め",
      "ま-"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "mục 目 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "立",
    "hanViet": "LẬP",
    "meaning": "đứng thẳng, lập tức, tức thì",
    "onyomi": [
      "りつ",
      "りゅう",
      "りっとる"
    ],
    "kunyomi": [
      "た.つ",
      "-た.つ",
      "た.ち-",
      "た.てる",
      "-た.てる",
      "た.て-",
      "たて-",
      "-た.て",
      "-だ.て",
      "-だ.てる"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "lập 立 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "元",
    "hanViet": "NGUYÊN",
    "meaning": "bắt đầu, thứ nhất, chủ yếu, căn bản, nguyên tố, đơn vị tiền tệ",
    "onyomi": [
      "げん",
      "がん"
    ],
    "kunyomi": [
      "もと"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "nhân 儿 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "公",
    "hanViet": "CÔNG",
    "meaning": "cân bằng, chung, cụ, ông",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "おおやけ"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "bát 八 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "分",
    "hanViet": "PHÂN, PHẦN, PHẬN",
    "meaning": "phân chia, thân phận, số phận",
    "onyomi": [
      "ぶん",
      "ふん",
      "ぶ"
    ],
    "kunyomi": [
      "わ.ける",
      "わ.け",
      "わ.かれる",
      "わ.かる",
      "わ.かつ"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "đao 刀 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "切",
    "hanViet": "THIẾT, THẾ",
    "meaning": "cắt, chạm khắc, cần kíp",
    "onyomi": [
      "せつ",
      "さい"
    ],
    "kunyomi": [
      "き.る",
      "-き.る",
      "き.り",
      "-き.り",
      "-ぎ.り",
      "き.れる",
      "-き.れる",
      "き.れ",
      "-き.れ",
      "-ぎ.れ"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "đao 刀 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "少",
    "hanViet": "THIẾU, THIỂU",
    "meaning": "kém, không đủ, trẻ tuổi, ít ỏi",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "すく.ない",
      "すこ.し"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "tiểu 小 (+1 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "心",
    "hanViet": "TÂM",
    "meaning": "lòng, tim",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "こころ",
      "-ごころ"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "tâm 心 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "方",
    "hanViet": "BÀNG, PHƯƠNG",
    "meaning": "phía, vuông, hình vuông, trái lời, không tuân theo",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "かた",
      "-かた",
      "-がた"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "phương 方 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "牛",
    "hanViet": "NGƯU",
    "meaning": "con trâu, sao Ngưu",
    "onyomi": [
      "ぎゅう"
    ],
    "kunyomi": [
      "うし"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "ngưu 牛 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "止",
    "hanViet": "CHI, CHỈ",
    "meaning": "dừng lại, thôi, dừng lại, thôi",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "と.まる",
      "-ど.まり",
      "と.める",
      "-と.める",
      "-ど.め",
      "とど.める",
      "とど.め",
      "とど.まる",
      "や.める",
      "や.む",
      "-や.む",
      "よ.す",
      "-さ.す",
      "-さ.し"
    ],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "chỉ 止 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "兄",
    "hanViet": "HUYNH, HUỐNG",
    "meaning": "anh trai",
    "onyomi": [
      "けい",
      "きょう"
    ],
    "kunyomi": [
      "あに"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nhân 儿 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "冬",
    "hanViet": "ĐÔNG",
    "meaning": "mùa đông, tiếng trống đánh tùng tùng",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ふゆ"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "băng 冫 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "古",
    "hanViet": "CỔ",
    "meaning": "cũ, xưa",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "ふる.い",
      "ふる-",
      "-ふる.す"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "台",
    "hanViet": "DI, THAI, ĐÀI",
    "meaning": "sao Thai, cái đài, lầu, cái đài, lầu",
    "onyomi": [
      "だい",
      "たい"
    ],
    "kunyomi": [
      "うてな",
      "われ",
      "つかさ"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "広",
    "hanViet": "KHOÁT, QUẢNG",
    "meaning": "Wide, Broad, Spacious",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "ひろ.い",
      "ひろ.まる",
      "ひろ.める",
      "ひろ.がる",
      "ひろ.げる"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nghiễm 广 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "用",
    "hanViet": "DỤNG",
    "meaning": "dùng, sử dụng",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "もち.いる"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "dụng 用 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "世",
    "hanViet": "THẾ",
    "meaning": "đời, trên đời, nối đời nhau, chỗ quen biết cũ",
    "onyomi": [
      "せい",
      "せ",
      "そう"
    ],
    "kunyomi": [
      "よ"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nhất 一 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "主",
    "hanViet": "CHÚA, CHỦ",
    "meaning": "người đứng đầu, người đứng đầu",
    "onyomi": [
      "しゅ",
      "す",
      "しゅう"
    ],
    "kunyomi": [
      "ぬし",
      "おも",
      "あるじ"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "chủ 丶 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "代",
    "hanViet": "ĐẠI",
    "meaning": "triều đại, thay thế cho, đại diện",
    "onyomi": [
      "だい",
      "たい"
    ],
    "kunyomi": [
      "か.わる",
      "かわ.る",
      "かわ.り",
      "か.わり",
      "-がわ.り",
      "-が.わり",
      "か.える",
      "よ",
      "しろ"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "写",
    "hanViet": "TẢ",
    "meaning": "viết, chép, dốc hết ra, tháo ra, đúc tượng",
    "onyomi": [
      "しゃ",
      "じゃ"
    ],
    "kunyomi": [
      "うつ.す",
      "うつ.る",
      "うつ-",
      "うつ.し"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "mịch 冖 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "去",
    "hanViet": "KHU, KHỨ, KHỬ",
    "meaning": "đi, bỏ, đã qua",
    "onyomi": [
      "きょ",
      "こ"
    ],
    "kunyomi": [
      "さ.る",
      "-さ.る"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "khư 厶 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "字",
    "hanViet": "TỰ",
    "meaning": "chữ, giấy tờ, hiệu, tên chữ",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "あざ",
      "あざな",
      "-な"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "tử 子 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "早",
    "hanViet": "TẢO",
    "meaning": "buổi sáng, sớm",
    "onyomi": [
      "そう",
      "さっ"
    ],
    "kunyomi": [
      "はや.い",
      "はや",
      "はや-",
      "はや.まる",
      "はや.める",
      "さ-"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "nhật 日 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "町",
    "hanViet": "ĐINH, ĐỈNH",
    "meaning": "bờ ruộng, đinh (đơn vị đo, bằng 100 mẫu)",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "まち"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "điền 田 (+2 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "花",
    "hanViet": "HOA",
    "meaning": "bông hoa",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "はな"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "thảo 艸 (+4 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "赤",
    "hanViet": "THÍCH, XÍCH",
    "meaning": "đỏ, màu đỏ, trần truồng",
    "onyomi": [
      "せき",
      "しゃく"
    ],
    "kunyomi": [
      "あか",
      "あか-",
      "あか.い",
      "あか.らむ",
      "あか.らめる"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "xích 赤 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "足",
    "hanViet": "TÚ, TÚC",
    "meaning": "chân thú, đầy đủ",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "あし",
      "た.りる",
      "た.る",
      "た.す"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "túc 足 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "不",
    "hanViet": "BƯU, BẤT, BỈ, PHI, PHU, PHẦU, PHỦ",
    "meaning": "không, chẳng",
    "onyomi": [
      "ふ",
      "ぶ"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 4,
    "radical": "nhất 一 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "仕",
    "hanViet": "SĨ",
    "meaning": "học trò, quan",
    "onyomi": [
      "し",
      "じ"
    ],
    "kunyomi": [
      "つか.える"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "会",
    "hanViet": "CỐI, HỘI",
    "meaning": "tính gộp, tính cộng lại sổ sách trong một năm, hội hè, tụ hội",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [
      "あ.う",
      "あ.わせる",
      "あつ.まる"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "同",
    "hanViet": "ĐỒNG",
    "meaning": "cùng nhau",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "おな.じ"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "多",
    "hanViet": "ĐA",
    "meaning": "nhiều",
    "onyomi": [
      "た"
    ],
    "kunyomi": [
      "おお.い",
      "まさ.に",
      "まさ.る"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "tịch 夕 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "考",
    "hanViet": "KHẢO",
    "meaning": "thọ, già, thi cử, nghiên cứu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "かんが.える",
      "かんが.え"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "lão 老 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "肉",
    "hanViet": "NHỤ, NHỤC, NẬU",
    "meaning": "thịt, cùi quả",
    "onyomi": [
      "にく"
    ],
    "kunyomi": [
      "しし"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "nhục 肉 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "自",
    "hanViet": "TỰ",
    "meaning": "tự mình, riêng tư, tự nhiên, tất nhiên, từ, do (liên từ)",
    "onyomi": [
      "じ",
      "し"
    ],
    "kunyomi": [
      "みずか.ら",
      "おの.ずから",
      "おの.ずと"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "tự 自 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "色",
    "hanViet": "SẮC",
    "meaning": "màu sắc, vẻ",
    "onyomi": [
      "しょく",
      "しき"
    ],
    "kunyomi": [
      "いろ"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "sắc 色 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "体",
    "hanViet": "BỔN, THỂ",
    "meaning": "thân, mình, hình thể, dạng",
    "onyomi": [
      "たい",
      "てい"
    ],
    "kunyomi": [
      "からだ",
      "かたち"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "作",
    "hanViet": "TÁ, TÁC",
    "meaning": "làm, tạo nên",
    "onyomi": [
      "さく",
      "さ"
    ],
    "kunyomi": [
      "つく.る",
      "つく.り",
      "-づく.り"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "図",
    "hanViet": "ĐỒ",
    "meaning": "Map, Drawing, Plan",
    "onyomi": [
      "ず",
      "と"
    ],
    "kunyomi": [
      "え",
      "はか.る"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "vi 囗 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "売",
    "hanViet": "MẠI",
    "meaning": "Sell",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "う.る",
      "う.れる"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "sĩ 士 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "弟",
    "hanViet": "ĐỄ, ĐỆ",
    "meaning": "em trai, dễ dãi",
    "onyomi": [
      "てい",
      "だい",
      "で"
    ],
    "kunyomi": [
      "おとうと"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "cung 弓 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "社",
    "hanViet": "XÃ",
    "meaning": "thần đất, đền thờ thần đất",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "やしろ"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "kỳ 示 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "言",
    "hanViet": "NGÂN, NGÔN",
    "meaning": "nói, lời nói",
    "onyomi": [
      "げん",
      "ごん"
    ],
    "kunyomi": [
      "い.う",
      "こと"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "ngôn 言 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "走",
    "hanViet": "TẨU",
    "meaning": "chạy, tẩu (tiếng xưng hô)",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "はし.る"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "tẩu 走 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "近",
    "hanViet": "CẤN, CẬN, KÝ",
    "meaning": "gần, bên cạnh",
    "onyomi": [
      "きん",
      "こん"
    ],
    "kunyomi": [
      "ちか.い"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "sước 辵 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "里",
    "hanViet": "LÍ, LÝ",
    "meaning": "làng xóm, dặm, ở trong",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "さと"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "lý 里 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "空",
    "hanViet": "KHÔNG, KHỐNG, KHỔNG",
    "meaning": "trống rỗng, không gian, bỏ trống",
    "onyomi": [
      "くう"
    ],
    "kunyomi": [
      "そら",
      "あ.く",
      "あ.き",
      "あ.ける",
      "から",
      "す.く",
      "す.かす",
      "むな.しい"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "huyệt 穴 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "青",
    "hanViet": "THANH",
    "meaning": "xanh, màu xanh",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "あお",
      "あお-",
      "あお.い"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "thanh 青 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "音",
    "hanViet": "ÂM, ẤM",
    "meaning": "âm, tiếng",
    "onyomi": [
      "おん",
      "いん",
      "-のん"
    ],
    "kunyomi": [
      "おと",
      "ね"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "âm 音 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "地",
    "hanViet": "ĐỊA",
    "meaning": "đất, địa vị",
    "onyomi": [
      "ち",
      "じ"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "thổ 土 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "安",
    "hanViet": "AN, YÊN",
    "meaning": "yên tĩnh, yên lành, làm yên lòng, an toàn",
    "onyomi": [
      "あん"
    ],
    "kunyomi": [
      "やす.い",
      "やす.まる",
      "やす",
      "やす.らか"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "miên 宀 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "有",
    "hanViet": "DỰU, HỮU, HỰU",
    "meaning": "có, sỡ hữu",
    "onyomi": [
      "ゆう",
      "う"
    ],
    "kunyomi": [
      "あ.る"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "nguyệt 月 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "死",
    "hanViet": "TỬ",
    "meaning": "chết",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "し.ぬ",
      "し.に-"
    ],
    "jlpt": "N4",
    "strokeCount": 6,
    "radical": "ngạt 歹 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "京",
    "hanViet": "KINH, NGUYÊN",
    "meaning": "kinh đô, thủ đô",
    "onyomi": [
      "きょう",
      "けい",
      "きん"
    ],
    "kunyomi": [
      "みやこ"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "đầu 亠 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "夜",
    "hanViet": "DẠ, DỊCH",
    "meaning": "ban đêm",
    "onyomi": [
      "や"
    ],
    "kunyomi": [
      "よ",
      "よる"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "tịch 夕 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "妹",
    "hanViet": "MUỘI",
    "meaning": "em gái",
    "onyomi": [
      "まい"
    ],
    "kunyomi": [
      "いもうと"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "姉",
    "hanViet": "TỶ",
    "meaning": "chị gái",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "あね",
      "はは"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "店",
    "hanViet": "ĐIẾM",
    "meaning": "quán trọ, tiệm hàng",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [
      "みせ",
      "たな"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nghiễm 广 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "明",
    "hanViet": "MINH",
    "meaning": "sáng, đời nhà Minh (Trung Quốc)",
    "onyomi": [
      "めい",
      "みょう",
      "みん"
    ],
    "kunyomi": [
      "あ.かり",
      "あか.るい",
      "あか.るむ",
      "あか.らむ",
      "あき.らか",
      "あ.ける",
      "-あ.け",
      "あ.く",
      "あ.くる",
      "あ.かす"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "歩",
    "hanViet": "BỘ",
    "meaning": "đi chân, bước",
    "onyomi": [
      "ほ",
      "ぶ",
      "ふ"
    ],
    "kunyomi": [
      "ある.く",
      "あゆ.む"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "chỉ 止 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "画",
    "hanViet": "HOẠ, HOẠCH",
    "meaning": "vẽ, bức tranh",
    "onyomi": [
      "が",
      "かく",
      "え",
      "かい"
    ],
    "kunyomi": [
      "えが.く",
      "かく.する",
      "かぎ.る",
      "はかりごと",
      "はか.る"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "điền 田 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "知",
    "hanViet": "TRI, TRÍ",
    "meaning": "biết, quen nhau",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "し.る",
      "し.らせる"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "thỉ 矢 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "室",
    "hanViet": "THẤT",
    "meaning": "nhà, huyệt chôn",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "むろ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "miên 宀 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "思",
    "hanViet": "TAI, TƯ, TỨ",
    "meaning": "nhớ, mong, nhớ, mong",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "おも.う",
      "おもえら.く",
      "おぼ.す"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "海",
    "hanViet": "HẢI",
    "meaning": "biển",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "うみ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "茶",
    "hanViet": "TRÀ",
    "meaning": "chè",
    "onyomi": [
      "ちゃ",
      "さ"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thảo 艸 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "以",
    "hanViet": "DĨ",
    "meaning": "dùng, sử dụng, bởi vì, lý do",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "もっ.て"
    ],
    "jlpt": "N4",
    "strokeCount": 5,
    "radical": "nhân 人 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "夏",
    "hanViet": "GIÁ, GIẠ, HẠ",
    "meaning": "mùa hè, đời nhà Hạ (Trung Quốc)",
    "onyomi": [
      "か",
      "が",
      "げ"
    ],
    "kunyomi": [
      "なつ"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "tuy 夊 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "家",
    "hanViet": "CÔ, GIA",
    "meaning": "nhà, tiếng vợ gọi chồng",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "いえ",
      "や",
      "うち"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "紙",
    "hanViet": "CHỈ",
    "meaning": "giấy viết",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "かみ"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "通",
    "hanViet": "THÔNG",
    "meaning": "xuyên qua",
    "onyomi": [
      "つう",
      "つ"
    ],
    "kunyomi": [
      "とお.る",
      "とお.り",
      "-とお.り",
      "-どお.り",
      "とお.す",
      "とお.し",
      "-どお.し",
      "かよ.う"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "強",
    "hanViet": "CƯỜNG, CƯỠNG",
    "meaning": "mạnh, gượng, miễn cưỡng",
    "onyomi": [
      "きょう",
      "ごう"
    ],
    "kunyomi": [
      "つよ.い",
      "つよ.まる",
      "つよ.める",
      "し.いる",
      "こわ.い"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "cung 弓 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "教",
    "hanViet": "GIAO, GIÁO",
    "meaning": "dạy dỗ, truyền thụ, tôn giáo, đạo, sai bảo, khiến",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "おし.える",
      "おそ.わる"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "phác 攴 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "理",
    "hanViet": "LÍ, LÝ",
    "meaning": "vân, đường vân, lý lẽ, sửa sang",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "ことわり"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "ngọc 玉 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "週",
    "hanViet": "CHU",
    "meaning": "đi khắp nơi",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "sước 辵 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "魚",
    "hanViet": "NGƯ",
    "meaning": "con cá",
    "onyomi": [
      "ぎょ"
    ],
    "kunyomi": [
      "うお",
      "さかな",
      "-ざかな"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "ngư 魚 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "鳥",
    "hanViet": "ĐIỂU",
    "meaning": "con chim",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "とり"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "điểu 鳥 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "黒",
    "hanViet": "HẮC",
    "meaning": "Black",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "くろ",
      "くろ.ずむ",
      "くろ.い"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "hắc 黑 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "住",
    "hanViet": "TRÚ, TRỤ",
    "meaning": "ở, thôi, dừng, còn đấy",
    "onyomi": [
      "じゅう",
      "ぢゅう",
      "ちゅう"
    ],
    "kunyomi": [
      "す.む",
      "す.まう",
      "-ず.まい"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "医",
    "hanViet": "Y, Ế",
    "meaning": "chữa bệnh, thầy thuốc",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "い.やす",
      "い.する",
      "くすし"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "hễ 匸 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "究",
    "hanViet": "CỨU",
    "meaning": "kết cục, suy xét tỉ mỉ",
    "onyomi": [
      "きゅう",
      "く"
    ],
    "kunyomi": [
      "きわ.める"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "huyệt 穴 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "者",
    "hanViet": "GIẢ",
    "meaning": "người, một đại từ thay thế",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "もの"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "lão 老 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "研",
    "hanViet": "NGHIÊN, NGHIỄN",
    "meaning": "nghiền, mài, tìm tòi",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "と.ぐ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thạch 石 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "場",
    "hanViet": "TRÀNG, TRƯỜNG",
    "meaning": "vùng, cái sân",
    "onyomi": [
      "じょう",
      "ちょう"
    ],
    "kunyomi": [
      "ば"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "朝",
    "hanViet": "TRIÊU, TRIỀU, TRÀO",
    "meaning": "buổi sáng, chầu vua, triều vua, triều đại",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "あさ"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "nguyệt 月 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "答",
    "hanViet": "ĐÁP",
    "meaning": "trả lời, báo đáp",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "こた.える",
      "こた.え"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "買",
    "hanViet": "MÃI",
    "meaning": "mua, sắm, tậu",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "か.う"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "道",
    "hanViet": "ĐÁO, ĐẠO",
    "meaning": "đường, tia, đạo, nói",
    "onyomi": [
      "どう",
      "とう"
    ],
    "kunyomi": [
      "みち",
      "いう"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "楽",
    "hanViet": "LẠC",
    "meaning": "sung sướng",
    "onyomi": [
      "がく",
      "らく",
      "ごう"
    ],
    "kunyomi": [
      "たの.しい",
      "たの.しむ",
      "この.む"
    ],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "mộc 木 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "事",
    "hanViet": "SỰ",
    "meaning": "việc, làm việc, thờ",
    "onyomi": [
      "じ",
      "ず"
    ],
    "kunyomi": [
      "こと",
      "つか.う",
      "つか.える"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "quyết 亅 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "使",
    "hanViet": "SỨ, SỬ",
    "meaning": "sứ giả, đi sứ, khiến cho, sai khiến",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "つか.う",
      "つか.い",
      "-つか.い",
      "-づか.い"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "始",
    "hanViet": "THUỶ, THÍ, THỈ",
    "meaning": "bắt đầu, mới, trước",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "はじ.める",
      "-はじ.める",
      "はじ.まる"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "服",
    "hanViet": "PHỤC",
    "meaning": "quần áo, phục tùng, phục dịch, làm việc",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "nguyệt 月 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "物",
    "hanViet": "VẬT",
    "meaning": "con vật, đồ vật",
    "onyomi": [
      "ぶつ",
      "もつ"
    ],
    "kunyomi": [
      "もの",
      "もの-"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "ngưu 牛 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "屋",
    "hanViet": "ỐC",
    "meaning": "nhà, mui xe",
    "onyomi": [
      "おく"
    ],
    "kunyomi": [
      "や"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thi 尸 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "度",
    "hanViet": "ĐẠC, ĐỘ",
    "meaning": "đo lường, mức độ, lần",
    "onyomi": [
      "ど",
      "と",
      "たく"
    ],
    "kunyomi": [
      "たび",
      "-た.い"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "nghiễm 广 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "待",
    "hanViet": "ĐÃI",
    "meaning": "đối xử, tiếp đãi, đợi, chờ",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "ま.つ",
      "-ま.ち"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "xích 彳 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "持",
    "hanViet": "TRÌ",
    "meaning": "cầm, giữ, nắm",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "も.つ",
      "-も.ち",
      "も.てる"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "界",
    "hanViet": "GIỚI",
    "meaning": "ranh giới, giới hạn",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "điền 田 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "発",
    "hanViet": "PHÁT",
    "meaning": "Hán văn Nhật Bản dùng như chữ 發",
    "onyomi": [
      "はつ",
      "ほつ"
    ],
    "kunyomi": [
      "た.つ",
      "あば.く",
      "おこ.る",
      "つか.わす",
      "はな.つ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "bát 癶 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "送",
    "hanViet": "TỐNG",
    "meaning": "đưa, cho, biếu, đưa tiễn",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "おく.る"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "重",
    "hanViet": "TRÙNG, TRỌNG",
    "meaning": "trùng, lặp lại, lần, nặng",
    "onyomi": [
      "じゅう",
      "ちょう"
    ],
    "kunyomi": [
      "え",
      "おも.い",
      "おも.り",
      "おも.なう",
      "かさ.ねる",
      "かさ.なる",
      "おも"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "lý 里 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "起",
    "hanViet": "KHỈ, KHỞI",
    "meaning": "bắt đầu, đứng dậy, bắt đầu",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "お.きる",
      "お.こる",
      "お.こす",
      "おこ.す",
      "た.つ"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "tẩu 走 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "院",
    "hanViet": "VIỆN",
    "meaning": "tường bao chung quanh, nơi, chỗ, toà quan",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "phụ 阜 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "終",
    "hanViet": "CHUNG",
    "meaning": "hết, cuối, kết thúc",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "お.わる",
      "-お.わる",
      "おわ.る",
      "お.える",
      "つい",
      "つい.に"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "習",
    "hanViet": "TẬP",
    "meaning": "học đi học lại, luyện tập, quen",
    "onyomi": [
      "しゅう",
      "じゅ"
    ],
    "kunyomi": [
      "なら.う",
      "なら.い"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "vũ 羽 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "転",
    "hanViet": "CHUYỂN",
    "meaning": "quay vòng, chuyển, đổi",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [
      "ころ.がる",
      "ころ.げる",
      "ころ.がす",
      "ころ.ぶ",
      "まろ.ぶ",
      "うたた",
      "うつ.る",
      "くる.めく"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "xa 車 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "運",
    "hanViet": "VẬN",
    "meaning": "sự may mắn, vận may, sự chuyên trở",
    "onyomi": [
      "うん"
    ],
    "kunyomi": [
      "はこ.ぶ"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "開",
    "hanViet": "KHAI",
    "meaning": "mở ra, nở (hoa), một phần chia",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "ひら.く",
      "ひら.き",
      "-びら.き",
      "ひら.ける",
      "あ.く",
      "あ.ける"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "môn 門 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "集",
    "hanViet": "TẬP",
    "meaning": "tập (sách), tụ hợp lại",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "あつ.まる",
      "あつ.める",
      "つど.う"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "chuy 隹 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "飲",
    "hanViet": "ẤM, ẨM",
    "meaning": "uống, nước uống, thuốc nước",
    "onyomi": [
      "いん",
      "おん"
    ],
    "kunyomi": [
      "の.む",
      "-の.み"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "thực 食 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "業",
    "hanViet": "NGHIỆP",
    "meaning": "nghề nghiệp, sự nghiệp",
    "onyomi": [
      "ぎょう",
      "ごう"
    ],
    "kunyomi": [
      "わざ"
    ],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "mộc 木 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "漢",
    "hanViet": "HÁN",
    "meaning": "đời nhà Hán, sông Hán, sông Ngân Hà",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "歌",
    "hanViet": "CA",
    "meaning": "hát, bài hát, khúc ca",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "うた",
      "うた.う"
    ],
    "jlpt": "N4",
    "strokeCount": 14,
    "radical": "khiếm 欠 (+10 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "親",
    "hanViet": "THÂN, THẤN",
    "meaning": "cha mẹ, ruột thịt, thân cận, gần gũi",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "おや",
      "おや-",
      "した.しい",
      "した.しむ"
    ],
    "jlpt": "N4",
    "strokeCount": 16,
    "radical": "kiến 見 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "病",
    "hanViet": "BỆNH",
    "meaning": "bệnh tật",
    "onyomi": [
      "びょう",
      "へい"
    ],
    "kunyomi": [
      "や.む",
      "-や.み",
      "やまい"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "nạch 疒 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "別",
    "hanViet": "BIỆT",
    "meaning": "chia tay, xa cách, khác biệt, quay, ngoảnh, chuyển",
    "onyomi": [
      "べつ"
    ],
    "kunyomi": [
      "わか.れる",
      "わ.ける"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "đao 刀 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "注",
    "hanViet": "CHÚ",
    "meaning": "rót nước, chú thích, giải nghĩa, chú ý",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "そそ.ぐ",
      "さ.す",
      "つ.ぐ"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "洋",
    "hanViet": "DƯƠNG",
    "meaning": "tràn trề, phong phú, biển",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "特",
    "hanViet": "ĐẶC",
    "meaning": "con trâu đực, riêng biệt, đặc biệt, khác hẳn mọi thứ",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "ngưu 牛 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "意",
    "hanViet": "Y, Ý",
    "meaning": "ý, ý nghĩ, dự tính, ý định, lòng dạ",
    "onyomi": [
      "い"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "味",
    "hanViet": "VỊ",
    "meaning": "mùi, hương vị",
    "onyomi": [
      "み"
    ],
    "kunyomi": [
      "あじ",
      "あじ.わう"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "勉",
    "hanViet": "MIỄN, MẪN",
    "meaning": "cố sức, cố gắng, cố sức, cố gắng",
    "onyomi": [
      "べん"
    ],
    "kunyomi": [
      "つと.める"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "lực 力 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "旅",
    "hanViet": "LỮ",
    "meaning": "quán trọ, lang thang, du lịch, lữ (gồm 500 lính)",
    "onyomi": [
      "りょ"
    ],
    "kunyomi": [
      "たび"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "phương 方 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "員",
    "hanViet": "VIÊN, VÂN",
    "meaning": "người, kẻ, gã",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "動",
    "hanViet": "ĐỘNG",
    "meaning": "động đậy, cử động, hoạt động",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "うご.く",
      "うご.かす"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "lực 力 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "悪",
    "hanViet": "ÁC",
    "meaning": "ác độc, xấu xí",
    "onyomi": [
      "あく",
      "お"
    ],
    "kunyomi": [
      "わる.い",
      "わる-",
      "あ.し",
      "にく.い",
      "-にく.い",
      "ああ",
      "いずくに",
      "いずくんぞ",
      "にく.む"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "族",
    "hanViet": "THẤU, TẤU, TỘC",
    "meaning": "loài, dòng dõi, họ",
    "onyomi": [
      "ぞく"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "phương 方 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "着",
    "hanViet": "HỒ, TRƯỚC, TRỨ, TRỮ",
    "meaning": "mặc áo, biên soạn sách, nước cờ",
    "onyomi": [
      "ちゃく",
      "じゃく"
    ],
    "kunyomi": [
      "き.る",
      "-ぎ",
      "き.せる",
      "-き.せ",
      "つ.く",
      "つ.ける"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "mục 目 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "野",
    "hanViet": "DÃ",
    "meaning": "đồng nội, không thuần, rất, vô cùng",
    "onyomi": [
      "や",
      "しょ"
    ],
    "kunyomi": [
      "の",
      "の-"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "lý 里 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "風",
    "hanViet": "PHONG, PHÓNG, PHÚNG",
    "meaning": "gió, tục, thói quen, bệnh phong",
    "onyomi": [
      "ふう",
      "ふ"
    ],
    "kunyomi": [
      "かぜ",
      "かざ-",
      "-かぜ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "phong 風 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "新",
    "hanViet": "TÂN",
    "meaning": "mới mẻ",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "あたら.しい",
      "あら.た",
      "あら-",
      "にい-"
    ],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "cân 斤 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "問",
    "hanViet": "VẤN",
    "meaning": "hỏi, tra xét, hỏi thăm",
    "onyomi": [
      "もん"
    ],
    "kunyomi": [
      "と.う",
      "と.い",
      "とん"
    ],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "銀",
    "hanViet": "NGÂN",
    "meaning": "bạc, Ag",
    "onyomi": [
      "ぎん"
    ],
    "kunyomi": [
      "しろがね"
    ],
    "jlpt": "N4",
    "strokeCount": 14,
    "radical": "kim 金 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "題",
    "hanViet": "ĐỀ, ĐỆ",
    "meaning": "trán (trên đầu), đề bài, tiêu đề",
    "onyomi": [
      "だい"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "館",
    "hanViet": "QUÁN",
    "meaning": "nhà, nơi ở, quán trọ",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "やかた",
      "たて"
    ],
    "jlpt": "N4",
    "strokeCount": 16,
    "radical": "thực 食 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "駅",
    "hanViet": "DỊCH",
    "meaning": "Station",
    "onyomi": [
      "えき"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 14,
    "radical": "mã 馬 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "料",
    "hanViet": "LIÊU, LIỆU",
    "meaning": "đo, lường tính, liệu đoán, vuốt ve",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "đẩu 斗 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "映",
    "hanViet": "ÁNH",
    "meaning": "ánh sáng",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "うつ.る",
      "うつ.す",
      "は.える",
      "-ば.え"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "私",
    "hanViet": "TƯ",
    "meaning": "riêng, việc riêng, của riêng",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "わたくし",
      "わたし"
    ],
    "jlpt": "N4",
    "strokeCount": 7,
    "radical": "hoà 禾 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "帰",
    "hanViet": "QUY",
    "meaning": "trở về",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "かえ.る",
      "かえ.す",
      "おく.る",
      "とつ.ぐ"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "cân 巾 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "春",
    "hanViet": "XUÂN",
    "meaning": "mùa xuân",
    "onyomi": [
      "しゅん"
    ],
    "kunyomi": [
      "はる"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "昼",
    "hanViet": "TRÚ",
    "meaning": "ban ngày",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "ひる"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "thi 尸 (+6 nét), nhật 日 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "秋",
    "hanViet": "THU, THÂU",
    "meaning": "mùa thu, dây thắng đái, mùa thu",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "あき",
      "とき"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "hoà 禾 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "計",
    "hanViet": "KÊ, KẾ",
    "meaning": "mưu kế, kế sách",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "はか.る",
      "はか.らう"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "ngôn 言 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "建",
    "hanViet": "KIẾN, KIỂN",
    "meaning": "xây dựng",
    "onyomi": [
      "けん",
      "こん"
    ],
    "kunyomi": [
      "た.てる",
      "た.て",
      "-だ.て",
      "た.つ"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "dẫn 廴 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "英",
    "hanViet": "ANH",
    "meaning": "hoa, người tài giỏi, nước Anh",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "はなぶさ"
    ],
    "jlpt": "N4",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "飯",
    "hanViet": "PHÃN, PHẠN",
    "meaning": "cơm, ăn cơm, cơm",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "めし"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "thực 食 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "曜",
    "hanViet": "DIỆU",
    "meaning": "bóng sáng mặt trời, chói mắt",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 18,
    "radical": "nhật 日 (+14 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "品",
    "hanViet": "PHẨM",
    "meaning": "đồ vật, chủng loại, phẩm hàm, hạng quan, hạng, cấp",
    "onyomi": [
      "ひん",
      "ほん"
    ],
    "kunyomi": [
      "しな"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "khẩu 口 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "急",
    "hanViet": "CẤP",
    "meaning": "vội vàng, kíp, nóng nảy",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "いそ.ぐ",
      "いそ.ぎ",
      "せ.く"
    ],
    "jlpt": "N4",
    "strokeCount": 9,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "真",
    "hanViet": "CHÂN",
    "meaning": "thật, thực, người tu hành",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ま",
      "ま-",
      "まこと"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "mục 目 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "堂",
    "hanViet": "ĐÀNG, ĐƯỜNG",
    "meaning": "nhà chính, gian nhà giữa, nhà chính, gian nhà giữa",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [],
    "jlpt": "N4",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "試",
    "hanViet": "THÍ",
    "meaning": "thử, thử nghiệm, thi tài",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "こころ.みる",
      "ため.す"
    ],
    "jlpt": "N4",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "借",
    "hanViet": "TÁ",
    "meaning": "vay mượn",
    "onyomi": [
      "しゃく"
    ],
    "kunyomi": [
      "か.りる"
    ],
    "jlpt": "N4",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "験",
    "hanViet": "NGHIỆM",
    "meaning": "chứng nghiệm, kiểm nghiệm, hiệu nghiệm",
    "onyomi": [
      "けん",
      "げん"
    ],
    "kunyomi": [
      "あかし",
      "しるし",
      "ため.す",
      "ためし"
    ],
    "jlpt": "N4",
    "strokeCount": 18,
    "radical": "mã 馬 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "質",
    "hanViet": "CHÍ, CHẤT",
    "meaning": "thể chất (rắn, lỏng, khí), tư chất, chất phác, mộc mạc",
    "onyomi": [
      "しつ",
      "しち",
      "ち"
    ],
    "kunyomi": [
      "たち",
      "ただ.す",
      "もと",
      "わりふ"
    ],
    "jlpt": "N4",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "貸",
    "hanViet": "THẢI, THẮC",
    "meaning": "vay mượn, cho vay",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "か.す",
      "か.し-",
      "かし-"
    ],
    "jlpt": "N4",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 5"
  }
]

export const N3_KANJI: JoyoKanjiEntry[] = [
  {
    "kanji": "才",
    "hanViet": "TÀI",
    "meaning": "tài năng, mới, vừa mới",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 3,
    "radical": "thủ 手 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "王",
    "hanViet": "VƯƠNG, VƯỢNG",
    "meaning": "vua",
    "onyomi": [
      "おう",
      "-のう"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "ngọc 玉 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "石",
    "hanViet": "THẠCH, ĐẠN",
    "meaning": "đá, tạ (đơn vị đo, bằng 120 cân)",
    "onyomi": [
      "せき",
      "しゃく",
      "こく"
    ],
    "kunyomi": [
      "いし"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "thạch 石 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "内",
    "hanViet": "NẠP, NỘI",
    "meaning": "bên trong",
    "onyomi": [
      "ない",
      "だい"
    ],
    "kunyomi": [
      "うち"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "nhập 入 (+2 nét), quynh 冂 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "太",
    "hanViet": "THÁI",
    "meaning": "cao, to, rất",
    "onyomi": [
      "たい",
      "た"
    ],
    "kunyomi": [
      "ふと.い",
      "ふと.る"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "đại 大 (+1 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "引",
    "hanViet": "DẤN, DẪN",
    "meaning": "dương cung, dẫn, dắt, gây ra",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [
      "ひ.く",
      "ひ.き",
      "ひ.き-",
      "-び.き",
      "ひ.ける"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "cung 弓 (+1 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "市",
    "hanViet": "THỊ",
    "meaning": "thị xã, cái chợ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "いち"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "cân 巾 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "他",
    "hanViet": "THA, ĐÀ",
    "meaning": "nó, khác",
    "onyomi": [
      "た"
    ],
    "kunyomi": [
      "ほか"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "号",
    "hanViet": "HIỆU, HÀO",
    "meaning": "hiệu (phù hiệu, biển hiệu, ...), làm hiệu, dấu hiệu, gào khóc, kêu gào",
    "onyomi": [
      "ごう"
    ],
    "kunyomi": [
      "さけ.ぶ",
      "よびな"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "平",
    "hanViet": "BIỀN, BÌNH",
    "meaning": "bằng, âm bằng",
    "onyomi": [
      "へい",
      "びょう",
      "ひょう"
    ],
    "kunyomi": [
      "たい.ら",
      "-だいら",
      "ひら",
      "ひら-"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "can 干 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "打",
    "hanViet": "TÁ, ĐẢ",
    "meaning": "tá, 12, đánh, đập",
    "onyomi": [
      "だ",
      "だあす"
    ],
    "kunyomi": [
      "う.つ",
      "う.ち-",
      "ぶ.つ"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "thủ 手 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "申",
    "hanViet": "THÂN",
    "meaning": "nói, trình bày, Thân (ngôi thứ 9 hàng Chi)",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "もう.す",
      "もう.し-",
      "さる"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "điền 田 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "礼",
    "hanViet": "LỄ",
    "meaning": "lễ nghi",
    "onyomi": [
      "れい",
      "らい"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "kỳ 示 (+1 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "耳",
    "hanViet": "NHĨ",
    "meaning": "cái tai, cái quai cầm, vậy, thôi (tiếng dứt câu)",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "みみ"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhĩ 耳 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "交",
    "hanViet": "GIAO",
    "meaning": "trao cho, giao cho, tiếp giáp",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "まじ.わる",
      "まじ.える",
      "ま.じる",
      "まじ.る",
      "ま.ざる",
      "ま.ぜる",
      "-か.う",
      "か.わす",
      "かわ.す",
      "こもごも"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "đầu 亠 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "光",
    "hanViet": "QUANG",
    "meaning": "sáng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "ひか.る",
      "ひかり"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhân 儿 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "回",
    "hanViet": "HỐI, HỒI",
    "meaning": "về, đạo Hồi, Hồi giáo",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [
      "まわ.る",
      "-まわ.る",
      "-まわ.り",
      "まわ.す",
      "-まわ.す",
      "まわ.し-",
      "-まわ.し",
      "もとお.る",
      "か.える"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "vi 囗 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "当",
    "hanViet": "ĐANG, ĐÁNG, ĐƯƠNG",
    "meaning": "xứng nhau, ngang nhau, tương đương, tương ứng, nên, đáng, thẳng, trực tiếp",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "あ.たる",
      "あ.たり",
      "あ.てる",
      "あ.て",
      "まさ.に",
      "まさ.にべし"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "tiểu 小 (+3 nét), kệ 彐 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "米",
    "hanViet": "MỄ",
    "meaning": "gạo, mét (đơn vị đo chiều dài)",
    "onyomi": [
      "べい",
      "まい",
      "めえとる"
    ],
    "kunyomi": [
      "こめ",
      "よね"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "mễ 米 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "声",
    "hanViet": "THANH",
    "meaning": "tiếng, âm thanh",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "こえ",
      "こわ-"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "sĩ 士 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "形",
    "hanViet": "HÌNH",
    "meaning": "dáng vẻ, hình dáng",
    "onyomi": [
      "けい",
      "ぎょう"
    ],
    "kunyomi": [
      "かた",
      "-がた",
      "かたち",
      "なり"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "sam 彡 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "草",
    "hanViet": "THẢO, TẠO",
    "meaning": "cỏ, thảo mộc",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "くさ",
      "くさ-",
      "-ぐさ"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thảo 艸 (+6 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "化",
    "hanViet": "HOA, HOÁ",
    "meaning": "biến hoá, biến đổi",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "ば.ける",
      "ば.かす",
      "ふ.ける",
      "け.する"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "tỷ 匕 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "両",
    "hanViet": "LƯỠNG, LƯỢNG, LẠNG",
    "meaning": "hai, 2",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "てる",
      "ふたつ"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhất 一 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "全",
    "hanViet": "TOÀN",
    "meaning": "tất cả, toàn bộ",
    "onyomi": [
      "ぜん"
    ],
    "kunyomi": [
      "まった.く",
      "すべ.て"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhập 入 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "向",
    "hanViet": "HƯỚNG, HƯỞNG",
    "meaning": "hướng, phía, hướng vào, nhằm vào",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "む.く",
      "む.い",
      "-む.き",
      "む.ける",
      "-む.け",
      "む.かう",
      "む.かい",
      "む.こう",
      "む.こう-",
      "むこ",
      "むか.い"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "曲",
    "hanViet": "KHÚC",
    "meaning": "cong queo, khúc, đoạn",
    "onyomi": [
      "きょく"
    ],
    "kunyomi": [
      "ま.がる",
      "ま.げる",
      "くま"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "viết 曰 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "次",
    "hanViet": "THỨ, TƯ",
    "meaning": "sau (không phải đầu tiên), tiếp theo, thứ bậc, lần, lượt",
    "onyomi": [
      "じ",
      "し"
    ],
    "kunyomi": [
      "つ.ぐ",
      "つぎ"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "khiếm 欠 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "直",
    "hanViet": "TRỊ, TRỰC",
    "meaning": "thẳng",
    "onyomi": [
      "ちょく",
      "じき",
      "じか"
    ],
    "kunyomi": [
      "ただ.ちに",
      "なお.す",
      "-なお.す",
      "なお.る",
      "なお.き",
      "す.ぐ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "mục 目 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "活",
    "hanViet": "HOẠT, QUẠT",
    "meaning": "hoạt động",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [
      "い.きる",
      "い.かす",
      "い.ける"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "点",
    "hanViet": "ĐIỂM",
    "meaning": "điểm, chấm, nốt, giờ",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [
      "つ.ける",
      "つ.く",
      "た.てる",
      "さ.す",
      "とぼ.す",
      "とも.す",
      "ぼち"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "hoả 火 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "科",
    "hanViet": "KHOA",
    "meaning": "khoa, bộ môn, xử tội, kết án, khoa cử, khoa thi",
    "onyomi": [
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "hoà 禾 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "首",
    "hanViet": "THÚ, THỦ",
    "meaning": "thú tội, đầu thú, đầu, chúa, chủ, trùm",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "くび"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thủ 首 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "欠",
    "hanViet": "KHIẾM",
    "meaning": "thiếu thốn, nợ, ngáp",
    "onyomi": [
      "けつ",
      "けん"
    ],
    "kunyomi": [
      "か.ける",
      "か.く"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "khiếm 欠 (+0 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "由",
    "hanViet": "DO, YÊU",
    "meaning": "do, bởi vì",
    "onyomi": [
      "ゆ",
      "ゆう",
      "ゆい"
    ],
    "kunyomi": [
      "よし",
      "よ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "điền 田 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "民",
    "hanViet": "DÂN, MIÊN",
    "meaning": "người dân, người, dân",
    "onyomi": [
      "みん"
    ],
    "kunyomi": [
      "たみ"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "thị 氏 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "付",
    "hanViet": "PHÓ, PHỤ",
    "meaning": "giao phó",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "つ.ける",
      "-つ.ける",
      "-づ.ける",
      "つ.け",
      "つ.け-",
      "-つ.け",
      "-づ.け",
      "-づけ",
      "つ.く",
      "-づ.く",
      "つ.き",
      "-つ.き",
      "-つき",
      "-づ.き",
      "-づき"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "失",
    "hanViet": "THẤT",
    "meaning": "lỡ, sai lầm, mất",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "うしな.う",
      "う.せる"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "đại 大 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "必",
    "hanViet": "TẤT",
    "meaning": "tất yếu, ắt, nhất định, cần phải",
    "onyomi": [
      "ひつ"
    ],
    "kunyomi": [
      "かなら.ず"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "tâm 心 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "未",
    "hanViet": "MÙI, VỊ",
    "meaning": "Mùi (ngôi thứ 8 hàng Chi), chưa",
    "onyomi": [
      "み",
      "び"
    ],
    "kunyomi": [
      "いま.だ",
      "ま.だ",
      "ひつじ"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "mộc 木 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "末",
    "hanViet": "MẠT",
    "meaning": "cuối cùng, ngọn",
    "onyomi": [
      "まつ",
      "ばつ"
    ],
    "kunyomi": [
      "すえ"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "mộc 木 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "記",
    "hanViet": "KÍ, KÝ",
    "meaning": "nhớ, ghi chép, viết",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "しる.す"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "ngôn 言 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "組",
    "hanViet": "TỔ",
    "meaning": "dây tơ mỏng và to bản, liên lạc",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "く.む",
      "くみ",
      "-ぐみ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "船",
    "hanViet": "THUYỀN",
    "meaning": "cái thuyền",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "ふね",
      "ふな-"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "chu 舟 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "雪",
    "hanViet": "TUYẾT",
    "meaning": "tuyết",
    "onyomi": [
      "せつ"
    ],
    "kunyomi": [
      "ゆき"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "vũ 雨 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "支",
    "hanViet": "CHI",
    "meaning": "cấp cho, chi cấp",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "ささ.える",
      "つか.える",
      "か.う"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "chi 支 (+0 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "助",
    "hanViet": "TRỢ",
    "meaning": "trợ giúp",
    "onyomi": [
      "じょ"
    ],
    "kunyomi": [
      "たす.ける",
      "たす.かる",
      "す.ける",
      "すけ"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "lực 力 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "君",
    "hanViet": "QUÂN",
    "meaning": "chỉ người con trai, vua, chồng",
    "onyomi": [
      "くん"
    ],
    "kunyomi": [
      "きみ",
      "-ぎみ"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "対",
    "hanViet": "ĐỐI",
    "meaning": "Vis-a-vis, Opposite, Even",
    "onyomi": [
      "たい",
      "つい"
    ],
    "kunyomi": [
      "あいて",
      "こた.える",
      "そろ.い",
      "つれあ.い",
      "なら.ぶ",
      "むか.う"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thốn 寸 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "局",
    "hanViet": "CỤC",
    "meaning": "ván (cờ), cuộc, bữa, phần, bộ phận",
    "onyomi": [
      "きょく"
    ],
    "kunyomi": [
      "つぼね"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thi 尸 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "役",
    "hanViet": "DỊCH",
    "meaning": "đi thú ngoài biên thuỳ, việc quân",
    "onyomi": [
      "やく",
      "えき"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "xích 彳 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "投",
    "hanViet": "ĐẦU, ĐẬU",
    "meaning": "ném, quẳng, đưa vào, bỏ vào, hợp với nhau",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "な.げる",
      "-な.げ"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "決",
    "hanViet": "HUYẾT, KHUYẾT, QUYẾT",
    "meaning": "khơi, tháo, vỡ đê, quyết tâm, nhất định",
    "onyomi": [
      "けつ"
    ],
    "kunyomi": [
      "き.める",
      "-ぎ.め",
      "き.まる",
      "さ.く"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "身",
    "hanViet": "QUYÊN, THÂN",
    "meaning": "thân thể",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "み"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thân 身 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "馬",
    "hanViet": "MÃ",
    "meaning": "con ngựa",
    "onyomi": [
      "ば"
    ],
    "kunyomi": [
      "うま",
      "うま-",
      "ま"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "mã 馬 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "番",
    "hanViet": "BA, BÀ, PHAN, PHIÊN",
    "meaning": "khoẻ mạnh, phiên, lượt, lần, người Phiên",
    "onyomi": [
      "ばん"
    ],
    "kunyomi": [
      "つが.い"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "điền 田 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "絵",
    "hanViet": "HỘI",
    "meaning": "Picture, Drawing, Painting",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "数",
    "hanViet": "SÁC, SỐ, SỔ, XÚC",
    "meaning": "số lượng, một vài, đếm",
    "onyomi": [
      "すう",
      "す",
      "さく",
      "そく",
      "しゅ"
    ],
    "kunyomi": [
      "かず",
      "かぞ.える",
      "しばしば",
      "せ.める",
      "わずらわ.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "phác 攴 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "所",
    "hanViet": "SỞ",
    "meaning": "nơi, chỗ, viện, sở, đồn",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "ところ",
      "-ところ",
      "どころ",
      "とこ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "hộ 戶 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "具",
    "hanViet": "CỤ",
    "meaning": "đồ dùng",
    "onyomi": [
      "ぐ"
    ],
    "kunyomi": [
      "そな.える",
      "つぶさ.に"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "bát 八 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "受",
    "hanViet": "THÂU, THỌ, THỤ",
    "meaning": "chịu đựng, được, bị, mắc phải",
    "onyomi": [
      "じゅ"
    ],
    "kunyomi": [
      "う.ける",
      "-う.け",
      "う.かる"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "hựu 又 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "和",
    "hanViet": "HOÀ, HOẠ, HỒ",
    "meaning": "cùng, và, trộn lẫn, hoạ theo, hoà theo (thơ, nhạc)",
    "onyomi": [
      "わ",
      "お",
      "か"
    ],
    "kunyomi": [
      "やわ.らぐ",
      "やわ.らげる",
      "なご.む",
      "なご.やか",
      "あ.える"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "定",
    "hanViet": "ĐÍNH, ĐỊNH",
    "meaning": "định, yên lặng",
    "onyomi": [
      "てい",
      "じょう"
    ],
    "kunyomi": [
      "さだ.める",
      "さだ.まる",
      "さだ.か"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "実",
    "hanViet": "CHÍ, THẬT, THỰC",
    "meaning": "Reality, Truth",
    "onyomi": [
      "じつ",
      "しつ"
    ],
    "kunyomi": [
      "み",
      "みの.る",
      "まこと",
      "みの",
      "みち.る"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "泳",
    "hanViet": "VỊNH",
    "meaning": "lặn dưới nước",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "およ.ぐ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "苦",
    "hanViet": "CỔ, KHỔ",
    "meaning": "khổ cực, cố gắng hết sức",
    "onyomi": [
      "く"
    ],
    "kunyomi": [
      "くる.しい",
      "-ぐる.しい",
      "くる.しむ",
      "くる.しめる",
      "にが.い",
      "にが.る"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "表",
    "hanViet": "BIỂU",
    "meaning": "bên ngoài, tỏ rõ, tuyên bố, tiêu biểu, tờ biểu",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [
      "おもて",
      "-おもて",
      "あらわ.す",
      "あらわ.れる",
      "あら.わす"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "y 衣 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "部",
    "hanViet": "BẪU, BỘ",
    "meaning": "bộ, khoa, ngành, ban, bộ (sách, phim,...)",
    "onyomi": [
      "ぶ"
    ],
    "kunyomi": [
      "-べ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ấp 邑 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "乗",
    "hanViet": "THẶNG, THỪA",
    "meaning": "cỗ xe, sách ghi chép, cưỡi",
    "onyomi": [
      "じょう",
      "しょう"
    ],
    "kunyomi": [
      "の.る",
      "-の.り",
      "の.せる"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "triệt 丿 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "客",
    "hanViet": "KHÁCH",
    "meaning": "khách, người ngoài",
    "onyomi": [
      "きゃく",
      "かく"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "miên 宀 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "相",
    "hanViet": "TƯƠNG, TƯỚNG",
    "meaning": "qua lại lẫn nhau, tự mình xem xét, vẻ mặt, tướng mạo",
    "onyomi": [
      "そう",
      "しょう"
    ],
    "kunyomi": [
      "あい-"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "美",
    "hanViet": "MĨ, MỸ",
    "meaning": "đẹp, nước Mỹ, châu Mỹ",
    "onyomi": [
      "び",
      "み"
    ],
    "kunyomi": [
      "うつく.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "dương 羊 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "負",
    "hanViet": "PHỤ",
    "meaning": "cậy thế, ỷ thế người khác, vác, cõng, làm trái ngược",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "ま.ける",
      "ま.かす",
      "お.う"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "bối 貝 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "談",
    "hanViet": "ĐÀM",
    "meaning": "bàn bạc",
    "onyomi": [
      "だん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "要",
    "hanViet": "YÊU, YẾU",
    "meaning": "đòi hỏi, quan trọng, nhất định phải",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "い.る",
      "かなめ"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "á 襾 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "勝",
    "hanViet": "THĂNG, THẮNG",
    "meaning": "được, thắng lợi, hơn, giỏi, tốt đẹp",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "か.つ",
      "-が.ち",
      "まさ.る",
      "すぐ.れる",
      "かつ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "lực 力 (+10 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "速",
    "hanViet": "TỐC",
    "meaning": "nhanh chóng, tốc độ",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "はや.い",
      "はや-",
      "はや.める",
      "すみ.やか"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "配",
    "hanViet": "PHỐI",
    "meaning": "kết hợp, giao hợp, pha, hoà",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "くば.る"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "dậu 酉 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "酒",
    "hanViet": "TỬU",
    "meaning": "rượu",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "さけ",
      "さか-"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "dậu 酉 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "進",
    "hanViet": "TIẾN, TẤN",
    "meaning": "đi lên, tiến lên",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "すす.む",
      "すす.める"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "sước 辵 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "落",
    "hanViet": "LẠC",
    "meaning": "rơi, rụng, xóm (đơn vị hành chính)",
    "onyomi": [
      "らく"
    ],
    "kunyomi": [
      "お.ちる",
      "お.ち",
      "お.とす"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thảo 艸 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "葉",
    "hanViet": "DIẾP, DIỆP",
    "meaning": "lá cây",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "は"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thảo 艸 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "路",
    "hanViet": "LẠC, LỘ",
    "meaning": "đường đi",
    "onyomi": [
      "ろ",
      "る"
    ],
    "kunyomi": [
      "-じ",
      "みち"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "túc 足 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "鳴",
    "hanViet": "MINH, Ô",
    "meaning": "hót (chim), gáy (gà)",
    "onyomi": [
      "めい"
    ],
    "kunyomi": [
      "な.く",
      "な.る",
      "な.らす"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "điểu 鳥 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "横",
    "hanViet": "HOÀNH, HOẠNH, QUÁNG",
    "meaning": "ngang",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "よこ"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "mộc 木 (+11 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "調",
    "hanViet": "ĐIỀU, ĐIỆU",
    "meaning": "chuyển, thay đổi, điều chỉnh, lên dây (đàn)",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "しら.べる",
      "しら.べ",
      "ととの.う",
      "ととの.える"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "頭",
    "hanViet": "ĐẦU",
    "meaning": "cái đầu",
    "onyomi": [
      "とう",
      "ず",
      "と"
    ],
    "kunyomi": [
      "あたま",
      "かしら",
      "-がしら",
      "かぶり"
    ],
    "jlpt": "N3",
    "strokeCount": 16,
    "radical": "hiệt 頁 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "顔",
    "hanViet": "NHAN",
    "meaning": "dáng mặt, vẻ mặt",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "かお"
    ],
    "jlpt": "N3",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "最",
    "hanViet": "TỐI",
    "meaning": "cực kỳ, hơn nhất, chót",
    "onyomi": [
      "さい",
      "しゅ"
    ],
    "kunyomi": [
      "もっと.も",
      "つま"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "quynh 冂 (+10 nét), viết 曰 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "争",
    "hanViet": "TRANH, TRÁNH",
    "meaning": "tranh giành, bàn luận, sai khác, khác biệt",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "あらそ.う",
      "いか.でか"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "quyết 亅 (+5 nét), đao 刀 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "伝",
    "hanViet": "TRUYỀN, TRUYỆN",
    "meaning": "truyền, truyện",
    "onyomi": [
      "でん",
      "てん"
    ],
    "kunyomi": [
      "つた.わる",
      "つた.える",
      "つた.う",
      "つだ.う",
      "-づた.い",
      "つて"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "共",
    "hanViet": "CUNG, CỘNG, CỦNG",
    "meaning": "cùng, chung, cộng",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "とも",
      "とも.に",
      "-ども"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "bát 八 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "好",
    "hanViet": "HIẾU, HẢO",
    "meaning": "ham, thích, tốt, hay, đẹp, sung sướng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "この.む",
      "す.く",
      "よ.い",
      "い.い"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nữ 女 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "成",
    "hanViet": "THÀNH",
    "meaning": "làm xong, hoàn thành",
    "onyomi": [
      "せい",
      "じょう"
    ],
    "kunyomi": [
      "な.る",
      "な.す",
      "-な.す"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "qua 戈 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "老",
    "hanViet": "LÃO",
    "meaning": "già, nhiều tuổi",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [
      "お.いる",
      "ふ.ける"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "lão 老 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "位",
    "hanViet": "VỊ",
    "meaning": "vị trí",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "くらい",
      "ぐらい"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "初",
    "hanViet": "SƠ",
    "meaning": "lần đầu, vừa mới, bắt đầu",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "はじ.め",
      "はじ.めて",
      "はつ",
      "はつ-",
      "うい-",
      "-そ.める",
      "-ぞ.め"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "đao 刀 (+5 nét), y 衣 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "利",
    "hanViet": "LỢI",
    "meaning": "lợi ích, công dụng, sắc, nhọn",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "き.く"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "đao 刀 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "努",
    "hanViet": "NỖ",
    "meaning": "cố gắng",
    "onyomi": [
      "ど"
    ],
    "kunyomi": [
      "つと.める"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "lực 力 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "労",
    "hanViet": "LAO",
    "meaning": "nặng nhọc",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [
      "ろう.する",
      "いたわ.る",
      "いた.ずき",
      "ねぎら",
      "つか.れる",
      "ねぎら.う"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "lực 力 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "命",
    "hanViet": "MỆNH",
    "meaning": "mạng, lời sai khiến",
    "onyomi": [
      "めい",
      "みょう"
    ],
    "kunyomi": [
      "いのち"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "放",
    "hanViet": "PHÓNG, PHƯƠNG, PHỎNG",
    "meaning": "phóng, phi (ngựa)",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "はな.す",
      "-っぱな.し",
      "はな.つ",
      "はな.れる",
      "こ.く",
      "ほう.る"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "phác 攴 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "昔",
    "hanViet": "THÁC, THỐ, TÍCH, TỊCH",
    "meaning": "xưa, cũ, trước kia, đêm",
    "onyomi": [
      "せき",
      "しゃく"
    ],
    "kunyomi": [
      "むかし"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "育",
    "hanViet": "DỤC",
    "meaning": "nuôi nấng",
    "onyomi": [
      "いく"
    ],
    "kunyomi": [
      "そだ.つ",
      "そだ.ち",
      "そだ.てる",
      "はぐく.む"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "指",
    "hanViet": "CHỈ",
    "meaning": "ngón tay, chỉ, trỏ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "ゆび",
      "さ.す",
      "-さ.し"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "神",
    "hanViet": "THẦN",
    "meaning": "thần linh, thánh",
    "onyomi": [
      "しん",
      "じん"
    ],
    "kunyomi": [
      "かみ",
      "かん-",
      "こう-"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "kỳ 示 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "追",
    "hanViet": "TRUY, ĐÔI",
    "meaning": "đuổi theo, truy tìm, truy cứu, hồi tưởng, nhớ lại",
    "onyomi": [
      "つい"
    ],
    "kunyomi": [
      "お.う"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "戦",
    "hanViet": "CHIẾN",
    "meaning": "War, Battle, Match",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "いくさ",
      "たたか.う",
      "おのの.く",
      "そよ.ぐ",
      "わなな.く"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "qua 戈 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "良",
    "hanViet": "LƯƠNG",
    "meaning": "hiền lành, tốt",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "よ.い",
      "-よ.い",
      "い.い",
      "-い.い"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "cấn 艮 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "便",
    "hanViet": "TIỆN",
    "meaning": "thuận lợi, thuận tiện, ỉa, đái, phân, nước giải",
    "onyomi": [
      "べん",
      "びん"
    ],
    "kunyomi": [
      "たよ.り"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "働",
    "hanViet": "ĐỘNG",
    "meaning": "động đậy, cử động, hoạt động",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "はたら.く"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "庭",
    "hanViet": "THÍNH, ĐÌNH",
    "meaning": "sân trước",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "にわ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nghiễm 广 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "息",
    "hanViet": "TỨC",
    "meaning": "hơi thở, than vãn",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "いき"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "流",
    "hanViet": "LƯU",
    "meaning": "dòng nước, trôi, chảy",
    "onyomi": [
      "りゅう",
      "る"
    ],
    "kunyomi": [
      "なが.れる",
      "なが.れ",
      "なが.す",
      "-なが.す"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "消",
    "hanViet": "TIÊU",
    "meaning": "tiêu tan, tiêu biến",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "き.える",
      "け.す"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "都",
    "hanViet": "ĐÔ",
    "meaning": "tất cả, toàn bộ, đã, thủ phủ, thủ đô",
    "onyomi": [
      "と",
      "つ"
    ],
    "kunyomi": [
      "みやこ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ấp 邑 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "商",
    "hanViet": "THƯƠNG",
    "meaning": "buôn bán",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "あきな.う"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "深",
    "hanViet": "THÂM",
    "meaning": "sâu, khuya (đêm)",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ふか.い",
      "-ぶか.い",
      "ふか.まる",
      "ふか.める",
      "み-"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "球",
    "hanViet": "CẦU",
    "meaning": "cái khánh bằng ngọc, hình cầu, quả cầu, quả bóng",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "たま"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ngọc 玉 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "陽",
    "hanViet": "DƯƠNG",
    "meaning": "mặt trời, dương",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "ひ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "寒",
    "hanViet": "HÀN",
    "meaning": "lạnh",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "さむ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "miên 宀 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "悲",
    "hanViet": "BI",
    "meaning": "buồn, thương cảm",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "かな.しい",
      "かな.しむ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "期",
    "hanViet": "CƠ, KI, KY, KÌ, KỲ",
    "meaning": "thời kỳ, lúc, hẹn",
    "onyomi": [
      "き",
      "ご"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nguyệt 月 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "歯",
    "hanViet": "XỈ",
    "meaning": "răng, tuổi tác",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "よわい",
      "は",
      "よわ.い",
      "よわい.する"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "chỉ 止 (+8 nét), xỉ 齒 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "港",
    "hanViet": "CẢNG, HỐNG",
    "meaning": "bến cảng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "みなと"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "登",
    "hanViet": "ĐĂNG",
    "meaning": "lên, leo lên",
    "onyomi": [
      "とう",
      "と",
      "どう",
      "しょう",
      "ちょう"
    ],
    "kunyomi": [
      "のぼ.る",
      "あ.がる"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "bát 癶 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "亡",
    "hanViet": "VONG, VÔ",
    "meaning": "mất đi, chết, mất",
    "onyomi": [
      "ぼう",
      "もう"
    ],
    "kunyomi": [
      "な.い",
      "な.き-",
      "ほろ.びる",
      "ほろ.ぶ",
      "ほろ.ぼす"
    ],
    "jlpt": "N3",
    "strokeCount": 3,
    "radical": "đầu 亠 (+1 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "合",
    "hanViet": "CÁP, HIỆP, HẠP, HỢP",
    "meaning": "cửa ngách - giản thể của chữ 閤, hợp, vừa ý, nhắm mắt",
    "onyomi": [
      "ごう",
      "がっ",
      "かっ"
    ],
    "kunyomi": [
      "あ.う",
      "-あ.う",
      "あ.い",
      "あい-",
      "-あ.い",
      "-あい",
      "あ.わす",
      "あ.わせる",
      "-あ.わせる"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "予",
    "hanViet": "DƯ, DỮ",
    "meaning": "ta, tôi (tiếng xưng hô), cho",
    "onyomi": [
      "よ",
      "しゃ"
    ],
    "kunyomi": [
      "あらかじ.め"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "quyết 亅 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "反",
    "hanViet": "PHIÊN, PHIẾN, PHẢN",
    "meaning": "ngược, sai trái, trở lại",
    "onyomi": [
      "はん",
      "ほん",
      "たん",
      "ほ"
    ],
    "kunyomi": [
      "そ.る",
      "そ.らす",
      "かえ.す",
      "かえ.る",
      "-かえ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "hựu 又 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "返",
    "hanViet": "PHIÊN, PHẢN",
    "meaning": "ngược, sai trái, trở lại",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "かえ.す",
      "-かえ.す",
      "かえ.る",
      "-かえ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "sước 辵 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "宿",
    "hanViet": "TÚ, TÚC",
    "meaning": "trú đêm, ở qua đêm, lưu lại",
    "onyomi": [
      "しゅく"
    ],
    "kunyomi": [
      "やど",
      "やど.る",
      "やど.す"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "miên 宀 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "想",
    "hanViet": "TƯỞNG",
    "meaning": "nhớ, nghĩ tới",
    "onyomi": [
      "そう",
      "そ"
    ],
    "kunyomi": [
      "おも.う"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "感",
    "hanViet": "CẢM, HÁM",
    "meaning": "cảm thấy, cảm động, tình cảm",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "暗",
    "hanViet": "ÁM, ÂM",
    "meaning": "tối, mờ, không rõ, không tỏ, thẫm, sẫm màu, ngầm, âm thầm, bí mật, mờ ám",
    "onyomi": [
      "あん"
    ],
    "kunyomi": [
      "くら.い",
      "くら.む",
      "くれ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "nhật 日 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "様",
    "hanViet": "DẠNG",
    "meaning": "hình dạng, dáng vẻ, mẫu",
    "onyomi": [
      "よう",
      "しょう"
    ],
    "kunyomi": [
      "さま",
      "さん"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "mộc 木 (+10 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "福",
    "hanViet": "PHÚC",
    "meaning": "phúc, may mắn",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "kỳ 示 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "殺",
    "hanViet": "SÁI, SÁT, TÁT, ÁI",
    "meaning": "giết chết",
    "onyomi": [
      "さつ",
      "さい",
      "せつ"
    ],
    "kunyomi": [
      "ころ.す",
      "-ごろ.し",
      "そ.ぐ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thù 殳 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "然",
    "hanViet": "NHIÊN",
    "meaning": "đúng, thế, vậy, nhưng",
    "onyomi": [
      "ぜん",
      "ねん"
    ],
    "kunyomi": [
      "しか",
      "しか.り",
      "しか.し",
      "さ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "hoả 火 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "熱",
    "hanViet": "NHIỆT",
    "meaning": "nóng, bị sốt",
    "onyomi": [
      "ねつ"
    ],
    "kunyomi": [
      "あつ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "hoả 火 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "選",
    "hanViet": "SOÁT, TOÁN, TOẢN, TUYẾN, TUYỂN",
    "meaning": "chọn lựa",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "えら.ぶ"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "sước 辵 (+12 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "願",
    "hanViet": "NGUYỆN",
    "meaning": "mong muốn",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "ねが.う",
      "-ねがい"
    ],
    "jlpt": "N3",
    "strokeCount": 19,
    "radical": "hiệt 頁 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "情",
    "hanViet": "TÌNH",
    "meaning": "tình cảm",
    "onyomi": [
      "じょう",
      "せい"
    ],
    "kunyomi": [
      "なさ.け"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "疑",
    "hanViet": "NGHI, NGHĨ, NGƯNG, NGẬT",
    "meaning": "nghi ngờ, ngỡ là",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [
      "うたが.う"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "sơ 疋 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "皆",
    "hanViet": "GIAI",
    "meaning": "cùng, đồng thời",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "みな",
      "みんな"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "bạch 白 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "例",
    "hanViet": "LỆ",
    "meaning": "lệ thường",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "たと.える"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "参",
    "hanViet": "SAM, SÂM, TAM, THAM, XAM",
    "meaning": "tua cờ, cỏ sâm (thứ cỏ quý, lá như bàn tay, hoa trắng, dùng làm thuốc), sao Sâm (một trong Nhị thập bát tú)",
    "onyomi": [
      "さん",
      "しん"
    ],
    "kunyomi": [
      "まい.る",
      "まい-",
      "まじわる",
      "みつ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "khư 厶 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "完",
    "hanViet": "HOÀN",
    "meaning": "hết, xong, vẹn, đủ",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "miên 宀 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "念",
    "hanViet": "NIỆM",
    "meaning": "mong mỏi, nhớ",
    "onyomi": [
      "ねん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "tâm 心 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "折",
    "hanViet": "CHIẾT, ĐỀ",
    "meaning": "bẻ gãy, gấp lại, gập lại, lộn nhào",
    "onyomi": [
      "せつ",
      "しゃく"
    ],
    "kunyomi": [
      "お.る",
      "おり",
      "お.り",
      "-お.り",
      "お.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "望",
    "hanViet": "VỌNG",
    "meaning": "trông ngóng, xem, mong ước, ngày rằm",
    "onyomi": [
      "ぼう",
      "もう"
    ],
    "kunyomi": [
      "のぞ.む",
      "もち"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "nguyệt 月 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "束",
    "hanViet": "THÚ, THÚC",
    "meaning": "bó, buộc",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "たば",
      "たば.ねる",
      "つか",
      "つか.ねる"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "残",
    "hanViet": "TÀN",
    "meaning": "thiếu, tàn, còn sót lại",
    "onyomi": [
      "ざん",
      "さん"
    ],
    "kunyomi": [
      "のこ.る",
      "のこ.す",
      "そこな.う",
      "のこ.り"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "ngạt 歹 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "求",
    "hanViet": "CẦU",
    "meaning": "cầu xin",
    "onyomi": [
      "きゅう",
      "ぐ"
    ],
    "kunyomi": [
      "もと.める"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "的",
    "hanViet": "ĐÍCH, ĐỂ",
    "meaning": "của, thuộc về, đúng, chính xác, mục tiêu",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "まと"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "bạch 白 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "約",
    "hanViet": "YÊU, ƯỚC",
    "meaning": "thắt, bó, đại lược, chừng, khoảng, giao ước, ước hẹn",
    "onyomi": [
      "やく"
    ],
    "kunyomi": [
      "つづ.まる",
      "つづ.める",
      "つづま.やか"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "mịch 糸 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "性",
    "hanViet": "TÍNH",
    "meaning": "tính tình, tính cách, tính chất, giới tính, mạng sống",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "さが"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "格",
    "hanViet": "CÁC, CÁCH",
    "meaning": "cách thức",
    "onyomi": [
      "かく",
      "こう",
      "きゃく",
      "ごう"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "能",
    "hanViet": "NAI, NĂNG, NẠI",
    "meaning": "khả năng, có thể",
    "onyomi": [
      "のう"
    ],
    "kunyomi": [
      "よ.く"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "術",
    "hanViet": "THUẬT, TOẠI",
    "meaning": "kỹ thuật, học thuật, phương pháp",
    "onyomi": [
      "じゅつ"
    ],
    "kunyomi": [
      "すべ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "hành 行 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "晴",
    "hanViet": "TÌNH",
    "meaning": "tạnh (trời không mưa)",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "は.れる",
      "は.れ",
      "は.れ-",
      "-ば.れ",
      "は.らす"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "列",
    "hanViet": "LIỆT",
    "meaning": "bày ra, xếp theo hàng ngang",
    "onyomi": [
      "れつ",
      "れ"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "đao 刀 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "式",
    "hanViet": "THỨC",
    "meaning": "phép tắc, cách thức",
    "onyomi": [
      "しき"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "dặc 弋 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "信",
    "hanViet": "THÂN, TÍN",
    "meaning": "tin tưởng, tin theo, lòng tin, đức tin",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "単",
    "hanViet": "ĐAN, ĐƠN, THIỀN",
    "meaning": "Simple, One, Single",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "ひとえ"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thập 十 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "変",
    "hanViet": "BIẾN",
    "meaning": "Unusual, Change, Strange",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "か.わる",
      "か.わり",
      "か.える"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "tri 夂 (+6 nét), tuy 夊 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "夫",
    "hanViet": "PHU, PHÙ",
    "meaning": "chồng, đàn ông, (thán từ dùng để bắt đầu hoặc kết thúc câu)",
    "onyomi": [
      "ふ",
      "ふう",
      "ぶ"
    ],
    "kunyomi": [
      "おっと",
      "それ"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "đại 大 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "昨",
    "hanViet": "TẠC",
    "meaning": "hôm qua",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "法",
    "hanViet": "PHÁP",
    "meaning": "phép tắc, khuôn phép, khuôn mẫu",
    "onyomi": [
      "ほう",
      "はっ",
      "ほっ",
      "ふらん"
    ],
    "kunyomi": [
      "のり"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "晩",
    "hanViet": "VÃN",
    "meaning": "buổi chiều",
    "onyomi": [
      "ばん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "猫",
    "hanViet": "MIÊU",
    "meaning": "con mèo",
    "onyomi": [
      "びょう"
    ],
    "kunyomi": [
      "ねこ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "khuyển 犬 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "園",
    "hanViet": "VIÊN",
    "meaning": "cái vườn",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "その"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "vi 囗 (+10 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "遠",
    "hanViet": "VIẾN, VIỂN, VIỄN",
    "meaning": "xa xôi",
    "onyomi": [
      "えん",
      "おん"
    ],
    "kunyomi": [
      "とお.い"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "sước 辵 (+10 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "係",
    "hanViet": "HỆ",
    "meaning": "buộc, bó, nối",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "かか.る",
      "かかり",
      "-がかり",
      "かか.わる"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "取",
    "hanViet": "THỦ, TỤ",
    "meaning": "lấy",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "と.る",
      "と.り",
      "と.り-",
      "とり",
      "-ど.り"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "hựu 又 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "守",
    "hanViet": "THÚ, THỦ",
    "meaning": "giữ, coi, đợi, giữ, coi",
    "onyomi": [
      "しゅ",
      "す"
    ],
    "kunyomi": [
      "まも.る",
      "まも.り",
      "もり",
      "-もり",
      "かみ"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "miên 宀 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "幸",
    "hanViet": "HẠNH",
    "meaning": "may mắn, yêu dấu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "さいわ.い",
      "さち",
      "しあわ.せ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "can 干 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "箱",
    "hanViet": "SƯƠNG, TƯƠNG",
    "meaning": "cái hòm, rương, vali",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "はこ"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "trúc 竹 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "面",
    "hanViet": "DIỆN, MIẾN",
    "meaning": "mặt, bề mặt, bột gạo, sợi miến",
    "onyomi": [
      "めん",
      "べん"
    ],
    "kunyomi": [
      "おも",
      "おもて",
      "つら"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "diện 面 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "喜",
    "hanViet": "HI, HÍ, HÝ, HỈ, HỶ",
    "meaning": "thích, ưa thích, vui vẻ",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "よろこ.ぶ",
      "よろこ.ばす"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "治",
    "hanViet": "TRÌ, TRỊ",
    "meaning": "cai trị",
    "onyomi": [
      "じ",
      "ち"
    ],
    "kunyomi": [
      "おさ.める",
      "おさ.まる",
      "なお.る",
      "なお.す"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "笑",
    "hanViet": "TIẾU",
    "meaning": "cười",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "わら.う",
      "え.む"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "trúc 竹 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "辞",
    "hanViet": "TỪ",
    "meaning": "nói ra thành văn, từ biệt, từ chối",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "や.める",
      "いな.む"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "thiệt 舌 (+7 nét), tân 辛 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "関",
    "hanViet": "QUAN",
    "meaning": "cửa ải, cửa ô, đóng (cửa), quan hệ, liên quan",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "せき",
      "-ぜき",
      "かか.わる",
      "からくり",
      "かんぬき"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "môn 門 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "政",
    "hanViet": "CHINH, CHÁNH, CHÍNH",
    "meaning": "việc của nhà nước, chính trị",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "まつりごと",
      "まん"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "phác 攴 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "留",
    "hanViet": "LƯU",
    "meaning": "lưu giữ, ở lại",
    "onyomi": [
      "りゅう",
      "る"
    ],
    "kunyomi": [
      "と.める",
      "と.まる",
      "とど.める",
      "とど.まる",
      "るうぶる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "điền 田 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "険",
    "hanViet": "HIỂM",
    "meaning": "Precipitous, Inaccessible Place, Impregnable Position",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "けわ.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "危",
    "hanViet": "NGUY, QUỴ",
    "meaning": "cao mà không vững, nguy khốn, sao Nguy (một trong Nhị thập bát tú)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "あぶ.ない",
      "あや.うい",
      "あや.ぶむ"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "tiết 卩 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "存",
    "hanViet": "TỒN",
    "meaning": "còn, xét tới, đang, còn",
    "onyomi": [
      "そん",
      "ぞん"
    ],
    "kunyomi": [
      "ながら.える",
      "あ.る",
      "たも.つ",
      "と.う"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "tử 子 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "原",
    "hanViet": "NGUYÊN, NGUYỆN",
    "meaning": "cánh đồng, gốc, vốn (từ trước)",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "はら"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "hán 厂 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "薬",
    "hanViet": "DƯỢC",
    "meaning": "cây thuốc, thuốc chữa bệnh",
    "onyomi": [
      "やく"
    ],
    "kunyomi": [
      "くすり"
    ],
    "jlpt": "N3",
    "strokeCount": 16,
    "radical": "thảo 艸 (+13 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "側",
    "hanViet": "TRẮC",
    "meaning": "một bên",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "かわ",
      "がわ",
      "そば"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "席",
    "hanViet": "TỊCH",
    "meaning": "cái chiếu, chỗ ngồi",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "むしろ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "cân 巾 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "敗",
    "hanViet": "BẠI",
    "meaning": "hỏng, đổ nát, thua, thất bại, phá",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "やぶ.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "phác 攴 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "果",
    "hanViet": "QUẢ",
    "meaning": "quả, trái, quả nhiên, kết quả",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "は.たす",
      "はた.す",
      "-は.たす",
      "は.てる",
      "-は.てる",
      "は.て"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "無",
    "hanViet": "MÔ, VÔ",
    "meaning": "không có",
    "onyomi": [
      "む",
      "ぶ"
    ],
    "kunyomi": [
      "な.い"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "hoả 火 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "因",
    "hanViet": "NHÂN",
    "meaning": "nguyên nhân, nhân tiện, tuỳ theo",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [
      "よ.る",
      "ちな.む"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "vi 囗 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "常",
    "hanViet": "THƯỜNG",
    "meaning": "thông thường, bình thường",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "つね",
      "とこ-"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "cân 巾 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "識",
    "hanViet": "CHÍ, THỨC",
    "meaning": "ghi chép, văn ký sự, biết",
    "onyomi": [
      "しき"
    ],
    "kunyomi": [
      "し.る",
      "しる.す"
    ],
    "jlpt": "N3",
    "strokeCount": 19,
    "radical": "ngôn 言 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "非",
    "hanViet": "PHI, PHỈ",
    "meaning": "không phải, châu Phi",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "あら.ず"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "phi 非 (+0 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "官",
    "hanViet": "QUAN",
    "meaning": "quan, người làm việc cho nhà nước",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "察",
    "hanViet": "SÁT",
    "meaning": "xem kỹ",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "miên 宀 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "愛",
    "hanViet": "ÁI",
    "meaning": "yêu, thích, quý, hay, thường xuyên",
    "onyomi": [
      "あい"
    ],
    "kunyomi": [
      "いと.しい",
      "かな.しい",
      "め.でる",
      "お.しむ",
      "まな"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "警",
    "hanViet": "CẢNH",
    "meaning": "đề phòng, phòng ngừa",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "いまし.める"
    ],
    "jlpt": "N3",
    "strokeCount": 19,
    "radical": "ngôn 言 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "覚",
    "hanViet": "GIÁC, GIÁO",
    "meaning": "biết, phát hiện, tỉnh dậy",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "おぼ.える",
      "さ.ます",
      "さ.める",
      "さと.る"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "kiến 見 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "説",
    "hanViet": "DUYỆT, THUYẾT, THUẾ",
    "meaning": "nói, giảng",
    "onyomi": [
      "せつ",
      "ぜい"
    ],
    "kunyomi": [
      "と.く"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "告",
    "hanViet": "CÁO, CỐC",
    "meaning": "bảo cho biết, báo cáo",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "つ.げる"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "種",
    "hanViet": "CHÚNG, CHỦNG",
    "meaning": "thóc giống, chủng loại, giống",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "たね",
      "-ぐさ"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "hoà 禾 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "達",
    "hanViet": "ĐẠT",
    "meaning": "qua, thông",
    "onyomi": [
      "たつ",
      "だ"
    ],
    "kunyomi": [
      "-たち"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "類",
    "hanViet": "LOẠI",
    "meaning": "chủng loại, loài",
    "onyomi": [
      "るい"
    ],
    "kunyomi": [
      "たぐ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "報",
    "hanViet": "BÁO",
    "meaning": "báo cáo, báo tin, thông báo, trả lời, báo đáp, đền ơn",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "むく.いる"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "等",
    "hanViet": "ĐẲNG",
    "meaning": "bằng nhau, thứ bậc, chờ đợi",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ひと.しい",
      "など",
      "-ら"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "座",
    "hanViet": "TOÀ, TOẠ",
    "meaning": "chỗ ngồi",
    "onyomi": [
      "ざ"
    ],
    "kunyomi": [
      "すわ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nghiễm 广 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "忘",
    "hanViet": "VONG, VÔ, VƯƠNG",
    "meaning": "quên",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "わす.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "洗",
    "hanViet": "TIỂN, TẨY",
    "meaning": "rửa",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "あら.う"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "許",
    "hanViet": "HỔ, HỨA, HỬ",
    "meaning": "khen, hứa hẹn, rất, lắm",
    "onyomi": [
      "きょ"
    ],
    "kunyomi": [
      "ゆる.す",
      "もと"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ngôn 言 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "静",
    "hanViet": "TĨNH, TỊNH",
    "meaning": "yên lặng, yên ổn",
    "onyomi": [
      "せい",
      "じょう"
    ],
    "kunyomi": [
      "しず-",
      "しず.か",
      "しず.まる",
      "しず.める"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "thanh 青 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "煙",
    "hanViet": "YÊN",
    "meaning": "khói, thuốc lá",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "けむ.る",
      "けむり",
      "けむ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "hoả 火 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "加",
    "hanViet": "GIA",
    "meaning": "thêm vào, tăng thêm",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "くわ.える",
      "くわ.わる"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "lực 力 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "容",
    "hanViet": "DONG, DUNG",
    "meaning": "chứa đựng, dáng dấp, hình dong, chứa đựng",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "い.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "易",
    "hanViet": "DỊ, DỊCH",
    "meaning": "dễ dàng, thay đổi, biến đổi",
    "onyomi": [
      "えき",
      "い"
    ],
    "kunyomi": [
      "やさ.しい",
      "やす.い"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "財",
    "hanViet": "TÀI",
    "meaning": "của cải",
    "onyomi": [
      "ざい",
      "さい",
      "ぞく"
    ],
    "kunyomi": [
      "たから"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "bối 貝 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "若",
    "hanViet": "NHÃ, NHƯỢC",
    "meaning": "giống như, nếu",
    "onyomi": [
      "じゃく",
      "にゃく",
      "にゃ"
    ],
    "kunyomi": [
      "わか.い",
      "わか-",
      "も.しくわ",
      "も.し",
      "も.しくは",
      "ごと.し"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "忙",
    "hanViet": "MANG",
    "meaning": "bận rộn, bề bộn",
    "onyomi": [
      "ぼう",
      "もう"
    ],
    "kunyomi": [
      "いそが.しい",
      "せわ.しい",
      "おそ.れる",
      "うれえるさま"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "徒",
    "hanViet": "ĐỒ",
    "meaning": "đi bộ, không, trống, đồ đệ, học trò",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "いたずら",
      "あだ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "xích 彳 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "得",
    "hanViet": "ĐẮC",
    "meaning": "được, trúng, đúng",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [
      "え.る",
      "う.る"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "xích 彳 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "続",
    "hanViet": "TỤC",
    "meaning": "Hán văn Nhật Bản dùng như chữ 續",
    "onyomi": [
      "ぞく",
      "しょく",
      "こう",
      "きょう"
    ],
    "kunyomi": [
      "つづ.く",
      "つづ.ける",
      "つぐ.ない"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "mịch 糸 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "連",
    "hanViet": "LIÊN, LIỄN",
    "meaning": "liền nối",
    "onyomi": [
      "れん"
    ],
    "kunyomi": [
      "つら.なる",
      "つら.ねる",
      "つ.れる",
      "-づ.れ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "困",
    "hanViet": "KHỐN",
    "meaning": "khốn cùng, khốn khổ, khốn đốn, vây hãm, mỏi mệt",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "こま.る"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "vi 囗 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "機",
    "hanViet": "CƠ, KI, KY",
    "meaning": "công việc, máy móc, công việc",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "はた"
    ],
    "jlpt": "N3",
    "strokeCount": 16,
    "radical": "mộc 木 (+12 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "飛",
    "hanViet": "PHI",
    "meaning": "bay",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "と.ぶ",
      "と.ばす",
      "-と.ばす"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "phi 飛 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "害",
    "hanViet": "HẠI, HẠT",
    "meaning": "hãm hại, hại, có hại",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "余",
    "hanViet": "DƯ, XÀ",
    "meaning": "thừa, ngoài ra, thừa ra, nhàn rỗi",
    "onyomi": [
      "よ"
    ],
    "kunyomi": [
      "あま.る",
      "あま.り",
      "あま.す",
      "あんま.り"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "難",
    "hanViet": "NA, NAN, NẠN",
    "meaning": "khó khăn, hoạn nạn",
    "onyomi": [
      "なん"
    ],
    "kunyomi": [
      "かた.い",
      "-がた.い",
      "むずか.しい",
      "むづか.しい",
      "むつか.しい",
      "-にく.い"
    ],
    "jlpt": "N3",
    "strokeCount": 18,
    "radical": "chuy 隹 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "確",
    "hanViet": "XÁC",
    "meaning": "bền lâu, đúng, trúng, chính xác",
    "onyomi": [
      "かく",
      "こう"
    ],
    "kunyomi": [
      "たし.か",
      "たし.かめる"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "thạch 石 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "在",
    "hanViet": "TẠI",
    "meaning": "ở, tại",
    "onyomi": [
      "ざい"
    ],
    "kunyomi": [
      "あ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "thổ 土 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "夢",
    "hanViet": "MÔNG, MỘNG",
    "meaning": "mơ, mộng, chiêm bao, mơ tưởng, ao ước, họ Mộng",
    "onyomi": [
      "む",
      "ぼう"
    ],
    "kunyomi": [
      "ゆめ",
      "ゆめ.みる",
      "くら.い"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "tịch 夕 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "産",
    "hanViet": "SẢN",
    "meaning": "sinh đẻ",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "う.む",
      "う.まれる",
      "うぶ-",
      "む.す"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "sinh 生 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "倒",
    "hanViet": "ĐÁO, ĐẢO",
    "meaning": "lật ngược, đổ, ngã, đổi",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "たお.れる",
      "-だお.れ",
      "たお.す",
      "さかさま",
      "さかさ",
      "さかしま"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妻",
    "hanViet": "THÊ, THẾ",
    "meaning": "vợ cả",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "つま"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "議",
    "hanViet": "NGHỊ",
    "meaning": "bàn bạc",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 20,
    "radical": "ngôn 言 (+13 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "犯",
    "hanViet": "PHẠM",
    "meaning": "xâm phạm, phạm phải, mắc phải, phạm nhân",
    "onyomi": [
      "はん",
      "ぼん"
    ],
    "kunyomi": [
      "おか.す"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "khuyển 犬 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "罪",
    "hanViet": "TỘI",
    "meaning": "tội lỗi",
    "onyomi": [
      "ざい"
    ],
    "kunyomi": [
      "つみ"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "võng 网 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "論",
    "hanViet": "LUÂN, LUẬN",
    "meaning": "bàn bạc",
    "onyomi": [
      "ろん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "経",
    "hanViet": "KINH",
    "meaning": "dây vải, kinh sách, trải qua, chịu đựng",
    "onyomi": [
      "けい",
      "きょう",
      "きん"
    ],
    "kunyomi": [
      "へ.る",
      "た.つ",
      "たていと",
      "はか.る",
      "のり"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "済",
    "hanViet": "TẾ",
    "meaning": "Settle (debt, Etc.), Relieve (burden), Finish",
    "onyomi": [
      "さい",
      "せい"
    ],
    "kunyomi": [
      "す.む",
      "-ず.み",
      "-ずみ",
      "す.まない",
      "す.ます",
      "-す.ます",
      "すく.う",
      "な.す",
      "わたし",
      "わた.る"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "判",
    "hanViet": "PHÁN",
    "meaning": "chia rẽ, phán quyết, sử kiện",
    "onyomi": [
      "はん",
      "ばん"
    ],
    "kunyomi": [
      "わか.る"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "đao 刀 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "制",
    "hanViet": "CHẾ",
    "meaning": "làm, chế tạo, chế độ, hạn chế, ngăn cấm",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "務",
    "hanViet": "VŨ, VỤ",
    "meaning": "công việc",
    "onyomi": [
      "む"
    ],
    "kunyomi": [
      "つと.める"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "lực 力 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "資",
    "hanViet": "TƯ",
    "meaning": "của cải, vốn, giúp đỡ, cung cấp, tư chất, tư cách",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "bối 貝 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "権",
    "hanViet": "QUYỀN",
    "meaning": "quả cân, quyền lợi",
    "onyomi": [
      "けん",
      "ごん"
    ],
    "kunyomi": [
      "おもり",
      "かり",
      "はか.る"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "mộc 木 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "件",
    "hanViet": "KIỆN",
    "meaning": "phân biệt, từ chỉ đồ đựng trong bồ hay sọt",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "くだん"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "断",
    "hanViet": "ĐOÁN, ĐOẠN",
    "meaning": "phán đoán, quyết đoán, đứt",
    "onyomi": [
      "だん"
    ],
    "kunyomi": [
      "た.つ",
      "ことわ.る",
      "さだ.める"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "cân 斤 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "任",
    "hanViet": "NHIỆM, NHÂM, NHẬM",
    "meaning": "gánh vác, đảm nhận, chịu đựng, để mặc cho",
    "onyomi": [
      "にん"
    ],
    "kunyomi": [
      "まか.せる",
      "まか.す"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "責",
    "hanViet": "TRÁCH, TRÁI",
    "meaning": "cầu xin, trách mắng",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "せ.める"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "増",
    "hanViet": "TĂNG",
    "meaning": "tăng thêm lên",
    "onyomi": [
      "ぞう"
    ],
    "kunyomi": [
      "ま.す",
      "ま.し",
      "ふ.える",
      "ふ.やす"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "thổ 土 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "解",
    "hanViet": "GIÁI, GIẢI, GIỚI",
    "meaning": "cởi (áo), giải phóng, giải toả, giảng giải",
    "onyomi": [
      "かい",
      "げ"
    ],
    "kunyomi": [
      "と.く",
      "と.かす",
      "と.ける",
      "ほど.く",
      "ほど.ける",
      "わか.る",
      "さと.る"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "giác 角 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "際",
    "hanViet": "TẾ",
    "meaning": "bên cạnh, bên bờ, mép, lề, giữa, dịp, lúc, trong khoảng",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "きわ",
      "-ぎわ"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "phụ 阜 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "認",
    "hanViet": "NHẬN",
    "meaning": "nhận ra, nhận biết, chấp thuận, nhận, bằng lòng",
    "onyomi": [
      "にん"
    ],
    "kunyomi": [
      "みと.める",
      "したた.める"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "過",
    "hanViet": "QUA, QUÁ",
    "meaning": "qua, vượt, hơn, quá, đã từng",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "す.ぎる",
      "-す.ぎる",
      "-す.ぎ",
      "す.ごす",
      "あやま.つ",
      "あやま.ち",
      "よ.ぎる"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "sước 辵 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "寝",
    "hanViet": "TẨM",
    "meaning": "ngủ, lăng mộ",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ね.る",
      "ね.かす",
      "い.ぬ",
      "みたまや",
      "や.める"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "miên 宀 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "置",
    "hanViet": "TRÍ",
    "meaning": "đặt, để, bày",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "お.く",
      "-お.き"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "võng 网 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "費",
    "hanViet": "BÍ, BỈ, PHÍ, PHẤT, PHỈ",
    "meaning": "chi phí, lệ phí, tiêu phí, phí phạm",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "つい.やす",
      "つい.える"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "示",
    "hanViet": "KÌ, KỲ, THỊ",
    "meaning": "thần đất, làm cho yên lòng, cả, lớn",
    "onyomi": [
      "じ",
      "し"
    ],
    "kunyomi": [
      "しめ.す"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "kỳ 示 (+0 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "観",
    "hanViet": "QUAN, QUÁN",
    "meaning": "xem, quan sát, xem, quan sát",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "み.る",
      "しめ.す"
    ],
    "jlpt": "N3",
    "strokeCount": 18,
    "radical": "kiến 見 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "値",
    "hanViet": "TRỊ, TRỰC",
    "meaning": "trị giá, đáng giá",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "ね",
      "あたい"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "吸",
    "hanViet": "HẤP",
    "meaning": "hấp thụ, hút vào",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "す.う"
    ],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "状",
    "hanViet": "TRẠNG",
    "meaning": "hình dáng, trạng (người đỗ đầu kỳ thi)",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "khuyển 犬 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "収",
    "hanViet": "THÂU",
    "meaning": "Income, Obtain, Reap",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "おさ.める",
      "おさ.まる"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "hựu 又 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "職",
    "hanViet": "CHỨC, DẶC, XÍ",
    "meaning": "phần việc về mình",
    "onyomi": [
      "しょく",
      "そく"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 18,
    "radical": "nhĩ 耳 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "規",
    "hanViet": "QUY",
    "meaning": "quy tắc, quy chế, khuyến khích, khích lệ, cái compa",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "kiến 見 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "割",
    "hanViet": "CÁT",
    "meaning": "cắt đứt",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [
      "わ.る",
      "わり",
      "わ.り",
      "わ.れる",
      "さ.く"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "đao 刀 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "演",
    "hanViet": "DIỄN",
    "meaning": "diễn ra, diễn thuyết, diễn giảng, nói rõ, làm thử, mô phỏng, tập trước",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "師",
    "hanViet": "SƯ",
    "meaning": "nhiều, đông đúc, sư (gồm 2500 lính), thầy giáo",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "いくさ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "cân 巾 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "備",
    "hanViet": "BỊ",
    "meaning": "có đủ, hoàn toàn, sửa soạn, sắp sẵn, đề phòng, phòng trước",
    "onyomi": [
      "び"
    ],
    "kunyomi": [
      "そな.える",
      "そな.わる",
      "つぶさ.に"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nhân 人 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "優",
    "hanViet": "ƯU",
    "meaning": "hơn, xuất sắc, nhiều, thừa thãi",
    "onyomi": [
      "ゆう",
      "う"
    ],
    "kunyomi": [
      "やさ.しい",
      "すぐ.れる",
      "まさ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 17,
    "radical": "nhân 人 (+15 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "宅",
    "hanViet": "TRẠCH",
    "meaning": "nhà ở",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 6,
    "radical": "miên 宀 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "現",
    "hanViet": "HIỆN",
    "meaning": "xuất hiện, tồn tại, bây giờ",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "あらわ.れる",
      "あらわ.す",
      "うつつ",
      "うつ.つ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ngọc 玉 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "呼",
    "hanViet": "HAO, HÁ, HÔ",
    "meaning": "gọi to",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "よ.ぶ"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "違",
    "hanViet": "VI, VY",
    "meaning": "không theo, không nghe, không tuân, làm trái, xa nhau",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "ちが.う",
      "ちが.い",
      "ちが.える",
      "-ちが.える",
      "たが.う",
      "たが.える"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "差",
    "hanViet": "SAI, SI, SOA, SÁI, TA, THA",
    "meaning": "sai khiến, không đều, so le, hiệu số",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [
      "さ.す",
      "さ.し"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "công 工 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "供",
    "hanViet": "CUNG, CÚNG",
    "meaning": "cung cấp, tặng, lời khai, khẩu cung",
    "onyomi": [
      "きょう",
      "く",
      "くう",
      "ぐ"
    ],
    "kunyomi": [
      "そな.える",
      "とも",
      "-ども"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "限",
    "hanViet": "HẠN",
    "meaning": "giới hạn, bậc cửa",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "かぎ.る",
      "かぎ.り",
      "-かぎ.り"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "phụ 阜 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "与",
    "hanViet": "DƯ, DỮ, DỰ",
    "meaning": "cho, đi lại chơi bời, thân thiện, khen ngợi, tán thưởng",
    "onyomi": [
      "よ"
    ],
    "kunyomi": [
      "あた.える",
      "あずか.る",
      "くみ.する",
      "ともに"
    ],
    "jlpt": "N3",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渡",
    "hanViet": "ĐỘ",
    "meaning": "vượt qua, cứu giúp, bến đò",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "わた.る",
      "-わた.る",
      "わた.す"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "景",
    "hanViet": "CẢNH, ẢNH",
    "meaning": "cảnh vật, phong cảnh",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "抜",
    "hanViet": "BẠT, BỘI",
    "meaning": "Slip Out, Extract, Pull Out",
    "onyomi": [
      "ばつ",
      "はつ",
      "はい"
    ],
    "kunyomi": [
      "ぬ.く",
      "-ぬ.く",
      "ぬ.き",
      "ぬ.ける",
      "ぬ.かす",
      "ぬ.かる"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "候",
    "hanViet": "HẬU",
    "meaning": "thời gian, tình hình, tình trạng, khí hậu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "そうろう"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "構",
    "hanViet": "CẤU",
    "meaning": "làm ra, tạo ra, xây dựng, tác phẩm",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "かま.える",
      "かま.う"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "mộc 木 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "捕",
    "hanViet": "BỔ, BỘ",
    "meaning": "bắt",
    "onyomi": [
      "ほ"
    ],
    "kunyomi": [
      "と.らえる",
      "と.らわれる",
      "と.る",
      "とら.える",
      "とら.われる",
      "つか.まえる",
      "つか.まる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慣",
    "hanViet": "QUÁN",
    "meaning": "quen, nuông chiều",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "な.れる",
      "な.らす"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "満",
    "hanViet": "MÃN, MUỘN",
    "meaning": "Full, Fullness, Enough",
    "onyomi": [
      "まん",
      "ばん"
    ],
    "kunyomi": [
      "み.ちる",
      "み.つ",
      "み.たす"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "掛",
    "hanViet": "QUẢI",
    "meaning": "treo lên",
    "onyomi": [
      "かい",
      "けい"
    ],
    "kunyomi": [
      "か.ける",
      "-か.ける",
      "か.け",
      "-か.け",
      "-が.け",
      "か.かる",
      "-か.かる",
      "-が.かる",
      "か.かり",
      "-が.かり",
      "かかり",
      "-がかり"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "居",
    "hanViet": "CƯ, KY, KÍ, KÝ",
    "meaning": "ở, cư trú",
    "onyomi": [
      "きょ",
      "こ"
    ],
    "kunyomi": [
      "い.る",
      "-い",
      "お.る"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thi 尸 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "突",
    "hanViet": "GIA, ĐỘT",
    "meaning": "phá tung, đột ngột, bỗng nhiên, ống khói",
    "onyomi": [
      "とつ",
      "か"
    ],
    "kunyomi": [
      "つ.く"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "huyệt 穴 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "招",
    "hanViet": "CHIÊU, KIÊU, KIỀU, THIÊU, THIỀU",
    "meaning": "mời, vẫy tay gọi",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "まね.く"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "段",
    "hanViet": "ĐOÀN, ĐOÁN, ĐOẠN",
    "meaning": "đoạn, khúc, quãng, khoảng, họ Đoàn (âm Đoàn)",
    "onyomi": [
      "だん",
      "たん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "thù 殳 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "腹",
    "hanViet": "PHÚC",
    "meaning": "bụng",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [
      "はら"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "nhục 肉 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "痛",
    "hanViet": "THỐNG",
    "meaning": "đau đớn, quá mức",
    "onyomi": [
      "つう"
    ],
    "kunyomi": [
      "いた.い",
      "いた.む",
      "いた.ましい",
      "いた.める"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nạch 疒 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "退",
    "hanViet": "THOÁI, THỐI",
    "meaning": "lui, lùi lại, lui, lùi lại",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "しりぞ.く",
      "しりぞ.ける",
      "ひ.く",
      "の.く",
      "の.ける",
      "ど.く"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "迷",
    "hanViet": "MÊ",
    "meaning": "lạc, mất, mê, say, ham, lầm mê, mê tín",
    "onyomi": [
      "めい"
    ],
    "kunyomi": [
      "まよ.う"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "訪",
    "hanViet": "PHÓNG, PHỎNG",
    "meaning": "thăm viếng, hỏi thăm, dò xét, thăm viếng, hỏi thăm",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "おとず.れる",
      "たず.ねる",
      "と.う"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "ngôn 言 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "怒",
    "hanViet": "NỘ",
    "meaning": "giận, nổi cáu",
    "onyomi": [
      "ど",
      "ぬ"
    ],
    "kunyomi": [
      "いか.る",
      "おこ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "眠",
    "hanViet": "MIÊN",
    "meaning": "ngủ",
    "onyomi": [
      "みん"
    ],
    "kunyomi": [
      "ねむ.る",
      "ねむ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "mục 目 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "靴",
    "hanViet": "NGOA",
    "meaning": "giày ủng",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "くつ"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "cách 革 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "途",
    "hanViet": "ĐỒ",
    "meaning": "đường lối",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "みち"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "給",
    "hanViet": "CẤP",
    "meaning": "đủ dùng, cấp, phát",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "たま.う",
      "たも.う",
      "-たま.え"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "冷",
    "hanViet": "LÃNH",
    "meaning": "lạnh lẽo, lặng lẽ",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "つめ.たい",
      "ひ.える",
      "ひ.や",
      "ひ.ややか",
      "ひ.やす",
      "ひ.やかす",
      "さ.める",
      "さ.ます"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "băng 冫 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "処",
    "hanViet": "XỨ, XỬ",
    "meaning": "Dispose, Manage, Deal With",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "ところ",
      "-こ",
      "お.る"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "kỷ 几 (+3 nét), tri 夂 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "婦",
    "hanViet": "PHỤ",
    "meaning": "đàn bà, vợ",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "よめ"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "nữ 女 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "程",
    "hanViet": "TRÌNH",
    "meaning": "đường đi, đoạn đường, đo, lường, trật tự",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "ほど",
      "-ほど"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "hoà 禾 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "精",
    "hanViet": "TINH",
    "meaning": "gạo đã giã, tinh tuý",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "しら.げる",
      "くわ.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "mễ 米 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "絶",
    "hanViet": "TUYỆT",
    "meaning": "Discontinue, Sever, Cut Off",
    "onyomi": [
      "ぜつ"
    ],
    "kunyomi": [
      "た.える",
      "た.やす",
      "た.つ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "杯",
    "hanViet": "BÔI",
    "meaning": "cái cốc, cái chén",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "さかずき"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "積",
    "hanViet": "TÍCH, TÝ",
    "meaning": "chứa chất, tích, dồn lại, tích (kết quả phép nhân)",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "つ.む",
      "-づ.み",
      "つ.もる",
      "つ.もり"
    ],
    "jlpt": "N3",
    "strokeCount": 16,
    "radical": "hoà 禾 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "寄",
    "hanViet": "KÍ, KÝ",
    "meaning": "phó thác, gửi",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "よ.る",
      "-よ.り",
      "よ.せる"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "miên 宀 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "娘",
    "hanViet": "NƯƠNG",
    "meaning": "cô, chị, mẹ",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "むすめ",
      "こ"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nữ 女 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "怖",
    "hanViet": "BỐ, PHỐ",
    "meaning": "sợ hãi, doạ nạt, sợ hãi",
    "onyomi": [
      "ふ",
      "ほ"
    ],
    "kunyomi": [
      "こわ.い",
      "こわ.がる",
      "お.じる",
      "おそ.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恐",
    "hanViet": "KHÚNG, KHỦNG",
    "meaning": "sợ hãi, doạ nạt",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "おそ.れる",
      "おそ.る",
      "おそ.ろしい",
      "こわ.い",
      "こわ.がる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "婚",
    "hanViet": "HÔN",
    "meaning": "cưới, lễ cưới, bố vợ",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "nữ 女 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遊",
    "hanViet": "DU",
    "meaning": "đi chơi",
    "onyomi": [
      "ゆう",
      "ゆ"
    ],
    "kunyomi": [
      "あそ.ぶ",
      "あそ.ばす"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "貧",
    "hanViet": "BẦN",
    "meaning": "nghèo",
    "onyomi": [
      "ひん",
      "びん"
    ],
    "kunyomi": [
      "まず.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "適",
    "hanViet": "QUÁT, THÍCH, TRÍCH, ĐÍCH, ĐỊCH",
    "meaning": "đang lúc",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "かな.う"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "sước 辵 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "押",
    "hanViet": "ÁP",
    "meaning": "cầm cố, nợ, cược, đặt cọc, ký tên, đóng dấu, áp giải",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "お.す",
      "お.し-",
      "お.っ-",
      "お.さえる",
      "おさ.える"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "更",
    "hanViet": "CANH, CÁNH",
    "meaning": "canh giờ, càng, hơn, càng, hơn",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "さら",
      "さら.に",
      "ふ.ける",
      "ふ.かす"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "viết 曰 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浮",
    "hanViet": "PHÙ",
    "meaning": "nổi",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "う.く",
      "う.かれる",
      "う.かぶ",
      "む",
      "う.かべる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "越",
    "hanViet": "HOẠT, VIỆT",
    "meaning": "vượt quá, nước Việt, họ Việt",
    "onyomi": [
      "えつ",
      "おつ"
    ],
    "kunyomi": [
      "こ.す",
      "-こ.す",
      "-ご.し",
      "こ.える",
      "-ご.え"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "tẩu 走 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "背",
    "hanViet": "BẮC, BỐI, BỘI",
    "meaning": "lưng, mặt trái, mặt sau, mu bàn tay",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "せ",
      "せい",
      "そむ.く",
      "そむ.ける"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "nhục 肉 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "盗",
    "hanViet": "ĐẠO",
    "meaning": "ăm trộm, ăm cắp, kẻ trộm",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ぬす.む",
      "ぬす.み"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "mẫn 皿 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "除",
    "hanViet": "TRỪ",
    "meaning": "thềm, loại bỏ, phép trừ",
    "onyomi": [
      "じょ",
      "じ"
    ],
    "kunyomi": [
      "のぞ.く",
      "-よ.け"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "phụ 阜 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "幾",
    "hanViet": "CƠ, KHỞI, KI, KY, KÍ, KÝ, KỈ, KỲ, KỶ",
    "meaning": "hầu như, gần như, bao nhiêu",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "いく-",
      "いく.つ",
      "いく.ら"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "yêu 幺 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "散",
    "hanViet": "TÁN, TẢN",
    "meaning": "tan nhỏ ra, tan nhỏ ra",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "ち.る",
      "ち.らす",
      "-ち.らす",
      "ち.らかす",
      "ち.らかる",
      "ち.らばる",
      "ばら",
      "ばら.ける"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "phác 攴 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "似",
    "hanViet": "TỰ, TỰA",
    "meaning": "như, giống như",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "に.る",
      "ひ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "富",
    "hanViet": "PHÚ",
    "meaning": "giàu có, dồi dào",
    "onyomi": [
      "ふ",
      "ふう"
    ],
    "kunyomi": [
      "と.む",
      "とみ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "miên 宀 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "探",
    "hanViet": "THAM, THÁM",
    "meaning": "thăm",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "さぐ.る",
      "さが.す"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "迎",
    "hanViet": "NGHINH, NGHÊNH, NGHỊNH",
    "meaning": "đón tiếp, đón tiếp",
    "onyomi": [
      "げい"
    ],
    "kunyomi": [
      "むか.える"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "sước 辵 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "祖",
    "hanViet": "TỔ",
    "meaning": "ông, tổ sư",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "kỳ 示 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "雑",
    "hanViet": "TẠP",
    "meaning": "Miscellaneous",
    "onyomi": [
      "ざつ",
      "ぞう"
    ],
    "kunyomi": [
      "まじ.える",
      "まじ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "chuy 隹 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "賛",
    "hanViet": "TÁN",
    "meaning": "khen ngợi, văn tán dương công đức, giúp đỡ",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "たす.ける",
      "たた.える"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "込",
    "hanViet": "VU",
    "meaning": "Crowded, Mixture, In Bulk",
    "onyomi": [],
    "kunyomi": [
      "-こ.む",
      "こ.む",
      "こ.み",
      "-こ.み",
      "こ.める"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "sước 辵 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "欲",
    "hanViet": "DỤC",
    "meaning": "ham muốn",
    "onyomi": [
      "よく"
    ],
    "kunyomi": [
      "ほっ.する",
      "ほ.しい"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "khiếm 欠 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "閉",
    "hanViet": "BẾ",
    "meaning": "đóng, khép (cửa), nhắm (mắt), ngậm",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "と.じる",
      "と.ざす",
      "し.める",
      "し.まる",
      "た.てる"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "môn 門 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "窓",
    "hanViet": "SONG",
    "meaning": "cửa sổ",
    "onyomi": [
      "そう",
      "す"
    ],
    "kunyomi": [
      "まど",
      "てんまど",
      "けむだし"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "huyệt 穴 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "否",
    "hanViet": "BĨ, BỈ, PHẦU, PHỦ",
    "meaning": "khổ cực, một quẻ trong Kinh Dịch tượng trưng cho vận xấu, không",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "いな",
      "いや"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "暮",
    "hanViet": "MỘ",
    "meaning": "buổi chiều tối",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [
      "く.れる",
      "く.らす"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "nhật 日 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "誤",
    "hanViet": "NGỘ",
    "meaning": "nhầm, làm mê hoặc",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "あやま.る",
      "-あやま.る"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "降",
    "hanViet": "GIÁNG, HÀNG",
    "meaning": "sa xuống, rớt xuống, hàng phục, đầu hàng",
    "onyomi": [
      "こう",
      "ご"
    ],
    "kunyomi": [
      "お.りる",
      "お.ろす",
      "ふ.る",
      "ふ.り",
      "くだ.る",
      "くだ.す"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "phụ 阜 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "勤",
    "hanViet": "CẦN",
    "meaning": "cố hết sức, chăm chỉ, cần cù",
    "onyomi": [
      "きん",
      "ごん"
    ],
    "kunyomi": [
      "つと.める",
      "-づと.め",
      "つと.まる",
      "いそ.しむ"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "lực 力 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "刻",
    "hanViet": "HẶC, KHẮC",
    "meaning": "chạm, khắc, khắc giờ",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "きざ.む",
      "きざ.み"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "遅",
    "hanViet": "TRÌ",
    "meaning": "trì hoãn, chậm trễ, muộn",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "おく.れる",
      "おく.らす",
      "おそ.い"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "破",
    "hanViet": "PHÁ",
    "meaning": "rách nát, phá vỡ, bổ ra",
    "onyomi": [
      "は"
    ],
    "kunyomi": [
      "やぶ.る",
      "やぶ.れる",
      "わ.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "thạch 石 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "互",
    "hanViet": "HỖ",
    "meaning": "lẫn nhau",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "たが.い",
      "かたみ.に"
    ],
    "jlpt": "N3",
    "strokeCount": 4,
    "radical": "nhị 二 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "彼",
    "hanViet": "BỈ",
    "meaning": "kia, nọ, phía bên kia, đối phương",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "かれ",
      "かの",
      "か.の"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "xích 彳 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恥",
    "hanViet": "SỈ",
    "meaning": "xấu hổ, thẹn",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "は.じる",
      "はじ",
      "は.じらう",
      "は.ずかしい"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "払",
    "hanViet": "BẬT, PHẤT",
    "meaning": "Pay, Clear Out, Prune",
    "onyomi": [
      "ふつ",
      "ひつ",
      "ほつ"
    ],
    "kunyomi": [
      "はら.う",
      "-はら.い",
      "-ばら.い"
    ],
    "jlpt": "N3",
    "strokeCount": 5,
    "radical": "thủ 手 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舞",
    "hanViet": "VŨ",
    "meaning": "múa",
    "onyomi": [
      "ぶ"
    ],
    "kunyomi": [
      "ま.う",
      "-ま.う",
      "まい"
    ],
    "jlpt": "N3",
    "strokeCount": 15,
    "radical": "suyễn 舛 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頼",
    "hanViet": "LẠI",
    "meaning": "Trust, Request",
    "onyomi": [
      "らい"
    ],
    "kunyomi": [
      "たの.む",
      "たの.もしい",
      "たよ.る"
    ],
    "jlpt": "N3",
    "strokeCount": 16,
    "radical": "hiệt 頁 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "戻",
    "hanViet": "LỆ, LIỆT, LƯ",
    "meaning": "Re-, Return, Revert",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "もど.す",
      "もど.る"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "hộ 戶 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抱",
    "hanViet": "BÀO, BÃO",
    "meaning": "ôm ấp, bế, ấp ủ, vừa khít, khớp",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "だ.く",
      "いだ.く",
      "かか.える"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "緒",
    "hanViet": "TỰ",
    "meaning": "đầu dây, đầu mối",
    "onyomi": [
      "しょ",
      "ちょ"
    ],
    "kunyomi": [
      "お",
      "いとぐち"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逃",
    "hanViet": "ĐÀO",
    "meaning": "bỏ trốn",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "に.げる",
      "に.がす",
      "のが.す",
      "のが.れる"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "御",
    "hanViet": "NGỮ, NGỰ, NHẠ",
    "meaning": "ngăn lại, chống lại",
    "onyomi": [
      "ぎょ",
      "ご"
    ],
    "kunyomi": [
      "おん-",
      "お-",
      "み-"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "xích 彳 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "吹",
    "hanViet": "XUY, XUÝ",
    "meaning": "thổi, thổi",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "ふ.く"
    ],
    "jlpt": "N3",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畑",
    "hanViet": "HÁN",
    "meaning": "Farm, Field, Garden",
    "onyomi": [],
    "kunyomi": [
      "はた",
      "はたけ",
      "-ばたけ"
    ],
    "jlpt": "N3",
    "strokeCount": 9,
    "radical": "hoả 火 (+5 nét), điền 田 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "到",
    "hanViet": "ĐÁO",
    "meaning": "đến nơi",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "いた.る"
    ],
    "jlpt": "N3",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "髪",
    "hanViet": "PHÁT",
    "meaning": "tóc, một phần nghìn của một tấc",
    "onyomi": [
      "はつ"
    ],
    "kunyomi": [
      "かみ"
    ],
    "jlpt": "N3",
    "strokeCount": 14,
    "radical": "tiêu 髟 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "疲",
    "hanViet": "BÌ",
    "meaning": "mỏi mệt, mệt nhọc",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "つか.れる",
      "-づか.れ",
      "つか.らす"
    ],
    "jlpt": "N3",
    "strokeCount": 10,
    "radical": "nạch 疒 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "歳",
    "hanViet": "TUẾ",
    "meaning": "năm, tuổi",
    "onyomi": [
      "さい",
      "せい"
    ],
    "kunyomi": [
      "とし",
      "とせ",
      "よわい"
    ],
    "jlpt": "N3",
    "strokeCount": 13,
    "radical": "chỉ 止 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "偶",
    "hanViet": "NGẪU",
    "meaning": "tình cờ, đôi, chẵn, tượng gỗ",
    "onyomi": [
      "ぐう"
    ],
    "kunyomi": [
      "たま"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "偉",
    "hanViet": "VĨ",
    "meaning": "cao to",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "えら.い"
    ],
    "jlpt": "N3",
    "strokeCount": 12,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頂",
    "hanViet": "ĐÍNH, ĐỈNH",
    "meaning": "đỉnh đầu, chỗ cao nhất, đỉnh đầu",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "いただ.く",
      "いただき"
    ],
    "jlpt": "N3",
    "strokeCount": 11,
    "radical": "hiệt 頁 (+2 nét)",
    "grade": "Lớp 6"
  }
]

export const N2_KANJI: JoyoKanjiEntry[] = [
  {
    "kanji": "了",
    "hanViet": "LIỄU, LIỆU",
    "meaning": "xong, hết, đã, rồi",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 2,
    "radical": "quyết 亅 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "丸",
    "hanViet": "HOÀN",
    "meaning": "viên, vật nhỏ và tròn",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "まる",
      "まる.める",
      "まる.い"
    ],
    "jlpt": "N2",
    "strokeCount": 3,
    "radical": "chủ 丶 (+2 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "玉",
    "hanViet": "NGỌC, TÚC",
    "meaning": "viên ngọc, đá quý, đẹp",
    "onyomi": [
      "ぎょく"
    ],
    "kunyomi": [
      "たま",
      "たま-",
      "-だま"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "ngọc 玉 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "久",
    "hanViet": "CỬU",
    "meaning": "lâu, chờ đợi",
    "onyomi": [
      "きゅう",
      "く"
    ],
    "kunyomi": [
      "ひさ.しい"
    ],
    "jlpt": "N2",
    "strokeCount": 3,
    "radical": "triệt 丿 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "戸",
    "hanViet": "HỘ",
    "meaning": "cửa một cánh, nhà",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "と"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "hộ 戶 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "毛",
    "hanViet": "MAO, MÔ",
    "meaning": "sợi lông",
    "onyomi": [
      "もう"
    ],
    "kunyomi": [
      "け"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "mao 毛 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "央",
    "hanViet": "ƯƠNG",
    "meaning": "ở giữa, trung tâm, dừng, ngớt",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "đại 大 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "氷",
    "hanViet": "BĂNG",
    "meaning": "nước đá, băng, lạnh, buốt, ướp lạnh",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [
      "こおり",
      "ひ",
      "こお.る"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "thuỷ 水 (+1 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "皮",
    "hanViet": "BÌ",
    "meaning": "da, bề ngoài, vỏ bọc",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "かわ"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "bì 皮 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "皿",
    "hanViet": "MÃNH, MẪN",
    "meaning": "cái mâm, cái mâm",
    "onyomi": [
      "べい"
    ],
    "kunyomi": [
      "さら"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "mẫn 皿 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "竹",
    "hanViet": "TRÚC",
    "meaning": "cây trúc, cây tre, cây tiêu, cây sáo",
    "onyomi": [
      "ちく"
    ],
    "kunyomi": [
      "たけ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "trúc 竹 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "糸",
    "hanViet": "MỊCH",
    "meaning": "bộ mịch",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "いと"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "mịch 糸 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "虫",
    "hanViet": "HUỶ, TRÙNG",
    "meaning": "loài sâu bọ",
    "onyomi": [
      "ちゅう",
      "き"
    ],
    "kunyomi": [
      "むし"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "trùng 虫 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "村",
    "hanViet": "THÔN",
    "meaning": "thôn xóm, nhà quê",
    "onyomi": [
      "そん"
    ],
    "kunyomi": [
      "むら"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "貝",
    "hanViet": "BỐI",
    "meaning": "con sò, hến, vật quý, tiền tệ",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "かい"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "bối 貝 (+0 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "池",
    "hanViet": "TRÌ",
    "meaning": "cái ao",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "いけ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "羽",
    "hanViet": "VŨ",
    "meaning": "lông chim",
    "onyomi": [
      "う"
    ],
    "kunyomi": [
      "は",
      "わ",
      "はね"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "vũ 羽 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "角",
    "hanViet": "CỐC, GIÁC, GIỐC, LỘC",
    "meaning": "cái sừng, góc, cái sừng",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "かど",
      "つの"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "giác 角 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "谷",
    "hanViet": "CỐC, DỤC, LỘC",
    "meaning": "hang núi, khe núi, cây lương thực, thóc lúa, kê",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "たに",
      "きわ.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "cốc 谷 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "麦",
    "hanViet": "MẠCH",
    "meaning": "lúa tẻ",
    "onyomi": [
      "ばく"
    ],
    "kunyomi": [
      "むぎ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "mạch 麥 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "林",
    "hanViet": "LÂM",
    "meaning": "rừng cây",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [
      "はやし"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "州",
    "hanViet": "CHÂU",
    "meaning": "châu (đơn vị hành chính)",
    "onyomi": [
      "しゅう",
      "す"
    ],
    "kunyomi": [
      "す"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "xuyên 巛 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "血",
    "hanViet": "HUYẾT",
    "meaning": "máu",
    "onyomi": [
      "けつ"
    ],
    "kunyomi": [
      "ち"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "huyết 血 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "星",
    "hanViet": "TINH",
    "meaning": "ngôi sao, sao Tinh (một trong Nhị thập bát tú)",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "ほし",
      "-ぼし"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "札",
    "hanViet": "TRÁT",
    "meaning": "thẻ tre để viết, công văn",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [
      "ふだ"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "mộc 木 (+1 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "辺",
    "hanViet": "BIÊN",
    "meaning": "bên, phía, bờ, rịa, ven, mép, vệ, viền, cạnh, biên giới",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "あた.り",
      "ほと.り",
      "-べ"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "sước 辵 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "弱",
    "hanViet": "NHƯỢC",
    "meaning": "yếu, kém, trẻ, gần, suýt soát",
    "onyomi": [
      "じゃく"
    ],
    "kunyomi": [
      "よわ.い",
      "よわ.る",
      "よわ.まる",
      "よわ.める"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "cung 弓 (+7 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "黄",
    "hanViet": "HOÀNG, HUỲNH",
    "meaning": "vàng, màu vàng, vàng, màu vàng",
    "onyomi": [
      "こう",
      "おう"
    ],
    "kunyomi": [
      "き",
      "こ-"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "hoàng 黃 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "森",
    "hanViet": "SÂM",
    "meaning": "sum suê, rậm rạp",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "もり"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 1"
  },
  {
    "kanji": "雲",
    "hanViet": "VÂN",
    "meaning": "mây",
    "onyomi": [
      "うん"
    ],
    "kunyomi": [
      "くも",
      "-ぐも"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "vũ 雨 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "県",
    "hanViet": "HUYỆN",
    "meaning": "Prefecture",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "か.ける"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "軽",
    "hanViet": "CHÍ, KHÁNH, KHINH",
    "meaning": "Lightly, Trifling, Unimportant",
    "onyomi": [
      "けい",
      "きょう",
      "きん"
    ],
    "kunyomi": [
      "かる.い",
      "かろ.やか",
      "かろ.んじる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "xa 車 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "農",
    "hanViet": "NÔNG",
    "meaning": "người làm ruộng",
    "onyomi": [
      "のう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thần 辰 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "鉄",
    "hanViet": "THIẾT",
    "meaning": "sắt, Fe",
    "onyomi": [
      "てつ"
    ],
    "kunyomi": [
      "くろがね"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "kim 金 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "算",
    "hanViet": "TOÁN",
    "meaning": "tính toán",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "そろ"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "trúc 竹 (+8 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "線",
    "hanViet": "TUYẾN",
    "meaning": "đường, tia",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "すじ"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "仲",
    "hanViet": "TRỌNG",
    "meaning": "giữa, đương lúc",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "なか"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "低",
    "hanViet": "ĐÊ",
    "meaning": "thấp, cúi xuống, hạ xuống",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "ひく.い",
      "ひく.める",
      "ひく.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "岸",
    "hanViet": "NGẠN",
    "meaning": "bờ, biên",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "きし"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "sơn 山 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "波",
    "hanViet": "BA",
    "meaning": "sóng nhỏ",
    "onyomi": [
      "は"
    ],
    "kunyomi": [
      "なみ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "拾",
    "hanViet": "KIỆP, THIỆP, THẬP",
    "meaning": "nhặt lấy",
    "onyomi": [
      "しゅう",
      "じゅう"
    ],
    "kunyomi": [
      "ひろ.う"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "秒",
    "hanViet": "MIỂU, MIỄU",
    "meaning": "tua lúa, giây (bằng 1/60 phút)",
    "onyomi": [
      "びょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "hoà 禾 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "競",
    "hanViet": "CẠNH",
    "meaning": "mạnh, khỏe, ganh đua",
    "onyomi": [
      "きょう",
      "けい"
    ],
    "kunyomi": [
      "きそ.う",
      "せ.る",
      "くら.べる"
    ],
    "jlpt": "N2",
    "strokeCount": 20,
    "radical": "lập 立 (+15 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "令",
    "hanViet": "LINH, LỆNH, LỊNH",
    "meaning": "lệnh, chỉ thị, viên quan, tốt đẹp, hiền lành",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "根",
    "hanViet": "CĂN",
    "meaning": "rễ cây",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "ね",
      "-ね"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "倍",
    "hanViet": "BỘI",
    "meaning": "gấp nhiều lần",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "島",
    "hanViet": "ĐẢO",
    "meaning": "hòn đảo, gò",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "しま"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "sơn 山 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "祭",
    "hanViet": "SÁI, TẾ",
    "meaning": "họ Sái, cúng tế",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "まつ.る",
      "まつ.り",
      "まつり"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "kỳ 示 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "章",
    "hanViet": "CHƯƠNG",
    "meaning": "chương (sách), trật tự mạch lạc, điều lệ",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "lập 立 (+6 nét), âm 音 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "童",
    "hanViet": "ĐỒNG",
    "meaning": "đứa trẻ",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "わらべ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "lập 立 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "階",
    "hanViet": "GIAI",
    "meaning": "cấp bậc, bậc thềm",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "きざはし"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "植",
    "hanViet": "THỰC, TRĨ, TRỊ",
    "meaning": "thực vật",
    "onyomi": [
      "しょく"
    ],
    "kunyomi": [
      "う.える",
      "う.わる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "温",
    "hanViet": "UẨN, ÔN",
    "meaning": "nhắc lại, xem lại, ấm áp",
    "onyomi": [
      "おん"
    ],
    "kunyomi": [
      "あたた.か",
      "あたた.かい",
      "あたた.まる",
      "あたた.める",
      "ぬく"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "湯",
    "hanViet": "SƯƠNG, THANG, THÃNG",
    "meaning": "nước nóng, vua Thang",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ゆ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "短",
    "hanViet": "ĐOẢN",
    "meaning": "ngắn",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "みじか.い"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thỉ 矢 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "泉",
    "hanViet": "TOÀN, TUYỀN",
    "meaning": "dòng suối",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "いずみ"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "橋",
    "hanViet": "CAO, KHIÊU, KIẾU, KIỀU, KIỂU",
    "meaning": "cái cầu",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "はし"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "mộc 木 (+12 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "緑",
    "hanViet": "LỤC",
    "meaning": "Green",
    "onyomi": [
      "りょく",
      "ろく"
    ],
    "kunyomi": [
      "みどり"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "練",
    "hanViet": "LUYỆN",
    "meaning": "lụa trắng, rèn luyện",
    "onyomi": [
      "れん"
    ],
    "kunyomi": [
      "ね.る",
      "ね.り"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "億",
    "hanViet": "ỨC",
    "meaning": "ức, mười vạn, liệu, lường, yên ổn",
    "onyomi": [
      "おく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "nhân 人 (+13 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "課",
    "hanViet": "KHOÁ",
    "meaning": "bài học",
    "onyomi": [
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "賞",
    "hanViet": "THƯỞNG",
    "meaning": "xem, ngắm, khen thưởng, thưởng công",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "ほ.める"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "輪",
    "hanViet": "LUÂN",
    "meaning": "cái bánh xe, vòng, vầng, vành",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [
      "わ"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "xa 車 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "像",
    "hanViet": "TƯƠNG, TƯỢNG",
    "meaning": "hình dáng, giống như, hình dáng",
    "onyomi": [
      "ぞう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "卒",
    "hanViet": "THỐT, TUẤT, TỐT",
    "meaning": "cuối cùng",
    "onyomi": [
      "そつ",
      "しゅつ"
    ],
    "kunyomi": [
      "そっ.する",
      "お.える",
      "お.わる",
      "ついに",
      "にわか"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thập 十 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "協",
    "hanViet": "HIỆP",
    "meaning": "hoà hợp, giúp đỡ",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thập 十 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "周",
    "hanViet": "CHU, CHÂU",
    "meaning": "vòng quanh, đời nhà Chu, vòng quanh",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "まわ.り"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "囲",
    "hanViet": "VY",
    "meaning": "Surround, Besiege, Store",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "かこ.む",
      "かこ.う",
      "かこ.い"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "vi 囗 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "固",
    "hanViet": "CỐ",
    "meaning": "vững chắc, vốn có",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "かた.める",
      "かた.まる",
      "かた.まり",
      "かた.い"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "vi 囗 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "季",
    "hanViet": "QUÝ",
    "meaning": "tháng cuối một quý, mùa, nhỏ, út (em)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "tử 子 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "希",
    "hanViet": "HI, HY",
    "meaning": "ít, mong muốn",
    "onyomi": [
      "き",
      "け"
    ],
    "kunyomi": [
      "まれ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "cân 巾 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "材",
    "hanViet": "TÀI",
    "meaning": "những thứ có sẵn trong tự nhiên mà dùng được",
    "onyomi": [
      "ざい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "芸",
    "hanViet": "VÂN",
    "meaning": "gieo, rắc",
    "onyomi": [
      "げい",
      "うん"
    ],
    "kunyomi": [
      "う.える",
      "のり",
      "わざ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thảo 艸 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "技",
    "hanViet": "KĨ, KỸ",
    "meaning": "kỹ thuật, tài năng",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [
      "わざ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "骨",
    "hanViet": "CỐT",
    "meaning": "xương cốt",
    "onyomi": [
      "こつ"
    ],
    "kunyomi": [
      "ほね"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "cốt 骨 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "寺",
    "hanViet": "TỰ",
    "meaning": "ngôi chùa",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "てら"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "thốn 寸 (+3 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "岩",
    "hanViet": "NHAM",
    "meaning": "núi cao ngất, nơi hiểm yếu, hang núi",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "いわ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "sơn 山 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "区",
    "hanViet": "KHU, ÂU",
    "meaning": "khu vực, vùng, cái âu, âu (đơn vị đo khối lượng, bằng bốn đấu)",
    "onyomi": [
      "く",
      "おう",
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "hễ 匸 (+2 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "坂",
    "hanViet": "BẢN, PHẢN",
    "meaning": "sườn núi",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "さか"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thổ 土 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "勇",
    "hanViet": "DŨNG",
    "meaning": "dũng mãnh",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "いさ.む"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "lực 力 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "毒",
    "hanViet": "ĐẠI, ĐỐC, ĐỘC",
    "meaning": "độc hại",
    "onyomi": [
      "どく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "vô 毋 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "浅",
    "hanViet": "THIỂN, TIÊN",
    "meaning": "cạn, nông",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "あさ.い"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "軍",
    "hanViet": "QUÂN",
    "meaning": "quân, binh lính",
    "onyomi": [
      "ぐん"
    ],
    "kunyomi": [
      "いくさ"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "xa 車 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "仏",
    "hanViet": "PHẬT",
    "meaning": "đức Phật, đạo Phật, Phật giáo",
    "onyomi": [
      "ぶつ",
      "ふつ"
    ],
    "kunyomi": [
      "ほとけ"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "nhân 人 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "築",
    "hanViet": "TRÚC",
    "meaning": "xây cất",
    "onyomi": [
      "ちく"
    ],
    "kunyomi": [
      "きず.く"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "trúc 竹 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "門",
    "hanViet": "MÔN",
    "meaning": "cái cửa, loài, loại, thứ, môn",
    "onyomi": [
      "もん"
    ],
    "kunyomi": [
      "かど",
      "と"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "môn 門 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "荷",
    "hanViet": "HÀ, HẠ",
    "meaning": "hoa sen, vác trên vai",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "に"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thảo 艸 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "府",
    "hanViet": "PHỦ",
    "meaning": "mình, ta (ngôi thứ nhất), phủ (đơn vị hành chính), phủ quan",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nghiễm 广 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "浴",
    "hanViet": "DỤC",
    "meaning": "tắm",
    "onyomi": [
      "よく"
    ],
    "kunyomi": [
      "あ.びる",
      "あ.びせる"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "専",
    "hanViet": "CHUYÊN",
    "meaning": "chú ý hết cả vào một việc, chỉ có một, duy nhất",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "もっぱ.ら"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thốn 寸 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "細",
    "hanViet": "TẾ",
    "meaning": "nhỏ bé, tinh xảo, mịn",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "ほそ.い",
      "ほそ.る",
      "こま.か",
      "こま.かい"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "鼻",
    "hanViet": "TÌ, TỊ, TỴ",
    "meaning": "cái mũi, khuyết, lỗ, núm",
    "onyomi": [
      "び"
    ],
    "kunyomi": [
      "はな"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "tỵ 鼻 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "兵",
    "hanViet": "BINH",
    "meaning": "vũ khí, quân lính, quân sự",
    "onyomi": [
      "へい",
      "ひょう"
    ],
    "kunyomi": [
      "つわもの"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "bát 八 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "塩",
    "hanViet": "DIÊM",
    "meaning": "muối ăn",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "しお"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "栄",
    "hanViet": "VINH",
    "meaning": "vinh, vinh dự, vinh hoa",
    "onyomi": [
      "えい",
      "よう"
    ],
    "kunyomi": [
      "さか.える",
      "は.え",
      "-ば.え",
      "は.える",
      "え"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "干",
    "hanViet": "CAN, CÁN",
    "meaning": "phạm đến, cầu, mong, can thiệp",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "ほ.す",
      "ほ.し-",
      "-ぼ.し",
      "ひ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 3,
    "radical": "can 干 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "底",
    "hanViet": "ĐỂ",
    "meaning": "đáy (bình, ao, ...), đạt đến, đạt tới",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "そこ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nghiễm 广 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "署",
    "hanViet": "THỬ, THỰ",
    "meaning": "ký tên, tạm giữ chức, chức vụ lâm thời, nơi làm việc",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "võng 网 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "恋",
    "hanViet": "LUYẾN",
    "meaning": "yêu, thương mến, tiếc nuối",
    "onyomi": [
      "れん"
    ],
    "kunyomi": [
      "こ.う",
      "こい",
      "こい.しい"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "訓",
    "hanViet": "HUẤN",
    "meaning": "dạy dỗ, răn bảo",
    "onyomi": [
      "くん",
      "きん"
    ],
    "kunyomi": [
      "おし.える",
      "よ.む",
      "くん.ずる"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "ngôn 言 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "祈",
    "hanViet": "KÌ, KỲ",
    "meaning": "cầu phúc, cầu cúng, báo đền",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "いの.る"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "kỳ 示 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "焼",
    "hanViet": "THIÊU",
    "meaning": "Bake, Burning",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "や.く",
      "や.き",
      "や.き-",
      "-や.き",
      "や.ける"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "hoả 火 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "胸",
    "hanViet": "HUNG",
    "meaning": "ngực, bụng",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "むね",
      "むな-"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "脳",
    "hanViet": "NÃO",
    "meaning": "Brain, Memory",
    "onyomi": [
      "のう",
      "どう"
    ],
    "kunyomi": [
      "のうずる"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "nhục 肉 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "可",
    "hanViet": "KHẢ, KHẮC",
    "meaning": "có thể",
    "onyomi": [
      "か",
      "こく"
    ],
    "kunyomi": [
      "-べ.き",
      "-べ.し"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "枚",
    "hanViet": "MAI",
    "meaning": "cây, quả, trái, cái núm quả chuông",
    "onyomi": [
      "まい",
      "ばい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "禁",
    "hanViet": "CÂM, CẤM, CẦM",
    "meaning": "cấm đoán (không cho phép), kiêng kị, tránh, cấm đoán (không cho phép)",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "kỳ 示 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "喫",
    "hanViet": "KHIẾT",
    "meaning": "ăn uống",
    "onyomi": [
      "きつ"
    ],
    "kunyomi": [
      "の.む"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "減",
    "hanViet": "GIẢM",
    "meaning": "giảm bớt",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "へ.る",
      "へ.らす"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "順",
    "hanViet": "THUẬN",
    "meaning": "suôn sẻ, thuận theo, hàng phục, thuận, xuôi",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "hiệt 頁 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "布",
    "hanViet": "BỐ",
    "meaning": "vải vóc, bày ra",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "ぬの"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "cân 巾 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "詞",
    "hanViet": "TỪ",
    "meaning": "lời văn, từ khúc, bài từ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "ことば"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "歴",
    "hanViet": "LỊCH",
    "meaning": "trải qua, vượt qua, lịch (như: lịch 曆)",
    "onyomi": [
      "れき",
      "れっき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "chỉ 止 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "冊",
    "hanViet": "SÁCH",
    "meaning": "quyển sách, sổ",
    "onyomi": [
      "さつ",
      "さく"
    ],
    "kunyomi": [
      "ふみ"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "quynh 冂 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "宇",
    "hanViet": "VŨ",
    "meaning": "mái hiên, toà nhà",
    "onyomi": [
      "う"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "miên 宀 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "団",
    "hanViet": "ĐOÀN",
    "meaning": "Group, Association",
    "onyomi": [
      "だん",
      "とん"
    ],
    "kunyomi": [
      "かたまり",
      "まる.い"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "vi 囗 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "暴",
    "hanViet": "BÃO, BẠO, BỘC",
    "meaning": "giông bão, to, mạnh, tàn ác",
    "onyomi": [
      "ぼう",
      "ばく"
    ],
    "kunyomi": [
      "あば.く",
      "あば.れる"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "nhật 日 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "混",
    "hanViet": "CÔN, CỔN, HỒN, HỖN",
    "meaning": "lẫn lộn, hỗn tạp",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "ま.じる",
      "-ま.じり",
      "ま.ざる",
      "ま.ぜる",
      "こ.む"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "乱",
    "hanViet": "LOẠN",
    "meaning": "lẫn lộn, rối, phá hoại",
    "onyomi": [
      "らん",
      "ろん"
    ],
    "kunyomi": [
      "みだ.れる",
      "みだ.る",
      "みだ.す",
      "みだ",
      "おさ.める",
      "わた.る"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "ất 乙 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "改",
    "hanViet": "CẢI",
    "meaning": "sửa đổi, thay đổi",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "あらた.める",
      "あらた.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "phác 攴 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "絡",
    "hanViet": "LẠC",
    "meaning": "quấn quanh, ràng buộc",
    "onyomi": [
      "らく"
    ],
    "kunyomi": [
      "から.む",
      "から.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "比",
    "hanViet": "BÌ, BÍ, BỈ, TỈ, TỴ, TỶ",
    "meaning": "so sánh, đọ, bì, thi đua, ngang bằng, như",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "くら.べる"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "tỷ 比 (+0 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "被",
    "hanViet": "BÍ, BỊ, PHI",
    "meaning": "áo ngủ, chăn, mền, phủ lấp, che kín",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "こうむ.る",
      "おお.う",
      "かぶ.る",
      "かぶ.せる"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "y 衣 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "震",
    "hanViet": "CHẤN, THẦN",
    "meaning": "1. sét đánh\n 2. quẻ Chấn (ngưỡng bồn) trong Kinh Dịch:\n - 2 vạch trên đứt, tượng Lôi (sấm)\n - tượng trưng: con trai trưởng, hành Mộc, tuổi Mão, hướng Đông",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ふる.う",
      "ふる.える"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "vũ 雨 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "械",
    "hanViet": "GIỚI",
    "meaning": "đồ khí giới",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "かせ"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "mộc 木 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "個",
    "hanViet": "CÁ",
    "meaning": "cái, quả, con",
    "onyomi": [
      "こ",
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "圧",
    "hanViet": "ÁP, YỂM, YẾP",
    "meaning": "Pressure, Push, Overwhelm",
    "onyomi": [
      "あつ",
      "えん",
      "おう"
    ],
    "kunyomi": [
      "お.す",
      "へ.す",
      "おさ.える",
      "お.さえる"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "thổ 土 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "厚",
    "hanViet": "HẬU",
    "meaning": "dày dặn, chiều dày, hậu hĩnh",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "あつ.い",
      "あか"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "hán 厂 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "防",
    "hanViet": "PHÒNG",
    "meaning": "phòng ngừa, giữ gìn, cái đê ngăn nước",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "ふせ.ぐ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "phụ 阜 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "史",
    "hanViet": "SỬ",
    "meaning": "lịch sử",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "委",
    "hanViet": "UY, UỶ",
    "meaning": "uỷ thác, phó thác, dịu dàng, ỉu xìu, rơi rụng, rã rời",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "ゆだ.ねる"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "査",
    "hanViet": "TRA",
    "meaning": "Investigate",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "総",
    "hanViet": "TỔNG",
    "meaning": "tổng quát, thâu tóm, chung, toàn bộ, buộc túm lại",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "す.べて",
      "すべ.て",
      "ふさ"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "設",
    "hanViet": "THIẾT",
    "meaning": "sắp đặt, bày, đặt",
    "onyomi": [
      "せつ"
    ],
    "kunyomi": [
      "もう.ける"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "ngôn 言 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "省",
    "hanViet": "SẢNH, TIỂN, TỈNH",
    "meaning": "coi xét, tiết kiệm, tỉnh lị",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "かえり.みる",
      "はぶ.く"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "税",
    "hanViet": "THOÁT, THUẾ, THỐI",
    "meaning": "tô thuế",
    "onyomi": [
      "ぜい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "hoà 禾 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "各",
    "hanViet": "CÁC",
    "meaning": "mỗi một, đều, cùng",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "おのおの"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "勢",
    "hanViet": "THẾ",
    "meaning": "thế lực, tình hình, tình thế, hột dái",
    "onyomi": [
      "せい",
      "ぜい"
    ],
    "kunyomi": [
      "いきお.い",
      "はずみ"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "lực 力 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "営",
    "hanViet": "DINH, DOANH",
    "meaning": "nơi đóng quân, mưu sự, doanh (gồm 500 lính)",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "いとな.む",
      "いとな.み"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "khẩu 口 (+8 nét), tiểu 小 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "領",
    "hanViet": "LÃNH, LĨNH",
    "meaning": "cổ áo, lĩnh, nhận, cổ áo",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "えり"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "hiệt 頁 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "副",
    "hanViet": "PHÓ, PHỐC, PHỨC",
    "meaning": "phụ, phó, thứ 2",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "đao 刀 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "域",
    "hanViet": "VỰC",
    "meaning": "vùng, phạm vi, bờ cõi",
    "onyomi": [
      "いき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "停",
    "hanViet": "ĐÌNH",
    "meaning": "dừng lại",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "と.める",
      "と.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "革",
    "hanViet": "CÁCH, CỨC",
    "meaning": "thay đổi, da thú đã cạo lông, bỏ đi, bãi đi",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "かわ"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "cách 革 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "律",
    "hanViet": "LUẬT",
    "meaning": "quy tắc, luật",
    "onyomi": [
      "りつ",
      "りち",
      "れつ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "xích 彳 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "準",
    "hanViet": "CHUYẾT, CHUẨN",
    "meaning": "chuẩn mực, theo như, cứ như (trích dẫn)",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [
      "じゅん.じる",
      "じゅん.ずる",
      "なぞら.える",
      "のり",
      "ひと.しい",
      "みずもり"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "則",
    "hanViet": "TẮC",
    "meaning": "quy tắc, bắt chước",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "のっと.る"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "đao 刀 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "導",
    "hanViet": "ĐẠO",
    "meaning": "dẫn, đưa, chỉ đạo",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "みちび.く"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "thốn 寸 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "乳",
    "hanViet": "NHŨ",
    "meaning": "sinh, đẻ, vú, sữa",
    "onyomi": [
      "にゅう"
    ],
    "kunyomi": [
      "ちち",
      "ち"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "ất 乙 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "城",
    "hanViet": "GIÀM, THÀNH",
    "meaning": "thành trì, xây thành",
    "onyomi": [
      "じょう",
      "せい"
    ],
    "kunyomi": [
      "しろ"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thổ 土 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "担",
    "hanViet": "ĐAM, ĐÃN, ĐẢM",
    "meaning": "khiêng, mang, vác, đồ để mang vác, khiêng, mang, vác",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "かつ.ぐ",
      "にな.う"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "額",
    "hanViet": "NGẠCH",
    "meaning": "trán (trên đầu), hạn chế số lượng nhất định",
    "onyomi": [
      "がく"
    ],
    "kunyomi": [
      "ひたい"
    ],
    "jlpt": "N2",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "輸",
    "hanViet": "DU, THÂU, THÚ",
    "meaning": "chở đồ đi, nộp, đưa đồ, thua bạc",
    "onyomi": [
      "ゆ",
      "しゅ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "xa 車 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "燃",
    "hanViet": "NHIÊN",
    "meaning": "đốt",
    "onyomi": [
      "ねん"
    ],
    "kunyomi": [
      "も.える",
      "も.やす",
      "も.す"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "hoả 火 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "祝",
    "hanViet": "CHÚ, CHÚC",
    "meaning": "khấn, chúc tụng, mong muốn, mừng",
    "onyomi": [
      "しゅく",
      "しゅう"
    ],
    "kunyomi": [
      "いわ.う"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "kỳ 示 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "届",
    "hanViet": "GIỚI",
    "meaning": "đến lúc, tới lúc, đến giờ, lần, khoá, kỳ",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "とど.ける",
      "-とど.け",
      "とど.く"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thi 尸 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "肩",
    "hanViet": "KHIÊN, KIÊN",
    "meaning": "cái vai, gánh vác, cái vai",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "かた"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腕",
    "hanViet": "OẢN, UYỂN",
    "meaning": "cổ tay",
    "onyomi": [
      "わん"
    ],
    "kunyomi": [
      "うで"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "nhục 肉 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腰",
    "hanViet": "YÊU",
    "meaning": "cái lưng",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "こし"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "nhục 肉 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "触",
    "hanViet": "XÚC",
    "meaning": "húc, đâm, chạm vào, sờ vào, cảm động",
    "onyomi": [
      "しょく"
    ],
    "kunyomi": [
      "ふ.れる",
      "さわ.る",
      "さわ"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "giác 角 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "層",
    "hanViet": "TẰNG",
    "meaning": "tầng, lớp",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "thi 尸 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "型",
    "hanViet": "HÌNH",
    "meaning": "cái khuôn đất để đúc, làm gương, làm mẫu",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "かた",
      "-がた"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thổ 土 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "庁",
    "hanViet": "SẢNH, THÍNH",
    "meaning": "phòng khách, chỗ quan ngồi làm việc, phòng khách",
    "onyomi": [
      "ちょう",
      "てい"
    ],
    "kunyomi": [
      "やくしょ"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "nghiễm 广 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "管",
    "hanViet": "QUẢN",
    "meaning": "cai quản, trông nom, cái bút, ống tròn",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "くだ"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "trúc 竹 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "象",
    "hanViet": "TƯƠNG, TƯỢNG",
    "meaning": "hình dáng, giống như, con voi",
    "onyomi": [
      "しょう",
      "ぞう"
    ],
    "kunyomi": [
      "かたど.る"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thỉ 豕 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "量",
    "hanViet": "LƯƠNG, LƯỜNG, LƯỢNG",
    "meaning": "đong, đo, bao dung, khả năng, dung lượng",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "はか.る"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "lý 里 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "境",
    "hanViet": "CẢNH",
    "meaning": "biên giới, ranh giới, hoàn cảnh, cảnh trí",
    "onyomi": [
      "きょう",
      "けい"
    ],
    "kunyomi": [
      "さかい"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "thổ 土 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "武",
    "hanViet": "VÕ, VŨ",
    "meaning": "võ thuật, quân sự, võ thuật",
    "onyomi": [
      "ぶ",
      "む"
    ],
    "kunyomi": [
      "たけ",
      "たけ.し"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "chỉ 止 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "述",
    "hanViet": "THUẬT",
    "meaning": "thuật lại, kể lại, noi theo",
    "onyomi": [
      "じゅつ"
    ],
    "kunyomi": [
      "の.べる"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "sước 辵 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "販",
    "hanViet": "PHIẾN, PHÁN",
    "meaning": "mua rẻ bán đắt, buôn bán, mua rẻ bán đắt",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "含",
    "hanViet": "HÀM, HÁM",
    "meaning": "cằm, nuốt, chứa đựng",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "ふく.む",
      "ふく.める"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "況",
    "hanViet": "HUỐNG",
    "meaning": "huống chi, huống hồ",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "まし.て",
      "いわ.んや",
      "おもむき"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "補",
    "hanViet": "BỔ",
    "meaning": "thêm vào, chắp, vá, bổ (thuốc)",
    "onyomi": [
      "ほ"
    ],
    "kunyomi": [
      "おぎな.う"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "y 衣 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "効",
    "hanViet": "HIỆU",
    "meaning": "bắt chước, ví với, công hiệu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "き.く",
      "ききめ",
      "なら.う"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "lực 力 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "豊",
    "hanViet": "LỄ, PHONG",
    "meaning": "đầy, thịnh, được mùa",
    "onyomi": [
      "ほう",
      "ぶ"
    ],
    "kunyomi": [
      "ゆた.か",
      "とよ"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "đậu 豆 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "巻",
    "hanViet": "QUYỂN",
    "meaning": "Scroll, Volume, Book",
    "onyomi": [
      "かん",
      "けん"
    ],
    "kunyomi": [
      "ま.く",
      "まき",
      "ま.き"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "tiết 卩 (+6 nét), kỷ 己 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "捜",
    "hanViet": "SẢO, SƯU, TIÊU",
    "meaning": "Search, Look For, Locate",
    "onyomi": [
      "そう",
      "しゅ",
      "しゅう"
    ],
    "kunyomi": [
      "さが.す"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "替",
    "hanViet": "THẾ",
    "meaning": "thay thế",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "か.える",
      "か.え-",
      "か.わる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "viết 曰 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "造",
    "hanViet": "THÁO, TẠO",
    "meaning": "làm, chế tạo, bịa đặt",
    "onyomi": [
      "ぞう"
    ],
    "kunyomi": [
      "つく.る",
      "つく.り",
      "-づく.り"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "印",
    "hanViet": "ẤN",
    "meaning": "in ấn, cái ấn",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [
      "しるし",
      "-じるし",
      "しる.す"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "tiết 卩 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "復",
    "hanViet": "PHÚ, PHÚC, PHỤC",
    "meaning": "khôi phục, phục hồi, trở lại, làm lại, lặp lại",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [
      "また"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "xích 彳 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "筆",
    "hanViet": "BÚT",
    "meaning": "cái bút (để viết), viết bằng bút, nét trong chữ Hán",
    "onyomi": [
      "ひつ"
    ],
    "kunyomi": [
      "ふで"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "貯",
    "hanViet": "TRỮ",
    "meaning": "chứa cất",
    "onyomi": [
      "ちょ"
    ],
    "kunyomi": [
      "た.める",
      "たくわ.える"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "刺",
    "hanViet": "THÍCH, THỨ",
    "meaning": "tiêm, chích, châm, chọc, danh thiếp (âm thứ), tiêm, chích, châm, chọc",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "さ.す",
      "さ.さる",
      "さ.し",
      "さし",
      "とげ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "郵",
    "hanViet": "BƯU",
    "meaning": "nhà trạm (truyền tin)",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "ấp 邑 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "針",
    "hanViet": "CHÂM, TRÂM",
    "meaning": "cái kim, cái kim",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "はり"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "kim 金 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "菓",
    "hanViet": "QUẢ",
    "meaning": "quả, trái, quả nhiên, kết quả",
    "onyomi": [
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "河",
    "hanViet": "HÀ",
    "meaning": "sông",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "かわ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "汗",
    "hanViet": "HÀN, HÃN, HẠN",
    "meaning": "mồ hôi, mồ hôi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "あせ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "再",
    "hanViet": "TÁI",
    "meaning": "lại, lần nữa, làm lại",
    "onyomi": [
      "さい",
      "さ"
    ],
    "kunyomi": [
      "ふたた.び"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "quynh 冂 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "接",
    "hanViet": "TIẾP",
    "meaning": "tiếp tục, nối tiếp, tiếp theo",
    "onyomi": [
      "せつ",
      "しょう"
    ],
    "kunyomi": [
      "つ.ぐ"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "占",
    "hanViet": "CHIÊM, CHIẾM",
    "meaning": "xem điềm để biết tốt xấu, chiếm đoạt của người khác",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "し.める",
      "うらな.う"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "bốc 卜 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "胃",
    "hanViet": "TRỤ, VỊ",
    "meaning": "dạ dày, mề (gà, chim)",
    "onyomi": [
      "い"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "nhục 肉 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "悩",
    "hanViet": "NÃO",
    "meaning": "Trouble, Worry, In Pain",
    "onyomi": [
      "のう"
    ],
    "kunyomi": [
      "なや.む",
      "なや.ます",
      "なや.ましい",
      "なやみ"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "昇",
    "hanViet": "THĂNG",
    "meaning": "bay lên, cái thưng, thưng, thăng (đơn vị đo)",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "のぼ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "濃",
    "hanViet": "NÙNG",
    "meaning": "dày, đặc, đậm (màu) (ý nhấn mạnh, trái với đạm)",
    "onyomi": [
      "のう"
    ],
    "kunyomi": [
      "こ.い"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "thuỷ 水 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "極",
    "hanViet": "CỰC",
    "meaning": "cực, tột cùng",
    "onyomi": [
      "きょく",
      "ごく"
    ],
    "kunyomi": [
      "きわ.める",
      "きわ.まる",
      "きわ.まり",
      "きわ.み",
      "き.める",
      "-ぎ.め",
      "き.まる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "逆",
    "hanViet": "NGHỊCH, NGHỊNH",
    "meaning": "trái ngược",
    "onyomi": [
      "ぎゃく",
      "げき"
    ],
    "kunyomi": [
      "さか",
      "さか.さ",
      "さか.らう"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "sước 辵 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "巨",
    "hanViet": "CỰ, HÁ",
    "meaning": "lớn, to",
    "onyomi": [
      "きょ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "công 工 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "庫",
    "hanViet": "KHỐ",
    "meaning": "kho chứa đồ vật",
    "onyomi": [
      "こ",
      "く"
    ],
    "kunyomi": [
      "くら"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nghiễm 广 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "児",
    "hanViet": "NHI",
    "meaning": "đứa trẻ, con (từ xưng hô với cha mẹ)",
    "onyomi": [
      "じ",
      "に",
      "げい"
    ],
    "kunyomi": [
      "こ",
      "-こ",
      "-っこ"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "nhân 儿 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "凍",
    "hanViet": "ĐÔNG, ĐỐNG",
    "meaning": "đóng băng, nước đá",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "こお.る",
      "こご.える",
      "こご.る",
      "い.てる",
      "し.みる"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "băng 冫 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "幼",
    "hanViet": "YẾU, ẤU",
    "meaning": "bé, nhỏ tuổi",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "おさな.い"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "yêu 幺 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "清",
    "hanViet": "SẢNH, THANH",
    "meaning": "trong sạch (nước), đời nhà Thanh, họ Thanh",
    "onyomi": [
      "せい",
      "しょう",
      "しん"
    ],
    "kunyomi": [
      "きよ.い",
      "きよ.まる",
      "きよ.める"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "録",
    "hanViet": "LỤC",
    "meaning": "ghi chép",
    "onyomi": [
      "ろく"
    ],
    "kunyomi": [
      "しる.す",
      "と.る"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "券",
    "hanViet": "KHOÁN",
    "meaning": "văn tự để làm tin",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "移",
    "hanViet": "DI, DỊ, SỈ, XỈ",
    "meaning": "di chuyển, khen ngợi, rộng rãi",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "うつ.る",
      "うつ.す"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "hoà 禾 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "並",
    "hanViet": "BÍNH, TINH, TÍNH, TỊNH",
    "meaning": "hợp, gồm, châu Tinh (Trung Quốc), bằng nhau, ngang nhau, đều",
    "onyomi": [
      "へい",
      "ほう"
    ],
    "kunyomi": [
      "な.み",
      "なみ",
      "なら.べる",
      "なら.ぶ",
      "なら.びに"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nhất 一 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "乾",
    "hanViet": "CAN, CÀN, KIỀN",
    "meaning": "khô, cạn kiệt, tiếng hão gọi mà không có thực sự, quẻ Càn (tam liên) trong Kinh Dịch (có 3 vạch liền, tượng Thiên (trời), tượng trưng người cha, hành Kim, tuổi Tuất và Hợi, hướng Tây Bắc)",
    "onyomi": [
      "かん",
      "けん"
    ],
    "kunyomi": [
      "かわ.く",
      "かわ.かす",
      "ほ.す",
      "ひ.る",
      "いぬい"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "ất 乙 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "欧",
    "hanViet": "ÂU, ẨU",
    "meaning": "châu Âu",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "うた.う",
      "は.く"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "khiếm 欠 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "臣",
    "hanViet": "THẦN",
    "meaning": "bề tôi",
    "onyomi": [
      "しん",
      "じん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thần 臣 (+0 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "略",
    "hanViet": "LƯỢC",
    "meaning": "qua loa, sơ sài, mưu lược",
    "onyomi": [
      "りゃく"
    ],
    "kunyomi": [
      "ほぼ",
      "はぶ.く",
      "おか.す",
      "おさ.める",
      "はかりごと",
      "はか.る"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "điền 田 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "航",
    "hanViet": "HÀNG",
    "meaning": "cái xuồng, thuyền, vượt qua",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "chu 舟 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "板",
    "hanViet": "BẢN",
    "meaning": "tấm, miếng, gỗ đóng quan tài, cứng, rắn",
    "onyomi": [
      "はん",
      "ばん"
    ],
    "kunyomi": [
      "いた"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "詰",
    "hanViet": "CẬT",
    "meaning": "hỏi vặn",
    "onyomi": [
      "きつ",
      "きち"
    ],
    "kunyomi": [
      "つ.める",
      "つ.め",
      "-づ.め",
      "つ.まる",
      "つ.む"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "照",
    "hanViet": "CHIẾU",
    "meaning": "chiếu, soi, rọi",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "て.る",
      "て.らす",
      "て.れる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "hoả 火 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "快",
    "hanViet": "KHOÁI",
    "meaning": "nhanh nhẹn, sắp sửa, sướng, thích",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "こころよ.い"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "tâm 心 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "版",
    "hanViet": "BẢN",
    "meaning": "bản in, lần xuất bản",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "phiến 片 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "預",
    "hanViet": "DỰ",
    "meaning": "sẵn, có trước, làm trước, tham gia, dự",
    "onyomi": [
      "よ"
    ],
    "kunyomi": [
      "あず.ける",
      "あず.かる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "hiệt 頁 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "延",
    "hanViet": "DIÊN, DUYÊN",
    "meaning": "kéo dài, chậm, kéo dài",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "の.びる",
      "の.べる",
      "の.べ",
      "の.ばす"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "dẫn 廴 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "翌",
    "hanViet": "DỰC",
    "meaning": "ngày mai",
    "onyomi": [
      "よく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "vũ 羽 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "符",
    "hanViet": "BỒ, PHÙ",
    "meaning": "phù hiệu, thẻ bài, cái bùa trừ ma, phù hiệu, thẻ bài",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "trúc 竹 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "編",
    "hanViet": "BIÊN",
    "meaning": "đan, bện, tết, sắp xếp, tổ chức, biên soạn, biên tập",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "あ.む",
      "-あ.み"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "普",
    "hanViet": "PHỔ",
    "meaning": "rộng, lớn, khắp",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "あまね.く",
      "あまねし"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "掃",
    "hanViet": "TÁO, TẢO",
    "meaning": "quét, cái chổi",
    "onyomi": [
      "そう",
      "しゅ"
    ],
    "kunyomi": [
      "は.く"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "泥",
    "hanViet": "NÊ, NỄ, NỆ",
    "meaning": "bùn đất, kiềm chế, trì trệ",
    "onyomi": [
      "でい",
      "ない",
      "で",
      "に"
    ],
    "kunyomi": [
      "どろ",
      "なず.む"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "棒",
    "hanViet": "BỔNG",
    "meaning": "cái gậy ngắn, côn, cừ, giỏi",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "孫",
    "hanViet": "TÔN, TỐN",
    "meaning": "cháu gọi bằng ông, nhún nhường",
    "onyomi": [
      "そん"
    ],
    "kunyomi": [
      "まご"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "tử 子 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "帯",
    "hanViet": "ĐÁI, ĐỚI",
    "meaning": "đều, đai, dây, dải, thắt lưng, mang, đeo",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "お.びる",
      "おび"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "cân 巾 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "粉",
    "hanViet": "PHẤN",
    "meaning": "bột, phấn, son phấn",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [
      "デシメートル",
      "こ",
      "こな"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "mễ 米 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "菜",
    "hanViet": "THÁI",
    "meaning": "rau ăn",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "な"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "貨",
    "hanViet": "HOÁ",
    "meaning": "tiền tệ, hàng hoá",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "たから"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "陸",
    "hanViet": "LỤC",
    "meaning": "đất liền, đường bộ, sao Lục",
    "onyomi": [
      "りく",
      "ろく"
    ],
    "kunyomi": [
      "おか"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "均",
    "hanViet": "QUÂN, VẬN",
    "meaning": "đều, bằng nhau",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "なら.す"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thổ 土 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "採",
    "hanViet": "THÁI, THẢI",
    "meaning": "hái, ngắt, chọn nhặt",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "と.る"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "永",
    "hanViet": "VĨNH, VỊNH",
    "meaning": "lâu dài",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "なが.い"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "thuỷ 水 (+1 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "液",
    "hanViet": "DỊCH",
    "meaning": "chất lỏng",
    "onyomi": [
      "えき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "績",
    "hanViet": "TÍCH",
    "meaning": "đánh sợi, xe chỉ, tích luỹ",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "mịch 糸 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "複",
    "hanViet": "PHỨC",
    "meaning": "áo kép, kép, ghép, phức",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "y 衣 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "党",
    "hanViet": "ĐẢNG",
    "meaning": "bè, đảng",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "なかま",
      "むら"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nhân 儿 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "卵",
    "hanViet": "CÔN, NOÃN",
    "meaning": "quả trứng, hột dái",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "たまご"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "tiết 卩 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "捨",
    "hanViet": "XẢ",
    "meaning": "vứt bỏ, bỏ đi, rời bỏ, bố thí",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "す.てる"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "汚",
    "hanViet": "Ô, Ố",
    "meaning": "bẩn thỉu, bẩn thỉu",
    "onyomi": [
      "お"
    ],
    "kunyomi": [
      "けが.す",
      "けが.れる",
      "けが.らわしい",
      "よご.す",
      "よご.れる",
      "きたな.い"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "机",
    "hanViet": "CƠ, KI, KY, KÌ, KỶ",
    "meaning": "công việc, máy móc, công việc",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "つくえ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "mộc 木 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "簡",
    "hanViet": "GIẢN",
    "meaning": "lược bớt, đơn giản hoá, thẻ tre để viết",
    "onyomi": [
      "かん",
      "けん"
    ],
    "kunyomi": [
      "えら.ぶ",
      "ふだ"
    ],
    "jlpt": "N2",
    "strokeCount": 18,
    "radical": "trúc 竹 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "誌",
    "hanViet": "CHÍ",
    "meaning": "ghi chép, văn ký sự",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "宝",
    "hanViet": "BẢO, BỬU",
    "meaning": "quý giá, quý giá",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "たから"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "尊",
    "hanViet": "TÔN",
    "meaning": "tôn trọng, kính, cái chén (như chữ 樽)",
    "onyomi": [
      "そん"
    ],
    "kunyomi": [
      "たっと.い",
      "とうと.い",
      "たっと.ぶ",
      "とうと.ぶ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thốn 寸 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "敬",
    "hanViet": "KÍNH",
    "meaning": "tôn trọng, kính trọng",
    "onyomi": [
      "けい",
      "きょう"
    ],
    "kunyomi": [
      "うやま.う"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "phác 攴 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "灰",
    "hanViet": "HÔI, KHÔI",
    "meaning": "tro",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "はい"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "hoả 火 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "砂",
    "hanViet": "SA",
    "meaning": "đá vụn, sỏi vụn, cát, sạn",
    "onyomi": [
      "さ",
      "しゃ"
    ],
    "kunyomi": [
      "すな"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thạch 石 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "著",
    "hanViet": "TRƯỚC, TRỨ, TRỮ",
    "meaning": "mặc áo, biên soạn sách, nước cờ",
    "onyomi": [
      "ちょ",
      "ちゃく"
    ],
    "kunyomi": [
      "あらわ.す",
      "いちじる.しい"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "蒸",
    "hanViet": "CHƯNG",
    "meaning": "lũ, bọn, hơi nóng bốc lên, hương lên, đùn đùn",
    "onyomi": [
      "じょう",
      "せい"
    ],
    "kunyomi": [
      "む.す",
      "む.れる",
      "む.らす"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "hoả 火 (+9 nét), thảo 艸 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "蔵",
    "hanViet": "TÀNG",
    "meaning": "Storehouse, Hide, Own",
    "onyomi": [
      "ぞう",
      "そう"
    ],
    "kunyomi": [
      "くら",
      "おさ.める",
      "かく.れる"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "thảo 艸 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "装",
    "hanViet": "TRANG",
    "meaning": "quần áo, trang phục, giả làm, đóng giả, giả bộ, trang điểm, trang sức, hoá trang",
    "onyomi": [
      "そう",
      "しょう"
    ],
    "kunyomi": [
      "よそお.う",
      "よそお.い"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "y 衣 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "裏",
    "hanViet": "LÍ, LÝ",
    "meaning": "ở trong, lần lót áo",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "うら"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "y 衣 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "諸",
    "hanViet": "CHƯ, GIA",
    "meaning": "(là hợp thanh của 2 chữ \"chi ư\")",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "もろ"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "臓",
    "hanViet": "TẠNG",
    "meaning": "Entrails, Viscera, Bowels",
    "onyomi": [
      "ぞう"
    ],
    "kunyomi": [
      "はらわた"
    ],
    "jlpt": "N2",
    "strokeCount": 19,
    "radical": "nhục 肉 (+14 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "純",
    "hanViet": "CHUẨN, THUẦN, TRUY, TUYỀN, ĐỒN",
    "meaning": "thuần tuý, không  có loại khác",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "紅",
    "hanViet": "CÔNG, HỒNG",
    "meaning": "màu hồng, màu đỏ",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "べに",
      "くれない",
      "あか.い"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mịch 糸 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "拝",
    "hanViet": "BÁI",
    "meaning": "lạy, vái, chúc mừng, tôn kính",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "おが.む",
      "おろが.む"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "劇",
    "hanViet": "KỊCH",
    "meaning": "quá mức, trò đùa, vở kịch",
    "onyomi": [
      "げき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "đao 刀 (+13 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "承",
    "hanViet": "CHỬNG, THỪA, TẶNG",
    "meaning": "vâng theo, hứng, đón lấy, nhận lấy",
    "onyomi": [
      "しょう",
      "じょう"
    ],
    "kunyomi": [
      "うけたまわ.る",
      "う.ける"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "損",
    "hanViet": "TỔN",
    "meaning": "tốn, mất",
    "onyomi": [
      "そん"
    ],
    "kunyomi": [
      "そこ.なう",
      "そこな.う",
      "-そこ.なう",
      "そこ.ねる",
      "-そこ.ねる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thủ 手 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "枝",
    "hanViet": "CHI, KÌ, KỲ",
    "meaning": "cành cây",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "えだ"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "測",
    "hanViet": "TRẮC",
    "meaning": "lường trước",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "はか.る"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "講",
    "hanViet": "GIẢNG",
    "meaning": "giảng giải",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "ngôn 言 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "紹",
    "hanViet": "THIỆU",
    "meaning": "tiếp nối",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "介",
    "hanViet": "GIỚI",
    "meaning": "khoảng giữa, vẩy (cá), bậm bực, bứt rứt",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "nhân 人 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "湖",
    "hanViet": "HỒ",
    "meaning": "hồ nước",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "みずうみ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "銅",
    "hanViet": "ĐỒNG",
    "meaning": "đồng, Cu",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "あかがね"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "kim 金 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "油",
    "hanViet": "DU",
    "meaning": "tinh dầu",
    "onyomi": [
      "ゆ",
      "ゆう"
    ],
    "kunyomi": [
      "あぶら"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "旧",
    "hanViet": "CỰU",
    "meaning": "cũ, lâu",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "ふる.い",
      "もと"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "nhật 日 (+1 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "姓",
    "hanViet": "TÍNH",
    "meaning": "họ",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貿",
    "hanViet": "MẬU",
    "meaning": "mậu dịch, trao đổi",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "将",
    "hanViet": "THƯƠNG, TƯƠNG, TƯỚNG",
    "meaning": "sẽ, sắp, đem, đưa, cầm, cấp tướng, chỉ huy",
    "onyomi": [
      "しょう",
      "そう"
    ],
    "kunyomi": [
      "まさ.に",
      "はた",
      "まさ",
      "ひきい.る",
      "もって"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thốn 寸 (+6 nét), tường 爿 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "伸",
    "hanViet": "THÂN",
    "meaning": "duỗi ra, bày tỏ, kể rõ",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "の.びる",
      "の.ばす",
      "の.べる",
      "の.す"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "幅",
    "hanViet": "BỨC, PHÚC",
    "meaning": "khổ rộng của vải, bức, tấm (từ dùng để đếm số vải)",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [
      "はば"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "cân 巾 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "甘",
    "hanViet": "CAM",
    "meaning": "ngọt, cam chịu",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "あま.い",
      "あま.える",
      "あま.やかす",
      "うま.い"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "cam 甘 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "換",
    "hanViet": "HOÁN",
    "meaning": "hoán đổi, trao đổi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "か.える",
      "-か.える",
      "か.わる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "療",
    "hanViet": "LIỆU",
    "meaning": "chữa bệnh, điều trị",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "nạch 疒 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "般",
    "hanViet": "BAN, BÀN, BÁT",
    "meaning": "quanh co, quay về, chủng loại",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "chu 舟 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "依",
    "hanViet": "Y, Ỷ",
    "meaning": "giống, như, dựa vào, nương vào",
    "onyomi": [
      "い",
      "え"
    ],
    "kunyomi": [
      "よ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漁",
    "hanViet": "NGƯ",
    "meaning": "người đánh cá, đánh cá",
    "onyomi": [
      "ぎょ",
      "りょう"
    ],
    "kunyomi": [
      "あさ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "募",
    "hanViet": "MỘ",
    "meaning": "tuyển mộ",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [
      "つの.る"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "lực 力 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "患",
    "hanViet": "HOẠN",
    "meaning": "hoạn nạn",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "わずら.う"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "湾",
    "hanViet": "LOAN",
    "meaning": "vịnh biển, chỗ ngoặt trên sông, khuỷu sông",
    "onyomi": [
      "わん"
    ],
    "kunyomi": [
      "いりえ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "爆",
    "hanViet": "BẠC, BẠO, BỘC",
    "meaning": "nổ, toé lửa",
    "onyomi": [
      "ばく"
    ],
    "kunyomi": [
      "は.ぜる"
    ],
    "jlpt": "N2",
    "strokeCount": 19,
    "radical": "hoả 火 (+15 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "跡",
    "hanViet": "TÍCH",
    "meaning": "dấu vết, dấu tích",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "あと"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "túc 足 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "香",
    "hanViet": "HƯƠNG",
    "meaning": "hương, mùi",
    "onyomi": [
      "こう",
      "きょう"
    ],
    "kunyomi": [
      "か",
      "かお.り",
      "かお.る"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "hương 香 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "兆",
    "hanViet": "TRIỆU",
    "meaning": "điềm, triệu chứng, một triệu",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "きざ.す",
      "きざ.し"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "nhân 儿 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "齢",
    "hanViet": "LINH",
    "meaning": "Age",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "よわい",
      "とし"
    ],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "xỉ 齒 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刊",
    "hanViet": "KHAN, SAN",
    "meaning": "chặt, chạm khắc, xuất bản, in ấn",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "đao 刀 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "傾",
    "hanViet": "KHUYNH",
    "meaning": "nghiêng, đè úp, dốc hết",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "かたむ.く",
      "かたむ.ける",
      "かたぶ.く",
      "かた.げる",
      "かし.げる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奥",
    "hanViet": "ÁO, ÚC",
    "meaning": "sâu xa, khó hiểu, nước Áo",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "おく",
      "おく.まる",
      "くま"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "đại 大 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "贈",
    "hanViet": "TẶNG",
    "meaning": "tặng, biếu",
    "onyomi": [
      "ぞう",
      "そう"
    ],
    "kunyomi": [
      "おく.る"
    ],
    "jlpt": "N2",
    "strokeCount": 18,
    "radical": "bối 貝 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "超",
    "hanViet": "SIÊU",
    "meaning": "vượt mức, siêu việt",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "こ.える",
      "こ.す"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "tẩu 走 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雇",
    "hanViet": "CỐ",
    "meaning": "(một loài chim)",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "やと.う"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "chuy 隹 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "片",
    "hanViet": "PHIẾN",
    "meaning": "tấm",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "かた-",
      "かた"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "phiến 片 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "群",
    "hanViet": "QUẦN",
    "meaning": "chòm (sao), nhóm, tụ họp, bè bạn",
    "onyomi": [
      "ぐん"
    ],
    "kunyomi": [
      "む.れる",
      "む.れ",
      "むら",
      "むら.がる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "dương 羊 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "埋",
    "hanViet": "MAI, MAN",
    "meaning": "chôn, vùi, che lấp",
    "onyomi": [
      "まい"
    ],
    "kunyomi": [
      "う.める",
      "う.まる",
      "う.もれる",
      "うず.める",
      "うず.まる",
      "い.ける"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thổ 土 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "駐",
    "hanViet": "TRÚ",
    "meaning": "nghỉ lại, lưu lại",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "mã 馬 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柱",
    "hanViet": "TRÚ, TRỤ",
    "meaning": "cái cột",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "はしら"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "孝",
    "hanViet": "HIẾU",
    "meaning": "lòng biết ơn cha mẹ",
    "onyomi": [
      "こう",
      "きょう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "tử 子 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "鋭",
    "hanViet": "DUỆ, NHUỆ, ĐOÁI",
    "meaning": "sắc, nhọn, mũi nhọn",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "するど.い"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "kim 金 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殿",
    "hanViet": "ĐIẾN, ĐIỆN, ĐÁN",
    "meaning": "cung điện",
    "onyomi": [
      "でん",
      "てん"
    ],
    "kunyomi": [
      "との",
      "-どの"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thù 殳 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "薄",
    "hanViet": "BÁC, BẠC",
    "meaning": "mỏng manh, nhẹ, nhạt nhẽo",
    "onyomi": [
      "はく"
    ],
    "kunyomi": [
      "うす.い",
      "うす-",
      "-うす",
      "うす.める",
      "うす.まる",
      "うす.らぐ",
      "うす.ら-",
      "うす.れる",
      "すすき"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "thảo 艸 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "伺",
    "hanViet": "TÍ, TÝ, TỨ",
    "meaning": "chờ đợi, dò xét, thăm dò",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "うかが.う"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "炭",
    "hanViet": "THÁN",
    "meaning": "than củi",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "すみ"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "hoả 火 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "包",
    "hanViet": "BAO",
    "meaning": "bao, túi, gói, bao bọc, vây quanh, quây quanh",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "つつ.む",
      "くる.む"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "bao 勹 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "衣",
    "hanViet": "Y, Ý",
    "meaning": "cái áo, mặc áo",
    "onyomi": [
      "い",
      "え"
    ],
    "kunyomi": [
      "ころも",
      "きぬ",
      "-ぎ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "y 衣 (+0 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "鉱",
    "hanViet": "KHOÁNG, QUÁNG",
    "meaning": "Mineral, Ore",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "あらがね"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "kim 金 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "双",
    "hanViet": "SONG",
    "meaning": "đôi, cặp",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "ふた",
      "たぐい",
      "ならぶ",
      "ふたつ"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "hựu 又 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "床",
    "hanViet": "SÀNG",
    "meaning": "cái giường",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "とこ",
      "ゆか"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "nghiễm 广 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "掘",
    "hanViet": "QUẬT",
    "meaning": "đào lên",
    "onyomi": [
      "くつ"
    ],
    "kunyomi": [
      "ほ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "泊",
    "hanViet": "BẠC, PHÁCH",
    "meaning": "ghé thuyền, đỗ thuyền, đạm bạc",
    "onyomi": [
      "はく"
    ],
    "kunyomi": [
      "と.まる",
      "と.める"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "荒",
    "hanViet": "HOANG",
    "meaning": "không có người",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "あら.い",
      "あら-",
      "あ.れる",
      "あ.らす",
      "-あ.らし",
      "すさ.む"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thảo 艸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "袋",
    "hanViet": "ĐẠI",
    "meaning": "cái đẫy, túi, bao, bị",
    "onyomi": [
      "たい",
      "だい"
    ],
    "kunyomi": [
      "ふくろ"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "y 衣 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "珍",
    "hanViet": "TRÂN",
    "meaning": "quý báu",
    "onyomi": [
      "ちん"
    ],
    "kunyomi": [
      "めずら.しい",
      "たから"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "ngọc 玉 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "籍",
    "hanViet": "TẠ, TỊCH",
    "meaning": "ghi chép vào sổ, liệt kê",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 20,
    "radical": "trúc 竹 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刷",
    "hanViet": "LOÁT, XOÁT",
    "meaning": "tẩy sạch, cái bàn chải",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [
      "す.る",
      "-ず.り",
      "-ずり",
      "は.く"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "封",
    "hanViet": "PHONG",
    "meaning": "bì đóng kín, đậy lại, phong cấp",
    "onyomi": [
      "ふう",
      "ほう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thốn 寸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "筒",
    "hanViet": "ĐỒNG, ĐỘNG",
    "meaning": "ống tre, ống",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "つつ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柔",
    "hanViet": "NHU",
    "meaning": "mềm dẻo",
    "onyomi": [
      "じゅう",
      "にゅう"
    ],
    "kunyomi": [
      "やわ.らか",
      "やわ.らかい",
      "やわ",
      "やわ.ら"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沈",
    "hanViet": "THẨM, TRẤM, TRẦM",
    "meaning": "chìm, lặn, ném xuống nước",
    "onyomi": [
      "ちん",
      "じん"
    ],
    "kunyomi": [
      "しず.む",
      "しず.める"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "辛",
    "hanViet": "TÂN",
    "meaning": "Tân (ngôi thứ 8 hàng Can), cay, nhọc nhằn",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "から.い",
      "つら.い",
      "-づら.い",
      "かのと"
    ],
    "jlpt": "N2",
    "strokeCount": 7,
    "radical": "tân 辛 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "匹",
    "hanViet": "MỘC, THẤT",
    "meaning": "tấm (vải), đơn lẻ",
    "onyomi": [
      "ひつ"
    ],
    "kunyomi": [
      "ひき"
    ],
    "jlpt": "N2",
    "strokeCount": 4,
    "radical": "hễ 匸 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "叫",
    "hanViet": "KHIẾU",
    "meaning": "kêu, gọi",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "さけ.ぶ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "涙",
    "hanViet": "LỆ, LUỴ",
    "meaning": "Tears, Sympathy",
    "onyomi": [
      "るい",
      "れい"
    ],
    "kunyomi": [
      "なみだ"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "缶",
    "hanViet": "PHŨ, PHẪU, PHỮU",
    "meaning": "bộ phũ, bộ phũ, bộ phũ",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "かま"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "phũ 缶 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "粒",
    "hanViet": "LẠP",
    "meaning": "hạt gạo, hạt thóc",
    "onyomi": [
      "りゅう"
    ],
    "kunyomi": [
      "つぶ"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "mễ 米 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塔",
    "hanViet": "THÁP, ĐÁP",
    "meaning": "toà tháp",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肌",
    "hanViet": "CƠ",
    "meaning": "bắp thịt",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "はだ"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "nhục 肉 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舟",
    "hanViet": "CHU, CHÂU",
    "meaning": "cái thuyền, cái thuyền",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "ふね",
      "ふな-",
      "-ぶね"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "chu 舟 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "曇",
    "hanViet": "ĐÀM",
    "meaning": "mây chùm",
    "onyomi": [
      "どん"
    ],
    "kunyomi": [
      "くも.る"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "nhật 日 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "磨",
    "hanViet": "MA, MÁ",
    "meaning": "mài, xay (gạo)",
    "onyomi": [
      "ま"
    ],
    "kunyomi": [
      "みが.く",
      "す.る"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "thạch 石 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "湿",
    "hanViet": "CHẬP, THẤP",
    "meaning": "ẩm ướt",
    "onyomi": [
      "しつ",
      "しゅう"
    ],
    "kunyomi": [
      "しめ.る",
      "しめ.す",
      "うるお.う",
      "うるお.す"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "硬",
    "hanViet": "NGẠNH",
    "meaning": "cứng, rắn",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "かた.い"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "thạch 石 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鈍",
    "hanViet": "ĐỘN",
    "meaning": "cùn, nhụt (không sắc)",
    "onyomi": [
      "どん"
    ],
    "kunyomi": [
      "にぶ.い",
      "にぶ.る",
      "にぶ-",
      "なま.る",
      "なまく.ら"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "kim 金 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "涼",
    "hanViet": "LƯƠNG, LƯỢNG",
    "meaning": "mát mẻ",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "すず.しい",
      "すず.む",
      "すず.やか",
      "うす.い",
      "ひや.す",
      "まことに"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "零",
    "hanViet": "LINH",
    "meaning": "mưa lác đác, vụn vặt, lẻ, linh, héo rụng",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "ぜろ",
      "こぼ.す",
      "こぼ.れる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "vũ 雨 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "綿",
    "hanViet": "MIÊN",
    "meaning": "tơ tằm, kéo dài, liền, mềm mại",
    "onyomi": [
      "めん"
    ],
    "kunyomi": [
      "わた"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "帽",
    "hanViet": "MẠO",
    "meaning": "nón, mũ",
    "onyomi": [
      "ぼう",
      "もう"
    ],
    "kunyomi": [
      "ずきん",
      "おお.う"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "cân 巾 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憎",
    "hanViet": "TĂNG",
    "meaning": "ghét, không thích",
    "onyomi": [
      "ぞう"
    ],
    "kunyomi": [
      "にく.む",
      "にく.い",
      "にく.らしい",
      "にく.しみ"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "滴",
    "hanViet": "CHÍCH, TRÍCH, TÍCH",
    "meaning": "giọt nước, giọt nước, giọt nước",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "しずく",
      "したた.る"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畳",
    "hanViet": "ĐIỆP",
    "meaning": "Tatami Mat, Counter For Tatami Mats, Fold",
    "onyomi": [
      "じょう",
      "ちょう"
    ],
    "kunyomi": [
      "たた.む",
      "たたみ",
      "かさ.なる"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "điền 田 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畜",
    "hanViet": "HÚC, SÚC",
    "meaning": "súc vật, nuôi nấng",
    "onyomi": [
      "ちく"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "điền 田 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "溶",
    "hanViet": "DONG, DUNG",
    "meaning": "tan ra, hoà tan, lưu thông",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "と.ける",
      "と.かす",
      "と.く"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "踊",
    "hanViet": "DŨNG",
    "meaning": "nhảy nhót, hăng hái làm việc",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "おど.る"
    ],
    "jlpt": "N2",
    "strokeCount": 14,
    "radical": "túc 足 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賢",
    "hanViet": "HIỀN, HIỆN",
    "meaning": "người có đức hạnh, tài năng",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "かしこ.い"
    ],
    "jlpt": "N2",
    "strokeCount": 16,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "灯",
    "hanViet": "ĐINH, ĐĂNG",
    "meaning": "cái đèn",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ひ",
      "ほ-",
      "ともしび",
      "とも.す",
      "あかり"
    ],
    "jlpt": "N2",
    "strokeCount": 6,
    "radical": "hoả 火 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "咲",
    "hanViet": "TIẾU",
    "meaning": "cười",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "さ.く",
      "-ざき"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "khẩu 口 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塗",
    "hanViet": "TRÀ, ĐỒ, ĐỘ",
    "meaning": "bôi, phết, quết, sơn",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "ぬ.る",
      "ぬ.り",
      "まみ.れる"
    ],
    "jlpt": "N2",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "召",
    "hanViet": "CHIÊU, THIỆU, TRIỆU",
    "meaning": "kêu gọi, mời đến, kêu gọi, mời đến",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "め.す"
    ],
    "jlpt": "N2",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "挟",
    "hanViet": "HIỆP, TIỆP",
    "meaning": "cắp, xách, xốc, gắp, cậy, nhờ, dựa vào, cái đũa",
    "onyomi": [
      "きょう",
      "しょう"
    ],
    "kunyomi": [
      "はさ.む",
      "はさ.まる",
      "わきばさ.む",
      "さしはさ.む"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "枯",
    "hanViet": "KHÔ",
    "meaning": "héo hon (cây), khô, cạn",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "か.れる",
      "か.らす"
    ],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沸",
    "hanViet": "PHÍ, PHẤT",
    "meaning": "sôi (nước)",
    "onyomi": [
      "ふつ"
    ],
    "kunyomi": [
      "わ.く",
      "わ.かす"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "濯",
    "hanViet": "TRẠC, TRẠO",
    "meaning": "giặt giũ, rửa",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [
      "すす.ぐ",
      "ゆす.ぐ"
    ],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "thuỷ 水 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "燥",
    "hanViet": "TÁO",
    "meaning": "khô ráo, hanh",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "はしゃ.ぐ"
    ],
    "jlpt": "N2",
    "strokeCount": 17,
    "radical": "hoả 火 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瓶",
    "hanViet": "BÌNH",
    "meaning": "cái bình, cái lọ",
    "onyomi": [
      "びん"
    ],
    "kunyomi": [
      "かめ"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "ngoã 瓦 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "耕",
    "hanViet": "CANH",
    "meaning": "cày ruộng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "たがや.す"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "lỗi 耒 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "肯",
    "hanViet": "KHẢI, KHẲNG",
    "meaning": "được, đồng ý, há, há sao (như khởi 豈)",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "がえんじ.る"
    ],
    "jlpt": "N2",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "脂",
    "hanViet": "CHI, CHỈ",
    "meaning": "mỡ tảng, sáp, nhựa, mỡ tảng",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "あぶら"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "膚",
    "hanViet": "PHU",
    "meaning": "da ngoài, ở ngoài vào, to lớn",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "はだ"
    ],
    "jlpt": "N2",
    "strokeCount": 15,
    "radical": "nhục 肉 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "軒",
    "hanViet": "HIÊN, HIẾN",
    "meaning": "xe có mái che, mái hiên bằng phẳng",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "のき"
    ],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "xa 車 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "軟",
    "hanViet": "NHUYỄN",
    "meaning": "mềm, dẻo",
    "onyomi": [
      "なん"
    ],
    "kunyomi": [
      "やわ.らか",
      "やわ.らかい"
    ],
    "jlpt": "N2",
    "strokeCount": 11,
    "radical": "xa 車 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "郊",
    "hanViet": "GIAO",
    "meaning": "ngoại thành, ngoại ô",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 9,
    "radical": "ấp 邑 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隅",
    "hanViet": "NGUNG",
    "meaning": "đất ngoài ven, cạnh góc",
    "onyomi": [
      "ぐう"
    ],
    "kunyomi": [
      "すみ"
    ],
    "jlpt": "N2",
    "strokeCount": 12,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隻",
    "hanViet": "CHÍCH",
    "meaning": "chiếc, cái, đơn chiếc, lẻ loi",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [],
    "jlpt": "N2",
    "strokeCount": 10,
    "radical": "chuy 隹 (+2 nét)",
    "grade": "Lớp 8"
  }
]

export const N1_KANJI: JoyoKanjiEntry[] = [
  {
    "kanji": "刀",
    "hanViet": "ĐAO",
    "meaning": "con dao, cái đao",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "かたな",
      "そり"
    ],
    "jlpt": "N1",
    "strokeCount": 2,
    "radical": "đao 刀 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "丁",
    "hanViet": "CHÊNH, TRANH, TRÀNH, ĐINH",
    "meaning": "con trai, họ Đinh",
    "onyomi": [
      "ちょう",
      "てい",
      "ちん",
      "とう",
      "ち"
    ],
    "kunyomi": [
      "ひのと"
    ],
    "jlpt": "N1",
    "strokeCount": 2,
    "radical": "nhất 一 (+1 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "又",
    "hanViet": "HỮU, HỰU",
    "meaning": "cũng, lại còn",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "また",
      "また-",
      "また.の-"
    ],
    "jlpt": "N1",
    "strokeCount": 2,
    "radical": "hựu 又 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "矢",
    "hanViet": "THI, THỈ",
    "meaning": "tên (bắn cung), tên (bắn cung)",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "や"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "thỉ 矢 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "羊",
    "hanViet": "DƯƠNG, TƯỜNG",
    "meaning": "con dê",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "ひつじ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "dương 羊 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "氏",
    "hanViet": "CHI, THỊ",
    "meaning": "họ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "うじ",
      "-うじ"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "thị 氏 (+0 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "仮",
    "hanViet": "GIÁ, GIẢ",
    "meaning": "dối trá, mượn, vay, nghỉ tắm gội",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "かり",
      "かり-"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "級",
    "hanViet": "CẤP",
    "meaning": "cấp bậc",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mịch 糸 (+3 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "功",
    "hanViet": "CÔNG",
    "meaning": "công lao, thành tích",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "いさお"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "lực 力 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "第",
    "hanViet": "ĐỆ",
    "meaning": "thứ bậc, nhà của vương công hoặc đại thần, khoa thi",
    "onyomi": [
      "だい",
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "trúc 竹 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "暑",
    "hanViet": "THỬ",
    "meaning": "nóng bức, nắng, mùa hè",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [
      "あつ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "整",
    "hanViet": "CHỈNH",
    "meaning": "đều, ngay ngắn, còn nguyên vẹn, sửa sang, chỉnh đốn",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "ととの.える",
      "ととの.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "phác 攴 (+12 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "詩",
    "hanViet": "THI",
    "meaning": "thơ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "うた"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "器",
    "hanViet": "KHÍ",
    "meaning": "đồ dùng",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "うつわ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "khẩu 口 (+13 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "士",
    "hanViet": "SĨ",
    "meaning": "học trò, quan",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "さむらい"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "sĩ 士 (+0 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "標",
    "hanViet": "PHIÊU, TIÊU",
    "meaning": "ngọn nguồn, cái nêu, nêu lên",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [
      "しるべ",
      "しるし"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mộc 木 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "鏡",
    "hanViet": "CẢNH, KÍNH",
    "meaning": "gương, kính, gương, kính",
    "onyomi": [
      "きょう",
      "けい"
    ],
    "kunyomi": [
      "かがみ"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "kim 金 (+11 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "養",
    "hanViet": "DƯỜNG, DƯỠNG, DƯỢNG, DẠNG",
    "meaning": "nuôi dưỡng, dâng biếu, nuôi dưỡng",
    "onyomi": [
      "よう",
      "りょう"
    ],
    "kunyomi": [
      "やしな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thực 食 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "謝",
    "hanViet": "TẠ",
    "meaning": "cảm tạ, cảm ơn, nhận lỗi, xin lỗi, tạ lỗi, rụng, tàn, rã",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "あやま.る"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngôn 言 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "松",
    "hanViet": "TUNG, TÔNG, TÙNG",
    "meaning": "cây tùng, cây thông, tóc rối bù, bờm cổ",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "まつ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "基",
    "hanViet": "CƠ",
    "meaning": "nền, móng, gây dựng, đồ làm ruộng",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "もと",
      "もとい"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "妥",
    "hanViet": "THOẢ",
    "meaning": "thoả đáng, ổn, yên",
    "onyomi": [
      "だ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雰",
    "hanViet": "PHÂN",
    "meaning": "khí sương mù",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "vũ 雨 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頑",
    "hanViet": "NGOAN",
    "meaning": "dốt nát, ngu xuẩn, ngoan cố, bảo thủ",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "かたく"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hiệt 頁 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "司",
    "hanViet": "TI, TY, TƯ",
    "meaning": "chủ trì, quản lý, quan sở, chủ trì, quản lý",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "つかさど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "泣",
    "hanViet": "KHẤP",
    "meaning": "khóc không thành tiếng",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "な.く"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "紀",
    "hanViet": "KỈ, KỶ",
    "meaning": "gỡ mối rối, 12 năm, kỷ cương, kỷ luật",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mịch 糸 (+3 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "典",
    "hanViet": "ĐIỂN",
    "meaning": "chuẩn mực, mẫu mực",
    "onyomi": [
      "てん",
      "でん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "bát 八 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "保",
    "hanViet": "BẢO",
    "meaning": "giữ gìn, bảo đảm",
    "onyomi": [
      "ほ",
      "ほう"
    ],
    "kunyomi": [
      "たも.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "弁",
    "hanViet": "BIỀN, BIỆN, BÀN",
    "meaning": "mũ lớn của quan văn và quan võ",
    "onyomi": [
      "べん",
      "へん"
    ],
    "kunyomi": [
      "かんむり",
      "わきま.える",
      "わ.ける",
      "はなびら",
      "あらそ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "củng 廾 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "証",
    "hanViet": "CHỨNG",
    "meaning": "bằng cứ, can gián",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "あかし"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "冒",
    "hanViet": "MẠO, MẶC",
    "meaning": "xông lên, hấp tấp, giả mạo",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "おか.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "quynh 冂 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "冗",
    "hanViet": "NHŨNG",
    "meaning": "vô tích sự, phiền nhiễu",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "mịch 冖 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "阪",
    "hanViet": "BẢN, PHẢN",
    "meaning": "sườn núi, sườn núi",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "さか"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "phụ 阜 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "梅",
    "hanViet": "MAI",
    "meaning": "cây hoa mai",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "うめ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "結",
    "hanViet": "KẾ, KẾT",
    "meaning": "thắt nút, kết, bó, liên kết",
    "onyomi": [
      "けつ",
      "けち"
    ],
    "kunyomi": [
      "むす.ぶ",
      "ゆ.う",
      "ゆ.わえる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "是",
    "hanViet": "THỊ",
    "meaning": "là, đúng",
    "onyomi": [
      "ぜ",
      "し"
    ],
    "kunyomi": [
      "これ",
      "この",
      "ここ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渉",
    "hanViet": "THIỆP",
    "meaning": "Ford, Go Cross, Transit",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "わた.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虚",
    "hanViet": "HƯ, KHƯ",
    "meaning": "không có thực, trống rỗng",
    "onyomi": [
      "きょ",
      "こ"
    ],
    "kunyomi": [
      "むな.しい",
      "うつ.ろ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "hô 虍 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "幻",
    "hanViet": "HUYỄN, ẢO",
    "meaning": "hư ảo, không có thực, hư ảo, không có thực",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "まぼろし"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "yêu 幺 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弓",
    "hanViet": "CUNG",
    "meaning": "cong, cái cung, cung (đơn vị đo, bằng 10 xích)",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "ゆみ"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "cung 弓 (+0 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "汽",
    "hanViet": "HẤT, KHÍ, ẤT",
    "meaning": "hơi nước",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 2"
  },
  {
    "kanji": "僧",
    "hanViet": "TĂNG",
    "meaning": "nam sư",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "禅",
    "hanViet": "THIỀN, THIỆN",
    "meaning": "lặng nghĩ suy xét, thiền, quét đất để tế",
    "onyomi": [
      "ぜん",
      "せん"
    ],
    "kunyomi": [
      "しずか",
      "ゆず.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kỳ 示 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "句",
    "hanViet": "CÂU, CÚ, CẤU",
    "meaning": "câu nói",
    "onyomi": [
      "く"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "節",
    "hanViet": "TIẾT, TIỆT",
    "meaning": "đốt, đoạn, tiết trời, một khoảng thời gian",
    "onyomi": [
      "せつ",
      "せち"
    ],
    "kunyomi": [
      "ふし",
      "-ぶし",
      "のっと"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "trúc 竹 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "昆",
    "hanViet": "CÔN",
    "meaning": "(xem: côn lôn 崑崙,昆仑), nhiều nhung nhúc, em trai",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "閥",
    "hanViet": "PHIỆT",
    "meaning": "tờ ghi công trạng",
    "onyomi": [
      "ばつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "môn 門 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舌",
    "hanViet": "THIỆT",
    "meaning": "cái lưỡi",
    "onyomi": [
      "ぜつ"
    ],
    "kunyomi": [
      "した"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thiệt 舌 (+0 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "宙",
    "hanViet": "TRỤ",
    "meaning": "từ xưa tới nay",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "履",
    "hanViet": "LÍ, LÝ",
    "meaning": "giày da, giày xéo",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "は.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thi 尸 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "善",
    "hanViet": "THIẾN, THIỆN",
    "meaning": "người tài giỏi, thiện, lành",
    "onyomi": [
      "ぜん"
    ],
    "kunyomi": [
      "よ.い",
      "い.い",
      "よ.く",
      "よし.とする"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "災",
    "hanViet": "TAI",
    "meaning": "cháy nhà, tai ương",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "わざわ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "hoả 火 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "率",
    "hanViet": "LUẬT, LÔ, SOÁT, SUÝ, SUẤT",
    "meaning": "noi theo, quản lãnh, noi theo",
    "onyomi": [
      "そつ",
      "りつ",
      "しゅつ"
    ],
    "kunyomi": [
      "ひき.いる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "huyền 玄 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "妨",
    "hanViet": "PHƯƠNG, PHƯỚNG",
    "meaning": "hại, trở ngại, ngăn trở",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "さまた.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "裕",
    "hanViet": "DỤ",
    "meaning": "nhiều đồ đạc, giàu có, thong thả",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "y 衣 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尻",
    "hanViet": "CỪU, KHÀO",
    "meaning": "xương cùng sau đít",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "しり"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "thi 尸 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尾",
    "hanViet": "VĨ",
    "meaning": "cái đuôi, theo sau",
    "onyomi": [
      "び"
    ],
    "kunyomi": [
      "お"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thi 尸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嫌",
    "hanViet": "HIỀM",
    "meaning": "sự nghi ngờ",
    "onyomi": [
      "けん",
      "げん"
    ],
    "kunyomi": [
      "きら.う",
      "きら.い",
      "いや"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nữ 女 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "臭",
    "hanViet": "KHỨU, XÚ",
    "meaning": "mùi, hôi thối, khai, khét, tiếng xấu",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "くさ.い",
      "-くさ.い",
      "にお.う",
      "にお.い"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tự 自 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "穴",
    "hanViet": "HUYỆT",
    "meaning": "hang, lỗ, hố",
    "onyomi": [
      "けつ"
    ],
    "kunyomi": [
      "あな"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "huyệt 穴 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "笛",
    "hanViet": "ĐỊCH",
    "meaning": "cái sáo (để thổi)",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "ふえ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "trúc 竹 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "敵",
    "hanViet": "ĐỊCH",
    "meaning": "kẻ thù, giặc, ngang nhau, chống cự",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "かたき",
      "あだ",
      "かな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "phác 攴 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "挙",
    "hanViet": "CỬ",
    "meaning": "Raise, Plan, Project",
    "onyomi": [
      "きょ"
    ],
    "kunyomi": [
      "あ.げる",
      "あ.がる",
      "こぞ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "派",
    "hanViet": "BA, PHÁI",
    "meaning": "dòng nước, phái, phe, ngành nhánh",
    "onyomi": [
      "は"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "岡",
    "hanViet": "CƯƠNG",
    "meaning": "sườn núi",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "おか"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "sơn 山 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "素",
    "hanViet": "TỐ",
    "meaning": "tơ trắng, trắng nõn, chất",
    "onyomi": [
      "そ",
      "す"
    ],
    "kunyomi": [
      "もと"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "評",
    "hanViet": "BÌNH",
    "meaning": "phê bình, bình phẩm",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "批",
    "hanViet": "PHÊ",
    "meaning": "bán buôn, bán sỉ, phê phán, phê bình",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "検",
    "hanViet": "KIỂM",
    "meaning": "Examination, Investigate",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "しら.べる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "審",
    "hanViet": "THẨM",
    "meaning": "tỉ mỉ, thẩm tra, xét hỏi kỹ",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "つまび.らか",
      "つぶさ.に"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "miên 宀 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "条",
    "hanViet": "THIÊU, ĐIÊU, ĐIỀU",
    "meaning": "điều khoản, khoản mục, sọc, vằn, sợi, cành cây",
    "onyomi": [
      "じょう",
      "ちょう",
      "でき"
    ],
    "kunyomi": [
      "えだ",
      "すじ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "企",
    "hanViet": "XÍ",
    "meaning": "kiễng chân, mong ngóng",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "くわだ.てる",
      "たくら.む"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "義",
    "hanViet": "NGHĨA",
    "meaning": "nghĩa khí",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "dương 羊 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "罰",
    "hanViet": "PHẠT",
    "meaning": "trừng phạt, hình phạt, đánh đập",
    "onyomi": [
      "ばつ",
      "ばち",
      "はつ"
    ],
    "kunyomi": [
      "ばっ.する"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "võng 网 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誕",
    "hanViet": "ĐẢN",
    "meaning": "nói toáng lên, nói xằng bậy, ngông nghênh",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "脱",
    "hanViet": "THOÁT, ĐOÁI",
    "meaning": "róc, lóc, bóc, sơ lược, rơi mất",
    "onyomi": [
      "だつ"
    ],
    "kunyomi": [
      "ぬ.ぐ",
      "ぬ.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhục 肉 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "坊",
    "hanViet": "PHÒNG, PHƯỜNG",
    "meaning": "phường hội, cái đê ngăn nước",
    "onyomi": [
      "ぼう",
      "ぼっ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thổ 土 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宮",
    "hanViet": "CUNG",
    "meaning": "cung điện",
    "onyomi": [
      "きゅう",
      "ぐう",
      "く",
      "くう"
    ],
    "kunyomi": [
      "みや"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "案",
    "hanViet": "ÁN",
    "meaning": "cái bàn dài, bản án",
    "onyomi": [
      "あん"
    ],
    "kunyomi": [
      "つくえ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "価",
    "hanViet": "GIÁ",
    "meaning": "giá trị, giá cả",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "あたい"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "統",
    "hanViet": "THỐNG",
    "meaning": "mối tơ, dòng, hệ thống, thống trị",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "す.べる",
      "ほび.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "策",
    "hanViet": "SÁCH",
    "meaning": "thẻ tre để viết, sách lược, mưu kế, roi ngựa",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "藤",
    "hanViet": "ĐẰNG",
    "meaning": "bụi cây, dây buộc",
    "onyomi": [
      "とう",
      "どう"
    ],
    "kunyomi": [
      "ふじ"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thảo 艸 (+15 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "姿",
    "hanViet": "TƯ",
    "meaning": "dáng dấp thuỳ mị, dáng vẻ, điệu bộ, tư thế",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "すがた"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nữ 女 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "応",
    "hanViet": "ƯNG",
    "meaning": "ưng, thích, xưa dùng như 應",
    "onyomi": [
      "おう",
      "よう",
      "-のう"
    ],
    "kunyomi": [
      "あた.る",
      "まさに",
      "こた.える"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "提",
    "hanViet": "THÌ, ĐỀ, ĐỂ",
    "meaning": "bày ra, kể ra, nắm lấy, mang",
    "onyomi": [
      "てい",
      "ちょう",
      "だい"
    ],
    "kunyomi": [
      "さ.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "援",
    "hanViet": "VIÊN, VIỆN",
    "meaning": "bám, víu, viện ra, dẫn ra, viện trợ",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "態",
    "hanViet": "THÁI",
    "meaning": "vẻ, thái độ, hình dạng, trạng thái",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "わざ.と"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "tâm 心 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "賀",
    "hanViet": "HẠ",
    "meaning": "đưa đồ mừng, chúc tụng",
    "onyomi": [
      "が"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "鬼",
    "hanViet": "QUỶ",
    "meaning": "ma quỷ, sao Quỷ (một trong Nhị thập bát tú)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "おに",
      "おに-"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "quỷ 鬼 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "護",
    "hanViet": "HỘ",
    "meaning": "che chở, bảo vệ",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "まも.る"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "ngôn 言 (+13 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "裁",
    "hanViet": "TÀI",
    "meaning": "cắt áo, rọc, xén, thể chế",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "た.つ",
      "さば.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "y 衣 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "崎",
    "hanViet": "KHI, KỲ",
    "meaning": "(xem: khi khu 崎嶇,崎岖)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "さき",
      "さい",
      "みさき"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sơn 山 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "看",
    "hanViet": "KHAN, KHÁN",
    "meaning": "xem, nhìn, đọc, xem, nhìn",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "み.る"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "幹",
    "hanViet": "CAN, CÁN, HÀN",
    "meaning": "mình, thân, gốc cây, cán, chuôi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "みき"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "can 干 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "張",
    "hanViet": "TRƯƠNG, TRƯỚNG",
    "meaning": "treo lên, giương lên, sao Trương (một trong Nhị thập bát tú)",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "は.る",
      "-は.り",
      "-ば.り"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "cung 弓 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "沢",
    "hanViet": "DỊCH, THÍCH, TRẠCH",
    "meaning": "Swamp, Marsh, Brilliance",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [
      "さわ",
      "うるお.い",
      "うるお.す",
      "つや"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "施",
    "hanViet": "DI, DỊ, THI, THÍ, THỈ",
    "meaning": "thực hiện, tiến hành",
    "onyomi": [
      "し",
      "せ"
    ],
    "kunyomi": [
      "ほどこ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "phương 方 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "俳",
    "hanViet": "BÀI, BỒI",
    "meaning": "do dự, phân vân",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "秀",
    "hanViet": "TÚ",
    "meaning": "ra hoa, nở hoa, đẹp đẽ, giỏi, xuất sắc",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "ひい.でる"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "hoà 禾 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "製",
    "hanViet": "CHẾ",
    "meaning": "làm, chế tạo, chế độ, hạn chế, ngăn cấm",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "y 衣 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "狭",
    "hanViet": "HIỆP",
    "meaning": "hẹp, bé",
    "onyomi": [
      "きょう",
      "こう"
    ],
    "kunyomi": [
      "せま.い",
      "せば.める",
      "せば.まる",
      "さ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "khuyển 犬 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "載",
    "hanViet": "TÁI, TẠI, TẢI",
    "meaning": "năm, tuổi, chở đồ, nâng",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "の.せる",
      "の.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "xa 車 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "視",
    "hanViet": "THỊ",
    "meaning": "nhìn kỹ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "み.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "kỳ 示 (+6 nét), kiến 見 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "環",
    "hanViet": "HOÀN",
    "meaning": "cái vòng ngọc",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "わ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngọc 玉 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "展",
    "hanViet": "TRIỂN",
    "meaning": "mở ra, trải ra, kéo dài, triển lãm, trưng bày",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thi 尸 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "株",
    "hanViet": "CHU, CHÂU",
    "meaning": "gốc cây, gốc (chữ dùng để đếm cây)",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "かぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "影",
    "hanViet": "ẢNH",
    "meaning": "bóng, tấm ảnh",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "かげ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "sam 彡 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "響",
    "hanViet": "HƯỞNG",
    "meaning": "vọng lại, tiếng vọng tiếng vang, điểm (giờ)",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "ひび.く"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "âm 音 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "票",
    "hanViet": "PHIÊU, PHIẾU, TIÊU",
    "meaning": "nhẹ nhàng, nhanh nhẹn, tấm vé, tem, phiếu",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "kỳ 示 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "訴",
    "hanViet": "TỐ",
    "meaning": "kể, thuật, tố giác, mách",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "うった.える"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "訟",
    "hanViet": "TỤNG",
    "meaning": "kiện tụng, tranh cãi",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ngôn 言 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逮",
    "hanViet": "ĐÃI, ĐỆ",
    "meaning": "theo kịp, đuổi",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sước 辵 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "模",
    "hanViet": "MÔ",
    "meaning": "cái khuôn bằng gỗ, mô phỏng, gương mẫu",
    "onyomi": [
      "も",
      "ぼ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mộc 木 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "鮮",
    "hanViet": "TIÊN, TIỂN",
    "meaning": "cá tươi, sáng sủa, ngon lành",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "あざ.やか"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngư 魚 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "属",
    "hanViet": "CHÚ, CHÚC, THUỘC",
    "meaning": "liền, nối, loại, loài, thuộc về",
    "onyomi": [
      "ぞく",
      "しょく"
    ],
    "kunyomi": [
      "さかん",
      "つく",
      "やから"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thi 尸 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "肥",
    "hanViet": "PHÌ",
    "meaning": "béo",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "こ.える",
      "こえ",
      "こ.やす",
      "こ.やし",
      "ふと.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "絞",
    "hanViet": "GIẢO, HÀO",
    "meaning": "vặn, xoắn, treo cổ",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "しぼ.る",
      "し.める",
      "し.まる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "輩",
    "hanViet": "BỐI",
    "meaning": "lũ, bọn, chúng, hàng xe, dãy xe, ví, so sánh",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "-ばら",
      "やから",
      "やかい",
      "ともがら"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "xa 車 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隠",
    "hanViet": "ẨN",
    "meaning": "ẩn, kín, giấu, nấp, trốn",
    "onyomi": [
      "いん",
      "おん"
    ],
    "kunyomi": [
      "かく.す",
      "かく.し",
      "かく.れる",
      "かか.す",
      "よ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "phụ 阜 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "授",
    "hanViet": "THỌ, THỤ",
    "meaning": "trao cho, truyền thụ, dạy",
    "onyomi": [
      "じゅ"
    ],
    "kunyomi": [
      "さず.ける",
      "さず.かる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "創",
    "hanViet": "SANG, SÁNG",
    "meaning": "đau, bị thương, mới",
    "onyomi": [
      "そう",
      "しょう"
    ],
    "kunyomi": [
      "つく.る",
      "はじ.める",
      "きず",
      "けず.しける"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "đao 刀 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "往",
    "hanViet": "VÃNG",
    "meaning": "đi, theo hướng, đã qua",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "い.く",
      "いにしえ",
      "さき.に",
      "ゆ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "xích 彳 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "較",
    "hanViet": "GIÁC, GIÁO, GIẢO, GIẾU",
    "meaning": "tay xe, càng xe, so với",
    "onyomi": [
      "かく",
      "こう"
    ],
    "kunyomi": [
      "くら.べる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "xa 車 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鉛",
    "hanViet": "DIÊN, DUYÊN",
    "meaning": "kim loại chì, Pb",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "なまり"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kim 金 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "故",
    "hanViet": "CỐ",
    "meaning": "cũ, cho nên, lý do",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "ゆえ",
      "ふる.い",
      "もと"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "phác 攴 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "障",
    "hanViet": "CHƯƠNG, CHƯỚNG",
    "meaning": "che, ngăn, cản, lấp, thành đóng ở nơi hiểm yếu",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "さわ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "phụ 阜 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "従",
    "hanViet": "TÒNG",
    "meaning": "đi theo",
    "onyomi": [
      "じゅう",
      "しょう",
      "じゅ"
    ],
    "kunyomi": [
      "したが.う",
      "したが.える",
      "より"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "xích 彳 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "我",
    "hanViet": "NGÃ",
    "meaning": "tôi, tao",
    "onyomi": [
      "が"
    ],
    "kunyomi": [
      "われ",
      "わ",
      "わ.が-",
      "わが-"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "qua 戈 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "激",
    "hanViet": "KHÍCH, KÍCH",
    "meaning": "nước bắn lên, mau, xiết, khích lệ, kích",
    "onyomi": [
      "げき"
    ],
    "kunyomi": [
      "はげ.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thuỷ 水 (+13 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "励",
    "hanViet": "LỆ",
    "meaning": "gắng sức, khích lệ",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "はげ.む",
      "はげ.ます"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "lực 力 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "討",
    "hanViet": "THẢO",
    "meaning": "đánh, trừng phạt người có tội, dò xét, đòi lại của cải",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "う.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngôn 言 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "徴",
    "hanViet": "CHUỶ, TRƯNG, TRỪNG",
    "meaning": "trưng tập, gọi đến, thu, chứng minh",
    "onyomi": [
      "ちょう",
      "ち"
    ],
    "kunyomi": [
      "しるし"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "xích 彳 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "怪",
    "hanViet": "QUÁI",
    "meaning": "kỳ lạ, yêu quái",
    "onyomi": [
      "かい",
      "け"
    ],
    "kunyomi": [
      "あや.しい",
      "あや.しむ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "獣",
    "hanViet": "THÚ",
    "meaning": "Animal, Beast",
    "onyomi": [
      "じゅう"
    ],
    "kunyomi": [
      "けもの",
      "けだもの"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "khuyển 犬 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "振",
    "hanViet": "CHÂN, CHẤN, CHẨN",
    "meaning": "rung động",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ふ.る",
      "ぶ.る",
      "ふ.り",
      "-ぶ.り",
      "ふ.るう"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "豚",
    "hanViet": "ĐỒN, ĐỘN",
    "meaning": "con lợn con, đi lê gót chân",
    "onyomi": [
      "とん"
    ],
    "kunyomi": [
      "ぶた"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thỉ 豕 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "独",
    "hanViet": "ĐỘC",
    "meaning": "một mình, con độc (một giống vượn)",
    "onyomi": [
      "どく",
      "とく"
    ],
    "kunyomi": [
      "ひと.り"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "khuyển 犬 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "屈",
    "hanViet": "KHUẤT, QUẬT",
    "meaning": "cong, khuất phục, (xem: quật cường 屈彊)",
    "onyomi": [
      "くつ"
    ],
    "kunyomi": [
      "かが.む",
      "かが.める"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thi 尸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "暇",
    "hanViet": "HẠ, XUYẾT",
    "meaning": "rảnh rỗi, thôi, nghỉ, rảnh rỗi",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "ひま",
      "いとま"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhật 日 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "織",
    "hanViet": "CHÍ, CHỨC, XÍ",
    "meaning": "dệt vải",
    "onyomi": [
      "しょく",
      "しき"
    ],
    "kunyomi": [
      "お.る",
      "お.り",
      "おり",
      "-おり",
      "-お.り"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mịch 糸 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "惑",
    "hanViet": "HOẶC",
    "meaning": "mê hoặc, ngờ hoặc",
    "onyomi": [
      "わく"
    ],
    "kunyomi": [
      "まど.う"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誘",
    "hanViet": "DỤ",
    "meaning": "dỗ dành, dẫn dụ",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "さそ.う",
      "いざな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "就",
    "hanViet": "TỰU",
    "meaning": "nên, hay là, tới, theo",
    "onyomi": [
      "しゅう",
      "じゅ"
    ],
    "kunyomi": [
      "つ.く",
      "つ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "uông 尢 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "睡",
    "hanViet": "THUỴ",
    "meaning": "giấc ngủ",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "ねむ.る",
      "ねむ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mục 目 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "症",
    "hanViet": "CHỨNG, TRƯNG",
    "meaning": "chứng bệnh, bệnh hòn (tích hòn rắn chắc trong bụng)",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nạch 疒 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "締",
    "hanViet": "ĐẾ, ĐỀ",
    "meaning": "ràng buộc",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "し.まる",
      "し.まり",
      "し.める",
      "-し.め",
      "-じ.め"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "迫",
    "hanViet": "BÀI, BÁCH",
    "meaning": "gần, sát, bức bách, đè ép, thúc giục",
    "onyomi": [
      "はく"
    ],
    "kunyomi": [
      "せま.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "sước 辵 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "端",
    "hanViet": "ĐOAN",
    "meaning": "đầu, mối",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "はし",
      "は",
      "はた",
      "-ばた",
      "はな"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "lập 立 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "健",
    "hanViet": "KIỆN",
    "meaning": "khoẻ mạnh, sức khoẻ, giỏi giang",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "すこ.やか"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "康",
    "hanViet": "KHANG, KHƯƠNG",
    "meaning": "khoẻ mạnh",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nghiễm 广 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "郎",
    "hanViet": "LANG",
    "meaning": "chàng trai, một chức quan",
    "onyomi": [
      "ろう",
      "りょう"
    ],
    "kunyomi": [
      "おとこ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "ấp 邑 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "稚",
    "hanViet": "TRĨ",
    "meaning": "lúa non, trẻ con",
    "onyomi": [
      "ち",
      "じ"
    ],
    "kunyomi": [
      "いとけない",
      "おさない",
      "おくて",
      "おでる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hoà 禾 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "博",
    "hanViet": "BÁC",
    "meaning": "rộng, thống suốt, đánh bạc",
    "onyomi": [
      "はく",
      "ばく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thập 十 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "潔",
    "hanViet": "KHIẾT",
    "meaning": "trong sạch",
    "onyomi": [
      "けつ"
    ],
    "kunyomi": [
      "いさぎよ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "隊",
    "hanViet": "TOẠI, TRUỴ, ĐỘI",
    "meaning": "đội quân, dàn thành hàng",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "修",
    "hanViet": "TU",
    "meaning": "tu hành, tu sửa",
    "onyomi": [
      "しゅう",
      "しゅ"
    ],
    "kunyomi": [
      "おさ.める",
      "おさ.まる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "奇",
    "hanViet": "CƠ, KÌ, KỲ",
    "meaning": "số lẻ (không chia hết cho 2), số thừa, số dư, số lẻ, kỳ lạ, lạ lùng",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "く.しき",
      "あや.しい",
      "くし",
      "めずら.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đại 大 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妙",
    "hanViet": "DIỆU",
    "meaning": "hay, đẹp, tuyệt, kỳ diệu, tài tình",
    "onyomi": [
      "みょう",
      "びょう"
    ],
    "kunyomi": [
      "たえ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "麗",
    "hanViet": "LY, LỆ",
    "meaning": "(xem: cao ly 高麗,高丽), đẹp đẽ, dính, bám",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "うるわ.しい",
      "うら.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "lộc 鹿 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "微",
    "hanViet": "VI, VY",
    "meaning": "nhỏ bé, nhạt (màu)",
    "onyomi": [
      "び"
    ],
    "kunyomi": [
      "かす.か"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "xích 彳 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "益",
    "hanViet": "ÍCH",
    "meaning": "thêm nhiều lên, ích lợi, châu Ích (Trung Quốc)",
    "onyomi": [
      "えき",
      "やく"
    ],
    "kunyomi": [
      "ま.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mẫn 皿 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "憲",
    "hanViet": "HIẾN",
    "meaning": "pháp luật, hiến pháp, quan trên",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "衆",
    "hanViet": "CHÚNG",
    "meaning": "nhiều, đông",
    "onyomi": [
      "しゅう",
      "しゅ"
    ],
    "kunyomi": [
      "おお.い"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "huyết 血 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "傘",
    "hanViet": "TÁN, TẢN",
    "meaning": "cái tán, (tên núi)",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "かさ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhân 人 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浜",
    "hanViet": "BANH, BINH",
    "meaning": "kênh cho tàu bè đỗ",
    "onyomi": [
      "ひん"
    ],
    "kunyomi": [
      "はま"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "撃",
    "hanViet": "KÍCH",
    "meaning": "đánh mạnh, gõ mạnh",
    "onyomi": [
      "げき"
    ],
    "kunyomi": [
      "う.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "攻",
    "hanViet": "CÔNG",
    "meaning": "đánh, tấn công",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "せ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "phác 攴 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "監",
    "hanViet": "GIAM, GIÁM",
    "meaning": "giam cầm, nhà tù, xem, coi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mẫn 皿 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "催",
    "hanViet": "THÔI",
    "meaning": "thúc giục, suy nghĩ",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "もよう.す",
      "もよお.す"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "促",
    "hanViet": "XÚC",
    "meaning": "vội vã, gấp",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "うなが.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "江",
    "hanViet": "GIANG",
    "meaning": "sông lớn",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "え"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "請",
    "hanViet": "THỈNH, TÌNH, TÍNH",
    "meaning": "mời mọc",
    "onyomi": [
      "せい",
      "しん",
      "しょう"
    ],
    "kunyomi": [
      "こ.う",
      "う.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雄",
    "hanViet": "HÙNG",
    "meaning": "con chim trống, mạnh, khoẻ",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "お-",
      "おす",
      "おん"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "chuy 隹 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "韓",
    "hanViet": "HÀN",
    "meaning": "nước Hàn, Triều Tiên",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "から",
      "いげた"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "vi 韋 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壊",
    "hanViet": "BÔI, BÙI, HOẠI, KHÔI, NHƯỠNG, PHÔI",
    "meaning": "Demolition, Break, Destroy",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [
      "こわ.す",
      "こわ.れる",
      "やぶ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thổ 土 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "診",
    "hanViet": "CHẨN",
    "meaning": "xem xét",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "み.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "閣",
    "hanViet": "CÁC",
    "meaning": "cái lầu",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "môn 門 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "僚",
    "hanViet": "LIÊU",
    "meaning": "bạn cùng làm việc, người cùng làm quan",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nhân 人 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "督",
    "hanViet": "ĐỐC",
    "meaning": "thúc giục, đốc thúc",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mục 目 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "街",
    "hanViet": "NHAI",
    "meaning": "ngã tư, đường phố",
    "onyomi": [
      "がい",
      "かい"
    ],
    "kunyomi": [
      "まち"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hành 行 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "宗",
    "hanViet": "TÔN, TÔNG",
    "meaning": "dòng họ",
    "onyomi": [
      "しゅう",
      "そう"
    ],
    "kunyomi": [
      "むね"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "緊",
    "hanViet": "KHẨN",
    "meaning": "căng (dây)",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "し.める",
      "し.まる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宴",
    "hanViet": "YẾN",
    "meaning": "yến tiệc",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "うたげ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "添",
    "hanViet": "THIÊM",
    "meaning": "thêm, đẻ con, sinh con",
    "onyomi": [
      "てん"
    ],
    "kunyomi": [
      "そ.える",
      "そ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "猛",
    "hanViet": "MÃNH",
    "meaning": "mạnh, khoẻ",
    "onyomi": [
      "もう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khuyển 犬 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "烈",
    "hanViet": "LIỆT",
    "meaning": "cháy mạnh, nồng (mùi, hương)",
    "onyomi": [
      "れつ"
    ],
    "kunyomi": [
      "はげ.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hoả 火 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "索",
    "hanViet": "SÁCH, TÁC",
    "meaning": "dây tơ, tìm tòi, lục, tan tác, chia lìa",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詳",
    "hanViet": "DƯƠNG, TƯỜNG",
    "meaning": "rõ ràng, tường tận",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "くわ.しい",
      "つまび.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "魅",
    "hanViet": "MỊ",
    "meaning": "ma quỷ",
    "onyomi": [
      "み"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "quỷ 鬼 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渇",
    "hanViet": "HẠT, KHÁT, KIỆT",
    "meaning": "Thirst, Dry Up, Parch",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [
      "かわ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "系",
    "hanViet": "HỆ",
    "meaning": "buộc, bó, nối",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "mịch 糸 (+1 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "旗",
    "hanViet": "KÌ, KỲ",
    "meaning": "lá cờ",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "はた"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "phương 方 (+10 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "乏",
    "hanViet": "PHẠP",
    "meaning": "thiếu, không đủ",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "とぼ.しい",
      "とも.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "triệt 丿 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "覧",
    "hanViet": "LÃM",
    "meaning": "xem, ngắm",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "み.る"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "kiến 見 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "懐",
    "hanViet": "HOÀI, PHÓ, PHỤ",
    "meaning": "Pocket, Feelings, Heart",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [
      "ふところ",
      "なつ.かしい",
      "なつ.かしむ",
      "なつ.く",
      "なつ.ける",
      "なず.ける",
      "いだ.く",
      "おも.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "tâm 心 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "枕",
    "hanViet": "CHẤM, CHẨM",
    "meaning": "xương trong óc cá, cái gối đầu",
    "onyomi": [
      "ちん",
      "しん"
    ],
    "kunyomi": [
      "まくら"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漏",
    "hanViet": "LÂU, LẬU",
    "meaning": "rò rỉ, dột",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [
      "も.る",
      "も.れる",
      "も.らす"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "購",
    "hanViet": "CẤU",
    "meaning": "mua sắm, mưu bàn",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "bối 貝 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "飾",
    "hanViet": "SỨC",
    "meaning": "trang sức, mệnh lệnh",
    "onyomi": [
      "しょく"
    ],
    "kunyomi": [
      "かざ.る",
      "かざ.り"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thực 食 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "騒",
    "hanViet": "TAO",
    "meaning": "Boisterous, Make Noise, Clamor",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "さわ.ぐ",
      "うれい",
      "さわ.がしい"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mã 馬 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "撮",
    "hanViet": "TOÁT",
    "meaning": "dúm (đơn vị đo, bằng 256 hạt thóc), rút lại, tụ họp",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [
      "と.る",
      "つま.む",
      "-ど.り"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "離",
    "hanViet": "LI, LY, LỆ",
    "meaning": "dời xa, chia lìa, dời khỏi, quẻ Ly (trung hư) trong Kinh Dịch (chỉ có vạch giữa đứt, tượng Hoả (lửa), trượng trưng cho con gái giữa, hành Hoả, tuổi Ngọ, hướng Nam)",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "はな.れる",
      "はな.す"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "chuy 隹 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "融",
    "hanViet": "DONG, DUNG",
    "meaning": "tan ra, hoà tan, lưu thông",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "と.ける",
      "と.かす"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "trùng 虫 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "華",
    "hanViet": "HOA, HOÁ",
    "meaning": "đẹp, quầng trăng, quầng mặt trời, người Trung Quốc",
    "onyomi": [
      "か",
      "け"
    ],
    "kunyomi": [
      "はな"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thảo 艸 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "既",
    "hanViet": "KÍ, KÝ",
    "meaning": "đã (đã ... lại còn ..., xem: vưu 尤)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "すで.に"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "vô 无 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "豪",
    "hanViet": "HÀO",
    "meaning": "người có tài, phóng khoáng, con hào (giống lợn)",
    "onyomi": [
      "ごう"
    ],
    "kunyomi": [
      "えら.い"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thỉ 豕 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鑑",
    "hanViet": "GIÁM",
    "meaning": "cái gương soi bằng đồng",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "かんが.みる",
      "かがみ"
    ],
    "jlpt": "N1",
    "strokeCount": 23,
    "radical": "kim 金 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尋",
    "hanViet": "TẦM",
    "meaning": "tìm kiếm, đơn vị đo độ dài (bằng 8 thước Tàu cũ)",
    "onyomi": [
      "じん"
    ],
    "kunyomi": [
      "たず.ねる",
      "ひろ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thốn 寸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "廊",
    "hanViet": "LANG",
    "meaning": "mái hiên, hành lang",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nghiễm 广 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "驚",
    "hanViet": "KINH",
    "meaning": "kinh động, kinh sợ",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "おどろ.く",
      "おどろ.かす"
    ],
    "jlpt": "N1",
    "strokeCount": 22,
    "radical": "mã 馬 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嘆",
    "hanViet": "THÁN",
    "meaning": "kêu, than thở, tấm tắc khen, ngân dài giọng",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "なげ.く",
      "なげ.かわしい"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "khẩu 口 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "倉",
    "hanViet": "SẢNG, THƯƠNG, THẢNG, XƯƠNG",
    "meaning": "kho, vựa, (xem: thảng thốt 倉猝), kho, vựa",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "くら"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "巣",
    "hanViet": "SÀO",
    "meaning": "tổ chim, ổ",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "す",
      "す.くう"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "xuyên 巛 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "径",
    "hanViet": "KÍNH",
    "meaning": "đường tắt, lối tắt, thẳng",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "みち",
      "こみち",
      "さしわたし",
      "ただちに"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "xích 彳 (+5 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "救",
    "hanViet": "CỨU",
    "meaning": "cứu giúp",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "すく.う"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phác 攴 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "脈",
    "hanViet": "MẠCH",
    "meaning": "mạch máu, mạch, thớ, gân, liền nhau",
    "onyomi": [
      "みゃく"
    ],
    "kunyomi": [
      "すじ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "墓",
    "hanViet": "MỘ",
    "meaning": "nấm mồ, ngôi mộ",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [
      "はか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "徳",
    "hanViet": "ĐỨC",
    "meaning": "đạo đức, thiện, ơn, ân, nước Đức",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "xích 彳 (+11 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "偵",
    "hanViet": "TRINH",
    "meaning": "thăm dò, do thám, điều tra",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "序",
    "hanViet": "TỰ",
    "meaning": "thứ tự, bài tựa, bài mở đầu",
    "onyomi": [
      "じょ"
    ],
    "kunyomi": [
      "つい.で",
      "ついで"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nghiễm 广 (+4 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "志",
    "hanViet": "CHÍ",
    "meaning": "ý chí, chí hướng, cân, đo, đong, ghi chép",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "シリング",
      "こころざ.す",
      "こころざし"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "恩",
    "hanViet": "ÂN",
    "meaning": "ơn huệ",
    "onyomi": [
      "おん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "桜",
    "hanViet": "ANH",
    "meaning": "Cherry",
    "onyomi": [
      "おう",
      "よう"
    ],
    "kunyomi": [
      "さくら"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "眼",
    "hanViet": "NHÃN, NHẪN",
    "meaning": "cái mắt",
    "onyomi": [
      "がん",
      "げん"
    ],
    "kunyomi": [
      "まなこ",
      "め"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mục 目 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "興",
    "hanViet": "HƯNG, HỨNG",
    "meaning": "thức dậy, hưng thịnh, dấy lên",
    "onyomi": [
      "こう",
      "きょう"
    ],
    "kunyomi": [
      "おこ.る",
      "おこ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "cữu 臼 (+10 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "衛",
    "hanViet": "VỆ",
    "meaning": "bảo vệ, phòng giữ, nước Vệ",
    "onyomi": [
      "えい",
      "え"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "hành 行 (+9 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "酸",
    "hanViet": "TOAN",
    "meaning": "vị chua, đau ê ẩm, axít",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "す.い"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "dậu 酉 (+7 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "銭",
    "hanViet": "TIỀN",
    "meaning": "Coin, .01 Yen, Money",
    "onyomi": [
      "せん",
      "ぜん"
    ],
    "kunyomi": [
      "ぜに",
      "すき"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "kim 金 (+6 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "飼",
    "hanViet": "TỰ",
    "meaning": "cho ăn, chăn nuôi",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "か.う"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thực 食 (+5 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "傷",
    "hanViet": "THƯƠNG",
    "meaning": "đau đớn",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "きず",
      "いた.む",
      "いた.める"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "厳",
    "hanViet": "NGHIÊM",
    "meaning": "kín, chặt chẽ, nghiêm khắc, rất",
    "onyomi": [
      "げん",
      "ごん"
    ],
    "kunyomi": [
      "おごそ.か",
      "きび.しい",
      "いか.めしい",
      "いつくし"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "hán 厂 (+14 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "密",
    "hanViet": "MẬT",
    "meaning": "đông đúc, giữ kín",
    "onyomi": [
      "みつ"
    ],
    "kunyomi": [
      "ひそ.か"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "miên 宀 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "暖",
    "hanViet": "HUYÊN, NOÃN",
    "meaning": "ấm áp",
    "onyomi": [
      "だん",
      "のん"
    ],
    "kunyomi": [
      "あたた.か",
      "あたた.かい",
      "あたた.まる",
      "あたた.める"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhật 日 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "秘",
    "hanViet": "BÍ",
    "meaning": "bí mật, thần",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "ひ.める",
      "ひそ.か",
      "かく.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hoà 禾 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "訳",
    "hanViet": "DỊCH",
    "meaning": "Translate, Reason, Circumstance",
    "onyomi": [
      "やく"
    ],
    "kunyomi": [
      "わけ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ngôn 言 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "染",
    "hanViet": "NHIỄM",
    "meaning": "nhiễm, mắc, lây, nhuộm",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "そ.める",
      "-ぞ.め",
      "-ぞめ",
      "そ.まる",
      "し.みる",
      "-じ.みる",
      "し.み",
      "-し.める"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "筋",
    "hanViet": "CÂN",
    "meaning": "gân (thớ thịt)",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "すじ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "trúc 竹 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "垂",
    "hanViet": "THUỲ",
    "meaning": "rủ xuống",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "た.れる",
      "た.らす",
      "た.れ",
      "-た.れ",
      "なんなんと.す"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thổ 土 (+5 nét), sĩ 士 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "宣",
    "hanViet": "TUYÊN",
    "meaning": "bộc lộ, bày tỏ, tuyên bố, nói ra",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "のたま.う"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "miên 宀 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "忠",
    "hanViet": "TRUNG",
    "meaning": "trung thành, làm hết bổn phận",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "tâm 心 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "拡",
    "hanViet": "KHOÁC, KHOÁCH, KHOÁNG, KHOẮC, KHUẾCH",
    "meaning": "Broaden, Extend, Expand",
    "onyomi": [
      "かく",
      "こう"
    ],
    "kunyomi": [
      "ひろ.がる",
      "ひろ.げる",
      "ひろ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "操",
    "hanViet": "THAO, THÁO",
    "meaning": "cầm, nắm, giữ gìn, nói",
    "onyomi": [
      "そう",
      "さん"
    ],
    "kunyomi": [
      "みさお",
      "あやつ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thủ 手 (+13 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "熟",
    "hanViet": "THỤC",
    "meaning": "chín, đã quen, kỹ càng",
    "onyomi": [
      "じゅく"
    ],
    "kunyomi": [
      "う.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hoả 火 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "異",
    "hanViet": "DI, DỊ",
    "meaning": "khác nhau",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "こと",
      "こと.なる",
      "け"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "điền 田 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "皇",
    "hanViet": "HOÀNG",
    "meaning": "ông vua, to lớn",
    "onyomi": [
      "こう",
      "おう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "bạch 白 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "盛",
    "hanViet": "THÀNH, THÌNH, THẠNH, THỊNH",
    "meaning": "có nhiều, đầy đủ",
    "onyomi": [
      "せい",
      "じょう"
    ],
    "kunyomi": [
      "も.る",
      "さか.る",
      "さか.ん"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mẫn 皿 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "漠",
    "hanViet": "MẠC",
    "meaning": "sa mạc, thờ ơ, lạnh nhạt",
    "onyomi": [
      "ばく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "糖",
    "hanViet": "ĐƯỜNG",
    "meaning": "đường ăn, chất ngọt",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mễ 米 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "納",
    "hanViet": "NẠP",
    "meaning": "thu vào, giao nộp",
    "onyomi": [
      "のう",
      "なっ",
      "な",
      "なん",
      "とう"
    ],
    "kunyomi": [
      "おさ.める",
      "-おさ.める",
      "おさ.まる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "肺",
    "hanViet": "BÁI, PHẾ",
    "meaning": "lá phổi",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "賃",
    "hanViet": "NHẤM, NHẪM",
    "meaning": "làm thuê, thuê mướn",
    "onyomi": [
      "ちん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "bối 貝 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "貴",
    "hanViet": "QUÝ",
    "meaning": "sang, quý giá, quý trọng",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "たっと.い",
      "とうと.い",
      "たっと.ぶ",
      "とうと.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "丼",
    "hanViet": "TỈNH, ĐẢM",
    "meaning": "tiếng đồ vật quăng xuống giếng",
    "onyomi": [
      "とん",
      "たん",
      "しょう",
      "せい"
    ],
    "kunyomi": [
      "どんぶり"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "chủ 丶 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "吐",
    "hanViet": "THỔ",
    "meaning": "nhả ra, nở (hoa)",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "は.く",
      "つ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奴",
    "hanViet": "NÔ",
    "meaning": "đày tớ, đứa ở",
    "onyomi": [
      "ど"
    ],
    "kunyomi": [
      "やつ",
      "やっこ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nữ 女 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隷",
    "hanViet": "LỆ",
    "meaning": "phụ thuộc, lối chữ lệ",
    "onyomi": [
      "れい"
    ],
    "kunyomi": [
      "したが.う",
      "しもべ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "đãi 隶 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "芋",
    "hanViet": "DỤ, HU, VU",
    "meaning": "ở, cư trú, to lớn, cây khoai nước, cây khoai sọ",
    "onyomi": [
      "う"
    ],
    "kunyomi": [
      "いも"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thảo 艸 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "縮",
    "hanViet": "SÚC",
    "meaning": "co lại",
    "onyomi": [
      "しゅく"
    ],
    "kunyomi": [
      "ちぢ.む",
      "ちぢ.まる",
      "ちぢ.める",
      "ちぢ.れる",
      "ちぢ.らす"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "mịch 糸 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "縦",
    "hanViet": "TÚNG",
    "meaning": "Vertical, Length, Height",
    "onyomi": [
      "じゅう"
    ],
    "kunyomi": [
      "たて"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "粋",
    "hanViet": "TUÝ",
    "meaning": "thuần khiết, tinh tuý",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "いき"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mễ 米 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "聖",
    "hanViet": "THÁNH",
    "meaning": "thần thánh",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "ひじり"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhĩ 耳 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "磁",
    "hanViet": "TỪ",
    "meaning": "từ tính, từ trường, nam châm",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thạch 石 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "射",
    "hanViet": "DẠ, DỊCH, XẠ",
    "meaning": "bắn tên, bắn nỏ, tìm kiếm, soi sáng",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "い.る",
      "さ.す",
      "う.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thốn 寸 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "幕",
    "hanViet": "MÁN, MÔ, MẠC, MẠN, MỘ",
    "meaning": "mặt trái của đồng tiền, cái màn che trên sân khấu",
    "onyomi": [
      "まく",
      "ばく"
    ],
    "kunyomi": [
      "とばり"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "cân 巾 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "薦",
    "hanViet": "TIẾN, TRÃI, TẤN",
    "meaning": "hai lần, tiến cử, cỏ cho súc vật",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "すす.める"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thảo 艸 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "推",
    "hanViet": "SUY, THÔI",
    "meaning": "đẩy, đấm, lựa chọn, chọn lọc",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "お.す"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "揮",
    "hanViet": "HUY",
    "meaning": "xua, huơ, múa",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "ふる.う"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "沿",
    "hanViet": "DIÊN, DUYÊN",
    "meaning": "ven, mép, đi men theo, noi theo",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "そ.う",
      "-ぞ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "源",
    "hanViet": "NGUYÊN",
    "meaning": "nguồn (nước), nguồn gốc",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "みなもと"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "歓",
    "hanViet": "HOAN",
    "meaning": "vui vẻ, mừng",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "よろこ.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "khiếm 欠 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "爪",
    "hanViet": "TRẢO",
    "meaning": "móng chân thú",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "つめ",
      "つま-"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "trảo 爪 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "豆",
    "hanViet": "ĐẬU",
    "meaning": "cây đậu",
    "onyomi": [
      "とう",
      "ず"
    ],
    "kunyomi": [
      "まめ",
      "まめ-"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "đậu 豆 (+0 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "腐",
    "hanViet": "HỦ, PHỤ",
    "meaning": "rữa, nát, thối, mục, đậu phụ",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "くさ.る",
      "-くさ.る",
      "くさ.れる",
      "くさ.れ",
      "くさ.らす",
      "くさ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nhục 肉 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "彫",
    "hanViet": "ĐIÊU",
    "meaning": "tàn rạc, héo rụng, chim diều hâu, con kên kên",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "ほ.る",
      "-ぼ.り"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sam 彡 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舎",
    "hanViet": "XÁ",
    "meaning": "quán trọ, nghỉ trọ",
    "onyomi": [
      "しゃ",
      "せき"
    ],
    "kunyomi": [
      "やど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thiệt 舌 (+2 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "滞",
    "hanViet": "TRỆ",
    "meaning": "chậm, trễ",
    "onyomi": [
      "たい",
      "てい"
    ],
    "kunyomi": [
      "とどこお.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "己",
    "hanViet": "KỈ, KỶ",
    "meaning": "mình, riêng, Kỷ (ngôi thứ 6 hàng Can)",
    "onyomi": [
      "こ",
      "き"
    ],
    "kunyomi": [
      "おのれ",
      "つちのと",
      "な"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "kỷ 己 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "厄",
    "hanViet": "NGOẢ, ÁCH",
    "meaning": "khốn ách, hẹp",
    "onyomi": [
      "やく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "hán 厂 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "亀",
    "hanViet": "QUY",
    "meaning": "con rùa",
    "onyomi": [
      "き",
      "きゅう",
      "きん"
    ],
    "kunyomi": [
      "かめ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ất 乙 (+10 nét), quy 龜 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剣",
    "hanViet": "KIẾM",
    "meaning": "cái kiếm",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "つるぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "đao 刀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寿",
    "hanViet": "THỌ",
    "meaning": "thọ, sống lâu",
    "onyomi": [
      "じゅ",
      "す",
      "しゅう"
    ],
    "kunyomi": [
      "ことぶき",
      "ことぶ.く",
      "ことほ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thốn 寸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "杉",
    "hanViet": "AM, SAM",
    "meaning": "cây sam (một loài giống cây thông)",
    "onyomi": [
      "さん"
    ],
    "kunyomi": [
      "すぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "mộc 木 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "汁",
    "hanViet": "CHẤP, HIỆP, TRẤP",
    "meaning": "hoà hợp, giúp đỡ, nhựa, chất lỏng",
    "onyomi": [
      "じゅう"
    ],
    "kunyomi": [
      "しる",
      "-しる",
      "つゆ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "thuỷ 水 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "炎",
    "hanViet": "DIỄM, VIÊM, ĐÀM",
    "meaning": "bốc cháy, nóng",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "ほのお"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hoả 火 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "為",
    "hanViet": "VI, VY, VỊ",
    "meaning": "làm, gây nên, bởi vì, giúp cho",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "ため",
      "な.る",
      "な.す",
      "す.る",
      "たり",
      "つく.る",
      "なり"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "hoả 火 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "熊",
    "hanViet": "HÙNG",
    "meaning": "con gấu",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "くま"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "hoả 火 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "獄",
    "hanViet": "NGỤC",
    "meaning": "tù ngục",
    "onyomi": [
      "ごく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "khuyển 犬 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酔",
    "hanViet": "TUÝ",
    "meaning": "say rượu",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "よ.う",
      "よ.い",
      "よ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "dậu 酉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酢",
    "hanViet": "THỐ, TẠC",
    "meaning": "khách rót rượu cho chủ",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [
      "す"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "dậu 酉 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鍋",
    "hanViet": "OA",
    "meaning": "cái nồi",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "なべ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "盟",
    "hanViet": "MINH",
    "meaning": "uống máu thề, liên minh",
    "onyomi": [
      "めい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mẫn 皿 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "遺",
    "hanViet": "DI, DỊ",
    "meaning": "mất, thất lạc",
    "onyomi": [
      "い",
      "ゆい"
    ],
    "kunyomi": [
      "のこ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "sước 辵 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "債",
    "hanViet": "TRÁI",
    "meaning": "nợ nần",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "及",
    "hanViet": "CẬP",
    "meaning": "tới, đến, kịp, bằng, cùng với, và",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "およ.ぶ",
      "およ.び",
      "および",
      "およ.ぼす"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "hựu 又 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奈",
    "hanViet": "NẠI",
    "meaning": "tự nhiên, vốn có, sẵn có",
    "onyomi": [
      "な",
      "ない",
      "だい"
    ],
    "kunyomi": [
      "いかん",
      "からなし"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đại 大 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "廃",
    "hanViet": "PHẾ",
    "meaning": "Abolish, Obsolete, Cessation",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [
      "すた.れる",
      "すた.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nghiễm 广 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "摘",
    "hanViet": "TRÍCH",
    "meaning": "trích ra, ngắt, hái, vặt",
    "onyomi": [
      "てき"
    ],
    "kunyomi": [
      "つ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thủ 手 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "核",
    "hanViet": "HẠCH, HẠT, HỒ",
    "meaning": "hạt, hột, nhân, hạt, hột, nhân",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沖",
    "hanViet": "TRÙNG, XUNG",
    "meaning": "khoẻ, mạnh, xung đột, đụng chạm",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "おき",
      "おきつ",
      "ちゅう.する",
      "わく"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "縄",
    "hanViet": "MẪN, THẰNG",
    "meaning": "Straw Rope, Cord",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "なわ",
      "ただ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "津",
    "hanViet": "TÂN",
    "meaning": "bờ, bến nước, gần, ven",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "つ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "献",
    "hanViet": "HIẾN",
    "meaning": "dâng, tặng, hiến, dâng biểu, bày tỏ",
    "onyomi": [
      "けん",
      "こん"
    ],
    "kunyomi": [
      "たてまつ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "khuyển 犬 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "継",
    "hanViet": "KẾ",
    "meaning": "Inherit, Succeed, Continue",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "つ.ぐ",
      "まま-"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mịch 糸 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "維",
    "hanViet": "DUY",
    "meaning": "nối liền, gìn giữ",
    "onyomi": [
      "い"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "伎",
    "hanViet": "KY, KĨ, KỸ",
    "meaning": "tài, khéo",
    "onyomi": [
      "ぎ",
      "き"
    ],
    "kunyomi": [
      "わざ",
      "わざおぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "踏",
    "hanViet": "ĐẠP",
    "meaning": "đạp, dẫm lên, tại chỗ, hiên trường",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "ふ.む",
      "ふ.まえる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "túc 足 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鹿",
    "hanViet": "LỘC",
    "meaning": "con hươu",
    "onyomi": [
      "ろく"
    ],
    "kunyomi": [
      "しか",
      "か"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "lộc 鹿 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "諾",
    "hanViet": "NẶC",
    "meaning": "vâng, bằng lòng",
    "onyomi": [
      "だく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "牙",
    "hanViet": "NHA",
    "meaning": "cái răng, ngà voi",
    "onyomi": [
      "が",
      "げ"
    ],
    "kunyomi": [
      "きば",
      "は"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nha 牙 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "跳",
    "hanViet": "KHIÊU, ĐÀO",
    "meaning": "nhảy",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "は.ねる",
      "と.ぶ",
      "-と.び"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "túc 足 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "昭",
    "hanViet": "CHIÊU, THIỀU",
    "meaning": "sáng sủa, rõ rệt",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "償",
    "hanViet": "THƯỜNG",
    "meaning": "đền lại",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "つぐな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "nhân 人 (+15 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刑",
    "hanViet": "HÌNH",
    "meaning": "hình phạt",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "đao 刀 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "執",
    "hanViet": "CHẤP",
    "meaning": "cầm, giữ, thi hành, thực hiện",
    "onyomi": [
      "しつ",
      "しゅう"
    ],
    "kunyomi": [
      "と.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塁",
    "hanViet": "LỖI, LUẬT, LUỸ",
    "meaning": "Bases, Fort, Rampart",
    "onyomi": [
      "るい",
      "らい",
      "すい"
    ],
    "kunyomi": [
      "とりで"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét), điền 田 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "崩",
    "hanViet": "BĂNG",
    "meaning": "núi lở, đổ, vỡ, gãy, vua chết",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "くず.れる",
      "-くず.れ",
      "くず.す"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sơn 山 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抗",
    "hanViet": "KHÁNG",
    "meaning": "vác, chống lại",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "あらが.う"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抵",
    "hanViet": "CHỈ, ĐỂ",
    "meaning": "mạo phạm, chống cự",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "旬",
    "hanViet": "QUYÊN, QUÂN, TUẦN",
    "meaning": "sự lặp lại, tuần tuổi, 10 ngày",
    "onyomi": [
      "じゅん",
      "しゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhật 日 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弾",
    "hanViet": "ĐÀN, ĐẠN",
    "meaning": "đàn hồi, bật, búng, gảy, đánh đàn",
    "onyomi": [
      "だん",
      "たん"
    ],
    "kunyomi": [
      "ひ.く",
      "-ひ.き",
      "はず.む",
      "たま",
      "はじ.く",
      "はじ.ける",
      "ただ.す",
      "はじ.きゆみ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "cung 弓 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "聴",
    "hanViet": "THÍNH",
    "meaning": "nghe",
    "onyomi": [
      "ちょう",
      "てい"
    ],
    "kunyomi": [
      "き.く",
      "ゆる.す"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "nhĩ 耳 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遣",
    "hanViet": "KHIỂN, KHÁN",
    "meaning": "phái, sai, đưa đi, tiêu trừ, giải bỏ",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "つか.う",
      "-つか.い",
      "-づか.い",
      "つか.わす",
      "や.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "sước 辵 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "闘",
    "hanViet": "ĐẤU",
    "meaning": "tranh đấu",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "たたか.う",
      "あらそ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "môn 門 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陣",
    "hanViet": "TRẬN",
    "meaning": "trận đánh, trận, cơn",
    "onyomi": [
      "じん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "phụ 阜 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "臨",
    "hanViet": "LÂM, LẤM, LẬM",
    "meaning": "ở trên soi xuống, sát, gần kề, kịp",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [
      "のぞ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thần 臣 (+11 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "削",
    "hanViet": "SẢO, TƯỚC",
    "meaning": "vót, nạo, đoạt mất",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [
      "けず.る",
      "はつ.る",
      "そ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "đao 刀 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "契",
    "hanViet": "KHIẾT, KHẤT, KHẾ, TIẾT",
    "meaning": "xa cách, (xem: khiết đan 契丹), văn tự để làm tin, hợp đồng",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "ちぎ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "đại 大 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恵",
    "hanViet": "HUỆ",
    "meaning": "Favor, Blessing, Grace",
    "onyomi": [
      "けい",
      "え"
    ],
    "kunyomi": [
      "めぐ.む",
      "めぐ.み"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "掲",
    "hanViet": "KHẾ, YẾT",
    "meaning": "Put Up (a Notice), Put Up, Hoist",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "かか.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "狙",
    "hanViet": "THƯ",
    "meaning": "một giống vượn rất xảo quyệt",
    "onyomi": [
      "そ",
      "しょ"
    ],
    "kunyomi": [
      "ねら.う",
      "ねら.い"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "khuyển 犬 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "葬",
    "hanViet": "TÁNG",
    "meaning": "chôn, vùi, mai táng",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "ほうむ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thảo 艸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "需",
    "hanViet": "NHU, NHUYỄN, NOẠ, TU",
    "meaning": "đợi, đồ dùng, nhu cầu, cần thiết",
    "onyomi": [
      "じゅ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "vũ 雨 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宜",
    "hanViet": "NGHI",
    "meaning": "thích đáng, phù hợp, nên",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [
      "よろ.しい",
      "よろ.しく"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "繰",
    "hanViet": "SÀO, TAO, TẢO",
    "meaning": "ươm tơ (kéo tơ ở kén ra), ươm tơ (kéo tơ ở kén ra)",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "く.る"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "mịch 糸 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "避",
    "hanViet": "TỊ, TỴ",
    "meaning": "tránh né, lánh, trốn, phòng",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "さ.ける",
      "よ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "sước 辵 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妊",
    "hanViet": "NHÂM, NHẬM",
    "meaning": "có mang, có bầu, có thai, mang thai",
    "onyomi": [
      "にん",
      "じん"
    ],
    "kunyomi": [
      "はら.む",
      "みごも.る"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "娠",
    "hanViet": "THẦN",
    "meaning": "đàn bà có chửa",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nữ 女 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "致",
    "hanViet": "TRÍ",
    "meaning": "suy cho đến cùng, đem lại, đưa đến, tỉ mỉ, kỹ, kín",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "いた.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "chí 至 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奏",
    "hanViet": "THẤU, TẤU",
    "meaning": "tâu lên, tấu nhạc",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "かな.でる"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "đại 大 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "伴",
    "hanViet": "BẠN, PHÁN",
    "meaning": "bạn bè, người đồng sự",
    "onyomi": [
      "はん",
      "ばん"
    ],
    "kunyomi": [
      "ともな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "併",
    "hanViet": "TÍNH",
    "meaning": "hợp lại, gộp lại, dồn lại, chặt, ăn (cờ)",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "あわ.せる"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "却",
    "hanViet": "KHƯỚC, NGANG, TỨC",
    "meaning": "lùi bước, từ chối, mất đi",
    "onyomi": [
      "きゃく"
    ],
    "kunyomi": [
      "かえ.って",
      "しりぞ.く",
      "しりぞ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tiết 卩 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慮",
    "hanViet": "LƯ, LỤC, LỰ",
    "meaning": "lo âu",
    "onyomi": [
      "りょ"
    ],
    "kunyomi": [
      "おもんぱく.る",
      "おもんぱか.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "懸",
    "hanViet": "HUYỀN",
    "meaning": "còn lại, tồn lại, sai, cách biệt, treo lên",
    "onyomi": [
      "けん",
      "け"
    ],
    "kunyomi": [
      "か.ける",
      "か.かる"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "tâm 心 (+16 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "房",
    "hanViet": "BÀNG, PHÒNG",
    "meaning": "căn phòng",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "ふさ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hộ 戶 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "扱",
    "hanViet": "HẤP, THÁP, TRÁP",
    "meaning": "lượm nhặt",
    "onyomi": [
      "そう",
      "きゅう"
    ],
    "kunyomi": [
      "あつか.い",
      "あつか.う",
      "あつか.る",
      "こ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thủ 手 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抑",
    "hanViet": "ỨC",
    "meaning": "đè, nén",
    "onyomi": [
      "よく"
    ],
    "kunyomi": [
      "おさ.える"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "択",
    "hanViet": "TRẠCH",
    "meaning": "chọn lựa",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [
      "えら.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "描",
    "hanViet": "MIÊU",
    "meaning": "phỏng vẽ, miêu tả",
    "onyomi": [
      "びょう"
    ],
    "kunyomi": [
      "えが.く",
      "か.く"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "盤",
    "hanViet": "BÀN",
    "meaning": "cái mâm, cái chậu",
    "onyomi": [
      "ばん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mẫn 皿 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "称",
    "hanViet": "XƯNG, XỨNG",
    "meaning": "gọi bằng, gọi là, xưng là",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "たた.える",
      "とな.える",
      "あ.げる",
      "かな.う",
      "はか.り",
      "はか.る",
      "ほめ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hoà 禾 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "緩",
    "hanViet": "HOÃN",
    "meaning": "chậm chạp",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "ゆる.い",
      "ゆる.やか",
      "ゆる.む",
      "ゆる.める"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "託",
    "hanViet": "THÁC",
    "meaning": "nhờ cậy, phó thác",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [
      "かこつ.ける",
      "かこ.つ",
      "かこ.つける"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngôn 言 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賄",
    "hanViet": "HỐI",
    "meaning": "của cải, hối lộ, đút lót",
    "onyomi": [
      "わい"
    ],
    "kunyomi": [
      "まかな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "bối 貝 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賂",
    "hanViet": "LỘ",
    "meaning": "đem của đút lót",
    "onyomi": [
      "ろ"
    ],
    "kunyomi": [
      "まいな.い",
      "まいな.う"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "bối 貝 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "還",
    "hanViet": "HOÀN, TOÀN",
    "meaning": "trở về, trả lại, vẫn còn, vẫn chưa",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "かえ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "sước 辵 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "邦",
    "hanViet": "BANG",
    "meaning": "bang, nước",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "くに"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "ấp 邑 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鈴",
    "hanViet": "LINH",
    "meaning": "cái chuông",
    "onyomi": [
      "れい",
      "りん"
    ],
    "kunyomi": [
      "すず"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kim 金 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "阜",
    "hanViet": "PHỤ",
    "meaning": "gò đất, to lớn, béo",
    "onyomi": [
      "ふ",
      "ふう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "phụ 阜 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "岐",
    "hanViet": "KÌ, KỲ",
    "meaning": "kỳ, đường rẽ",
    "onyomi": [
      "き",
      "ぎ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "sơn 山 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隆",
    "hanViet": "LONG",
    "meaning": "long trọng, hưng thịnh",
    "onyomi": [
      "りゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "控",
    "hanViet": "KHOANG, KHỐNG",
    "meaning": "tố giác, tố cáo, điều khiển, khống chế",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "ひか.える",
      "ひか.え"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壁",
    "hanViet": "BÍCH",
    "meaning": "bức tường, bức vách, thành, dựng đứng, thẳng đứng, sao Bích (một trong Nhị thập bát tú)",
    "onyomi": [
      "へき"
    ],
    "kunyomi": [
      "かべ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thổ 土 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "棋",
    "hanViet": "KY, KÌ, KÍ, KÝ, KỲ",
    "meaning": "cờ (chơi)",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "ご"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渋",
    "hanViet": "SÁP",
    "meaning": "Astringent, Hesitate, Reluctant",
    "onyomi": [
      "じゅう",
      "しゅう"
    ],
    "kunyomi": [
      "しぶ",
      "しぶ.い",
      "しぶ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "仙",
    "hanViet": "TIÊN",
    "meaning": "tiên, người đã tu luyện, đồng xu",
    "onyomi": [
      "せん",
      "せんと"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nhân 人 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "充",
    "hanViet": "SUNG",
    "meaning": "đầy đủ, làm đầy",
    "onyomi": [
      "じゅう"
    ],
    "kunyomi": [
      "あ.てる",
      "み.たす"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 儿 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "免",
    "hanViet": "MIỄN, VẤN",
    "meaning": "bỏ, miễn, khỏi",
    "onyomi": [
      "めん"
    ],
    "kunyomi": [
      "まぬか.れる",
      "まぬが.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 儿 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勧",
    "hanViet": "CẦN",
    "meaning": "cố hết sức, chăm chỉ, cần cù",
    "onyomi": [
      "かん",
      "けん"
    ],
    "kunyomi": [
      "すす.める"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "lực 力 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "圏",
    "hanViet": "KHUYÊN, QUYỂN",
    "meaning": "cái vòng, vành, vòng tròn, chuồng nuôi gia súc",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "かこ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "vi 囗 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "埼",
    "hanViet": "KỲ",
    "meaning": "bờ cong",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "さき",
      "さい",
      "みさき"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奪",
    "hanViet": "ĐOẠT",
    "meaning": "cướp lấy, quyết định, đường hẹp",
    "onyomi": [
      "だつ"
    ],
    "kunyomi": [
      "うば.う"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "đại 大 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慎",
    "hanViet": "THẬN",
    "meaning": "thận trọng, cẩn thận",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "つつし.む",
      "つつ.ましい",
      "つつし",
      "つつし.み"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拒",
    "hanViet": "CỦ, CỰ",
    "meaning": "đánh trả, chống cự",
    "onyomi": [
      "きょ",
      "ご"
    ],
    "kunyomi": [
      "こば.む"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "枠",
    "hanViet": "HOA",
    "meaning": "Frame, Framework, Spindle",
    "onyomi": [],
    "kunyomi": [
      "わく"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "甲",
    "hanViet": "GIÁP",
    "meaning": "vỏ cứng của động vật, áo giáp mặc khi chiến trận, Giáp (ngôi thứ nhất hàng Can)",
    "onyomi": [
      "こう",
      "かん"
    ],
    "kunyomi": [
      "きのえ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "điền 田 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "祉",
    "hanViet": "CHỈ",
    "meaning": "phúc",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "kỳ 示 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "稲",
    "hanViet": "ĐẠO",
    "meaning": "Rice Plant",
    "onyomi": [
      "とう",
      "て"
    ],
    "kunyomi": [
      "いね",
      "いな-"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "hoà 禾 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "譲",
    "hanViet": "NHƯỢNG",
    "meaning": "Defer, Turnover, Transfer",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "ゆず.る"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "ngôn 言 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謙",
    "hanViet": "KHIÊM, KHIỂM, KHIỆM",
    "meaning": "nhún nhường",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "へりくだ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngôn 言 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "躍",
    "hanViet": "DƯỢC, THÍCH",
    "meaning": "nhảy lên, háo hức, hăm hở",
    "onyomi": [
      "やく"
    ],
    "kunyomi": [
      "おど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "túc 足 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "銃",
    "hanViet": "SÚNG",
    "meaning": "cái lỗ rìu búa để cho cán vào, cái súng (vũ khí đời xưa)",
    "onyomi": [
      "じゅう"
    ],
    "kunyomi": [
      "つつ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "kim 金 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "項",
    "hanViet": "HẠNG",
    "meaning": "cổ sau, thứ, hạng, to, lớn",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "うなじ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hiệt 頁 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鋼",
    "hanViet": "CƯƠNG",
    "meaning": "thép",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "はがね"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "顧",
    "hanViet": "CỐ",
    "meaning": "ngoảnh, ngoái nhìn, đoái",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "かえり.みる"
    ],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "hiệt 頁 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "駆",
    "hanViet": "KHU",
    "meaning": "Drive, Run, Gallop",
    "onyomi": [
      "く"
    ],
    "kunyomi": [
      "か.ける",
      "か.る"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mã 馬 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唱",
    "hanViet": "XƯỚNG",
    "meaning": "kêu lên",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "とな.える"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "俊",
    "hanViet": "TUẤN",
    "meaning": "xinh, đẹp, kháu, tài giỏi",
    "onyomi": [
      "しゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "兼",
    "hanViet": "KIÊM",
    "meaning": "gấp đôi, kiêm nhiệm",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "か.ねる",
      "-か.ねる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "bát 八 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剤",
    "hanViet": "TỄ",
    "meaning": "do nhiều thứ hợp thành, thuốc",
    "onyomi": [
      "ざい",
      "すい",
      "せい"
    ],
    "kunyomi": [
      "かる",
      "けず.る"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "đao 刀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堀",
    "hanViet": "QUẬT",
    "meaning": "cao ngất",
    "onyomi": [
      "くつ"
    ],
    "kunyomi": [
      "ほり"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "巡",
    "hanViet": "DUYÊN, TUẦN",
    "meaning": "đi lại xem xét, đi hết một vòng",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [
      "めぐ.る",
      "めぐ.り"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "xuyên 巛 (+4 nét), sước 辵 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "戒",
    "hanViet": "GIỚI",
    "meaning": "phòng, tránh, cấm đoán, điều răn",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "いまし.める"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "qua 戈 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "排",
    "hanViet": "BÀI",
    "meaning": "xếp hàng, bè (thuyền bè), tháo ra",
    "onyomi": [
      "はい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "携",
    "hanViet": "HUỀ",
    "meaning": "xách, chống, dắt",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "たずさ.える",
      "たずさ.わる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thủ 手 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "敏",
    "hanViet": "MẪN",
    "meaning": "nhanh nhẹn, sáng suốt, ngón chân cái",
    "onyomi": [
      "びん"
    ],
    "kunyomi": [
      "さとい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "phác 攴 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "敷",
    "hanViet": "PHU",
    "meaning": "bày, mở rộng ra",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "し.く",
      "-し.き"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "phác 攴 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "犠",
    "hanViet": "HY",
    "meaning": "con vật tế thần",
    "onyomi": [
      "ぎ",
      "き"
    ],
    "kunyomi": [
      "いけにえ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngưu 牛 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "獲",
    "hanViet": "HOẠCH",
    "meaning": "bắt được, có được, gặt hái, đầy tớ, nô tỳ",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "え.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "khuyển 犬 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "茂",
    "hanViet": "MẬU",
    "meaning": "tươi tốt",
    "onyomi": [
      "も"
    ],
    "kunyomi": [
      "しげ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "繁",
    "hanViet": "BÀ, BÀN, PHIỀN, PHỒN",
    "meaning": "nhiều, đông, sinh, đẻ",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "しげ.る",
      "しげ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頻",
    "hanViet": "TẦN",
    "meaning": "thường, sự lặp lại",
    "onyomi": [
      "ひん"
    ],
    "kunyomi": [
      "しき.りに"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "hiệt 頁 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殖",
    "hanViet": "SỰ, THỰC",
    "meaning": "sinh sôi, nảy nở, nhiều, đông",
    "onyomi": [
      "しょく"
    ],
    "kunyomi": [
      "ふ.える",
      "ふ.やす"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngạt 歹 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "衝",
    "hanViet": "XUNG",
    "meaning": "đường cái, dội, xối (nước), bay lên",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "つ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hành 行 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誉",
    "hanViet": "DỰ",
    "meaning": "khen ngợi",
    "onyomi": [
      "よ"
    ],
    "kunyomi": [
      "ほま.れ",
      "ほ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "褒",
    "hanViet": "BAO, BẦU",
    "meaning": "khen ngợi, biểu dương, áo rộng",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "ほ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "y 衣 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "透",
    "hanViet": "THẤU",
    "meaning": "xuyên qua",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "す.く",
      "す.かす",
      "す.ける",
      "とう.る",
      "とう.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隣",
    "hanViet": "LÂN",
    "meaning": "gần, kề, láng giềng",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [
      "とな.る",
      "となり"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "phụ 阜 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雅",
    "hanViet": "NHA, NHÃ",
    "meaning": "thường, hay, luôn, thanh nhã, tao nhã (trái với tục)",
    "onyomi": [
      "が"
    ],
    "kunyomi": [
      "みや.び"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "chuy 隹 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遜",
    "hanViet": "TỐN",
    "meaning": "trốn lẩn, lánh đi, kém",
    "onyomi": [
      "そん"
    ],
    "kunyomi": [
      "したが.う",
      "へりくだ.る",
      "ゆず.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "sước 辵 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "徹",
    "hanViet": "TRIỆT",
    "meaning": "suốt, thấu, đến tận cùng",
    "onyomi": [
      "てつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "xích 彳 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瀬",
    "hanViet": "LAI",
    "meaning": "Rapids, Current, Torrent",
    "onyomi": [
      "らい"
    ],
    "kunyomi": [
      "せ"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "thuỷ 水 (+16 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "撤",
    "hanViet": "TRIỆT",
    "meaning": "rút đi, rút lui, giảm bớt, lược bớt",
    "onyomi": [
      "てつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "措",
    "hanViet": "THỐ, TRÁCH",
    "meaning": "thi thố ra, bãi bỏ, bắt tay vào làm, lo liệu",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "お.く"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拠",
    "hanViet": "CỨ",
    "meaning": "Foothold, Based On, Follow",
    "onyomi": [
      "きょ",
      "こ"
    ],
    "kunyomi": [
      "よ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "儀",
    "hanViet": "NGHI",
    "meaning": "dáng bên ngoài, lễ nghi, nghi thức",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "nhân 人 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "樹",
    "hanViet": "THỌ, THỤ",
    "meaning": "cái cây",
    "onyomi": [
      "じゅ"
    ],
    "kunyomi": [
      "き"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mộc 木 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "棄",
    "hanViet": "KHÍ",
    "meaning": "bỏ đi, vứt đi",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "す.てる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虎",
    "hanViet": "HỔ",
    "meaning": "con hổ",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "とら"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hô 虍 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蛍",
    "hanViet": "HUỲNH",
    "meaning": "Lightning-bug, Firefly",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "ほたる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tiểu 小 (+8 nét), trùng 虫 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蜂",
    "hanViet": "PHONG",
    "meaning": "con ong, đông, nhiều",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "はち"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "trùng 虫 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酎",
    "hanViet": "TRỬU, TRỮU",
    "meaning": "rượu ngon, rượu nặng",
    "onyomi": [
      "ちゅう",
      "ちゅ"
    ],
    "kunyomi": [
      "かも.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "dậu 酉 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蜜",
    "hanViet": "MẬT",
    "meaning": "mật ong, ngọt",
    "onyomi": [
      "みつ",
      "びつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "trùng 虫 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "艦",
    "hanViet": "HẠM",
    "meaning": "tàu chiến",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "chu 舟 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "潜",
    "hanViet": "TIỀM",
    "meaning": "giấu kín, ở ẩn, ngầm, không cho người khác biết",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "ひそ.む",
      "もぐ.る",
      "かく.れる",
      "くぐ.る",
      "ひそ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拳",
    "hanViet": "QUYỀN",
    "meaning": "nắm tay, quả đấm, quyền thuật",
    "onyomi": [
      "けん",
      "げん"
    ],
    "kunyomi": [
      "こぶし"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "仁",
    "hanViet": "NHÂN, NHƠN",
    "meaning": "lòng thương người, nhân trong hạt, tê liệt",
    "onyomi": [
      "じん",
      "に",
      "にん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "nhân 人 (+2 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "至",
    "hanViet": "CHÍ",
    "meaning": "đến, tới, rất, cực kỳ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "いた.る"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "chí 至 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "誠",
    "hanViet": "THÀNH",
    "meaning": "thật thà, thành thật",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "まこと"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "郷",
    "hanViet": "HƯƠNG",
    "meaning": "Home Town, Village, Native Place",
    "onyomi": [
      "きょう",
      "ごう"
    ],
    "kunyomi": [
      "さと"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ấp 邑 (+8 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "侵",
    "hanViet": "THẨM, TẨM, XÂM",
    "meaning": "chiếm lấy",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "おか.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "偽",
    "hanViet": "NGUỴ",
    "meaning": "giả, nguỵ",
    "onyomi": [
      "ぎ",
      "か"
    ],
    "kunyomi": [
      "いつわ.る",
      "にせ",
      "いつわ.り"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "克",
    "hanViet": "KHẮC",
    "meaning": "làm được, hiếu thắng, khắc phục, phục hồi",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "か.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhân 儿 (+5 nét), thập 十 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "哲",
    "hanViet": "TRIẾT",
    "meaning": "khôn, trí tuệ, triết học",
    "onyomi": [
      "てつ"
    ],
    "kunyomi": [
      "さとい",
      "あきらか"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "喪",
    "hanViet": "TANG, TÁNG",
    "meaning": "việc tang, tang lễ, đánh mất, rơi mất, làm mất, lễ tang",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "も"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堅",
    "hanViet": "KIÊN",
    "meaning": "bền vững, cố sức, không lo sợ",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "かた.い",
      "-がた.い"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "括",
    "hanViet": "HOẠT, QUÁT",
    "meaning": "bao quát, buộc lại, bó lại",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [
      "くく.る"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弧",
    "hanViet": "HỒ, O, Ô",
    "meaning": "cái cung gỗ",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "cung 弓 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "挑",
    "hanViet": "KHIÊU, THAO, THIÊU, THIỂU",
    "meaning": "chọn lựa, kén chọn, gánh, gồng, khều, chọc",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "いど.む"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "揚",
    "hanViet": "DƯƠNG",
    "meaning": "dơ lên, giương lên, bay lên, Dương Châu 揚州",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "あ.げる",
      "-あ.げ",
      "あ.がる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "握",
    "hanViet": "ÁC, ỐC",
    "meaning": "cầm, nắm",
    "onyomi": [
      "あく"
    ],
    "kunyomi": [
      "にぎ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "揺",
    "hanViet": "DAO, DIÊU",
    "meaning": "lay động, quấy nhiễu, lay động",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "ゆ.れる",
      "ゆ.る",
      "ゆ.らぐ",
      "ゆ.るぐ",
      "ゆ.する",
      "ゆ.さぶる",
      "ゆ.すぶる",
      "うご.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斎",
    "hanViet": "TRAI",
    "meaning": "ăn chay, nhà học",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "とき",
      "つつし.む",
      "ものいみ",
      "い.む",
      "いわ.う",
      "いつ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "văn 文 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "暫",
    "hanViet": "TẠM",
    "meaning": "tạm thời",
    "onyomi": [
      "ざん"
    ],
    "kunyomi": [
      "しばら.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "nhật 日 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "析",
    "hanViet": "TÍCH",
    "meaning": "gỡ, tách, tẽ, chẻ",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "枢",
    "hanViet": "XU",
    "meaning": "cái then cửa, cây xu, sao Xu",
    "onyomi": [
      "すう",
      "しゅ"
    ],
    "kunyomi": [
      "とぼそ",
      "からくり"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mộc 木 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "軸",
    "hanViet": "TRỤC",
    "meaning": "cái trục xe",
    "onyomi": [
      "じく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "xa 車 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柄",
    "hanViet": "BÍNH",
    "meaning": "cán, báng, tay cầm, người cầm quyền",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "がら",
      "え",
      "つか"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "滑",
    "hanViet": "CỐT, HOẠT",
    "meaning": "lưu thông, không ngừng, trơn, nhẵn, khôi hài, hài hước",
    "onyomi": [
      "かつ",
      "こつ"
    ],
    "kunyomi": [
      "すべ.る",
      "なめ.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "潟",
    "hanViet": "TÍCH",
    "meaning": "đất mặn",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "かた",
      "-がた"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "焦",
    "hanViet": "TIÊU, TIỀU",
    "meaning": "cháy, nỏ, giòn, bỏng rát",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "こ.げる",
      "こ.がす",
      "こ.がれる",
      "あせ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hoả 火 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "範",
    "hanViet": "PHẠM",
    "meaning": "phép tắc, khuôn mẫu",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "trúc 竹 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紛",
    "hanViet": "PHÂN",
    "meaning": "rối rắm",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [
      "まぎ.れる",
      "-まぎ.れ",
      "まぎ.らす",
      "まぎ.らわす",
      "まぎ.らわしい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "糾",
    "hanViet": "CỦ, KIỂU",
    "meaning": "dây chập ba lần, thu lại, gộp lại",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "ただ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mịch 糸 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "綱",
    "hanViet": "CƯƠNG",
    "meaning": "dây cáp",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "つな"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "網",
    "hanViet": "VÕNG",
    "meaning": "cái lưới, vu khống, lừa",
    "onyomi": [
      "もう"
    ],
    "kunyomi": [
      "あみ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肝",
    "hanViet": "CAN",
    "meaning": "lá gan, buồng gan",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "きも"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhục 肉 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "芝",
    "hanViet": "CHI",
    "meaning": "một loại cỏ thơm",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "しば"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thảo 艸 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誰",
    "hanViet": "THUỲ",
    "meaning": "ai (câu hỏi)",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "だれ",
      "たれ",
      "た"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngôn 言 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "裂",
    "hanViet": "LIỆT",
    "meaning": "xé ra, rách",
    "onyomi": [
      "れつ"
    ],
    "kunyomi": [
      "さ.く",
      "さ.ける",
      "-ぎ.れ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "y 衣 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "襲",
    "hanViet": "TẬP",
    "meaning": "áo liệm người chết, tập kích, lẻn đánh, đánh úp, bắt chước",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "おそ.う",
      "かさ.ね"
    ],
    "jlpt": "N1",
    "strokeCount": 22,
    "radical": "y 衣 (+17 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貢",
    "hanViet": "CỐNG",
    "meaning": "cống nạp, dâng, tiến cử, sông Cống",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "みつ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "bối 貝 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "趣",
    "hanViet": "THÚ, XÚC",
    "meaning": "thú vui, ham thích",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "おもむき",
      "おもむ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tẩu 走 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "距",
    "hanViet": "CỰ",
    "meaning": "khoảng cách",
    "onyomi": [
      "きょ"
    ],
    "kunyomi": [
      "へだ.たる",
      "けづめ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "túc 足 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "露",
    "hanViet": "LỘ",
    "meaning": "sương, hạt móc, lộ ra",
    "onyomi": [
      "ろ",
      "ろう"
    ],
    "kunyomi": [
      "つゆ"
    ],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "vũ 雨 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "牧",
    "hanViet": "MỤC",
    "meaning": "chăn nuôi, người chăn gia súc",
    "onyomi": [
      "ぼく"
    ],
    "kunyomi": [
      "まき"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "ngưu 牛 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "朗",
    "hanViet": "LÃNG",
    "meaning": "sáng",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [
      "ほが.らか",
      "あき.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nguyệt 月 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "潮",
    "hanViet": "TRIỀU, TRÀO",
    "meaning": "thuỷ triều, thuỷ triều",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "しお",
      "うしお"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "即",
    "hanViet": "TỨC",
    "meaning": "tới gần, ngay, tức thì, chính là",
    "onyomi": [
      "そく"
    ],
    "kunyomi": [
      "つ.く",
      "つ.ける",
      "すなわ.ち"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tiết 卩 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "垣",
    "hanViet": "VIÊN",
    "meaning": "tường thấp",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "かき"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thổ 土 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "威",
    "hanViet": "OAI, UY",
    "meaning": "oai, uy",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "おど.す",
      "おど.し",
      "おど.かす"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nữ 女 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "岳",
    "hanViet": "NHẠC",
    "meaning": "thuộc về vợ (xem: nhạc trượng 岳丈)",
    "onyomi": [
      "がく"
    ],
    "kunyomi": [
      "たけ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "sơn 山 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慰",
    "hanViet": "UÝ, UỶ",
    "meaning": "an ủi, yên lòng, an ủi",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "なぐさ.める",
      "なぐさ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "懇",
    "hanViet": "KHẨN",
    "meaning": "thành khẩn",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "ねんご.ろ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "tâm 心 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "懲",
    "hanViet": "TRỪNG",
    "meaning": "trừng trị, răn đe",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "こ.りる",
      "こ.らす",
      "こ.らしめる"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "tâm 心 (+15 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "摩",
    "hanViet": "MA",
    "meaning": "xoa, xát",
    "onyomi": [
      "ま"
    ],
    "kunyomi": [
      "ま.する",
      "さす.る",
      "す.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "擦",
    "hanViet": "SÁT",
    "meaning": "xoa, xát",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [
      "す.る",
      "す.れる",
      "-ず.れ",
      "こす.る",
      "こす.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "thủ 手 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "撲",
    "hanViet": "BẠC, PHÁC, PHỐC",
    "meaning": "đánh, dập tắt, đánh trượng, phẩy qua",
    "onyomi": [
      "ぼく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斉",
    "hanViet": "TỀ",
    "meaning": "đều, không so le, nước Tề, đất Tề",
    "onyomi": [
      "せい",
      "さい"
    ],
    "kunyomi": [
      "そろ.う",
      "ひと.しい",
      "ひと.しく",
      "あたる",
      "はやい"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "văn 文 (+4 nét), tề 齊 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "旨",
    "hanViet": "CHỈ",
    "meaning": "ngon, ý chỉ, chỉ dụ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "むね",
      "うま.い"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhật 日 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沼",
    "hanViet": "CHIỂU",
    "meaning": "cái ao hình cong",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "ぬま"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "泰",
    "hanViet": "THÁI",
    "meaning": "bình yên, thản nhiên, rất, một quẻ trong Kinh Dịch tượng trưng cho vận tốt",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "滅",
    "hanViet": "DIỆT",
    "meaning": "giết, dập tắt (lửa)",
    "onyomi": [
      "めつ"
    ],
    "kunyomi": [
      "ほろ.びる",
      "ほろ.ぶ",
      "ほろ.ぼす"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "滋",
    "hanViet": "TƯ",
    "meaning": "nảy nở, tăng thêm, phun, tưới",
    "onyomi": [
      "じ",
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "炉",
    "hanViet": "LÔ, LƯ",
    "meaning": "lò lửa, lò lửa",
    "onyomi": [
      "ろ"
    ],
    "kunyomi": [
      "いろり"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hoả 火 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "琴",
    "hanViet": "CẦM",
    "meaning": "cái đàn cầm",
    "onyomi": [
      "きん",
      "ごん"
    ],
    "kunyomi": [
      "こと"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngọc 玉 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寸",
    "hanViet": "THỐN",
    "meaning": "tấc (đơn vị đo chiều dài)",
    "onyomi": [
      "すん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "thốn 寸 (+0 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "竜",
    "hanViet": "LONG",
    "meaning": "Dragon, Imperial",
    "onyomi": [
      "りゅう",
      "りょう",
      "ろう"
    ],
    "kunyomi": [
      "たつ",
      "いせ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "lập 立 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "縁",
    "hanViet": "DUYÊN",
    "meaning": "Affinity, Relation, Connection",
    "onyomi": [
      "えん",
      "-ねん"
    ],
    "kunyomi": [
      "ふち",
      "ふちど.る",
      "ゆかり",
      "よすが",
      "へり",
      "えにし"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "翼",
    "hanViet": "DỰC",
    "meaning": "cánh chim, vây cá, sao Dực",
    "onyomi": [
      "よく"
    ],
    "kunyomi": [
      "つばさ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "vũ 羽 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "吉",
    "hanViet": "CÁT",
    "meaning": "tốt lành",
    "onyomi": [
      "きち",
      "きつ"
    ],
    "kunyomi": [
      "よし"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刃",
    "hanViet": "NHẪN, NHẬN",
    "meaning": "mũi nhọn, mũi nhọn",
    "onyomi": [
      "じん",
      "にん"
    ],
    "kunyomi": [
      "は",
      "やいば",
      "き.る"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "đao 刀 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "忍",
    "hanViet": "NHẪN",
    "meaning": "chịu đựng, nhẫn nhịn, nỡ, đành",
    "onyomi": [
      "にん"
    ],
    "kunyomi": [
      "しの.ぶ",
      "しの.ばせる"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "桃",
    "hanViet": "ĐÀO",
    "meaning": "cây hoa đào, lễ cưới",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "もも"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謎",
    "hanViet": "MÊ",
    "meaning": "câu đố",
    "onyomi": [
      "めい",
      "べい"
    ],
    "kunyomi": [
      "なぞ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "侍",
    "hanViet": "THỊ",
    "meaning": "thân cận, gần gũi",
    "onyomi": [
      "じ",
      "し"
    ],
    "kunyomi": [
      "さむらい",
      "はべ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "俺",
    "hanViet": "YÊM",
    "meaning": "ta, tôi",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "おれ",
      "われ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "叱",
    "hanViet": "SẤT",
    "meaning": "quát, thét",
    "onyomi": [
      "しつ",
      "しち"
    ],
    "kunyomi": [
      "しか.る"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "khẩu 口 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "娯",
    "hanViet": "NGU",
    "meaning": "vui vẻ",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nữ 女 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斗",
    "hanViet": "ĐẤU, ĐẨU, ẨU",
    "meaning": "tranh đấu, cái đấu (để đong), một đấu",
    "onyomi": [
      "と",
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "đẩu 斗 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "朱",
    "hanViet": "CHU, CHÂU",
    "meaning": "màu đỏ, màu đỏ",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "あけ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "mộc 木 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "丘",
    "hanViet": "KHIÊU, KHÂU",
    "meaning": "gò, đống, thửa (ruộng)",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "おか"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nhất 一 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "梨",
    "hanViet": "LÊ",
    "meaning": "cây lê, quả lê",
    "onyomi": [
      "り"
    ],
    "kunyomi": [
      "なし"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mộc 木 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "僕",
    "hanViet": "BỘC",
    "meaning": "người đầy tớ, người cầm cương ngựa",
    "onyomi": [
      "ぼく"
    ],
    "kunyomi": [
      "しもべ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nhân 人 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "釣",
    "hanViet": "ĐIẾU",
    "meaning": "câu cá",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "つ.る",
      "つ.り",
      "つ.り-"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "kim 金 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嵐",
    "hanViet": "LAM",
    "meaning": "khí núi bốc lên",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "あらし"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "sơn 山 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "姫",
    "hanViet": "CƠ",
    "meaning": "tiếng gọi đàn bà quý phái",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "ひめ",
      "ひめ-"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nữ 女 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "棚",
    "hanViet": "BÀNH, BẰNG",
    "meaning": "gác, nhà rạp, đơn vị quân gồm 14 lính",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "たな",
      "-だな"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "砲",
    "hanViet": "PHÁO",
    "meaning": "máy bắn đá, pháo, mìn",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thạch 石 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雷",
    "hanViet": "LÔI, LỖI",
    "meaning": "sấm",
    "onyomi": [
      "らい"
    ],
    "kunyomi": [
      "かみなり",
      "いかずち",
      "いかづち"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "vũ 雨 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "芽",
    "hanViet": "NHA",
    "meaning": "mầm, chồi",
    "onyomi": [
      "が"
    ],
    "kunyomi": [
      "め"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thảo 艸 (+4 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "澄",
    "hanViet": "TRỪNG",
    "meaning": "trong (nước), lọc",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "す.む",
      "す.ます",
      "-す.ます"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "矛",
    "hanViet": "MÂU",
    "meaning": "xà mâu (binh khí)",
    "onyomi": [
      "む",
      "ぼう"
    ],
    "kunyomi": [
      "ほこ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "mâu 矛 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鐘",
    "hanViet": "CHUNG",
    "meaning": "cái chuông, phút thời gian",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "かね"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "kim 金 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凶",
    "hanViet": "HUNG",
    "meaning": "hung ác, dữ tợn, sợ hãi",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "khảm 凵 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塊",
    "hanViet": "KHỐI",
    "meaning": "hòn, khối, đống",
    "onyomi": [
      "かい",
      "け"
    ],
    "kunyomi": [
      "かたまり",
      "つちくれ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "狩",
    "hanViet": "THÚ",
    "meaning": "lễ đi săn vào mùa đông",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "か.る",
      "か.り",
      "-が.り"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "khuyển 犬 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頃",
    "hanViet": "KHOẢNH, KHUYNH, KHUỂ",
    "meaning": "mảnh đất, phúc chốc, nhanh chóng, nửa bước chân",
    "onyomi": [
      "けい",
      "きょう"
    ],
    "kunyomi": [
      "ころ",
      "ごろ",
      "しばら.く"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "hiệt 頁 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "魂",
    "hanViet": "HỒN",
    "meaning": "linh hồn",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "たましい",
      "たま"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "quỷ 鬼 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "脚",
    "hanViet": "CƯỚC",
    "meaning": "chân",
    "onyomi": [
      "きゃく",
      "きゃ",
      "かく"
    ],
    "kunyomi": [
      "あし"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhục 肉 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "井",
    "hanViet": "TĨNH, TỈNH, ĐÁN",
    "meaning": "cái giếng, sao Tỉnh (một trong Nhị thập bát tú), cái giếng",
    "onyomi": [
      "せい",
      "しょう"
    ],
    "kunyomi": [
      "い"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "nhị 二 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "呪",
    "hanViet": "CHÚ",
    "meaning": "nguyền rủa, thần chú",
    "onyomi": [
      "じゅ",
      "しゅ",
      "しゅう",
      "ず"
    ],
    "kunyomi": [
      "まじな.う",
      "のろ.い",
      "まじな.い",
      "のろ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "khẩu 口 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嬢",
    "hanViet": "NƯƠNG",
    "meaning": "Lass, Girl, Miss",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "むすめ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "nữ 女 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "暦",
    "hanViet": "LỊCH",
    "meaning": "trải qua, vượt qua, lịch (như: lịch 曆)",
    "onyomi": [
      "れき",
      "りゃく"
    ],
    "kunyomi": [
      "こよみ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nhật 日 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "眺",
    "hanViet": "DIỂU, THIẾU",
    "meaning": "trông, ngắm từ xa, lườm, lễ họp chư hầu",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "なが.める"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mục 目 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "裸",
    "hanViet": "KHOÃ, KHOẢ, LOÃ, LOẢ, QUÁN",
    "meaning": "lộ ra, hiện ra, trần truồng, lộ ra, hiện ra",
    "onyomi": [
      "ら"
    ],
    "kunyomi": [
      "はだか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "y 衣 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賭",
    "hanViet": "ĐỔ",
    "meaning": "đánh bạc",
    "onyomi": [
      "と"
    ],
    "kunyomi": [
      "か.ける",
      "かけ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塾",
    "hanViet": "THỤC",
    "meaning": "lớp học tại nhà",
    "onyomi": [
      "じゅく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thổ 土 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "卓",
    "hanViet": "TRÁC",
    "meaning": "cao chót",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thập 十 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "菌",
    "hanViet": "KHUẨN",
    "meaning": "cây nấm, vi khuẩn",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陰",
    "hanViet": "UẨN, ÁM, ÂM, ẤM",
    "meaning": "bóng mát, mặt trái, mặt sau, số âm",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [
      "かげ",
      "かげ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "霊",
    "hanViet": "LINH",
    "meaning": "Spirits, Soul",
    "onyomi": [
      "れい",
      "りょう"
    ],
    "kunyomi": [
      "たま"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "vũ 雨 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "稼",
    "hanViet": "GIÁ",
    "meaning": "cấy lúa",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "かせ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hoà 禾 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嫁",
    "hanViet": "GIÁ",
    "meaning": "lấy chồng, gieo rắc",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "よめ",
      "とつ.ぐ",
      "い.く",
      "ゆ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nữ 女 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "溝",
    "hanViet": "CÂU",
    "meaning": "trong (nước), rãnh, cống, ngòi, lạch, khe, cái hào",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "みぞ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "滝",
    "hanViet": "LONG",
    "meaning": "Như chữ 瀧.",
    "onyomi": [
      "ろう",
      "そう"
    ],
    "kunyomi": [
      "たき"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "狂",
    "hanViet": "CUỒNG",
    "meaning": "điên cuồng",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "くる.う",
      "くる.おしい",
      "くるお.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "khuyển 犬 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "墨",
    "hanViet": "MẶC",
    "meaning": "mực viết",
    "onyomi": [
      "ぼく"
    ],
    "kunyomi": [
      "すみ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thổ 土 (+12 nét), hắc 黑 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "穏",
    "hanViet": "ỔN",
    "meaning": "Calm, Quiet, Moderation",
    "onyomi": [
      "おん"
    ],
    "kunyomi": [
      "おだ.やか"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "hoà 禾 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "魔",
    "hanViet": "MA",
    "meaning": "ma quỷ",
    "onyomi": [
      "ま"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "quỷ 鬼 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寮",
    "hanViet": "LIÊU",
    "meaning": "cửa sổ nhỏ",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "miên 宀 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "盆",
    "hanViet": "BỒN",
    "meaning": "cái chậu sành",
    "onyomi": [
      "ぼん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mẫn 皿 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "棟",
    "hanViet": "ĐỐNG",
    "meaning": "cái cột",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "むね",
      "むな-"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斬",
    "hanViet": "TRẢM",
    "meaning": "chém, chặt",
    "onyomi": [
      "ざん",
      "さん",
      "せん",
      "ぜん"
    ],
    "kunyomi": [
      "き.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "cân 斤 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寧",
    "hanViet": "NINH, TRỮ",
    "meaning": "an toàn, thà, nên, há nào, lẽ nào",
    "onyomi": [
      "ねい"
    ],
    "kunyomi": [
      "むし.ろ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "miên 宀 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "椅",
    "hanViet": "KỶ, Y, Ỷ",
    "meaning": "cái ghế tựa, cái ghế tựa",
    "onyomi": [
      "い"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "猿",
    "hanViet": "VIÊN",
    "meaning": "con vượn",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "さる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "khuyển 犬 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瞳",
    "hanViet": "ĐỒNG",
    "meaning": "con ngươi mắt",
    "onyomi": [
      "どう",
      "とう"
    ],
    "kunyomi": [
      "ひとみ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "mục 目 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鍵",
    "hanViet": "KIỆN",
    "meaning": "cái chìa khoá",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "かぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "碁",
    "hanViet": "KÌ, KỲ",
    "meaning": "cờ (chơi)",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thạch 石 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "租",
    "hanViet": "TÔ",
    "meaning": "tô thuế, cho thuê",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hoà 禾 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "幽",
    "hanViet": "U",
    "meaning": "ẩn núp, sâu xa, tối tăm, cầm tù",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "ふか.い",
      "かす.か",
      "くら.い",
      "しろ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "yêu 幺 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "泡",
    "hanViet": "BÀO, PHAO, PHÁO",
    "meaning": "ngâm nước, bọt nước, bong bóng",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "あわ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "癖",
    "hanViet": "PHÍCH, TÍCH",
    "meaning": "bệnh hòn (tích thành hòn trong bụng)",
    "onyomi": [
      "へき"
    ],
    "kunyomi": [
      "くせ",
      "くせ.に"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "nạch 疒 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鍛",
    "hanViet": "THUYẾN, ĐOÀN, ĐOÁN, ĐOẠN",
    "meaning": "rèn (kim loại), rèn (kim loại)",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "きた.える"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "kim 金 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "錬",
    "hanViet": "LUYỆN",
    "meaning": "Tempering, Refine, Drill",
    "onyomi": [
      "れん"
    ],
    "kunyomi": [
      "ね.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "穂",
    "hanViet": "TOẠI, TUỆ",
    "meaning": "Ear, Ear (grain), Head",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "ほ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hoà 禾 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "帝",
    "hanViet": "ĐẾ",
    "meaning": "vua",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "みかど"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "cân 巾 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瞬",
    "hanViet": "THUẤN",
    "meaning": "nháy mắt",
    "onyomi": [
      "しゅん"
    ],
    "kunyomi": [
      "またた.く",
      "まじろ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mục 目 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "菊",
    "hanViet": "CÚC",
    "meaning": "hoa cúc",
    "onyomi": [
      "きく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誇",
    "hanViet": "KHOA, KHOẢ",
    "meaning": "khoe khoang, nói khoác",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "ほこ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "阻",
    "hanViet": "TRỞ",
    "meaning": "cản trở, hiểm trở",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "はば.む"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "phụ 阜 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "黙",
    "hanViet": "MẶC",
    "meaning": "Silence, Become Silent, Stop Speaking",
    "onyomi": [
      "もく",
      "ぼく"
    ],
    "kunyomi": [
      "だま.る",
      "もだ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hoả 火 (+11 nét), hắc 黑 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "俵",
    "hanViet": "BIỂU",
    "meaning": "ban phát, phân chia",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [
      "たわら"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 5"
  },
  {
    "kanji": "架",
    "hanViet": "GIÁ",
    "meaning": "cái giá, gác (để đặt đồ vật)",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "か.ける",
      "か.かる"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "砕",
    "hanViet": "TOÁI",
    "meaning": "Smash, Break, Crush",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "くだ.く",
      "くだ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thạch 石 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "粘",
    "hanViet": "NIÊM",
    "meaning": "chất dính, dán vào",
    "onyomi": [
      "ねん"
    ],
    "kunyomi": [
      "ねば.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mễ 米 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "粧",
    "hanViet": "TRANG",
    "meaning": "đồ trang điểm, trang sức",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mễ 米 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "欺",
    "hanViet": "KHI",
    "meaning": "lừa dối, bắt nạt, ức hiếp",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [
      "あざむ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khiếm 欠 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詐",
    "hanViet": "TRÁ",
    "meaning": "lừa dối, giả dối",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [
      "いつわ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "霧",
    "hanViet": "VỤ",
    "meaning": "sương mù",
    "onyomi": [
      "む",
      "ぼう",
      "ぶ"
    ],
    "kunyomi": [
      "きり"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "vũ 雨 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柳",
    "hanViet": "LIỄU",
    "meaning": "cây liễu, sao Liễu (một trong Nhị thập bát tú)",
    "onyomi": [
      "りゅう"
    ],
    "kunyomi": [
      "やなぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "佐",
    "hanViet": "TÁ",
    "meaning": "giúp đỡ",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尺",
    "hanViet": "CHỈ, XÍCH",
    "meaning": "thước (10 tấc)",
    "onyomi": [
      "しゃく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "thi 尸 (+1 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "哀",
    "hanViet": "AI",
    "meaning": "buồn, thương cảm, tưởng nhớ",
    "onyomi": [
      "あい"
    ],
    "kunyomi": [
      "あわ.れ",
      "あわ.れむ",
      "かな.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "khẩu 口 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唇",
    "hanViet": "CHẤN, THẦN",
    "meaning": "môi",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "くちびる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塀",
    "hanViet": "BÍNH",
    "meaning": "Fence, Wall, (kokuji)",
    "onyomi": [
      "へい",
      "べい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "墜",
    "hanViet": "TRUỴ",
    "meaning": "rơi, ngã xuống",
    "onyomi": [
      "つい"
    ],
    "kunyomi": [
      "お.ちる",
      "お.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thổ 土 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "如",
    "hanViet": "NHƯ",
    "meaning": "bằng, giống, như",
    "onyomi": [
      "じょ",
      "にょ"
    ],
    "kunyomi": [
      "ごと.し"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nữ 女 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "婆",
    "hanViet": "BÀ",
    "meaning": "bà già, mẹ chồng",
    "onyomi": [
      "ば"
    ],
    "kunyomi": [
      "ばば",
      "ばあ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nữ 女 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "崖",
    "hanViet": "NHAI",
    "meaning": "ven núi, cạnh núi, vách núi",
    "onyomi": [
      "がい",
      "げ",
      "ぎ"
    ],
    "kunyomi": [
      "がけ",
      "きし",
      "はて"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sơn 山 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "幣",
    "hanViet": "TỆ",
    "meaning": "vải lụa, tiền",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "ぬさ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "cân 巾 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恨",
    "hanViet": "HẬN",
    "meaning": "giận, ghét",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "うら.む",
      "うら.めしい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憩",
    "hanViet": "KHẾ",
    "meaning": "nghỉ ngơi",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "いこ.い",
      "いこ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "扇",
    "hanViet": "PHIẾN, THIÊN",
    "meaning": "cánh cửa, cái quạt",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "おうぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hộ 戶 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "扉",
    "hanViet": "PHI",
    "meaning": "cánh cửa",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "とびら"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hộ 戶 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "挿",
    "hanViet": "SÁP, THÁP, TRÁP",
    "meaning": "Insert, Put In, Graft",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "さ.す",
      "はさ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "掌",
    "hanViet": "CHƯỞNG",
    "meaning": "lòng bàn tay, tát, vả",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "てのひら",
      "たなごころ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "炊",
    "hanViet": "XUY, XUÝ",
    "meaning": "nấu chín",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "た.く",
      "-だ.き"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hoả 火 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "爽",
    "hanViet": "SẢNG",
    "meaning": "sáng suốt, sảng khoái, chỗ cao ráo sáng sủa",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "あき.らか",
      "さわ.やか",
      "たがう"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "hào 爻 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瞭",
    "hanViet": "LIÊU, LIỄU, LIỆU",
    "meaning": "xong, hết, đã, rồi, mắt sáng, mắt trong",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "あきらか"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "mục 目 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "箸",
    "hanViet": "TRỢ, TRỨ",
    "meaning": "cái đũa",
    "onyomi": [
      "ちょ",
      "ちゃく"
    ],
    "kunyomi": [
      "はし"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "trúc 竹 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "胴",
    "hanViet": "ĐỖNG",
    "meaning": "thân người, ruột già",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "芯",
    "hanViet": "TÂM",
    "meaning": "bấc đèn, (xem: đăng tâm 燈芯,灯芯)",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thảo 艸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虹",
    "hanViet": "HỐNG, HỒNG",
    "meaning": "cầu vồng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "にじ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "trùng 虫 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "帳",
    "hanViet": "TRƯỚNG",
    "meaning": "căng lên, dương lên, trướng (lều dựng tạm khi hành binh)",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "とばり"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "cân 巾 (+8 nét)",
    "grade": "Lớp 3"
  },
  {
    "kanji": "蚊",
    "hanViet": "VĂN",
    "meaning": "con muỗi",
    "onyomi": [
      "ぶん"
    ],
    "kunyomi": [
      "か"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "trùng 虫 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蛇",
    "hanViet": "DI, SÁ, XÀ",
    "meaning": "con rắn",
    "onyomi": [
      "じゃ",
      "だ",
      "い",
      "や"
    ],
    "kunyomi": [
      "へび"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "trùng 虫 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貼",
    "hanViet": "THIẾP",
    "meaning": "dán, áp sát, men theo, cho thêm, trợ cấp, bù thêm",
    "onyomi": [
      "てん",
      "ちょう"
    ],
    "kunyomi": [
      "は.る",
      "つ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "bối 貝 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "辱",
    "hanViet": "NHỤC",
    "meaning": "nhục, xấu hổ, làm nhục, chịu khuất",
    "onyomi": [
      "じょく"
    ],
    "kunyomi": [
      "はずかし.める"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thần 辰 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鉢",
    "hanViet": "BÁT",
    "meaning": "cái bát xin ăn của sư",
    "onyomi": [
      "はち",
      "はつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kim 金 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "闇",
    "hanViet": "AM, YỂM, ÁM",
    "meaning": "tối, mờ, không rõ, không tỏ, thẫm, sẫm màu, ngầm, âm thầm, bí mật, mờ ám",
    "onyomi": [
      "あん",
      "おん"
    ],
    "kunyomi": [
      "やみ",
      "くら.い"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "môn 門 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隙",
    "hanViet": "KHÍCH",
    "meaning": "khe hở, khoảng",
    "onyomi": [
      "げき",
      "きゃく",
      "けき"
    ],
    "kunyomi": [
      "すき",
      "す.く",
      "す.かす",
      "ひま"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "phụ 阜 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "霜",
    "hanViet": "SƯƠNG",
    "meaning": "sương",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "しも"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "vũ 雨 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "飢",
    "hanViet": "CƠ, KY",
    "meaning": "đói, mất mùa, đói",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "う.える"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thực 食 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "餓",
    "hanViet": "NGÃ, NGẠ",
    "meaning": "đói quá",
    "onyomi": [
      "が"
    ],
    "kunyomi": [
      "う.える"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thực 食 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "迅",
    "hanViet": "TẤN",
    "meaning": "nhanh chóng",
    "onyomi": [
      "じん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "sước 辵 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "騎",
    "hanViet": "KỊ, KỴ",
    "meaning": "ngựa đã đóng cương, cưỡi ngựa",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mã 馬 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蓄",
    "hanViet": "SÚC",
    "meaning": "tích, chứa, trữ",
    "onyomi": [
      "ちく"
    ],
    "kunyomi": [
      "たくわ.える"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thảo 艸 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尽",
    "hanViet": "TẦN, TẪN, TẬN",
    "meaning": "hết, nhất, lớn nhất, to nhất, hết",
    "onyomi": [
      "じん",
      "さん"
    ],
    "kunyomi": [
      "つ.くす",
      "-つ.くす",
      "-づ.くし",
      "-つ.く",
      "-づ.く",
      "-ず.く",
      "つ.きる",
      "つ.かす",
      "さかづき",
      "ことごと.く",
      "つか",
      "つき"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thi 尸 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "彩",
    "hanViet": "THÁI, THẢI, THỂ",
    "meaning": "tia sáng, rực rỡ, nhiều màu, tiếng hoan hô, reo hò",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "いろど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sam 彡 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憶",
    "hanViet": "ỨC",
    "meaning": "nhớ",
    "onyomi": [
      "おく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "tâm 心 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "耐",
    "hanViet": "NĂNG, NẠI",
    "meaning": "chịu đựng, nhịn, ria mép",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "た.える"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhi 而 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "輝",
    "hanViet": "HUY",
    "meaning": "ánh sáng, soi, chiếu",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "かがや.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "xa 車 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "脅",
    "hanViet": "HIẾP",
    "meaning": "sườn, hai bên ngực, bức hiếp",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "おびや.かす",
      "おど.す",
      "おど.かす"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "麻",
    "hanViet": "MA",
    "meaning": "cây gai",
    "onyomi": [
      "ま",
      "まあ"
    ],
    "kunyomi": [
      "あさ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ma 麻 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "培",
    "hanViet": "BẪU, BẬU, BỒI",
    "meaning": "vun xới, bón",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "つちか.う"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "悔",
    "hanViet": "HỐI, HỔI",
    "meaning": "hối hận, nuối tiếc",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "く.いる",
      "く.やむ",
      "くや.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "脇",
    "hanViet": "HIẾP",
    "meaning": "sườn, hai bên ngực, bức hiếp",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "わき",
      "わけ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遂",
    "hanViet": "TOẠI",
    "meaning": "bèn (trợ từ)",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "と.げる",
      "つい.に"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "班",
    "hanViet": "BAN",
    "meaning": "lớp học, ca làm việc, buổi làm việc, toán, tốp, đoàn",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngọc 玉 (+6 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "斜",
    "hanViet": "GIA, TÀ",
    "meaning": "lệch, vẹo, nghiêng, xiên, chéo",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "なな.め",
      "はす"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "đẩu 斗 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殴",
    "hanViet": "ẤU, ẨU",
    "meaning": "đánh nhau bằng gậy",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "なぐ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thù 殳 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "盾",
    "hanViet": "MY, THUẪN",
    "meaning": "lông mày, cái khiên, cái mộc, thanh gỗ ngang ở lan can",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [
      "たて"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "穫",
    "hanViet": "HOẠCH",
    "meaning": "gặt lúa",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "hoà 禾 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "巾",
    "hanViet": "CÂN",
    "meaning": "cái khăn",
    "onyomi": [
      "きん",
      "ふく"
    ],
    "kunyomi": [
      "おお.い",
      "ちきり",
      "きれ"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "cân 巾 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "駒",
    "hanViet": "CÂU",
    "meaning": "ngựa non, khoẻ",
    "onyomi": [
      "く"
    ],
    "kunyomi": [
      "こま"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mã 馬 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紫",
    "hanViet": "TỬ",
    "meaning": "đỏ tía, tím",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "むらさき"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mịch 糸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抽",
    "hanViet": "TRỪU",
    "meaning": "rút ra, rút lại",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "ひき-"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "誓",
    "hanViet": "THỆ",
    "meaning": "thề, hứa",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "ちか.う"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "ngôn 言 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "悟",
    "hanViet": "NGỘ",
    "meaning": "hiểu",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "さと.る"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拓",
    "hanViet": "CHÍCH, THÁC, THÁP",
    "meaning": "nâng, nhấc, bày ra, cái khay để bưng đồ",
    "onyomi": [
      "たく"
    ],
    "kunyomi": [
      "ひら.く"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拘",
    "hanViet": "CÂU, CÙ",
    "meaning": "câu nệ, hay tin nhảm",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "かか.わる"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "礎",
    "hanViet": "SỞ",
    "meaning": "đá tảng",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "いしずえ"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thạch 石 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鶴",
    "hanViet": "HẠC",
    "meaning": "chim hạc, con sếu",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "つる"
    ],
    "jlpt": "N1",
    "strokeCount": 21,
    "radical": "điểu 鳥 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刈",
    "hanViet": "NGẢI",
    "meaning": "cắt cỏ",
    "onyomi": [
      "がい",
      "かい"
    ],
    "kunyomi": [
      "か.る"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "đao 刀 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剛",
    "hanViet": "CANG, CƯƠNG",
    "meaning": "cứng, rắn, vừa mới qua, vừa xong",
    "onyomi": [
      "ごう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "đao 刀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唯",
    "hanViet": "DUY, DUỴ",
    "meaning": "chỉ có",
    "onyomi": [
      "ゆい",
      "い"
    ],
    "kunyomi": [
      "ただ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壇",
    "hanViet": "ĐÀN",
    "meaning": "đàn cúng tế",
    "onyomi": [
      "だん",
      "たん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thổ 土 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尼",
    "hanViet": "NI, NÊ, NẬT, NẶC, NỆ",
    "meaning": "nữ sư",
    "onyomi": [
      "に"
    ],
    "kunyomi": [
      "あま"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "thi 尸 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "概",
    "hanViet": "HỊ, KHÁI",
    "meaning": "gạt phẳng, gạt bằng, đo đạc, bao quát, tóm tắt",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [
      "おおむ.ね"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mộc 木 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浸",
    "hanViet": "THÂM, TẨM",
    "meaning": "ngâm, thấm (nước), dần dần",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "ひた.す",
      "ひた.る",
      "つ.かる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "淡",
    "hanViet": "ĐÀM, ĐẠM",
    "meaning": "nhạt (màu), hơi hơi",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "あわ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "煮",
    "hanViet": "CHỬ",
    "meaning": "nấu (cơm)",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "に.る",
      "-に",
      "に.える",
      "に.やす"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hoả 火 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "覆",
    "hanViet": "PHÚ, PHÚC",
    "meaning": "che, đậy, lật lại, đổ, dốc",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [
      "おお.う",
      "くつがえ.す",
      "くつがえ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "á 襾 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謀",
    "hanViet": "MƯU",
    "meaning": "lo liệu",
    "onyomi": [
      "ぼう",
      "む"
    ],
    "kunyomi": [
      "はか.る",
      "たばか.る",
      "はかりごと"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陶",
    "hanViet": "DAO, GIAO, ĐÀO",
    "meaning": "đồ gốm, họ Đào",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "すえ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "隔",
    "hanViet": "CÁCH",
    "meaning": "ngăn ra",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "へだ.てる",
      "へだ.たる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "phụ 阜 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "征",
    "hanViet": "CHINH, TRƯNG",
    "meaning": "người trên đem binh đánh kẻ dưới, đi xa, trưng tập, gọi đến",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "xích 彳 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陛",
    "hanViet": "BỆ",
    "meaning": "sân hè",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "phụ 阜 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "俗",
    "hanViet": "TỤC",
    "meaning": "thói quen, người phàm tục",
    "onyomi": [
      "ぞく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "桑",
    "hanViet": "TANG",
    "meaning": "cây dâu",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "くわ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "潤",
    "hanViet": "NHUẬN",
    "meaning": "nhuần nhị, thấm ướt, lời, lãi",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [
      "うるお.う",
      "うるお.す",
      "うる.む"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "珠",
    "hanViet": "CHÂU",
    "meaning": "châu, ngọc trai",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "たま"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngọc 玉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "衰",
    "hanViet": "SUY, SUÝ, THOA, THÔI",
    "meaning": "giảm bớt, suy vong, áo tang",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [
      "おとろ.える"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "y 衣 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奨",
    "hanViet": "TƯỞNG",
    "meaning": "Exhort, Urge, Encourage",
    "onyomi": [
      "しょう",
      "そう"
    ],
    "kunyomi": [
      "すす.める"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "đại 大 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "劣",
    "hanViet": "LIỆT",
    "meaning": "kém, ít hơn",
    "onyomi": [
      "れつ"
    ],
    "kunyomi": [
      "おと.る"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "lực 力 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勘",
    "hanViet": "KHÁM",
    "meaning": "so sánh, tra hỏi phạm nhân",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "lực 力 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妃",
    "hanViet": "PHI, PHỐI",
    "meaning": "phi (vợ vua), sánh đôi cùng nhau",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "きさき"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nữ 女 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "丈",
    "hanViet": "TRƯỢNG",
    "meaning": "đơn vị đo (bằng 10 thước), già cả, dượng",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "たけ",
      "だけ"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "nhất 一 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "峰",
    "hanViet": "PHONG",
    "meaning": "đỉnh núi, cái bướu",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "みね",
      "ね"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "sơn 山 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "巧",
    "hanViet": "XẢO",
    "meaning": "khéo léo",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "たく.み",
      "たく.む",
      "うま.い"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "công 工 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "邪",
    "hanViet": "DA, TÀ, TỪ",
    "meaning": "không ngay thẳng, bất chính",
    "onyomi": [
      "じゃ"
    ],
    "kunyomi": [
      "よこし.ま"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "ấp 邑 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "駄",
    "hanViet": "ĐÀ",
    "meaning": "Burdensome, Pack Horse, Horse Load",
    "onyomi": [
      "だ",
      "た"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mã 馬 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唐",
    "hanViet": "ĐƯỜNG",
    "meaning": "đời nhà Đường (Trung Quốc), khoác, hoang đường",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "から"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "廷",
    "hanViet": "ĐÌNH",
    "meaning": "triều đình",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "dẫn 廴 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鬱",
    "hanViet": "UẤT, ÚC",
    "meaning": "buồn bã, uất ức, hơi thối, sum suê, rậm rạp",
    "onyomi": [
      "うつ"
    ],
    "kunyomi": [
      "うっ.する",
      "ふさ.ぐ",
      "しげ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 29,
    "radical": "sưởng 鬯 (+19 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "簿",
    "hanViet": "BẠ, BẠC, BỘ",
    "meaning": "sổ sách, sổ sách",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "trúc 竹 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "彰",
    "hanViet": "CHƯƠNG",
    "meaning": "rực rỡ, rõ rệt",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "sam 彡 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漫",
    "hanViet": "MAN, MẠN",
    "meaning": "đầy tràn, ngập",
    "onyomi": [
      "まん"
    ],
    "kunyomi": [
      "みだり.に",
      "そぞ.ろ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "訂",
    "hanViet": "ĐÍNH",
    "meaning": "thoả thuận hai bên",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "ただ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "ngôn 言 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "諮",
    "hanViet": "TI, TY, TƯ",
    "meaning": "bàn bạc, tư vấn, tường trình",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "はか.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "銘",
    "hanViet": "MINH",
    "meaning": "bài minh (khắc chữ vào bia để tự răn mình hoặc ghi chép công đức), ghi nhớ",
    "onyomi": [
      "めい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "kim 金 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堤",
    "hanViet": "ĐÊ, ĐỀ",
    "meaning": "con đê ngăn nước",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "つつみ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漂",
    "hanViet": "PHIÊU, PHIẾU, XIẾU",
    "meaning": "trôi nổi, tẩy vải cho trắng, thanh lịch, lịch sự",
    "onyomi": [
      "ひょう"
    ],
    "kunyomi": [
      "ただよ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "翻",
    "hanViet": "PHIÊN",
    "meaning": "lật lại, phiên dịch từ tiếng này sang tiếng khác",
    "onyomi": [
      "ほん",
      "はん"
    ],
    "kunyomi": [
      "ひるがえ.る",
      "ひるがえ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "vũ 羽 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "軌",
    "hanViet": "QUỸ",
    "meaning": "cỡ bánh xe, vết bánh xe, đường sắt, đường ray",
    "onyomi": [
      "き"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "xa 車 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "后",
    "hanViet": "HẤU, HẬU",
    "meaning": "sau, phía sau, hoàng hậu, vợ vua",
    "onyomi": [
      "こう",
      "ご"
    ],
    "kunyomi": [
      "きさき"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "奮",
    "hanViet": "PHẤN",
    "meaning": "chim dang cánh bay, hăng say, ráng sức, phấn khích",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [
      "ふる.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "đại 大 (+13 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "亭",
    "hanViet": "ĐÌNH",
    "meaning": "cái nhà nhỏ",
    "onyomi": [
      "てい",
      "ちん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "đầu 亠 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "仰",
    "hanViet": "NGANG, NGƯỠNG, NHẠNG",
    "meaning": "ngẩng lên, kính mến",
    "onyomi": [
      "ぎょう",
      "こう"
    ],
    "kunyomi": [
      "あお.ぐ",
      "おお.せ",
      "お.っしゃる",
      "おっしゃ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "伯",
    "hanViet": "BÁ, BÁCH",
    "meaning": "bác ruột, anh của bố, tước Bá",
    "onyomi": [
      "はく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "墳",
    "hanViet": "BỔN, PHẦN, PHẪN",
    "meaning": "mồ mả",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thổ 土 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壮",
    "hanViet": "TRANG, TRÁNG",
    "meaning": "mạnh mẽ, người đến 30 tuổi",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "さかん"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "sĩ 士 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "把",
    "hanViet": "BÀ, BÁ, BẢ",
    "meaning": "cầm, nắm, giữ, canh giữ, gác trông, chuôi, cán, tay cầm, tay nắm",
    "onyomi": [
      "は",
      "わ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "搬",
    "hanViet": "BAN, BÀN",
    "meaning": "trừ hết, dọn sạch, chuyển đi, dời đi, trừ hết, dọn sạch",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thủ 手 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "晶",
    "hanViet": "TINH",
    "meaning": "sáng sủa",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "洞",
    "hanViet": "ĐỖNG, ĐỘNG",
    "meaning": "hang động",
    "onyomi": [
      "どう"
    ],
    "kunyomi": [
      "ほら"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "涯",
    "hanViet": "NHAI",
    "meaning": "bờ, bến",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [
      "はて"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "疫",
    "hanViet": "DỊCH",
    "meaning": "bệnh ôn dịch, bệnh lây được",
    "onyomi": [
      "えき",
      "やく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nạch 疒 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "孔",
    "hanViet": "KHỔNG",
    "meaning": "rất, lắm, cái lỗ, hang nhỏ, thông suốt",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "あな"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "tử 子 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "邸",
    "hanViet": "ĐỂ",
    "meaning": "nhà cho sứ các nước chư hầu đến chầu ở, bức bình phong",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "やしき"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "ấp 邑 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "郡",
    "hanViet": "QUẬN",
    "meaning": "quận (đơn vị hành chính)",
    "onyomi": [
      "ぐん"
    ],
    "kunyomi": [
      "こおり"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ấp 邑 (+7 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "釈",
    "hanViet": "DỊCH, THÍCH",
    "meaning": "Explanation",
    "onyomi": [
      "しゃく",
      "せき"
    ],
    "kunyomi": [
      "とく",
      "す.てる",
      "ゆる.す"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "biện 釆 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肪",
    "hanViet": "PHƯƠNG",
    "meaning": "mỡ lá",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "喚",
    "hanViet": "HOÁN",
    "meaning": "kêu, gọi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "わめ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "媛",
    "hanViet": "VIÊN, VIỆN",
    "meaning": "con gái đẹp, con gái đẹp",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "ひめ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nữ 女 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貞",
    "hanViet": "TRINH",
    "meaning": "trong trắng, tiết hạnh, trung thành",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "さだ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "bối 貝 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "玄",
    "hanViet": "HUYỀN",
    "meaning": "màu đen",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "くろ",
      "くろ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "huyền 玄 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "苗",
    "hanViet": "MIÊU",
    "meaning": "lúa mạch, lúa non, mầm",
    "onyomi": [
      "びょう",
      "みょう"
    ],
    "kunyomi": [
      "なえ",
      "なわ-"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渦",
    "hanViet": "OA, QUA",
    "meaning": "nước xoáy, sông Qua (ở tỉnh An Huy của Trung Quốc)",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "うず"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慈",
    "hanViet": "TƯ, TỪ",
    "meaning": "hiền, thiện, nhân từ",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [
      "いつく.しむ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "襟",
    "hanViet": "KHÂM",
    "meaning": "cổ áo, vạt áo",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "えり"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "y 衣 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浦",
    "hanViet": "PHỐ, PHỔ",
    "meaning": "bến sông, cửa sông, ven sông",
    "onyomi": [
      "ほ"
    ],
    "kunyomi": [
      "うら"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塚",
    "hanViet": "TRŨNG, TRỦNG",
    "meaning": "mồ, mả đắp cao, lớn nhất, cao nhất, mồ, mả đắp cao",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "つか",
      "-づか"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陥",
    "hanViet": "HÃM",
    "meaning": "Collapse, Fall Into, Cave In",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "おちい.る",
      "おとしい.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "phụ 阜 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貫",
    "hanViet": "OAN, QUÁN",
    "meaning": "xâu tiền, xuyên qua, chọc thủng, thông xuốt",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "つらぬ.く",
      "ぬ.く",
      "ぬき"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "覇",
    "hanViet": "BÁ, PHÁCH",
    "meaning": "bá, chùm xỏ, bá quyền, chiếm giữ, cát cứ",
    "onyomi": [
      "は",
      "はく"
    ],
    "kunyomi": [
      "はたがしら"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "á 襾 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "呂",
    "hanViet": "LÃ, LỮ",
    "meaning": "xương sống, họ Lã, họ Lữ, xương sống",
    "onyomi": [
      "ろ",
      "りょ"
    ],
    "kunyomi": [
      "せぼね"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "茨",
    "hanViet": "TÌ, TỪ, TỲ",
    "meaning": "lợp cỏ tranh, cỏ tật lê (một thứ cỏ có gai), chất chứa",
    "onyomi": [
      "し",
      "じ"
    ],
    "kunyomi": [
      "いばら",
      "かや",
      "くさぶき"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thảo 艸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "擁",
    "hanViet": "UNG, ỦNG",
    "meaning": "ủng hộ, giúp đỡ",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thủ 手 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "孤",
    "hanViet": "CÔ",
    "meaning": "cô đơn, lẻ loi, cô độc, mồ côi",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tử 子 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賠",
    "hanViet": "BỒI",
    "meaning": "đền bù, đền trả",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鎖",
    "hanViet": "TOẢ",
    "meaning": "giam, nhốt, khoá chặt",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [
      "くさり",
      "とざ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "kim 金 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "噴",
    "hanViet": "PHÔN, PHÚN",
    "meaning": "phun, vọt, phì ra, xì ra",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [
      "ふ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "khẩu 口 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "祥",
    "hanViet": "TƯỜNG",
    "meaning": "điềm xấu tốt, điềm lành",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "さいわ.い",
      "きざ.し",
      "よ.い",
      "つまび.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "kỳ 示 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "牲",
    "hanViet": "SINH",
    "meaning": "súc vật dùng để cúng tế",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "ngưu 牛 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "秩",
    "hanViet": "DẬT, TRẬT",
    "meaning": "thứ tự, trật (10 năm), thứ tự",
    "onyomi": [
      "ちつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hoà 禾 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唆",
    "hanViet": "TOA",
    "meaning": "xui, xúi giục, bú, mút",
    "onyomi": [
      "さ"
    ],
    "kunyomi": [
      "そそ.る",
      "そそのか.す"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "膨",
    "hanViet": "BÀNH",
    "meaning": "(xem: bành hanh 膨脝)",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "ふく.らむ",
      "ふく.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "nhục 肉 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "芳",
    "hanViet": "PHƯƠNG",
    "meaning": "thơm ngát",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "かんば.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thảo 艸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恒",
    "hanViet": "CĂNG, CẮNG, HẰNG",
    "meaning": "thường, lâu bền",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "つね",
      "つねに"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "倫",
    "hanViet": "LUÂN",
    "meaning": "luân thường, đạo lý, loài, bực",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "陳",
    "hanViet": "TRẦN, TRẬN",
    "meaning": "xếp đặt, bày biện, cũ kỹ, lâu năm, họ Trần",
    "onyomi": [
      "ちん"
    ],
    "kunyomi": [
      "ひ.ねる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "須",
    "hanViet": "TU",
    "meaning": "râu cằm, đợi, nên làm, cần thiết",
    "onyomi": [
      "す",
      "しゅ"
    ],
    "kunyomi": [
      "すべから.く",
      "すべし",
      "ひげ",
      "まつ",
      "もち.いる",
      "もと.める"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "hiệt 頁 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "偏",
    "hanViet": "THIÊN",
    "meaning": "nghiêng, lệch, vẫn, cứ, lại, không ngờ, chẳng may",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "かたよ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhân 人 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遇",
    "hanViet": "NGỘ",
    "meaning": "gặp gỡ",
    "onyomi": [
      "ぐう"
    ],
    "kunyomi": [
      "あ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "糧",
    "hanViet": "LƯƠNG",
    "meaning": "cơm, lương thực",
    "onyomi": [
      "りょう",
      "ろう"
    ],
    "kunyomi": [
      "かて"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mễ 米 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殊",
    "hanViet": "THÙ",
    "meaning": "chấm dứt, xong hết, khác biệt, rất, lắm",
    "onyomi": [
      "しゅ"
    ],
    "kunyomi": [
      "こと"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngạt 歹 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慢",
    "hanViet": "MẠN",
    "meaning": "chậm chạp, khoan, trì hoãn",
    "onyomi": [
      "まん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "没",
    "hanViet": "MỘT",
    "meaning": "chìm mất, lặn (mặt trời), không",
    "onyomi": [
      "ぼつ",
      "もつ"
    ],
    "kunyomi": [
      "おぼ.れる",
      "しず.む",
      "ない"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "怠",
    "hanViet": "ĐÃI",
    "meaning": "lười biếng",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "おこた.る",
      "なま.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遭",
    "hanViet": "TAO",
    "meaning": "không hẹn mà gặp, vòng, lượt",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "あ.う",
      "あ.わせる"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "sước 辵 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "惰",
    "hanViet": "NOẠ, ĐOẠ",
    "meaning": "ngây ngô, dốt",
    "onyomi": [
      "だ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "猟",
    "hanViet": "LIỆP, LẠP",
    "meaning": "bắt, săn thú, thổi phất",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "かり",
      "か.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khuyển 犬 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寛",
    "hanViet": "KHOAN",
    "meaning": "Tolerant, Leniency, Generosity",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "くつろ.ぐ",
      "ひろ.い",
      "ゆる.やか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "miên 宀 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "胞",
    "hanViet": "BÀO",
    "meaning": "vật tròn có vỏ bọc ngoài, bao bọc",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhục 肉 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浄",
    "hanViet": "TỊNH",
    "meaning": "sạch sẽ, đóng vai hề",
    "onyomi": [
      "じょう",
      "せい"
    ],
    "kunyomi": [
      "きよ.める",
      "きよ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "随",
    "hanViet": "TUỲ",
    "meaning": "tuỳ theo, đời nhà Tuỳ",
    "onyomi": [
      "ずい"
    ],
    "kunyomi": [
      "まにま.に",
      "したが.う"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "phụ 阜 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "稿",
    "hanViet": "CẢO",
    "meaning": "rơm rạ, bản thảo, bản nháp",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "わら",
      "したがき"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "hoà 禾 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "丹",
    "hanViet": "ĐAN, ĐƠN",
    "meaning": "đỏ, thuốc viên, đỏ",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "に"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "chủ 丶 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壌",
    "hanViet": "NHƯỠNG",
    "meaning": "Lot, Earth, Soil",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "つち"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thổ 土 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舗",
    "hanViet": "PHÔ",
    "meaning": "Shop, Store, Pave",
    "onyomi": [
      "ほ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thiệt 舌 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "騰",
    "hanViet": "ĐẰNG",
    "meaning": "ngựa nhảy chồm lên, bốc lên, chạy, nhảy",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "あが.る",
      "のぼ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "mã 馬 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "緯",
    "hanViet": "VĨ, VỊ",
    "meaning": "sợi ngang, vĩ tuyến",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "よこいと",
      "ぬき"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "艇",
    "hanViet": "ĐĨNH",
    "meaning": "cái thoi (thứ thuyền nhỏ và dài)",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "chu 舟 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "披",
    "hanViet": "BIA, PHI",
    "meaning": "cái giá kèm theo áo quan để khỏi nghiêng đổ, rẽ ra, vạch ra, mở ra, khoác áo",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "錦",
    "hanViet": "CẨM",
    "meaning": "gấm",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "にしき"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "准",
    "hanViet": "CHUYẾT, CHUẨN",
    "meaning": "chuẩn mực, theo như, cứ như (trích dẫn)",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "băng 冫 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剰",
    "hanViet": "THẶNG, THỪA",
    "meaning": "còn, thừa ra, tặng thêm",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "あまつさえ",
      "あま.り",
      "あま.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "đao 刀 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "繊",
    "hanViet": "TIÊM",
    "meaning": "nhỏ nhặt",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "mịch 糸 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "諭",
    "hanViet": "DỤ",
    "meaning": "chỉ bảo, hiểu dụ, tỏ rõ",
    "onyomi": [
      "ゆ"
    ],
    "kunyomi": [
      "さと.す"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "惨",
    "hanViet": "THẢM",
    "meaning": "bi thảm",
    "onyomi": [
      "さん",
      "ざん"
    ],
    "kunyomi": [
      "みじ.め",
      "いた.む",
      "むご.い"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虐",
    "hanViet": "NGƯỢC",
    "meaning": "ác nghiệt, tai ngược",
    "onyomi": [
      "ぎゃく"
    ],
    "kunyomi": [
      "しいた.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "hô 虍 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "据",
    "hanViet": "CƯ, CỨ",
    "meaning": "chiếm giữ, căn cứ, bằng cứ",
    "onyomi": [
      "きょ"
    ],
    "kunyomi": [
      "す.える",
      "す.わる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "徐",
    "hanViet": "TỪ",
    "meaning": "từ từ, chầm chậm, đi thong thả",
    "onyomi": [
      "じょ"
    ],
    "kunyomi": [
      "おもむ.ろに"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "xích 彳 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "搭",
    "hanViet": "THÁP, ĐÁP",
    "meaning": "phụ vào, treo lên, để lẫn lộn",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thủ 手 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "戴",
    "hanViet": "ĐÁI, ĐỚI",
    "meaning": "đội (mũ), đội (mũ)",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [
      "いただ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "qua 戈 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "帥",
    "hanViet": "SOÁI, SUÝ, SUẤT",
    "meaning": "tướng cầm đầu, thống suất, làm gương, tướng cầm đầu, thống suất",
    "onyomi": [
      "すい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "cân 巾 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "啓",
    "hanViet": "KHẢI, KHỞI",
    "meaning": "mở ra, bắt đầu, mở ra",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "ひら.く",
      "さと.す"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鯨",
    "hanViet": "CANH, KÌNH",
    "meaning": "cá kình, cá voi",
    "onyomi": [
      "げい"
    ],
    "kunyomi": [
      "くじら"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "ngư 魚 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "荘",
    "hanViet": "TRANG",
    "meaning": "trang trại, gia trang, họ Trang",
    "onyomi": [
      "そう",
      "しょう",
      "ちゃん"
    ],
    "kunyomi": [
      "ほうき",
      "おごそ.か"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thảo 艸 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "栽",
    "hanViet": "TÀI, TẢI",
    "meaning": "trồng trọt, cây",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拐",
    "hanViet": "QUẢI",
    "meaning": "kẻ dụ dỗ, cái gậy",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "冠",
    "hanViet": "QUAN, QUÁN",
    "meaning": "mũ, nón, cầm đầu mọi người",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "かんむり"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mịch 冖 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勲",
    "hanViet": "HUÂN",
    "meaning": "công lao, huân chương",
    "onyomi": [
      "くん"
    ],
    "kunyomi": [
      "いさお"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "lực 力 (+13 nét), hoả 火 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酬",
    "hanViet": "THÙ",
    "meaning": "mời rượu, đền đáp lại",
    "onyomi": [
      "しゅう",
      "しゅ",
      "とう"
    ],
    "kunyomi": [
      "むく.いる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "dậu 酉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紋",
    "hanViet": "VĂN, VẤN",
    "meaning": "đường, vết, vằn, nếp nhăn",
    "onyomi": [
      "もん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "卸",
    "hanViet": "TÁ",
    "meaning": "tháo, cởi",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "おろ.す",
      "おろし",
      "おろ.し"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tiết 卩 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "欄",
    "hanViet": "LAN",
    "meaning": "lan can",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "てすり"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "mộc 木 (+17 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逸",
    "hanViet": "DẬT",
    "meaning": "lầm lỗi, ẩn dật, nhàn rỗi",
    "onyomi": [
      "いつ"
    ],
    "kunyomi": [
      "そ.れる",
      "そ.らす",
      "はぐ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sước 辵 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尚",
    "hanViet": "THƯỢNG",
    "meaning": "vẫn còn, ưa chuộng",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "なお"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "tiểu 小 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "顕",
    "hanViet": "HIỂN",
    "meaning": "Appear, Existing",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "あきらか",
      "あらわ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "粛",
    "hanViet": "TÚC",
    "meaning": "Solemn, Quietly, Softly",
    "onyomi": [
      "しゅく",
      "すく"
    ],
    "kunyomi": [
      "つつし.む"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mễ 米 (+5 nét), duật 聿 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "愚",
    "hanViet": "NGU",
    "meaning": "ngu đần",
    "onyomi": [
      "ぐ"
    ],
    "kunyomi": [
      "おろ.か"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "庶",
    "hanViet": "THỨ",
    "meaning": "nhiều, chi thứ (trong dòng họ), con thứ",
    "onyomi": [
      "しょ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nghiễm 广 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "践",
    "hanViet": "TIỄN",
    "meaning": "giẫm lên, thực hiện, thi hành",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "ふ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "túc 足 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "呈",
    "hanViet": "TRÌNH",
    "meaning": "trình ra, đưa ra, dâng lên",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "疎",
    "hanViet": "SƠ, SỚ",
    "meaning": "thông suốt, không thân thiết, họ xa, sơ xuất, xao nhãng",
    "onyomi": [
      "そ",
      "しょ"
    ],
    "kunyomi": [
      "うと.い",
      "うと.む",
      "まば.ら"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "sơ 疋 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "疾",
    "hanViet": "TẬT",
    "meaning": "bệnh tật",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "はや.い"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nạch 疒 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謡",
    "hanViet": "DAO",
    "meaning": "tin đồn, lời đồn đại, ca dao",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "うた.い",
      "うた.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鎌",
    "hanViet": "LIÊM",
    "meaning": "cái liềm, lưỡi liềm",
    "onyomi": [
      "れん",
      "けん"
    ],
    "kunyomi": [
      "かま"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "kim 金 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酷",
    "hanViet": "KHỐC",
    "meaning": "tàn khốc, tàn ác, rượu nồng",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [
      "ひど.い"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "dậu 酉 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "叙",
    "hanViet": "TỰ",
    "meaning": "thuật lại, kể lại",
    "onyomi": [
      "じょ"
    ],
    "kunyomi": [
      "つい.ず",
      "ついで"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "hựu 又 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "且",
    "hanViet": "THƯ, THẢ, TỒ",
    "meaning": "vừa, cứ",
    "onyomi": [
      "しょ",
      "そ",
      "しょう"
    ],
    "kunyomi": [
      "か.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nhất 一 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "痴",
    "hanViet": "SI",
    "meaning": "ngây ngô, ngớ ngẩn, bị điên, si, mê",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "し.れる",
      "おろか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nạch 疒 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "哺",
    "hanViet": "BU, BÔ, BỘ",
    "meaning": "bú sữa, bữa ăn quá trưa, xế chiều",
    "onyomi": [
      "ほ"
    ],
    "kunyomi": [
      "はぐく.む",
      "ふく.む"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "傲",
    "hanViet": "NGẠO",
    "meaning": "kiêu ngạo, ngạo nghễ, hỗn láo",
    "onyomi": [
      "ごう"
    ],
    "kunyomi": [
      "おご.る",
      "あなど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "茎",
    "hanViet": "HÀNH",
    "meaning": "thân cây cỏ, cái chuôi",
    "onyomi": [
      "けい",
      "きょう"
    ],
    "kunyomi": [
      "くき"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "悠",
    "hanViet": "DU",
    "meaning": "xa vời",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "伏",
    "hanViet": "BẶC, PHU, PHÚC, PHỤC",
    "meaning": "áp mặt vào, ẩn nấp, bái phục, tuân theo",
    "onyomi": [
      "ふく"
    ],
    "kunyomi": [
      "ふ.せる",
      "ふ.す"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鎮",
    "hanViet": "TRẤN",
    "meaning": "canh giữ",
    "onyomi": [
      "ちん"
    ],
    "kunyomi": [
      "しず.める",
      "しず.まる",
      "おさえ"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "kim 金 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奉",
    "hanViet": "BỔNG, PHỤNG",
    "meaning": "vâng chịu",
    "onyomi": [
      "ほう",
      "ぶ"
    ],
    "kunyomi": [
      "たてまつ.る",
      "まつ.る",
      "ほう.ずる"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đại 大 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憂",
    "hanViet": "ƯU",
    "meaning": "lo âu, lo lắng",
    "onyomi": [
      "ゆう"
    ],
    "kunyomi": [
      "うれ.える",
      "うれ.い",
      "う.い",
      "う.き"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "朴",
    "hanViet": "PHU, PHÁC",
    "meaning": "cây phác (vỏ dùng làm thuốc), chất phác",
    "onyomi": [
      "ぼく"
    ],
    "kunyomi": [
      "ほう",
      "ほお",
      "えのき"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "mộc 木 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "栃",
    "hanViet": "LỆ",
    "meaning": "Horse Chestnut, (kokuji)",
    "onyomi": [],
    "kunyomi": [
      "とち"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "惜",
    "hanViet": "TÍCH",
    "meaning": "tiếc nuối",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "お.しい",
      "お.しむ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "佳",
    "hanViet": "GIAI",
    "meaning": "đẹp, tốt",
    "onyomi": [
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 人 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "悼",
    "hanViet": "NẠO, ĐIỆU",
    "meaning": "thương tiếc, viếng người chết",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [
      "いた.む"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "該",
    "hanViet": "CAI",
    "meaning": "bao quát hết thảy, còn thiếu",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "赴",
    "hanViet": "PHÓ",
    "meaning": "đi đến, đến nơi",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "おもむ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tẩu 走 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "髄",
    "hanViet": "TUỶ",
    "meaning": "Marrow, Pith, Essence",
    "onyomi": [
      "ずい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "cốt 骨 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "傍",
    "hanViet": "BÀNG, BẠNG",
    "meaning": "một bên, bên cạnh, một bên",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "かたわ.ら",
      "わき",
      "おか-",
      "はた",
      "そば"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhân 人 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "累",
    "hanViet": "LOÃ, LUY, LUỴ, LUỸ",
    "meaning": "xâu liền, nối liền, dây to, bắt giam",
    "onyomi": [
      "るい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "癒",
    "hanViet": "DŨ",
    "meaning": "ốm khỏi",
    "onyomi": [
      "ゆ"
    ],
    "kunyomi": [
      "い.える",
      "いや.す",
      "い.やす"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "nạch 疒 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "郭",
    "hanViet": "QUÁCH",
    "meaning": "phía ngoài thành",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "くるわ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "ấp 邑 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尿",
    "hanViet": "NIẾU, NIỆU, TUY",
    "meaning": "nước giải, nước đái",
    "onyomi": [
      "にょう"
    ],
    "kunyomi": [
      "ゆばり",
      "いばり",
      "しと"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thi 尸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賓",
    "hanViet": "THẤN, TÂN",
    "meaning": "khách quý",
    "onyomi": [
      "ひん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "bối 貝 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虜",
    "hanViet": "LỖ",
    "meaning": "giặc giã, tù binh",
    "onyomi": [
      "りょ",
      "ろ"
    ],
    "kunyomi": [
      "とりこ",
      "とりく"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hô 虍 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憾",
    "hanViet": "HÁM, ĐẢM",
    "meaning": "ăn năn, hối hận",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "うら.む"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "tâm 心 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弥",
    "hanViet": "DI, MY",
    "meaning": "nước đầy, khắp, tràn đầy",
    "onyomi": [
      "み",
      "び"
    ],
    "kunyomi": [
      "や",
      "いや",
      "いよ.いよ",
      "わた.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "cung 弓 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "粗",
    "hanViet": "THÔ, THỐ",
    "meaning": "to, thô, sơ sài",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "あら.い",
      "あら-"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mễ 米 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "循",
    "hanViet": "TUẦN",
    "meaning": "noi, tuân theo",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "xích 彳 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凝",
    "hanViet": "NGƯNG",
    "meaning": "ngưng đọng",
    "onyomi": [
      "ぎょう"
    ],
    "kunyomi": [
      "こ.る",
      "こ.らす",
      "こご.らす",
      "こご.らせる",
      "こご.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "băng 冫 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "脊",
    "hanViet": "TÍCH",
    "meaning": "xương sống, cao và bằng",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "せ",
      "せい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhục 肉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "旦",
    "hanViet": "ĐÁN",
    "meaning": "buổi sớm",
    "onyomi": [
      "たん",
      "だん"
    ],
    "kunyomi": [
      "あき.らか",
      "あきら",
      "ただし",
      "あさ",
      "あした"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nhật 日 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "愉",
    "hanViet": "DU, THÂU",
    "meaning": "hài lòng",
    "onyomi": [
      "ゆ"
    ],
    "kunyomi": [
      "たの.しい",
      "たの.しむ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抹",
    "hanViet": "MẠT",
    "meaning": "bôi, xoa, trát, vòng qua",
    "onyomi": [
      "まつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "栓",
    "hanViet": "THUYÊN, XUYÊN",
    "meaning": "cái then cài cửa",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "那",
    "hanViet": "NA, NÁ, NẢ",
    "meaning": "nhiều, an nhàn, nào, gì (câu hỏi)",
    "onyomi": [
      "な",
      "だ"
    ],
    "kunyomi": [
      "なに",
      "なんぞ",
      "いかん"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "ấp 邑 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拍",
    "hanViet": "BÁC, PHÁCH",
    "meaning": "vỗ, đập, tát, vả",
    "onyomi": [
      "はく",
      "ひょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "猶",
    "hanViet": "DO, DỨU",
    "meaning": "con do (giống khỉ), vẫn còn",
    "onyomi": [
      "ゆう",
      "ゆ"
    ],
    "kunyomi": [
      "なお"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khuyển 犬 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宰",
    "hanViet": "TỂ",
    "meaning": "chúa tể, người đứng đầu, một chức quan thời phong kiến, làm thịt, mổ thịt, giết thịt",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寂",
    "hanViet": "TỊCH",
    "meaning": "yên tĩnh, hoang vắng",
    "onyomi": [
      "じゃく",
      "せき"
    ],
    "kunyomi": [
      "さび",
      "さび.しい",
      "さび.れる",
      "さみ.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "miên 宀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "縫",
    "hanViet": "PHÙNG, PHÚNG",
    "meaning": "may áo",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "ぬ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "呉",
    "hanViet": "NGÔ",
    "meaning": "nước Ngô, họ Ngô, rầm rĩ",
    "onyomi": [
      "ご"
    ],
    "kunyomi": [
      "く.れる",
      "くれ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凡",
    "hanViet": "HOÀN, PHÀM",
    "meaning": "thường, bình thường, tục, đại khái, chung",
    "onyomi": [
      "ぼん",
      "はん"
    ],
    "kunyomi": [
      "およ.そ",
      "おうよ.そ",
      "すべ.て"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "kỷ 几 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恭",
    "hanViet": "CUNG",
    "meaning": "kính cẩn, cung kính",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "うやうや.しい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "錯",
    "hanViet": "THÁC, THỐ",
    "meaning": "hòn đá mài, lẫn lộn, nhầm lẫn",
    "onyomi": [
      "さく",
      "しゃく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "穀",
    "hanViet": "CỐC",
    "meaning": "cây lương thực, thóc lúa, kê",
    "onyomi": [
      "こく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "hoà 禾 (+10 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "陵",
    "hanViet": "LĂNG",
    "meaning": "gò, đồi, mộ của vua, bỏ nát",
    "onyomi": [
      "りょう"
    ],
    "kunyomi": [
      "みささぎ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弊",
    "hanViet": "TIẾT, TẾ, TỆ",
    "meaning": "giả mạo, dối trá, có hại",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "củng 廾 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舶",
    "hanViet": "BẠC, BẠCH",
    "meaning": "thuyền lớn, thuyền lớn",
    "onyomi": [
      "はく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "chu 舟 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "窮",
    "hanViet": "CÙNG",
    "meaning": "cuối, hết",
    "onyomi": [
      "きゅう",
      "きょう"
    ],
    "kunyomi": [
      "きわ.める",
      "きわ.まる",
      "きわ.まり",
      "きわ.み"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "huyệt 穴 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "悦",
    "hanViet": "DUYỆT",
    "meaning": "đẹp lòng, vui thích",
    "onyomi": [
      "えつ"
    ],
    "kunyomi": [
      "よろこ.ぶ",
      "よろこ.ばす"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "縛",
    "hanViet": "PHƯỢC, PHỌC",
    "meaning": "trói buộc, ràng buộc",
    "onyomi": [
      "ばく"
    ],
    "kunyomi": [
      "しば.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "轄",
    "hanViet": "HẠT",
    "meaning": "cái chốt cho bánh xe không rời ra, cai quản",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [
      "くさび"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "xa 車 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弦",
    "hanViet": "HUYỀN",
    "meaning": "dây đàn, dây cung, trăng non",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "つる"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "cung 弓 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "窒",
    "hanViet": "CHẤT, TRẤT",
    "meaning": "tắc nghẽn, trở ngại",
    "onyomi": [
      "ちつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "huyệt 穴 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "洪",
    "hanViet": "HỒNG",
    "meaning": "lớn lao, mưa to, nước lũ",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thuỷ 水 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "摂",
    "hanViet": "NHIẾP",
    "meaning": "Vicarious, Surrogate, Act In Addition To",
    "onyomi": [
      "せつ",
      "しょう"
    ],
    "kunyomi": [
      "おさ.める",
      "かね.る",
      "と.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thủ 手 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "飽",
    "hanViet": "BÃO",
    "meaning": "no bụng, hạt gạo mẩy, đủ, nhiều, từng trải",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "あ.きる",
      "あ.かす",
      "あ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thực 食 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紳",
    "hanViet": "THÂN",
    "meaning": "cái đai áo, dải áo",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "庸",
    "hanViet": "DONG, DUNG",
    "meaning": "dùng, thường, ngu hèn",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nghiễm 广 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "搾",
    "hanViet": "TRÁ",
    "meaning": "bàn ép, chiết xuất",
    "onyomi": [
      "さく"
    ],
    "kunyomi": [
      "しぼ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thủ 手 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "碑",
    "hanViet": "BI",
    "meaning": "cái bia, đài bia, cột mốc, ca tụng",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "いしぶみ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thạch 石 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "尉",
    "hanViet": "UÝ, UẤT",
    "meaning": "cấp uý",
    "onyomi": [
      "い",
      "じょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thốn 寸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "匠",
    "hanViet": "TƯỢNG",
    "meaning": "người thợ, khéo, lành nghề",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "たくみ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "phương 匚 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賊",
    "hanViet": "TẶC",
    "meaning": "giặc, kẻ trộm",
    "onyomi": [
      "ぞく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "bối 貝 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鼓",
    "hanViet": "CỔ",
    "meaning": "cái trống, gảy đàn",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "つづみ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "cổ 鼓 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "旋",
    "hanViet": "TOÀN, TUYỀN",
    "meaning": "trở lại, quay lại, quay, xoay, xoáy, đi tiểu, tiểu tiện",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "め.ぐる",
      "いばり"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phương 方 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腸",
    "hanViet": "TRÀNG, TRƯỜNG",
    "meaning": "ruột, ruột",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "はらわた",
      "わた"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhục 肉 (+9 nét)",
    "grade": "Lớp 4"
  },
  {
    "kanji": "槽",
    "hanViet": "TÀO",
    "meaning": "cái máng cho muông thú ăn, cái gác dây đàn tỳ bà, cao hai bên, trũng ở giữa",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "ふね"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "mộc 木 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "伐",
    "hanViet": "PHẠT",
    "meaning": "chinh phạt, chặt",
    "onyomi": [
      "ばつ",
      "はつ",
      "か",
      "ぼち"
    ],
    "kunyomi": [
      "き.る",
      "そむ.く",
      "う.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nhân 人 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漬",
    "hanViet": "TÍ, TÝ",
    "meaning": "ngâm, tẩm, thấm",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "つ.ける",
      "つ.かる",
      "-づ.け",
      "-づけ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "坪",
    "hanViet": "BÌNH",
    "meaning": "chỗ đất bằng phẳng",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "つぼ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thổ 土 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紺",
    "hanViet": "CÁM",
    "meaning": "xanh biếc",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mịch 糸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "羅",
    "hanViet": "LA",
    "meaning": "vải lụa, cái lưới, bày biện",
    "onyomi": [
      "ら"
    ],
    "kunyomi": [
      "うすもの"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "võng 网 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "峡",
    "hanViet": "GIÁP, HIỆP, HẠP",
    "meaning": "eo đất, eo biển, eo đất, eo biển",
    "onyomi": [
      "きょう",
      "こう"
    ],
    "kunyomi": [
      "はざま"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "sơn 山 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "俸",
    "hanViet": "BỔNG",
    "meaning": "bổng lộc",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "醸",
    "hanViet": "NHƯỠNG",
    "meaning": "Brew, Cause",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [
      "かも.す"
    ],
    "jlpt": "N1",
    "strokeCount": 20,
    "radical": "dậu 酉 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弔",
    "hanViet": "ĐIẾU, ĐÍCH",
    "meaning": "viếng người chết, treo ngược, đến",
    "onyomi": [
      "ちょう"
    ],
    "kunyomi": [
      "とむら.う",
      "とぶら.う"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "cung 弓 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "乙",
    "hanViet": "ẤT",
    "meaning": "Ất (ngôi thứ hai thuộc hàng Can), bộ ất",
    "onyomi": [
      "おつ",
      "いつ"
    ],
    "kunyomi": [
      "おと-",
      "きのと"
    ],
    "jlpt": "N1",
    "strokeCount": 1,
    "radical": "ất 乙 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遍",
    "hanViet": "BIẾN",
    "meaning": "khắp nơi, lần, lượt, bận",
    "onyomi": [
      "へん"
    ],
    "kunyomi": [
      "あまね.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "sước 辵 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "衡",
    "hanViet": "HOÀNH, HÀNH",
    "meaning": "cái cân, cân đồ vật",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "hành 行 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "款",
    "hanViet": "KHOẢN",
    "meaning": "thành thực, thết đãi, đón tiếp, khoản mục",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khiếm 欠 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "閲",
    "hanViet": "DUYỆT",
    "meaning": "Review, Inspection, Revision",
    "onyomi": [
      "えつ"
    ],
    "kunyomi": [
      "けみ.する"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "môn 門 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "喝",
    "hanViet": "HÁT, HẠT, ÁI, ỚI",
    "meaning": "quát mắng, uống",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "敢",
    "hanViet": "CẢM",
    "meaning": "gan dạ, dám, bạo dạn",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [
      "あ.えて",
      "あ.えない",
      "あ.えず"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "phác 攴 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "膜",
    "hanViet": "MÔ, MẠC",
    "meaning": "màng da, cúng bái, màng da",
    "onyomi": [
      "まく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nhục 肉 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "盲",
    "hanViet": "MANH, VỌNG",
    "meaning": "mù loà",
    "onyomi": [
      "もう"
    ],
    "kunyomi": [
      "めくら"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "mục 目 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "胎",
    "hanViet": "THAI",
    "meaning": "cái thai, bào thai, có thai, có mang, có chửa",
    "onyomi": [
      "たい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhục 肉 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酵",
    "hanViet": "DIẾU, GIÁO",
    "meaning": "men rượu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "dậu 酉 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堕",
    "hanViet": "HUY, ĐOẠ",
    "meaning": "rơi xuống, đổ, đổ nát",
    "onyomi": [
      "だ"
    ],
    "kunyomi": [
      "お.ちる",
      "くず.す",
      "くず.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遮",
    "hanViet": "GIÀ",
    "meaning": "che lấp, ngăn trở",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [
      "さえぎ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "sước 辵 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凸",
    "hanViet": "ĐỘT",
    "meaning": "lồi, nhô ra, gồ lên",
    "onyomi": [
      "とつ"
    ],
    "kunyomi": [
      "でこ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "khảm 凵 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凹",
    "hanViet": "AO",
    "meaning": "lõm vào",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "くぼ.む",
      "へこ.む",
      "ぼこ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "khảm 凵 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瑠",
    "hanViet": "LƯU",
    "meaning": "(xem: lưu ly 琉璃)",
    "onyomi": [
      "る",
      "りゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "ngọc 玉 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "硫",
    "hanViet": "LƯU",
    "meaning": "(xem: lưu hoàng, lưu huỳnh 硫黃)",
    "onyomi": [
      "りゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thạch 石 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "赦",
    "hanViet": "XÁ",
    "meaning": "tha tội",
    "onyomi": [
      "しゃ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "xích 赤 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "窃",
    "hanViet": "THIẾT",
    "meaning": "ăn cắp, ăn trộm",
    "onyomi": [
      "せつ"
    ],
    "kunyomi": [
      "ぬす.む",
      "ひそ.か"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "huyệt 穴 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慨",
    "hanViet": "KHÁI",
    "meaning": "tức giận, căm phẫn, than thở, hào hiệp, khảng khái",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "扶",
    "hanViet": "BỒ, PHÙ",
    "meaning": "nâng đỡ, giúp đỡ",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "たす.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "戯",
    "hanViet": "HÍ, HÝ",
    "meaning": "Frolic, Play, Sport",
    "onyomi": [
      "ぎ",
      "げ"
    ],
    "kunyomi": [
      "たわむ.れる",
      "ざ.れる",
      "じゃ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "qua 戈 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "忌",
    "hanViet": "KÍ, KÝ, KỊ, KỴ",
    "meaning": "ghét",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "い.む",
      "い.み",
      "い.まわしい"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "tâm 心 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "濁",
    "hanViet": "TRẠC, TRỌC",
    "meaning": "đục (nước)",
    "onyomi": [
      "だく",
      "じょく"
    ],
    "kunyomi": [
      "にご.る",
      "にご.す"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thuỷ 水 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "奔",
    "hanViet": "BÔN, PHẪN",
    "meaning": "lồng lên, chạy vội, thua chạy, chạy trốn, vội vàng",
    "onyomi": [
      "ほん"
    ],
    "kunyomi": [
      "はし.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đại 大 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肖",
    "hanViet": "TIÊU, TIẾU",
    "meaning": "suy vong, mất, thất tán",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "あやか.る"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhục 肉 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "朽",
    "hanViet": "HỦ",
    "meaning": "gỗ mục",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "く.ちる"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "mộc 木 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殻",
    "hanViet": "XÁC",
    "meaning": "vỏ cứng",
    "onyomi": [
      "かく",
      "こく",
      "ばい"
    ],
    "kunyomi": [
      "から",
      "がら"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thù 殳 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "享",
    "hanViet": "HƯỞNG",
    "meaning": "dâng đồ, hưởng thụ",
    "onyomi": [
      "きょう",
      "こう"
    ],
    "kunyomi": [
      "う.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đầu 亠 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "藩",
    "hanViet": "PHAN, PHIÊN",
    "meaning": "bờ rào",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thảo 艸 (+15 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "媒",
    "hanViet": "MÔI",
    "meaning": "người làm mối, môi giới",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "なこうど"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nữ 女 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鶏",
    "hanViet": "KÊ",
    "meaning": "Chicken",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "にわとり",
      "とり"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "điểu 鳥 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嘱",
    "hanViet": "CHÚC",
    "meaning": "dặn dò",
    "onyomi": [
      "しょく"
    ],
    "kunyomi": [
      "しょく.する",
      "たの.む"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "khẩu 口 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "迭",
    "hanViet": "TUYỂN, ĐIỆT",
    "meaning": "thay phiên, lần lượt, xân lấn",
    "onyomi": [
      "てつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "sước 辵 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "椎",
    "hanViet": "CHUY, CHUỲ, TRUỲ",
    "meaning": "nện, đánh",
    "onyomi": [
      "つい",
      "すい"
    ],
    "kunyomi": [
      "つち",
      "う.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "絹",
    "hanViet": "QUYÊN",
    "meaning": "vải lụa",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "きぬ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mịch 糸 (+7 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "陪",
    "hanViet": "BỒI",
    "meaning": "theo bên, tiếp khách",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "phụ 阜 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剖",
    "hanViet": "PHẪU",
    "meaning": "mổ, giải phẫu, trình bày rõ ràng",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "đao 刀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "譜",
    "hanViet": "PHẢ, PHỔ",
    "meaning": "phả chép phân chia thứ tự, khúc nhạc, phả chép phân chia thứ tự",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "ngôn 言 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "淑",
    "hanViet": "THỤC",
    "meaning": "hiền lành",
    "onyomi": [
      "しゅく"
    ],
    "kunyomi": [
      "しと.やか"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "帆",
    "hanViet": "PHÀM, PHÂM",
    "meaning": "cánh buồm",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "ほ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "cân 巾 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憤",
    "hanViet": "PHẤN, PHẪN",
    "meaning": "tức giận, cáu",
    "onyomi": [
      "ふん"
    ],
    "kunyomi": [
      "いきどお.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酌",
    "hanViet": "CHƯỚC",
    "meaning": "rót rượu, uống rượu",
    "onyomi": [
      "しゃく"
    ],
    "kunyomi": [
      "く.む"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "dậu 酉 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "暁",
    "hanViet": "HIỂU",
    "meaning": "Daybreak, Dawn, In The Event",
    "onyomi": [
      "ぎょう",
      "きょう"
    ],
    "kunyomi": [
      "あかつき",
      "さと.る"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhật 日 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "傑",
    "hanViet": "KIỆT",
    "meaning": "giỏi giang (trong tuấn kiệt)",
    "onyomi": [
      "けつ"
    ],
    "kunyomi": [
      "すぐ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhân 人 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "錠",
    "hanViet": "ĐĨNH",
    "meaning": "thoi vàng, thoi bạc, con thoi dệt vải",
    "onyomi": [
      "じょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "璃",
    "hanViet": "LI, LY, LÊ",
    "meaning": "(xem: pha ly 玻璃, lưu ly 琉璃), (xem: pha ly 玻璃, lưu ly 琉璃)",
    "onyomi": [
      "り"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngọc 玉 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遷",
    "hanViet": "THIÊN",
    "meaning": "thay đổi, di dời",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "うつ.る",
      "うつ.す",
      "みやこがえ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "sước 辵 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拙",
    "hanViet": "CHUYẾT",
    "meaning": "vụng về",
    "onyomi": [
      "せつ"
    ],
    "kunyomi": [
      "つたな.い"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "峠",
    "hanViet": "CA, KHẢI, SÁ, TẠP",
    "meaning": "Mountain Peak, Mountain Pass, Climax",
    "onyomi": [],
    "kunyomi": [
      "とうげ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "sơn 山 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "篤",
    "hanViet": "ĐỐC",
    "meaning": "dốc sức, dốc lòng",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [
      "あつ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "trúc 竹 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "叔",
    "hanViet": "THÚC",
    "meaning": "chú ruột, cậu ruột, tiếng anh gọi em trai",
    "onyomi": [
      "しゅく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "hựu 又 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "雌",
    "hanViet": "THƯ",
    "meaning": "con chim mái",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "め-",
      "めす",
      "めん"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "chuy 隹 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堪",
    "hanViet": "KHAM",
    "meaning": "chịu đựng, chịu được",
    "onyomi": [
      "かん",
      "たん"
    ],
    "kunyomi": [
      "た.える",
      "たま.る",
      "こら.える",
      "こた.える"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thổ 土 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "吟",
    "hanViet": "NGÂM",
    "meaning": "ngâm thơ",
    "onyomi": [
      "ぎん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "khẩu 口 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "甚",
    "hanViet": "THẬM",
    "meaning": "rất",
    "onyomi": [
      "じん"
    ],
    "kunyomi": [
      "はなは.だ",
      "はなは.だしい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "cam 甘 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "崇",
    "hanViet": "SÙNG",
    "meaning": "cao, tôn sùng",
    "onyomi": [
      "すう"
    ],
    "kunyomi": [
      "あが.める"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "sơn 山 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漆",
    "hanViet": "THẾ, TẤT",
    "meaning": "sông Tất, quét sơn, cây sơn",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "うるし"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "岬",
    "hanViet": "GIÁP",
    "meaning": "vệ núi, mũi đất (ở biển)",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "みさき"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "sơn 山 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "紡",
    "hanViet": "PHƯỞNG",
    "meaning": "xe thành sợi",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "つむ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 糸 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "礁",
    "hanViet": "TIÊU, TIỀU",
    "meaning": "đá ngầm, san hô, đá ngầm",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "thạch 石 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "屯",
    "hanViet": "TRUÂN, ĐỒN",
    "meaning": "khó khăn, gian nan, truân chuyên, đồn bốt, đống đất",
    "onyomi": [
      "とん"
    ],
    "kunyomi": [
      "たむろ"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "triệt 屮 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "姻",
    "hanViet": "NHÂN",
    "meaning": "nhà trai (trong đám cưới), bố chồng",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nữ 女 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "擬",
    "hanViet": "NGHĨ",
    "meaning": "định, phỏng theo",
    "onyomi": [
      "ぎ"
    ],
    "kunyomi": [
      "まが.い",
      "もど.き"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "thủ 手 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "睦",
    "hanViet": "MỤC",
    "meaning": "hoà kính, tin, thân",
    "onyomi": [
      "ぼく",
      "もく"
    ],
    "kunyomi": [
      "むつ.まじい",
      "むつ.む",
      "むつ.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mục 目 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "閑",
    "hanViet": "NHÀN",
    "meaning": "nhàn hạ, rảnh rỗi",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "môn 門 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "曹",
    "hanViet": "TÀO",
    "meaning": "hai bên nguyên bị (trong vụ kiện), nước Tào",
    "onyomi": [
      "そう",
      "ぞう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "viết 曰 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詠",
    "hanViet": "VỊNH",
    "meaning": "vịnh thơ",
    "onyomi": [
      "えい"
    ],
    "kunyomi": [
      "よ.む",
      "うた.う"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "卑",
    "hanViet": "TI, TY",
    "meaning": "thấp, hèn kém",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "いや.しい",
      "いや.しむ",
      "いや.しめる"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thập 十 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "侮",
    "hanViet": "HỐI, VŨ",
    "meaning": "khinh nhờn, kẻ lấn áp",
    "onyomi": [
      "ぶ"
    ],
    "kunyomi": [
      "あなど.る",
      "あなず.る"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "鋳",
    "hanViet": "CHÚ",
    "meaning": "Casting, Mint",
    "onyomi": [
      "ちゅう",
      "い",
      "しゅ",
      "しゅう"
    ],
    "kunyomi": [
      "い.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "kim 金 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蔑",
    "hanViet": "MIỆT",
    "meaning": "máu bẩn, tất (đi vào chân)",
    "onyomi": [
      "べつ"
    ],
    "kunyomi": [
      "ないがしろ",
      "なみ.する",
      "くらい",
      "さげす.む"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thảo 艸 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "胆",
    "hanViet": "ĐÀN, ĐẢM",
    "meaning": "quả mật",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "きも"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhục 肉 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "浪",
    "hanViet": "LANG, LÃNG",
    "meaning": "con sóng, con sóng",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thuỷ 水 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "禍",
    "hanViet": "HOẠ",
    "meaning": "tai hoạ, tai vạ",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "わざわい"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kỳ 示 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "酪",
    "hanViet": "LẠC",
    "meaning": "cô đặc sữa",
    "onyomi": [
      "らく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "dậu 酉 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憧",
    "hanViet": "SUNG, TRÁNG, XUNG",
    "meaning": "phân vân",
    "onyomi": [
      "しょう",
      "とう",
      "どう"
    ],
    "kunyomi": [
      "あこが.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慶",
    "hanViet": "KHANH, KHÁNH, KHƯƠNG",
    "meaning": "mừng, chúc mừng",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "よろこ.び"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "亜",
    "hanViet": "A, Á",
    "meaning": "thứ hai, châu Á",
    "onyomi": [
      "あ"
    ],
    "kunyomi": [
      "つ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhị 二 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "汰",
    "hanViet": "THÁI, THẢI",
    "meaning": "quá mức, thải đi, bỏ đi, quá mức",
    "onyomi": [
      "た",
      "たい"
    ],
    "kunyomi": [
      "おご.る",
      "にご.る",
      "よな.げる"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沙",
    "hanViet": "SA, SÁ",
    "meaning": "cát, bãi cát, khàn, đục, tiếng rè rè, tiếng khàn",
    "onyomi": [
      "さ",
      "しゃ"
    ],
    "kunyomi": [
      "すな",
      "よなげる"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逝",
    "hanViet": "THỆ",
    "meaning": "trôi qua, đi không trở lại, chết, tạ thế",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "ゆ.く",
      "い.く"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "匿",
    "hanViet": "NẶC",
    "meaning": "giấu kín",
    "onyomi": [
      "とく"
    ],
    "kunyomi": [
      "かくま.う"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "hễ 匸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "寡",
    "hanViet": "QUẢ",
    "meaning": "ít, suông, nhạt nhẽo, goá chồng, quả phụ",
    "onyomi": [
      "か"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "miên 宀 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "痢",
    "hanViet": "LỊ",
    "meaning": "bệnh kiết lị",
    "onyomi": [
      "り"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nạch 疒 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "坑",
    "hanViet": "KHANH",
    "meaning": "cái hố, đường hầm, hãm hại",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thổ 土 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "藍",
    "hanViet": "LAM",
    "meaning": "màu xanh lam, cây chàm",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "あい"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thảo 艸 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畔",
    "hanViet": "BẠN",
    "meaning": "bờ",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "あぜ",
      "くろ",
      "ほとり"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "điền 田 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唄",
    "hanViet": "BÁI, BẠI, BỐI",
    "meaning": "tụng kinh",
    "onyomi": [
      "ばい"
    ],
    "kunyomi": [
      "うた",
      "うた.う"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "khẩu 口 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拷",
    "hanViet": "KHẢO",
    "meaning": "đánh tra khảo, tra tấn",
    "onyomi": [
      "ごう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "渓",
    "hanViet": "HOÁT, KHÊ",
    "meaning": "Mountain Stream, Valley",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "たに",
      "たにがわ"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "廉",
    "hanViet": "LIÊM",
    "meaning": "góc, cạnh, thanh liêm",
    "onyomi": [
      "れん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nghiễm 广 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謹",
    "hanViet": "CẨN",
    "meaning": "cẩn thận, không sơ suất",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [
      "つつし.む"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngôn 言 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "湧",
    "hanViet": "DŨNG",
    "meaning": "sóng lớn",
    "onyomi": [
      "ゆう",
      "よう",
      "ゆ"
    ],
    "kunyomi": [
      "わ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thuỷ 水 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "醜",
    "hanViet": "XÚ",
    "meaning": "xấu xa",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "みにく.い",
      "しこ"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "dậu 酉 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "升",
    "hanViet": "THĂNG",
    "meaning": "bay lên, cái thưng, thưng, thăng (đơn vị đo)",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "ます"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "thập 十 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "殉",
    "hanViet": "TUẪN, TUẬN",
    "meaning": "chết theo người khác",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "ngạt 歹 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "煩",
    "hanViet": "PHIỀN",
    "meaning": "buồn rầu, phiền muộn",
    "onyomi": [
      "はん",
      "ぼん"
    ],
    "kunyomi": [
      "わずら.う",
      "わずら.わす",
      "うるさ.がる",
      "うるさ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hoả 火 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "劾",
    "hanViet": "HẶC",
    "meaning": "hạch tội",
    "onyomi": [
      "がい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "lực 力 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "桟",
    "hanViet": "CHĂN, SẠN, TRẢN, TRĂN, XIỄN",
    "meaning": "Scaffold, Cleat, Frame",
    "onyomi": [
      "さん",
      "せん"
    ],
    "kunyomi": [
      "かけはし"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "婿",
    "hanViet": "TẾ",
    "meaning": "con rể",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "むこ"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nữ 女 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慕",
    "hanViet": "MỘ",
    "meaning": "yêu mến",
    "onyomi": [
      "ぼ"
    ],
    "kunyomi": [
      "した.う"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "tâm 心 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "罷",
    "hanViet": "BÃI, BÌ",
    "meaning": "ngừng, thôi, nghỉ, bãi, bỏ, xong",
    "onyomi": [
      "ひ"
    ],
    "kunyomi": [
      "まか.り-",
      "や.める"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "võng 网 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "矯",
    "hanViet": "KIỂU",
    "meaning": "nắn thẳng ra",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "た.める"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "thỉ 矢 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "某",
    "hanViet": "MỖ",
    "meaning": "(dùng làm tiếng đệm khi xưng hô)",
    "onyomi": [
      "ぼう"
    ],
    "kunyomi": [
      "それがし",
      "なにがし"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "囚",
    "hanViet": "TÙ",
    "meaning": "tù, giam giữ",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "とら.われる"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "vi 囗 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "泌",
    "hanViet": "BÍ",
    "meaning": "sông Bí",
    "onyomi": [
      "ひつ",
      "ひ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thuỷ 水 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "漸",
    "hanViet": "TIÊM, TIỀM, TIỆM",
    "meaning": "nhúng vào nước, thấm, tẩm, dần dần",
    "onyomi": [
      "ぜん"
    ],
    "kunyomi": [
      "ようや.く",
      "やや",
      "ようよ.う",
      "すす.む"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thuỷ 水 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "藻",
    "hanViet": "TẢO",
    "meaning": "rong, rêu",
    "onyomi": [
      "そう"
    ],
    "kunyomi": [
      "も"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "thảo 艸 (+16 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妄",
    "hanViet": "VONG, VÔ, VỌNG",
    "meaning": "viển vông, xa vời, ngông, lung tung, ẩu, sằng bậy",
    "onyomi": [
      "もう",
      "ぼう"
    ],
    "kunyomi": [
      "みだ.りに"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "nữ 女 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蛮",
    "hanViet": "MAN",
    "meaning": "thô lỗ, ngang ngạnh, rất, lắm",
    "onyomi": [
      "ばん"
    ],
    "kunyomi": [
      "えびす"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "trùng 虫 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "倹",
    "hanViet": "KIỆM",
    "meaning": "tiết kiệm",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "つま.しい",
      "つづまやか"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "挨",
    "hanViet": "AI, ẢI",
    "meaning": "sát, liền, kề, lần lượt, từng cái một, chạm vào, sờ vào",
    "onyomi": [
      "あい"
    ],
    "kunyomi": [
      "ひら.く"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宛",
    "hanViet": "UYÊN, UYỂN",
    "meaning": "nhỏ bé",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "あ.てる",
      "-あて",
      "-づつ",
      "あたか.も"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "miên 宀 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畏",
    "hanViet": "UÝ",
    "meaning": "sợ sệt",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "おそ.れる",
      "かしこま.る",
      "かしこ",
      "かしこ.し"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "điền 田 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "萎",
    "hanViet": "NUY, UY, UỶ",
    "meaning": "khô héo, (xem: nuy nhuy 萎蕤), khô héo",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "な",
      "しお.れる",
      "しな.びる",
      "しぼ.む",
      "な.える"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thảo 艸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "壱",
    "hanViet": "NHẤT",
    "meaning": "One (in Documents)",
    "onyomi": [
      "いち",
      "いつ"
    ],
    "kunyomi": [
      "ひとつ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "sĩ 士 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "咽",
    "hanViet": "YÊN, YẾN, YẾT, ÂN, Ế",
    "meaning": "nuốt xuống, cuống họng, cổ họng, nghẹn cổ không nói được",
    "onyomi": [
      "いん",
      "えん",
      "えつ"
    ],
    "kunyomi": [
      "むせ.ぶ",
      "むせ.る",
      "のど",
      "の.む"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "khẩu 口 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "淫",
    "hanViet": "DÂM",
    "meaning": "quá mức, quá thừa, buông thả, bừa bãi",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [
      "ひた.す",
      "ほしいまま",
      "みだ.ら",
      "みだ.れる",
      "みだり"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thuỷ 水 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "韻",
    "hanViet": "VẬN",
    "meaning": "vần, phong nhã",
    "onyomi": [
      "いん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "âm 音 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "臼",
    "hanViet": "CỮU",
    "meaning": "cái cối để giã",
    "onyomi": [
      "きゅう",
      "ぐ"
    ],
    "kunyomi": [
      "うす",
      "うすづ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "cữu 臼 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "餌",
    "hanViet": "NHĨ, NHỊ",
    "meaning": "bánh bột, mồi câu cá",
    "onyomi": [
      "じ",
      "に"
    ],
    "kunyomi": [
      "え",
      "えば",
      "えさ",
      "もち"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thực 食 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謁",
    "hanViet": "YẾT",
    "meaning": "yết kiến, hầu chuyện, bảo, cáo, danh thiếp",
    "onyomi": [
      "えつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "怨",
    "hanViet": "OÁN, UẨN",
    "meaning": "oán trách, giận",
    "onyomi": [
      "えん",
      "おん",
      "うん"
    ],
    "kunyomi": [
      "うら.む",
      "うらみ",
      "うら.めしい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "tâm 心 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "艶",
    "hanViet": "DIỄM",
    "meaning": "đẹp đẽ, tươi đẹp, con gái đẹp, chuyện tình yêu",
    "onyomi": [
      "えん"
    ],
    "kunyomi": [
      "つや",
      "なま.めかしい",
      "あで.やか",
      "つや.めく",
      "なま.めく"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "sắc 色 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "旺",
    "hanViet": "VƯỢNG",
    "meaning": "thịnh vượng, nở rộ (hoa)",
    "onyomi": [
      "おう",
      "きょう",
      "ごう"
    ],
    "kunyomi": [
      "かがや.き",
      "うつくし.い",
      "さかん"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhật 日 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "翁",
    "hanViet": "ÔNG",
    "meaning": "ông cụ",
    "onyomi": [
      "おう"
    ],
    "kunyomi": [
      "おきな"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "vũ 羽 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "臆",
    "hanViet": "ỨC",
    "meaning": "ngực",
    "onyomi": [
      "おく",
      "よく"
    ],
    "kunyomi": [
      "むね",
      "おくする"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "nhục 肉 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "箇",
    "hanViet": "CÁ",
    "meaning": "cái, quả, con",
    "onyomi": [
      "か",
      "こ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "trúc 竹 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "苛",
    "hanViet": "HA, HÀ, KHA",
    "meaning": "khắt khe",
    "onyomi": [
      "か"
    ],
    "kunyomi": [
      "いじ.める",
      "さいな.む",
      "いらだ.つ",
      "からい",
      "こまかい"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thảo 艸 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蓋",
    "hanViet": "CÁI, HẠP",
    "meaning": "che, đậy, trùm lên",
    "onyomi": [
      "がい",
      "かい",
      "こう"
    ],
    "kunyomi": [
      "ふた",
      "けだ.し",
      "おお.う",
      "かさ",
      "かこう"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thảo 艸 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "骸",
    "hanViet": "HÀI",
    "meaning": "xương đùi, hình hài",
    "onyomi": [
      "がい",
      "かい"
    ],
    "kunyomi": [
      "むくろ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "cốt 骨 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柿",
    "hanViet": "SĨ, THỊ",
    "meaning": "cây hồng, quả hồng, cây thị",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "かき"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嚇",
    "hanViet": "HÁCH",
    "meaning": "dọa nạt, đe doạ",
    "onyomi": [
      "かく"
    ],
    "kunyomi": [
      "おど.す"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "khẩu 口 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "顎",
    "hanViet": "NGẠC",
    "meaning": "hàm, quai hàm",
    "onyomi": [
      "がく"
    ],
    "kunyomi": [
      "あご",
      "あぎと"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "hiệt 頁 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "葛",
    "hanViet": "CÁT",
    "meaning": "cây sắn dây, vải dệt bằng vỏ sắn dây, bối rối",
    "onyomi": [
      "かつ",
      "かち"
    ],
    "kunyomi": [
      "つづら",
      "くず"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thảo 艸 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "褐",
    "hanViet": "CÁT, HẠT",
    "meaning": "áo vải to, áo vải to",
    "onyomi": [
      "かつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "y 衣 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "釜",
    "hanViet": "PHỦ",
    "meaning": "cái nồi, chảo",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "かま"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "kim 金 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瓦",
    "hanViet": "NGOÁ, NGOÃ",
    "meaning": "ngói",
    "onyomi": [
      "が"
    ],
    "kunyomi": [
      "かわら",
      "ぐらむ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "ngoã 瓦 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "棺",
    "hanViet": "QUAN, QUÁN",
    "meaning": "áo quan (cho người chết)",
    "onyomi": [
      "かん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "mộc 木 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "玩",
    "hanViet": "NGOẠN",
    "meaning": "chơi đùa",
    "onyomi": [
      "がん"
    ],
    "kunyomi": [
      "もちあそ.ぶ",
      "もてあそ.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "ngọc 玉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畿",
    "hanViet": "KÌ, KỲ",
    "meaning": "ở trong cửa",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "みやこ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "điền 田 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "僅",
    "hanViet": "CẨN, CẬN",
    "meaning": "chỉ, ít ỏi, vẻn vẹn, chỉ, ít ỏi, vẻn vẹn",
    "onyomi": [
      "きん",
      "ごん"
    ],
    "kunyomi": [
      "わず.か"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nhân 人 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斤",
    "hanViet": "CÂN, CẤN",
    "meaning": "cái rìu, cân (đơn vị khối lượng)",
    "onyomi": [
      "きん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "cân 斤 (+0 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "虞",
    "hanViet": "NGU",
    "meaning": "dự liệu, tính toán trước, yên vui, họ Ngu, nước Ngu, đời nhà Ngu",
    "onyomi": [
      "ぐ"
    ],
    "kunyomi": [
      "おそれ",
      "おもんぱか.る",
      "はか.る",
      "うれ.える",
      "あざむ.く",
      "あやま.る",
      "のぞ.む",
      "たの.しむ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hô 虍 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "串",
    "hanViet": "QUÁN, XUYẾN",
    "meaning": "suốt, xâu, chuỗi",
    "onyomi": [
      "かん",
      "けん",
      "せん"
    ],
    "kunyomi": [
      "くし",
      "つらぬ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "cổn 丨 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "窟",
    "hanViet": "QUẬT",
    "meaning": "cái hang, nhà hầm",
    "onyomi": [
      "くつ",
      "こつ"
    ],
    "kunyomi": [
      "いわや",
      "いはや",
      "あな"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "huyệt 穴 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "薫",
    "hanViet": "HUÂN",
    "meaning": "Send Forth Fragrance, Fragrant, Be Scented",
    "onyomi": [
      "くん"
    ],
    "kunyomi": [
      "かお.る"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thảo 艸 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "稽",
    "hanViet": "KHỂ, KÊ",
    "meaning": "lạy, dập đầu, xem xét, suy xét, cãi cọ",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "かんが.える",
      "とど.める"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "hoà 禾 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詣",
    "hanViet": "NGHỆ",
    "meaning": "đến tận nơi",
    "onyomi": [
      "けい",
      "げい"
    ],
    "kunyomi": [
      "けい.する",
      "まい.る",
      "いた.る",
      "もう.でる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "桁",
    "hanViet": "HÀNG, HÀNH, HÃNG",
    "meaning": "cái dầm gỗ, cái cùm to",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "けた"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mộc 木 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "舷",
    "hanViet": "HUYỀN",
    "meaning": "mạn thuyền",
    "onyomi": [
      "げん"
    ],
    "kunyomi": [
      "ふなばた",
      "ふなべり"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "chu 舟 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "股",
    "hanViet": "CỔ",
    "meaning": "nét dọc",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "また",
      "もも"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "乞",
    "hanViet": "KHÍ, KHẤT",
    "meaning": "kẻ ăn mày, người ăn xin",
    "onyomi": [
      "こつ",
      "きつ",
      "き",
      "きけ",
      "こち"
    ],
    "kunyomi": [
      "こ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 3,
    "radical": "ất 乙 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "侯",
    "hanViet": "HẦU, HẬU",
    "meaning": "tước Hầu",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勾",
    "hanViet": "CÂU, CẤU",
    "meaning": "cong, móc, đánh dấu móc",
    "onyomi": [
      "こう",
      "く"
    ],
    "kunyomi": [
      "かぎ",
      "ま.がる"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "bao 勹 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "喉",
    "hanViet": "HẦU",
    "meaning": "hầu, họng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "のど"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慌",
    "hanViet": "HOANG, HOẢNG",
    "meaning": "vội vã, vội vàng, hoảng sợ, vội vã, vội vàng",
    "onyomi": [
      "こう"
    ],
    "kunyomi": [
      "あわ.てる",
      "あわ.ただしい"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "梗",
    "hanViet": "CÁNH, CẠNH, NGẠNH",
    "meaning": "(xem: kết cánh 桔梗), cành cây, cánh bèo",
    "onyomi": [
      "こう",
      "きょう"
    ],
    "kunyomi": [
      "ふさぐ",
      "やまにれ",
      "おおむね"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "mộc 木 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "墾",
    "hanViet": "KHẨN",
    "meaning": "khai khẩn, vỡ đất hoang",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "は.る",
      "ひら.く"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thổ 土 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "痕",
    "hanViet": "NGÂN, NGẤN",
    "meaning": "hoen ra (nước mắt), vết sẹo, dấu vết",
    "onyomi": [
      "こん"
    ],
    "kunyomi": [
      "あと"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nạch 疒 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "挫",
    "hanViet": "TOẢ",
    "meaning": "bẻ gãy",
    "onyomi": [
      "ざ",
      "さ"
    ],
    "kunyomi": [
      "くじ.く",
      "くじ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塞",
    "hanViet": "TÁI, TẮC",
    "meaning": "chỗ canh phòng ngoài biên ải, nhét, nhồi, nút, bịt",
    "onyomi": [
      "そく",
      "さい"
    ],
    "kunyomi": [
      "ふさ.ぐ",
      "とりで",
      "み.ちる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "采",
    "hanViet": "THÁI, THẢI",
    "meaning": "màu mỡ, đẹp đẽ, hái, ngắt, chọn nhặt",
    "onyomi": [
      "さい"
    ],
    "kunyomi": [
      "と.る",
      "いろどり"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "biện 釆 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "柵",
    "hanViet": "SAN, SÁCH",
    "meaning": "hàng rào, rào chắn",
    "onyomi": [
      "さく",
      "さん"
    ],
    "kunyomi": [
      "しがら.む",
      "しがらみ",
      "とりで",
      "やらい"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mộc 木 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拶",
    "hanViet": "TẠT",
    "meaning": "bức bách, đè nén",
    "onyomi": [
      "さつ"
    ],
    "kunyomi": [
      "せま.る"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蚕",
    "hanViet": "TÀM, TẰM",
    "meaning": "con tằm, con tằm",
    "onyomi": [
      "さん",
      "てん"
    ],
    "kunyomi": [
      "かいこ",
      "こ"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "trùng 虫 (+4 nét)",
    "grade": "Lớp 6"
  },
  {
    "kanji": "嗣",
    "hanViet": "TỰ",
    "meaning": "nối tiếp, thừa hưởng, hậu duệ",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "khẩu 口 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肢",
    "hanViet": "CHI",
    "meaning": "chân tay",
    "onyomi": [
      "し"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nhục 肉 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賜",
    "hanViet": "TỨ",
    "meaning": "ban ơn",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "たまわ.る",
      "たま.う",
      "たも.う"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "璽",
    "hanViet": "TỈ, TỶ",
    "meaning": "cái ấn của vua, con dấu chính thức của quốc gia, quốc huy",
    "onyomi": [
      "じ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "ngọc 玉 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嫉",
    "hanViet": "TẬT",
    "meaning": "căm ghét, ghen ghét, đố kỵ, ganh tị",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "そね.む",
      "ねた.む",
      "にく.む"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nữ 女 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "爵",
    "hanViet": "TƯỚC",
    "meaning": "cái chén rượu, chức tước",
    "onyomi": [
      "しゃく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "trảo 爪 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腫",
    "hanViet": "THŨNG, TRŨNG",
    "meaning": "sưng, nề, phù",
    "onyomi": [
      "しゅ",
      "しょう"
    ],
    "kunyomi": [
      "は.れる",
      "は.れ",
      "は.らす",
      "く.む",
      "はれもの"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhục 肉 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "儒",
    "hanViet": "NHO, NHU",
    "meaning": "học trò, nho nhã, đạo Nho",
    "onyomi": [
      "じゅ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "nhân 人 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "愁",
    "hanViet": "SẦU",
    "meaning": "buồn bã",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "うれ.える",
      "うれ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蹴",
    "hanViet": "THÚC, XÚC",
    "meaning": "bước xéo gót, rảo bước, đá lật đi, vẻ kính cần",
    "onyomi": [
      "しゅく",
      "しゅう"
    ],
    "kunyomi": [
      "け.る"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "túc 足 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遵",
    "hanViet": "TUÂN",
    "meaning": "lần theo, noi theo, tuân theo",
    "onyomi": [
      "じゅん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "sước 辵 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "宵",
    "hanViet": "TIÊU",
    "meaning": "đêm, nhỏ bé",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "よい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "miên 宀 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "抄",
    "hanViet": "SAO",
    "meaning": "sao, chép lại, sao (đơn vị đo, bằng 1/1000 của thăng)",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thủ 手 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "硝",
    "hanViet": "TIÊU",
    "meaning": "đá tiêu (trong suốt, đốt cháy, dùng làm thuốc pháo)",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "thạch 石 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詔",
    "hanViet": "CHIẾU",
    "meaning": "chiếu chỉ",
    "onyomi": [
      "しょう"
    ],
    "kunyomi": [
      "みことのり"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "ngôn 言 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拭",
    "hanViet": "THỨC",
    "meaning": "lau chùi",
    "onyomi": [
      "しょく",
      "しき"
    ],
    "kunyomi": [
      "ぬぐ.う",
      "ふ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "thủ 手 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "薪",
    "hanViet": "TÂN",
    "meaning": "củi đun, tiền lương",
    "onyomi": [
      "しん"
    ],
    "kunyomi": [
      "たきぎ",
      "まき"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "thảo 艸 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腎",
    "hanViet": "THẬN",
    "meaning": "quả thận",
    "onyomi": [
      "じん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhục 肉 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "裾",
    "hanViet": "CƯ, CỨ",
    "meaning": "vạt áo, vạt áo",
    "onyomi": [
      "きょ",
      "こ"
    ],
    "kunyomi": [
      "すそ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "y 衣 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "畝",
    "hanViet": "MẪU",
    "meaning": "mẫu (đơn vị đo, bằng 60 trượng vuông)",
    "onyomi": [
      "ぼう",
      "ほ",
      "も",
      "む"
    ],
    "kunyomi": [
      "せ",
      "うね"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "điền 田 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "凄",
    "hanViet": "THÊ",
    "meaning": "lạnh, thê lương, thê thảm",
    "onyomi": [
      "せい",
      "さい"
    ],
    "kunyomi": [
      "さむ.い",
      "すご.い",
      "すさ.まじい"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "băng 冫 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "醒",
    "hanViet": "TINH, TỈNH",
    "meaning": "tỉnh lại, thức, đánh thức",
    "onyomi": [
      "せい"
    ],
    "kunyomi": [
      "さ.ます",
      "さ.める"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "dậu 酉 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "戚",
    "hanViet": "THÍCH, XÚC",
    "meaning": "thương, xót, thân thích",
    "onyomi": [
      "そく",
      "せき"
    ],
    "kunyomi": [
      "いた.む",
      "うれ.える",
      "みうち"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "qua 戈 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斥",
    "hanViet": "XÍCH",
    "meaning": "bác bỏ, bài xích, ruồng đuổi",
    "onyomi": [
      "せき"
    ],
    "kunyomi": [
      "しりぞ.ける"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "cân 斤 (+1 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "煎",
    "hanViet": "TIÊN, TIỄN",
    "meaning": "nấu, sắc, cất, ngâm, nấu, sắc, cất",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "せん.じる",
      "い.る",
      "に.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hoả 火 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "羨",
    "hanViet": "DIÊN, TIỄN, TIỆN",
    "meaning": "ham muốn, thích",
    "onyomi": [
      "せん",
      "えん"
    ],
    "kunyomi": [
      "うらや.む",
      "あまり"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "dương 羊 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "腺",
    "hanViet": "TUYẾN",
    "meaning": "tuyến dịch trong cơ thể",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "nhục 肉 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "詮",
    "hanViet": "THUYÊN",
    "meaning": "giải thích kỹ càng",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "せん.ずる",
      "かい",
      "あき.らか"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "ngôn 言 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "繕",
    "hanViet": "THIỆN",
    "meaning": "sửa chữa",
    "onyomi": [
      "ぜん"
    ],
    "kunyomi": [
      "つくろ.う"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mịch 糸 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "膳",
    "hanViet": "THIỆN",
    "meaning": "cỗ ăn",
    "onyomi": [
      "ぜん",
      "せん"
    ],
    "kunyomi": [
      "かしわ",
      "すす.める",
      "そな.える"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "nhục 肉 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塑",
    "hanViet": "TỐ",
    "meaning": "đắp tượng, nặn tượng",
    "onyomi": [
      "そ"
    ],
    "kunyomi": [
      "でく"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "曽",
    "hanViet": "TẰNG",
    "meaning": "Formerly, Once, Before",
    "onyomi": [
      "そう",
      "そ",
      "ぞう"
    ],
    "kunyomi": [
      "かつ",
      "かつて",
      "すなわち"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "nhật 日 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "遡",
    "hanViet": "TỐ",
    "meaning": "ngoi lên, bơi ngược dòng",
    "onyomi": [
      "そ",
      "さく"
    ],
    "kunyomi": [
      "さかのぼ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "sước 辵 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "痩",
    "hanViet": "SẤU",
    "meaning": "Get Thin",
    "onyomi": [
      "そう",
      "ちゅう",
      "しゅう",
      "しゅ"
    ],
    "kunyomi": [
      "や.せる"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nạch 疒 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "捉",
    "hanViet": "TRÓC",
    "meaning": "bắt giữ",
    "onyomi": [
      "そく",
      "さく"
    ],
    "kunyomi": [
      "とら.える"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "袖",
    "hanViet": "TỤ",
    "meaning": "tay áo",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "そで"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "y 衣 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "唾",
    "hanViet": "THOÁ",
    "meaning": "nước bọt, phỉ nhổ",
    "onyomi": [
      "だ",
      "た"
    ],
    "kunyomi": [
      "つば",
      "つばき"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "khẩu 口 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "堆",
    "hanViet": "ĐÔI, ĐỒI",
    "meaning": "đắp, đống, đắp, đống",
    "onyomi": [
      "たい",
      "つい"
    ],
    "kunyomi": [
      "うずたか.い"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thổ 土 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "但",
    "hanViet": "ĐÁN, ĐÃN",
    "meaning": "chỉ, song, những, nhưng mà, hễ, nếu như",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "ただ.し"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhân 人 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "綻",
    "hanViet": "TRÁN",
    "meaning": "đường khâu áo",
    "onyomi": [
      "たん"
    ],
    "kunyomi": [
      "ほころ.びる"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "mịch 糸 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逐",
    "hanViet": "TRỤC",
    "meaning": "đuổi đi, đuổi theo",
    "onyomi": [
      "ちく"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嫡",
    "hanViet": "ĐÍCH",
    "meaning": "vợ cả",
    "onyomi": [
      "ちゃく",
      "てき"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nữ 女 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "衷",
    "hanViet": "CHUNG, TRUNG, TRÚNG",
    "meaning": "vừa phải, tốt, lành, ngay thẳng",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "y 衣 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勅",
    "hanViet": "SẮC",
    "meaning": "sắc lệnh, răn bảo",
    "onyomi": [
      "ちょく"
    ],
    "kunyomi": [
      "いまし.める",
      "みことのり"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "lực 力 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "捗",
    "hanViet": "DUỆ",
    "meaning": "Make Progress",
    "onyomi": [
      "ちょく",
      "ほ"
    ],
    "kunyomi": [
      "はかど.る"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "thủ 手 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "朕",
    "hanViet": "TRẪM",
    "meaning": "ta đây (tự xưng)",
    "onyomi": [
      "ちん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nguyệt 月 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "潰",
    "hanViet": "HỘI",
    "meaning": "vỡ ngang, tan lở, thua trận",
    "onyomi": [
      "かい",
      "え"
    ],
    "kunyomi": [
      "つぶ.す",
      "つぶ.れる",
      "つい.える"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thuỷ 水 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "諦",
    "hanViet": "ĐẾ, ĐỀ",
    "meaning": "xét kỹ",
    "onyomi": [
      "てい",
      "たい"
    ],
    "kunyomi": [
      "あきら.める",
      "つまびらか",
      "まこと"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "逓",
    "hanViet": "ĐÁI, ĐỆ",
    "meaning": "Relay, In Turn, Sending",
    "onyomi": [
      "てい"
    ],
    "kunyomi": [
      "かわ.る",
      "たがいに"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "sước 辵 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "溺",
    "hanViet": "NIỆU, NỊCH",
    "meaning": "đi tiểu, đi đái, chết đuối, chìm đắm, say mê",
    "onyomi": [
      "でき",
      "じょう",
      "にょう"
    ],
    "kunyomi": [
      "いばり",
      "おぼ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thuỷ 水 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妬",
    "hanViet": "ĐỐ",
    "meaning": "ghét, ghen tỵ",
    "onyomi": [
      "と",
      "つ"
    ],
    "kunyomi": [
      "ねた.む",
      "そね.む",
      "つも.る",
      "ふさ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "nữ 女 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "痘",
    "hanViet": "ĐẬU",
    "meaning": "bệnh đậu mùa",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "nạch 疒 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "謄",
    "hanViet": "ĐẰNG",
    "meaning": "sao chép cho rõ ràng hơn",
    "onyomi": [
      "とう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "ngôn 言 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頓",
    "hanViet": "ĐỐN",
    "meaning": "ngưng lại, dừng lại, đình đốn",
    "onyomi": [
      "とん",
      "とつ"
    ],
    "kunyomi": [
      "にわか.に",
      "とん.と",
      "つまず.く",
      "とみ.に",
      "ぬかずく"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hiệt 頁 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弐",
    "hanViet": "NHỊ",
    "meaning": "Ii, Two, Second",
    "onyomi": [
      "に",
      "じ"
    ],
    "kunyomi": [
      "ふた.つ",
      "そえ"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "dặc 弋 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "匂",
    "hanViet": "CÁI",
    "meaning": "Fragrant, Stink, Glow",
    "onyomi": [],
    "kunyomi": [
      "にお.う",
      "にお.い",
      "にお.わせる"
    ],
    "jlpt": "N1",
    "strokeCount": 4,
    "radical": "bao 勹 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "捻",
    "hanViet": "NHIÊN, NIÊM, NIỄN, NIỆM, NIỆP, NẪM",
    "meaning": "nắn, rút lấy",
    "onyomi": [
      "ねん",
      "じょう"
    ],
    "kunyomi": [
      "ね.じる",
      "ねじ.る",
      "ひね.くる",
      "ひね.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "thủ 手 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "罵",
    "hanViet": "MẠ",
    "meaning": "mắng mỏ, chửi bới",
    "onyomi": [
      "ば"
    ],
    "kunyomi": [
      "ののし.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "võng 网 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "剥",
    "hanViet": "BÁC",
    "meaning": "bóc vỏ, lột",
    "onyomi": [
      "はく",
      "ほく"
    ],
    "kunyomi": [
      "へ.ぐ",
      "へず.る",
      "む.く",
      "む.ける",
      "は.がれる",
      "は.ぐ",
      "は.げる",
      "は.がす"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "đao 刀 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "斑",
    "hanViet": "BAN",
    "meaning": "lốm đốm, sắc lẫn lộn, có pha màu khác",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "ふ",
      "まだら"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "văn 文 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "氾",
    "hanViet": "PHIẾM",
    "meaning": "giàn giụa, mênh mông",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "ひろ.がる"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "thuỷ 水 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "汎",
    "hanViet": "PHIẾM, PHÙNG, PHẠP",
    "meaning": "phù phiếm, chèo thuyền",
    "onyomi": [
      "はん",
      "ぶ",
      "ふう",
      "ほう",
      "ほん"
    ],
    "kunyomi": [
      "ただよ.う",
      "ひろ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "thuỷ 水 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頒",
    "hanViet": "BAN, PHÂN, PHẦN",
    "meaning": "ban bố ra, ban phát",
    "onyomi": [
      "はん"
    ],
    "kunyomi": [
      "わか.つ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "hiệt 頁 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "眉",
    "hanViet": "MI, MY",
    "meaning": "lông mày",
    "onyomi": [
      "び",
      "み"
    ],
    "kunyomi": [
      "まゆ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "mục 目 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "膝",
    "hanViet": "TẤT",
    "meaning": "đầu gối",
    "onyomi": [
      "しつ"
    ],
    "kunyomi": [
      "ひざ"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "nhục 肉 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "肘",
    "hanViet": "CHỬU, TRỬU",
    "meaning": "khuỷu tay",
    "onyomi": [
      "ちゅう"
    ],
    "kunyomi": [
      "ひじ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nhục 肉 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "賦",
    "hanViet": "PHÚ",
    "meaning": "cho, ban cho, thuế, bài phú",
    "onyomi": [
      "ふ",
      "ぶ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "bối 貝 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "附",
    "hanViet": "PHỤ",
    "meaning": "bám, nương cậy, phụ thêm, góp vào",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "つ.ける",
      "つ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "phụ 阜 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "丙",
    "hanViet": "BÍNH",
    "meaning": "Bính (ngôi thứ 3 của hàng Can)",
    "onyomi": [
      "へい"
    ],
    "kunyomi": [
      "ひのえ"
    ],
    "jlpt": "N1",
    "strokeCount": 5,
    "radical": "nhất 一 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "蔽",
    "hanViet": "PHẤT, TẾ",
    "meaning": "che lấp",
    "onyomi": [
      "へい",
      "へつ",
      "ふつ"
    ],
    "kunyomi": [
      "おお.う",
      "おお.い"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thảo 艸 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "倣",
    "hanViet": "PHÓNG, PHẢNG, PHỎNG",
    "meaning": "bắt chước, làm theo, làm giống",
    "onyomi": [
      "ほう"
    ],
    "kunyomi": [
      "なら.う"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "nhân 人 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貌",
    "hanViet": "MẠC, MẠO, MỘC",
    "meaning": "vẻ ngoài, sắc mặt",
    "onyomi": [
      "ぼう",
      "ばく"
    ],
    "kunyomi": [
      "かたち",
      "かたどる"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "trĩ 豸 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "勃",
    "hanViet": "BỘT",
    "meaning": "đột nhiên, bừng bừng, ùn ùn",
    "onyomi": [
      "ぼつ",
      "ほつ"
    ],
    "kunyomi": [
      "おこ.る",
      "にわかに"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "lực 力 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "昧",
    "hanViet": "MUỘI, MẠT",
    "meaning": "mờ mờ, tối tăm, ngu dốt",
    "onyomi": [
      "まい",
      "ばい"
    ],
    "kunyomi": [
      "くら.い",
      "むさぼ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhật 日 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "繭",
    "hanViet": "KIỂN",
    "meaning": "cái kén tằm, mạng nhện, phồng da chân",
    "onyomi": [
      "けん"
    ],
    "kunyomi": [
      "まゆ",
      "きぬ"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "mịch 糸 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "冥",
    "hanViet": "MINH",
    "meaning": "mù mịt, ngu dốt",
    "onyomi": [
      "めい",
      "みょう"
    ],
    "kunyomi": [
      "くら.い"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "mịch 冖 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "麺",
    "hanViet": "MIẾN",
    "meaning": "bột gạo, sợi miến",
    "onyomi": [
      "めん",
      "べん"
    ],
    "kunyomi": [
      "むぎこ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mạch 麥 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "耗",
    "hanViet": "HAO, HÁO, MAO, MẠO",
    "meaning": "hao, sút, giảm, tin tức, không, hết",
    "onyomi": [
      "もう",
      "こう"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "lỗi 耒 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "餅",
    "hanViet": "BÍNH",
    "meaning": "bánh làm bằng bột",
    "onyomi": [
      "へい",
      "ひょう"
    ],
    "kunyomi": [
      "もち",
      "もちい"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "thực 食 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "冶",
    "hanViet": "DÃ",
    "meaning": "đúc (tạo hình cho kim loại nóng chảy rồi để đông lại), con gái đẹp",
    "onyomi": [
      "や"
    ],
    "kunyomi": [
      "い.る"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "băng 冫 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "妖",
    "hanViet": "YÊU",
    "meaning": "đẹp mĩ miều, quái lạ",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "あや.しい",
      "なま.めく",
      "わざわ.い"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "nữ 女 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "窯",
    "hanViet": "DAO, DIÊU",
    "meaning": "cái lò nung, đồ sành sứ",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "かま"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "huyệt 穴 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "沃",
    "hanViet": "ỐC",
    "meaning": "bón, tưới, tốt, màu mỡ",
    "onyomi": [
      "よう",
      "よく",
      "おく"
    ],
    "kunyomi": [
      "そそ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "thuỷ 水 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "濫",
    "hanViet": "CÃM, HẠM, LAM, LÃM, LẠM",
    "meaning": "giàn giụa, nước tràn, nước ngập, lạm, quá",
    "onyomi": [
      "らん"
    ],
    "kunyomi": [
      "みだ.りに",
      "みだ.りがましい"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "thuỷ 水 (+14 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "吏",
    "hanViet": "LẠI",
    "meaning": "viên quan, người làm việc cho nhà nước",
    "onyomi": [
      "り"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 6,
    "radical": "khẩu 口 (+3 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "侶",
    "hanViet": "LỮ",
    "meaning": "bạn bè",
    "onyomi": [
      "りょ",
      "ろ"
    ],
    "kunyomi": [
      "とも"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "nhân 人 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "厘",
    "hanViet": "HI, LI, LY, TRIỀN",
    "meaning": "sửa sang, tỷ lệ lãi, cai trị",
    "onyomi": [
      "りん"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "hán 厂 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "弄",
    "hanViet": "LỘNG",
    "meaning": "mân mê ngắm nghía, đùa dỡn, bỡn cợt, trêu chọc, thổi sáo, thổi tiêu",
    "onyomi": [
      "ろう",
      "る"
    ],
    "kunyomi": [
      "いじく.る",
      "ろう.する",
      "いじ.る",
      "ひねく.る",
      "たわむ.れる",
      "もてあそ.ぶ"
    ],
    "jlpt": "N1",
    "strokeCount": 7,
    "radical": "củng 廾 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "楼",
    "hanViet": "LÂU",
    "meaning": "cái lầu",
    "onyomi": [
      "ろう"
    ],
    "kunyomi": [
      "たかどの"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mộc 木 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "麓",
    "hanViet": "LỘC",
    "meaning": "chân núi",
    "onyomi": [
      "ろく"
    ],
    "kunyomi": [
      "ふもと"
    ],
    "jlpt": "N1",
    "strokeCount": 19,
    "radical": "lộc 鹿 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "刹",
    "hanViet": "SÁT",
    "meaning": "cái tháp thờ Phật, ngôi chùa, (xem: sát na 刹那)",
    "onyomi": [
      "せち",
      "せつ",
      "さつ"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "đao 刀 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "喩",
    "hanViet": "DỤ",
    "meaning": "Metaphor, Compare",
    "onyomi": [
      "ゆ"
    ],
    "kunyomi": [
      "たと.える",
      "さと.す"
    ],
    "jlpt": "N1",
    "strokeCount": 12,
    "radical": "khẩu 口 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嗅",
    "hanViet": "KHỨU",
    "meaning": "ngửi (mùi)",
    "onyomi": [
      "きゅう"
    ],
    "kunyomi": [
      "か.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "khẩu 口 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "嘲",
    "hanViet": "TRÀO",
    "meaning": "chế nhạo, cười nhạo",
    "onyomi": [
      "ちょう",
      "とう"
    ],
    "kunyomi": [
      "あざけ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "khẩu 口 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "毀",
    "hanViet": "HUỶ",
    "meaning": "huỷ hoại, nát, chê, diễu, mỉa mai",
    "onyomi": [
      "き"
    ],
    "kunyomi": [
      "こぼ.つ",
      "こわ.す",
      "こぼ.れる",
      "こわ.れる",
      "そし.る",
      "やぶ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thù 殳 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "彙",
    "hanViet": "VỊ, VỰNG",
    "meaning": "loài, loại, phân loại, tập hợp, thu thập",
    "onyomi": [
      "い"
    ],
    "kunyomi": [
      "はりねずみ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "kệ 彐 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "恣",
    "hanViet": "THƯ, TỨ",
    "meaning": "phóng túng",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "ほしいまま"
    ],
    "jlpt": "N1",
    "strokeCount": 10,
    "radical": "tâm 心 (+6 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "惧",
    "hanViet": "CỤ",
    "meaning": "sợ hãi, kính cẩn, khép nép",
    "onyomi": [
      "く",
      "ぐ"
    ],
    "kunyomi": [
      "おそ.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "tâm 心 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "慄",
    "hanViet": "LẬT",
    "meaning": "run sợ",
    "onyomi": [
      "りつ"
    ],
    "kunyomi": [
      "ふる.える",
      "おそ.れる",
      "おのの.く"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "tâm 心 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "憬",
    "hanViet": "CẢNH",
    "meaning": "hiểu biết, tỉnh ngộ",
    "onyomi": [
      "けい"
    ],
    "kunyomi": [
      "あこが.れる"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "tâm 心 (+12 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "拉",
    "hanViet": "LẠP",
    "meaning": "bẻ gãy, kéo, lôi, chuyên chở hàng hoá",
    "onyomi": [
      "らつ",
      "ら",
      "ろう"
    ],
    "kunyomi": [
      "らっ.する",
      "ひし.ぐ",
      "くだ.く"
    ],
    "jlpt": "N1",
    "strokeCount": 8,
    "radical": "thủ 手 (+5 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "摯",
    "hanViet": "CHÍ",
    "meaning": "họ Chí, thành thật",
    "onyomi": [
      "し"
    ],
    "kunyomi": [
      "いた.る"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "thủ 手 (+11 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "曖",
    "hanViet": "ÁI",
    "meaning": "u ám, mờ mịt, việc gì không rõ ràng",
    "onyomi": [
      "あい"
    ],
    "kunyomi": [
      "くら.い"
    ],
    "jlpt": "N1",
    "strokeCount": 17,
    "radical": "nhật 日 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "楷",
    "hanViet": "GIAI, KHẢI",
    "meaning": "cây giai, khuôn phép, chữ viết ngay ngắn",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "mộc 木 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "璧",
    "hanViet": "BÍCH",
    "meaning": "ngọc bích",
    "onyomi": [
      "へき"
    ],
    "kunyomi": [
      "たま"
    ],
    "jlpt": "N1",
    "strokeCount": 18,
    "radical": "ngọc 玉 (+13 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "瘍",
    "hanViet": "DƯƠNG",
    "meaning": "bệnh mụn nhọt",
    "onyomi": [
      "よう"
    ],
    "kunyomi": [
      "かさ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "nạch 疒 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "箋",
    "hanViet": "TIÊN",
    "meaning": "sách có chỉ dẫn, kiến giải tỉ mỉ",
    "onyomi": [
      "せん"
    ],
    "kunyomi": [
      "ふだ"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "trúc 竹 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "籠",
    "hanViet": "LUNG, LỘNG",
    "meaning": "cái lồng, lồng nhau",
    "onyomi": [
      "ろう",
      "る"
    ],
    "kunyomi": [
      "かご",
      "こ.める",
      "こも.る",
      "こ.む"
    ],
    "jlpt": "N1",
    "strokeCount": 22,
    "radical": "trúc 竹 (+17 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "緻",
    "hanViet": "TRÍ",
    "meaning": "suy cho đến cùng, đem lại, đưa đến, tỉ mỉ, kỹ, kín",
    "onyomi": [
      "ち"
    ],
    "kunyomi": [
      "こまか.い"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "mịch 糸 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "羞",
    "hanViet": "TU",
    "meaning": "xấu hổ, nhút nhát, đồ ăn ngon",
    "onyomi": [
      "しゅう"
    ],
    "kunyomi": [
      "はじ.る",
      "すすめ.る",
      "は.ずかしい"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "dương 羊 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "訃",
    "hanViet": "PHÓ",
    "meaning": "tin buồn, báo tin có tang",
    "onyomi": [
      "ふ"
    ],
    "kunyomi": [
      "しらせ"
    ],
    "jlpt": "N1",
    "strokeCount": 9,
    "radical": "ngôn 言 (+2 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "諧",
    "hanViet": "HÀI",
    "meaning": "hoà hợp, hài hoà",
    "onyomi": [
      "かい"
    ],
    "kunyomi": [
      "かな.う",
      "やわ.らぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "ngôn 言 (+9 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "貪",
    "hanViet": "THAM",
    "meaning": "ăn của đút, tham, ham",
    "onyomi": [
      "たん",
      "どん",
      "とん"
    ],
    "kunyomi": [
      "むさぼ.る"
    ],
    "jlpt": "N1",
    "strokeCount": 11,
    "radical": "bối 貝 (+4 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "踪",
    "hanViet": "TUNG",
    "meaning": "vết chân, tung tích, dấu vết",
    "onyomi": [
      "そう",
      "しょう"
    ],
    "kunyomi": [
      "あと"
    ],
    "jlpt": "N1",
    "strokeCount": 15,
    "radical": "túc 足 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "辣",
    "hanViet": "LẠT",
    "meaning": "cay xé, nham hiểm, độc ác",
    "onyomi": [
      "らつ"
    ],
    "kunyomi": [
      "から.い"
    ],
    "jlpt": "N1",
    "strokeCount": 14,
    "radical": "tân 辛 (+7 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "錮",
    "hanViet": "CỐ",
    "meaning": "hàn (gắn bằng kim loại)",
    "onyomi": [
      "こ"
    ],
    "kunyomi": [
      "ふさ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "kim 金 (+8 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "塡",
    "hanViet": "CHẤN, TRẤN, TRẦN, ĐIỀN, ĐIỄN",
    "meaning": "lấp đầy, điền vào tờ khai, tiếng trống ầm ầm",
    "onyomi": [
      "てん",
      "ちん"
    ],
    "kunyomi": [
      "はま.る",
      "うず.める",
      "は.める",
      "ふさ.ぐ"
    ],
    "jlpt": "N1",
    "strokeCount": 13,
    "radical": "thổ 土 (+10 nét)",
    "grade": "Lớp 8"
  },
  {
    "kanji": "頰",
    "hanViet": "GIÁP",
    "meaning": "má",
    "onyomi": [
      "きょう"
    ],
    "kunyomi": [
      "ほお",
      "ほほ"
    ],
    "jlpt": "N1",
    "strokeCount": 16,
    "radical": "hiệt 頁 (+7 nét)",
    "grade": "Lớp 8"
  }
]

export const ALL_JOYO_KANJI: JoyoKanjiEntry[] = [
  ...N5_KANJI,
  ...N4_KANJI,
  ...N3_KANJI,
  ...N2_KANJI,
  ...N1_KANJI,
]

let _joyoMapCache: Record<string, JoyoKanjiEntry> | null = null
export function getJoyoKanjiMap(): Record<string, JoyoKanjiEntry> {
  if (_joyoMapCache) return _joyoMapCache
  _joyoMapCache = ALL_JOYO_KANJI.reduce(
    (acc, curr) => {
      acc[curr.kanji] = curr
      return acc
    },
    {} as Record<string, JoyoKanjiEntry>,
  )
  return _joyoMapCache
}

// Lazy alias for callers that need map without import-time cost; keep legacy export for compat but defer build
export const JOYO_KANJI_MAP: Record<string, JoyoKanjiEntry> = new Proxy({} as Record<string, JoyoKanjiEntry>, {
  get(_target, prop: string) {
    return getJoyoKanjiMap()[prop]
  },
  has(_target, prop: string) {
    return prop in getJoyoKanjiMap()
  },
  ownKeys() {
    return Reflect.ownKeys(getJoyoKanjiMap())
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    const m = getJoyoKanjiMap()
    if (prop in m) return { configurable: true, enumerable: true, value: m[prop], writable: false }
    return undefined
  },
})
