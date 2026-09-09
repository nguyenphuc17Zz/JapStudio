/**
 * Kanji Dictionary & KanjiVG Stroke Data Service
 * Provides comprehensive Joyo Kanji metadata (Hán Việt, On/Kun, Radicals, JLPT,
 * Mnemonics, Jukugo compounds) and dynamic KanjiVG SVG vector fetching & caching.
 */

import { parseKanjiVgSvg, type KanjiStrokeSet } from './kanjiStrokeEngine'
import { ALL_JOYO_KANJI, JOYO_KANJI_MAP } from '../data/joyoKanjiData'
import { kanjiSearchEngine } from './kanjiSearchEngine'

export interface KanjiCompound {
  word: string
  reading: string
  meaning: string
}

export interface KanjiDetail {
  kanji: string
  hanViet: string
  meaning: string
  onyomi: string[]
  kunyomi: string[]
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  grade?: string
  strokeCount: number
  radical: string
  mnemonic: string
  compounds: KanjiCompound[]
}

export interface KanjiMasteryState {
  kanji: string
  practicedCount: number
  bestScore: number
  stars: number
  lastPracticed?: string
}

/**
 * Built-in core dictionary for instant offline access to common Kanji
 */
const BUILTIN_KANJI_DICT: Record<string, KanjiDetail> = {
  日: {
    kanji: '日',
    hanViet: 'NHẬT',
    meaning: 'Mặt trời, ban ngày, ngày, nước Nhật',
    onyomi: ['ニチ', 'ジツ'],
    kunyomi: ['ひ', '-び', '-か'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 4,
    radical: '日 (Nhật - Mặt trời)',
    mnemonic: 'Hình dáng mặt trời tròn khép kín với một vệt sáng ở chính giữa.',
    compounds: [
      { word: '日本', reading: 'にほん (Nihon)', meaning: 'Nước Nhật' },
      { word: '今日', reading: 'きょう (Kyou)', meaning: 'Hôm nay' },
      { word: '日曜日', reading: 'にちようび (Nichiyoubi)', meaning: 'Chủ nhật' },
      { word: '休日', reading: 'きゅうじつ (Kyuujitsu)', meaning: 'Ngày nghỉ' },
    ],
  },
  月: {
    kanji: '月',
    hanViet: 'NGUYỆT',
    meaning: 'Mặt trăng, tháng',
    onyomi: ['ゲツ', 'ガツ'],
    kunyomi: ['つき'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 4,
    radical: '月 (Nguyệt - Mặt trăng)',
    mnemonic: 'Hình ảnh vầng trăng khuyết với mây trôi ngang qua.',
    compounds: [
      { word: '今月', reading: 'こんげつ (Kongetsu)', meaning: 'Tháng này' },
      { word: '月曜日', reading: 'げつようび (Getsuyoubi)', meaning: 'Thứ hai' },
      { word: '毎月', reading: 'まいつき (Maitsuki)', meaning: 'Mỗi tháng' },
      { word: '満月', reading: 'まんげつ (Mangetsu)', meaning: 'Trăng tròn' },
    ],
  },
  木: {
    kanji: '木',
    hanViet: 'MỘC',
    meaning: 'Cây cối, gỗ',
    onyomi: ['ボク', 'モク'],
    kunyomi: ['き', 'こ-'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 4,
    radical: '木 (Mộc - Cây)',
    mnemonic: 'Hình vẽ thân cây với các cành tỏa ra và rễ cắm sâu vào lòng đất.',
    compounds: [
      { word: '木曜日', reading: 'もくようび (Mokuyoubi)', meaning: 'Thứ năm' },
      { word: '大木', reading: 'たいぼく (Taiboku)', meaning: 'Cây cổ thụ lớn' },
      { word: '木材', reading: 'もくざい (Mokuzai)', meaning: 'Gỗ nguyên liệu' },
    ],
  },
  水: {
    kanji: '水',
    hanViet: 'THỦY',
    meaning: 'Nước, chất lỏng',
    onyomi: ['スイ'],
    kunyomi: ['みず'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 4,
    radical: '水 (Thủy - Nước)',
    mnemonic: 'Dòng nước chảy xiết ở giữa với những giọt nước bắn sang hai bên.',
    compounds: [
      { word: '水曜日', reading: 'すいようび (Suiyoubi)', meaning: 'Thứ tư' },
      { word: '水泳', reading: 'すいえい (Suiei)', meaning: 'Bơi lội' },
      { word: '冷水', reading: 'れいすい (Reisui)', meaning: 'Nước lạnh' },
    ],
  },
  火: {
    kanji: '火',
    hanViet: 'HỎA',
    meaning: 'Lửa, ngọn lửa',
    onyomi: ['カ'],
    kunyomi: ['ひ', '-び', 'ほ-'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 4,
    radical: '火 (Hỏa - Lửa)',
    mnemonic: 'Ngọn lửa bốc cháy dữ dội với tàn lửa bay xung quanh.',
    compounds: [
      { word: '火曜日', reading: 'かようび (Kayoubi)', meaning: 'Thứ ba' },
      { word: '花火', reading: 'はなび (Hanabi)', meaning: 'Pháo hoa' },
      { word: '火山', reading: 'かざん (Kazan)', meaning: 'Núi lửa' },
    ],
  },
  学: {
    kanji: '学',
    hanViet: 'HỌC',
    meaning: 'Học tập, trường học, học thuyết',
    onyomi: ['ガク'],
    kunyomi: ['まな・ぶ'],
    jlpt: 'N5',
    grade: 'Lớp 1',
    strokeCount: 8,
    radical: '子 (Tử - Con cái)',
    mnemonic: 'Đứa trẻ (子) ngồi dưới mái trường có ánh sáng khai sáng để học tập.',
    compounds: [
      { word: '学生', reading: 'がくせい (Gakusei)', meaning: 'Học sinh, sinh viên' },
      { word: '大学', reading: 'だいがく (Daigaku)', meaning: 'Đại học' },
      { word: '学校', reading: 'がっこう (Gakkou)', meaning: 'Trường học' },
      { word: '学ぶ', reading: 'まなぶ (Manabu)', meaning: 'Học hỏi' },
    ],
  },
  書: {
    kanji: '書',
    hanViet: 'THƯ',
    meaning: 'Viết, sách vở, văn bản',
    onyomi: ['ショ'],
    kunyomi: ['か・く', '-が・き'],
    jlpt: 'N5',
    grade: 'Lớp 2',
    strokeCount: 10,
    radical: '曰 (Viết - Nói)',
    mnemonic: 'Tay cầm bút lông (聿) viết những lời nói (曰) thành cuốn sách.',
    compounds: [
      { word: '辞書', reading: 'じしょ (Jisho)', meaning: 'Từ điển' },
      { word: '図書館', reading: 'としょかん (Toshokan)', meaning: 'Thư viện' },
      { word: '教科書', reading: 'きょうかしょ (Kyoukasho)', meaning: 'Sách giáo khoa' },
      { word: '書く', reading: 'かく (Kaku)', meaning: 'Viết' },
    ],
  },
  道: {
    kanji: '道',
    hanViet: 'ĐẠO',
    meaning: 'Con đường, đạo lý, phương pháp',
    onyomi: ['ドウ', 'トウ'],
    kunyomi: ['みち'],
    jlpt: 'N4',
    grade: 'Lớp 2',
    strokeCount: 12,
    radical: '辵 (Sước - Bước đi)',
    mnemonic: 'Cái đầu (首) dẫn đường khi bước đi (辶) trên con đường chính nghĩa.',
    compounds: [
      { word: '道', reading: 'みち (Michi)', meaning: 'Con đường' },
      { word: '茶道', reading: 'さどう (Sadou)', meaning: 'Trà đạo' },
      { word: '柔道', reading: 'じゅうどう (Juudou)', meaning: 'Nhu đạo (Judo)' },
      { word: '歩道', reading: 'ほどう (Hodou)', meaning: 'Vỉa hè' },
    ],
  },
  語: {
    kanji: '語',
    hanViet: 'NGỮ',
    meaning: 'Ngôn ngữ, lời nói, kể chuyện',
    onyomi: ['ゴ'],
    kunyomi: ['かた・る', 'かた・らう'],
    jlpt: 'N5',
    grade: 'Lớp 2',
    strokeCount: 14,
    radical: '言 (Ngôn - Lời nói)',
    mnemonic: 'Lời nói (言) của bản thân ta (吾 = Ngũ + Khẩu) trở thành ngôn ngữ.',
    compounds: [
      { word: '日本語', reading: 'にほんご (Nihongo)', meaning: 'Tiếng Nhật' },
      { word: '単語', reading: 'たんご (Tango)', meaning: 'Từ vựng' },
      { word: '敬語', reading: 'けいご (Keigo)', meaning: 'Kính ngữ' },
      { word: '物語', reading: 'ものがたり (Monogatari)', meaning: 'Câu chuyện' },
    ],
  },
  桜: {
    kanji: '桜',
    hanViet: 'ANH',
    meaning: 'Hoa anh đào',
    onyomi: ['オウ'],
    kunyomi: ['さくら'],
    jlpt: 'N3',
    grade: 'Lớp 5',
    strokeCount: 10,
    radical: '木 (Mộc - Cây)',
    mnemonic: 'Loài cây (木) nở hoa rực rỡ như những người phụ nữ đeo chuỗi ngọc (ツ + 女).',
    compounds: [
      { word: '桜', reading: 'さくら (Sakura)', meaning: 'Hoa anh đào' },
      { word: '桜花', reading: 'おうか (Ouka)', meaning: 'Hoa anh đào khoe sắc' },
      { word: '桜前線', reading: 'さくらぜんせん (Sakurazensen)', meaning: 'Đường hoa anh đào nở' },
    ],
  },
  心: {
    kanji: '心',
    hanViet: 'TÂM',
    meaning: 'Trái tim, tâm hồn, tấm lòng',
    onyomi: ['シン'],
    kunyomi: ['こころ', '-ごころ'],
    jlpt: 'N4',
    grade: 'Lớp 2',
    strokeCount: 4,
    radical: '心 (Tâm - Trái tim)',
    mnemonic: 'Hình vẽ quả tim với các tâm thất và mạch máu tỏa ra.',
    compounds: [
      { word: '心配', reading: 'しんぱい (Shinpai)', meaning: 'Lo lắng' },
      { word: '安心', reading: 'あんしん (Anshin)', meaning: 'Yên tâm' },
      { word: '感心', reading: 'かんしん (Kanshin)', meaning: 'Ngưỡng mộ' },
      { word: '心', reading: 'こころ (Kokoro)', meaning: 'Tấm lòng' },
    ],
  },
  夢: {
    kanji: '夢',
    hanViet: 'MỘNG',
    meaning: 'Giấc mơ, ước mơ',
    onyomi: ['ム'],
    kunyomi: ['ゆめ', 'ゆめ・みる'],
    jlpt: 'N3',
    grade: 'Lớp 5',
    strokeCount: 13,
    radical: '夕 (Tịch - Buổi chiều tối)',
    mnemonic: 'Trong đêm tối (夕), đôi mắt phủ mờ nhìn thấy những ảo ảnh đẹp đẽ.',
    compounds: [
      { word: '夢', reading: 'ゆめ (Yume)', meaning: 'Giấc mơ' },
      { word: '悪夢', reading: 'あくむ (Akumu)', meaning: 'Ác mộng' },
      { word: '夢中', reading: 'むちゅう (Muchuu)', meaning: 'Say mê, miệt mài' },
    ],
  },
  愛: {
    kanji: '愛',
    hanViet: 'ÁI',
    meaning: 'Tình yêu, thương yêu',
    onyomi: ['アイ'],
    kunyomi: ['いと・しい', 'まな'],
    jlpt: 'N3',
    grade: 'Lớp 4',
    strokeCount: 13,
    radical: '心 (Tâm - Trái tim)',
    mnemonic: 'Khi bước đi (爫 + 夂), trái tim (心) luôn hướng về người mình yêu thương.',
    compounds: [
      { word: '愛', reading: 'あい (Ai)', meaning: 'Tình yêu' },
      { word: '愛情', reading: 'あいじょう (Aijou)', meaning: 'Tình cảm yêu thương' },
      { word: '恋愛', reading: 'れんあい (Renai)', meaning: 'Tình yêu đôi lứa' },
    ],
  },
  和: {
    kanji: '和',
    hanViet: 'HÒA',
    meaning: 'Hòa bình, hài hòa, phong cách Nhật Bản',
    onyomi: ['ワ', 'オ'],
    kunyomi: ['やわ・らぐ', 'なご・む'],
    jlpt: 'N3',
    grade: 'Lớp 3',
    strokeCount: 8,
    radical: '口 (Khẩu - Miệng)',
    mnemonic: 'Cây lúa (禾) vào miệng (口) mang lại ấm no, mọi người sống chan hòa.',
    compounds: [
      { word: '平和', reading: 'へいわ (Heiwa)', meaning: 'Hòa bình' },
      { word: '和食', reading: 'わしょく (Washoku)', meaning: 'Ẩm thực Nhật Bản' },
      { word: '調和', reading: 'ちょうわ (Chouwa)', meaning: 'Điều hòa, hòa hợp' },
    ],
  },
  風: {
    kanji: '風',
    hanViet: 'PHONG',
    meaning: 'Gió, phong cách, phong thái',
    onyomi: ['フウ', 'フ'],
    kunyomi: ['かぜ', 'かざ-'],
    jlpt: 'N4',
    grade: 'Lớp 2',
    strokeCount: 9,
    radical: '風 (Phong - Gió)',
    mnemonic: 'Cơn gió thổi lồng lộng cuốn theo cả những chú bọ (虫) bay lượn.',
    compounds: [
      { word: '風', reading: 'かぜ (Kaze)', meaning: 'Cơn gió' },
      { word: '台風', reading: 'たいふう (Taifuu)', meaning: 'Cơn bão' },
      { word: '風景', reading: 'ふうけい (Fuukei)', meaning: 'Phong cảnh' },
    ],
  },
}

/**
 * Built-in SVG vector path fallback for core Kanji (Joyo standard KanjiVG paths)
 */
const BUILTIN_KANJIVG_SVGS: Record<string, string> = {
  日: `<svg viewBox="0 0 109 109"><g id="kvg:065e5"><path id="kvg:065e5-s1" d="M30.75,19.25 c 0.88,0.88 1.48,2.23 1.5,3.75 c 0.25,18.75 0.5,45.75 0.5,67.75" /><path id="kvg:065e5-s2" d="M33.25,21.5 c 9.75,-1.25 36.25,-3.75 43.5,-4.25 c 2.65,-0.18 4.25,1.75 4.25,4.25 c 0,16.25 -0.5,45.75 -0.5,67.25" /><path id="kvg:065e5-s3" d="M33.5,53.25 c 8.5,-0.75 38.75,-3 46.5,-3.25" /><path id="kvg:065e5-s4" d="M33.75,87.75 c 10.75,-0.75 36.5,-2.25 46.25,-2.5" /></g></svg>`,
  月: `<svg viewBox="0 0 109 109"><g id="kvg:06708"><path id="kvg:06708-s1" d="M33.5,17.75 c 0.88,0.88 1.48,2.23 1.5,3.75 c 0.25,25.25 -3.5,52.25 -15.5,69.5" /><path id="kvg:06708-s2" d="M36,20.25 c 6.5,-1 31.75,-3.75 37.25,-4.25 c 3.5,-0.32 4.75,2 4.75,4.75 c 0,14.5 -0.25,48.75 -0.25,65.25 c 0,10.75 -5.25,2.75 -7.25,0.75" /><path id="kvg:06708-s3" d="M35.75,42.5 c 8.25,-0.75 32.5,-2.5 41.25,-2.75" /><path id="kvg:06708-s4" d="M34,64.25 c 9.25,-0.5 33,-2 43,-2.25" /></g></svg>`,
  木: `<svg viewBox="0 0 109 109"><g id="kvg:06728"><path id="kvg:06728-s1" d="M15.25,42.22 c 2.25,0.41 4.54,0.36 6.88,0.06 c 15.37,-1.91 44.5,-4.41 62,-5.39 c 2.37,-0.13 4.88,-0.02 7.12,0.61" /><path id="kvg:06728-s2" d="M53.25,12.5 c 1.25,1.25 1.75,3 1.75,4.75 c 0,11.5 -0.25,66 -0.25,73.5 c 0,4.25 -1.25,5.5 -4.75,2" /><path id="kvg:06728-s3" d="M52.75,42.5 c -6.62,13.75 -24,35.25 -38.25,43.25" /><path id="kvg:06728-s4" d="M55.75,43 c 7.12,9.38 23.38,28.88 32.38,36.62 c 2.25,1.94 4.88,3.5 7.62,4.88" /></g></svg>`,
  水: `<svg viewBox="0 0 109 109"><g id="kvg:06c34"><path id="kvg:06c34-s1" d="M52.75,14.5 c 1.09,1.09 1.75,2.75 1.75,4.75 c 0,13.25 -0.25,62.25 -0.25,67.75 c 0,11.25 -6.25,3.25 -7.75,1.75" /><path id="kvg:06c34-s2" d="M18.75,40.5 c 2.5,0.75 4.5,0.88 6.5,0.38 c 4.75,-1.25 12.25,-3.75 15,-4.88 c 2.62,-1.09 3.5,0.62 2.5,2.88 c -4.12,9.38 -15.88,27.38 -26,33.88" /><path id="kvg:06c34-s3" d="M80.25,23.25 c 0.12,1.12 -0.25,2.25 -1,3.25 c -4.25,5.75 -10.75,12.75 -19.5,18.75" /><path id="kvg:06c34-s4" d="M58,45.25 c 6.75,8.88 19.38,26.62 28.12,35.75 c 2.5,2.62 5.38,4.75 8.62,6.5" /></g></svg>`,
  火: `<svg viewBox="0 0 109 109"><g id="kvg:0706b"><path id="kvg:0706b-s1" d="M30.75,37.25 c 2.5,3.38 6.12,13 6.75,16.25" /><path id="kvg:0706b-s2" d="M80.25,32.25 c 0.12,1 -0.25,2 -0.88,2.88 c -3.5,4.88 -9.5,11.25 -15.88,15.12" /><path id="kvg:0706b-s3" d="M53.5,15.75 c 1.25,1.25 1.5,3 1.5,4.75 c 0,27.5 -6.25,57.5 -31.75,70.5" /><path id="kvg:0706b-s4" d="M54.25,48.75 c 9.88,13.75 22.88,28.62 31.75,35.75 c 2.75,2.25 5.5,4.25 8.75,5.75" /></g></svg>`,
  学: `<svg viewBox="0 0 109 109"><g id="kvg:05b66"><path id="kvg:05b66-s1" d="M31.25,17.25 c 3.62,2.88 7.38,7.88 8.5,11.25" /><path id="kvg:05b66-s2" d="M52.75,13.5 c 1.5,2.62 3.88,7.38 4.75,11.12" /><path id="kvg:05b66-s3" d="M78.25,12.75 c 0.88,1.12 0.88,2.25 0.12,3.62 c -3.12,5.62 -6.75,10.62 -10.38,14.62" /><path id="kvg:05b66-s4" d="M22,37.5 c 0,3.5 -3.25,13.25 -4.75,15.62" /><path id="kvg:05b66-s5" d="M24.25,39.75 c 18.25,-2.25 47.75,-5.5 61.25,-6.25 c 11.25,-0.62 1.75,7.75 -0.5,9.62" /><path id="kvg:05b66-s6" d="M49.75,44.75 c 2.62,1.38 5.75,4.25 6.12,6.62 c 0.75,4.88 -0.12,12.62 -4.88,18.88 c -3.12,4.12 -4.62,5 -8.25,7.88" /><path id="kvg:05b66-s7" d="M42.25,62.25 c 15.5,-4.75 29.5,-5.25 34.25,-4.75 c 4.38,0.5 5.75,3.38 4.38,6.88 c -4.38,11.12 -18.75,25.62 -40.62,31.88" /><path id="kvg:05b66-s8" d="M17.75,72.25 c 2.38,0.75 5.5,0.62 7.88,0.38 c 18.38,-1.88 47.12,-4.75 66.88,-5.62 c 2.75,-0.12 5.88,0.12 8.5,0.88" /></g></svg>`,
  書: `<svg viewBox="0 0 109 109"><g id="kvg:066f8"><path id="kvg:066f8-s1" d="M28.75,16.75 c 2.25,0.75 5.12,0.5 7.38,0.25 c 12.38,-1.38 27.62,-3 39.38,-3.75 c 2.38,-0.15 4.62,0 6.88,0.62" /><path id="kvg:066f8-s2" d="M53.25,17 c 1,1 1.5,2.25 1.5,3.75 c 0,9.75 -0.12,19.25 -0.12,28.25" /><path id="kvg:066f8-s3" d="M33.75,28.25 c 1.88,0.5 4.12,0.38 6,0.12 c 9.88,-1.25 20.38,-2.62 30.62,-3.5 c 2,-0.17 4.12,-0.12 6,0.38" /><path id="kvg:066f8-s4" d="M21.25,40.5 c 2.75,0.88 5.75,0.62 8.5,0.38 c 16.5,-1.5 39.5,-3.62 55.75,-4.75 c 2.75,-0.19 5.38,-0.12 8,0.62" /><path id="kvg:066f8-s5" d="M34.75,51.75 c 1.75,0.62 4.12,0.38 6,0.12 c 10.75,-1.38 22.38,-2.88 31.75,-3.75 c 2,-0.19 4.12,-0.12 6,0.38" /><path id="kvg:066f8-s6" d="M25.75,50.75 c 1,1 1.5,2.38 1.5,3.88 c 0,16.12 -0.25,32.38 -0.25,41.62" /><path id="kvg:066f8-s7" d="M35.75,64.25 c 0.88,0.88 1.25,2 1.25,3.25 c 0,7.25 0.12,20.25 0.12,27.75" /><path id="kvg:066f8-s8" d="M38.25,65.75 c 8.5,-1 27.25,-3.25 33.25,-3.75 c 2.5,-0.21 3.88,1.25 3.88,3.25 c 0,6.5 -0.12,18.75 -0.12,26.75" /><path id="kvg:066f8-s9" d="M38.75,78.25 c 8.25,-0.88 27.25,-2.25 35.5,-2.62" /><path id="kvg:066f8-s10" d="M38.75,93.5 c 9.25,-0.75 25.5,-1.75 35.5,-2.12" /></g></svg>`,
  道: `<svg viewBox="0 0 109 109"><g id="kvg:09053"><path id="kvg:09053-s1" d="M43.75,14.25 c 2.88,2.12 6.38,6.88 7.38,10" /><path id="kvg:09053-s2" d="M77.25,12.75 c 0.12,0.88 -0.12,1.75 -0.62,2.5 c -2.12,3.12 -5.5,6.75 -9.62,9.75" /><path id="kvg:09053-s3" d="M41.75,29.5 c 2,0.75 4.38,0.5 6.38,0.25 c 7.88,-1 22.88,-2.62 31.88,-3.25 c 2.12,-0.15 4.12,-0.12 6.12,0.38" /><path id="kvg:09053-s4" d="M46.75,41.25 c 0.88,0.88 1.38,2.12 1.38,3.5 c 0,7.75 -0.12,17.25 -0.12,24.25" /><path id="kvg:09053-s5" d="M49.25,42.75 c 7.25,-1 24.25,-2.75 29.5,-3.25 c 2.75,-0.26 4.12,1.12 4.12,3.5 c 0,7.25 -0.25,16.75 -0.25,23.75" /><path id="kvg:09053-s6" d="M49.75,54.75 c 7.5,-0.88 23.5,-2 31.75,-2.38" /><path id="kvg:09053-s7" d="M49.75,67.75 c 7.88,-0.75 23.12,-1.75 31.88,-2.12" /><path id="kvg:09053-s8" d="M19.75,20.25 c 3.62,1.62 9.38,6.62 10.25,9.12" /><path id="kvg:09053-s9" d="M14.5,49.25 c 2.25,0.88 4.75,0.75 6.75,0.12 c 3.75,-1.12 8.75,-3.12 11.25,-4.12 c 2.12,-0.85 3.38,0.88 2.25,2.62 c -5.75,8.88 -10.5,15.75 -17.25,24.38" /><path id="kvg:09053-s10" d="M14,75.25 c 3.25,-0.5 9.75,-1.25 14.5,-0.38 c 8.5,1.5 28.5,7.88 34.25,9.25 c 13.5,3.25 21.75,4.38 31.25,3.12" /></g></svg>`,
  心: `<svg viewBox="0 0 109 109"><g id="kvg:05fc3"><path id="kvg:05fc3-s1" d="M22.75,46.5 c 0.38,2.75 -1.5,13.75 -4.5,18.75" /><path id="kvg:05fc3-s2" d="M37.25,37.25 c 1.25,1.25 1.5,3.12 1.5,5.25 c 0,11.5 5.5,33.5 17.5,41.25 c 13.25,8.5 29.5,8.25 35.75,2 c 4.75,-4.75 4.25,-7.25 1.5,-12.25" /><path id="kvg:05fc3-s3" d="M53.75,34.5 c 2.88,4.12 6.5,10.25 7.62,14.25" /><path id="kvg:05fc3-s4" d="M81.25,35.25 c 4.25,3.62 8.5,9.38 10.75,14.62" /></g></svg>`,
  桜: `<svg viewBox="0 0 109 109"><g id="kvg:0685c"><path id="kvg:0685c-s1" d="M12.25,38.72 c 1.88,0.41 3.79,0.36 5.73,0.06 c 7.82,-1.21 16.5,-2.66 22.77,-3.64 c 1.97,-0.31 4.07,-0.02 5.93,0.51" /><path id="kvg:0685c-s2" d="M30.36,15.5 c 1.27,1.27 1.77,3 1.77,4.92 c 0,6.48 -0.09,50.84 -0.12,68.33 c -0.01,4.02 -0.01,6.86 -0.01,7.75" /><path id="kvg:0685c-s3" d="M30.44,39.28 c 0,1.34 -0.42,2.87 -1.02,4.24 c -4.8,11 -11.92,23.36 -19.42,29.98" /><path id="kvg:0685c-s4" d="M34.72,46.15 c 2.37,1.59 6.28,6.72 8.28,9.85" /><path id="kvg:0685c-s5" d="M51.25,23.25 c 2.5,2.12 5.5,5.88 6.5,8.25" /><path id="kvg:0685c-s6" d="M68.75,17.75 c 1.25,2 2.75,5.62 3.38,8.25" /><path id="kvg:0685c-s7" d="M88.25,16.75 c 0.12,0.88 -0.12,1.75 -0.62,2.5 c -2.12,3.12 -5.5,6.75 -9.62,9.75" /><path id="kvg:0685c-s8" d="M65.75,37.25 c 0.88,0.88 1.38,2.12 1.38,3.5 c 0,11.25 -0.25,20.25 -0.25,25.25 c 0,6.5 -3.5,1.25 -4.75,-0.25" /><path id="kvg:0685c-s9" d="M50.25,50.25 c 0.75,0.75 1.12,1.88 0.75,3.38 c -1.88,7.38 -5.62,17.25 -11.25,23.88" /><path id="kvg:0685c-s10" d="M46.75,54.75 c 12.25,-2.25 32.5,-4.75 42.75,-5.5 c 2.5,-0.18 4.88,0.25 7.25,0.88" /></g></svg>`,
  和: `<svg viewBox="0 0 109 109"><g id="kvg:0548c"><path id="kvg:0548c-s1" d="M41.25,14.75 c 0,0.88 -0.38,2.25 -1.12,3.12 c -5.12,5.88 -13.5,13.25 -21.88,17.38" /><path id="kvg:0548c-s2" d="M12.75,41.25 c 1.88,0.38 3.88,0.38 5.75,0.12 c 7.88,-1 19.38,-2.62 26.88,-3.75 c 1.88,-0.28 3.88,-0.25 5.75,0.25" /><path id="kvg:0548c-s3" d="M32.25,24.75 c 0.88,0.88 1.25,2 1.25,3.25 c 0,11.25 -0.12,50.25 -0.12,61.75" /><path id="kvg:0548c-s4" d="M31.75,42 c -4.88,12.75 -13.25,26.75 -21.5,33.75" /><path id="kvg:0548c-s5" d="M36.75,50.25 c 3.62,2.25 6.62,6.75 8.5,9.62" /><path id="kvg:0548c-s6" d="M57.75,34.75 c 0.88,0.88 1.38,2 1.38,3.25 c 0,8.75 0.12,31.25 0.12,41.75" /><path id="kvg:0548c-s7" d="M60.25,36.75 c 7.75,-1.25 21.75,-3.25 27.5,-3.88 c 3,-0.33 4.62,1.25 4.62,3.75 c 0,9.25 -0.25,28.25 -0.25,37.25" /><path id="kvg:0548c-s8" d="M60.75,76.25 c 7.5,-0.75 22.25,-1.75 30.5,-2.25" /></g></svg>`,
}

const KANJI_MASTERY_KEY = 'jw:kanji_mastery'
const KANJI_SVG_CACHE_KEY = 'jw:kanjivg_cache:'

export class KanjiService {
  /**
   * Converts a character to its 5-digit lowercase hex Unicode string (KanjiVG naming format)
   * Example: '日' (U+65E5) -> '065e5'
   */
  public getKanjiHex(char: string): string {
    const codePoint = char.codePointAt(0) || 0
    return codePoint.toString(16).padStart(5, '0').toLowerCase()
  }

  /**
   * Retrieves Kanji metadata (Hán Việt, On/Kun, Meaning, Radical, JLPT, Compounds)
   */
  public async getKanjiDetails(kanji: string): Promise<KanjiDetail> {
    if (BUILTIN_KANJI_DICT[kanji]) {
      return BUILTIN_KANJI_DICT[kanji]
    }

    if (JOYO_KANJI_MAP[kanji]) {
      const entry = JOYO_KANJI_MAP[kanji]
      return {
        kanji: entry.kanji,
        hanViet: entry.hanViet,
        meaning: entry.meaning,
        onyomi: entry.onyomi,
        kunyomi: entry.kunyomi,
        jlpt: entry.jlpt,
        grade: entry.grade || 'Thường dụng',
        strokeCount: entry.strokeCount,
        radical: entry.radical,
        mnemonic: entry.mnemonic || `Chữ Hán ${entry.hanViet} (${entry.kanji}) thuộc cấp độ ${entry.jlpt}.`,
        compounds: entry.compounds || [{ word: entry.kanji, reading: entry.onyomi[0] || entry.kunyomi[0] || '-', meaning: entry.meaning }],
      }
    }

    // Default fallback metadata for uncatalogued Kanji characters
    return {
      kanji,
      hanViet: 'HÁN TỰ',
      meaning: `Ký tự chữ Hán: ${kanji}`,
      onyomi: ['-'],
      kunyomi: ['-'],
      jlpt: 'N3',
      grade: 'Thường dụng',
      strokeCount: kanji.length * 5,
      radical: 'Chữ Hán Nhật Bản',
      mnemonic: `Tập trung ghi nhớ cấu trúc các nét và bộ thủ của chữ ${kanji}.`,
      compounds: [{ word: kanji, reading: '-', meaning: `Chữ Hán ${kanji}` }],
    }
  }

  /**
   * Fetches KanjiVG vector SVG paths for the given character.
   * Priority: Built-in SVG -> LocalStorage Cache -> KanjiVG CDN (jsDelivr / GitHub)
   */
  public async getKanjiStrokes(kanji: string): Promise<KanjiStrokeSet> {
    // 1. Check built-in SVG repository
    if (BUILTIN_KANJIVG_SVGS[kanji]) {
      return parseKanjiVgSvg(BUILTIN_KANJIVG_SVGS[kanji], kanji)
    }

    // 2. Check local storage cache (LRU bounded via index list)
    const hex = this.getKanjiHex(kanji)
    const cacheKey = `${KANJI_SVG_CACHE_KEY}${hex}`
    try {
      const cachedSvg = localStorage.getItem(cacheKey)
      if (cachedSvg) {
        // Touch LRU order
        try {
          const idxRaw = localStorage.getItem(`${KANJI_SVG_CACHE_KEY}__index`)
          if (idxRaw) {
            const idx: string[] = JSON.parse(idxRaw)
            const pos = idx.indexOf(cacheKey)
            if (pos !== -1) {
              idx.splice(pos, 1)
              idx.push(cacheKey)
              localStorage.setItem(`${KANJI_SVG_CACHE_KEY}__index`, JSON.stringify(idx))
            }
          }
        } catch {
          // ignore
        }
        return parseKanjiVgSvg(cachedSvg, kanji)
      }
    } catch {
      // storage unavailable
    }

    // 3. Fetch from live KanjiVG CDN
    const cdnUrls = [
      `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
      `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`,
    ]

    for (const url of cdnUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const svgText = await res.text()
          if (svgText.includes('<path')) {
            try {
              // LRU cap 100 SVGs to avoid 5MB quota
              const idxKey = `${KANJI_SVG_CACHE_KEY}__index`
              let idx: string[] = []
              try {
                const raw = localStorage.getItem(idxKey)
                idx = raw ? JSON.parse(raw) : []
              } catch {
                idx = []
              }
              if (idx.length >= 100) {
                const evict = idx.shift()
                if (evict) {
                  try {
                    localStorage.removeItem(evict)
                  } catch {
                    // ignore
                  }
                }
              }
              localStorage.setItem(cacheKey, svgText)
              if (!idx.includes(cacheKey)) {
                idx.push(cacheKey)
                try {
                  localStorage.setItem(idxKey, JSON.stringify(idx))
                } catch {
                  // if index write fails due to quota, evict one more
                  const ev2 = idx.shift()
                  if (ev2) {
                    try {
                      localStorage.removeItem(ev2)
                      localStorage.setItem(idxKey, JSON.stringify(idx))
                      localStorage.setItem(cacheKey, svgText)
                    } catch {
                      // give up
                    }
                  }
                }
              }
            } catch (e) {
              if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                // Evict oldest and retry once
                try {
                  const idxKey2 = `${KANJI_SVG_CACHE_KEY}__index`
                  const raw2 = localStorage.getItem(idxKey2)
                  const idx2: string[] = raw2 ? JSON.parse(raw2) : []
                  const ev = idx2.shift()
                  if (ev) localStorage.removeItem(ev)
                  if (idx2.length) localStorage.setItem(idxKey2, JSON.stringify(idx2))
                  localStorage.setItem(cacheKey, svgText)
                  idx2.push(cacheKey)
                  localStorage.setItem(idxKey2, JSON.stringify(idx2))
                } catch {
                  // ignore
                }
              }
            }
            return parseKanjiVgSvg(svgText, kanji)
          }
        }
      } catch {
        // continue to next fallback
      }
    }

    // 4. Fallback: Generate basic geometric strokes if network is offline
    const fallbackSvg = `<svg viewBox="0 0 109 109"><g id="kvg:${hex}">
      <path id="kvg:${hex}-s1" d="M25,25 L75,25" />
      <path id="kvg:${hex}-s2" d="M50,25 L50,55" />
      <path id="kvg:${hex}-s3" d="M30,40 L70,40" />
      <path id="kvg:${hex}-s4" d="M30,55 L70,55" />
      <path id="kvg:${hex}-s5" d="M20,70 L80,70" />
      <path id="kvg:${hex}-s6" d="M35,70 L35,95" />
      <path id="kvg:${hex}-s7" d="M65,70 L65,95" />
    </g></svg>`

    return parseKanjiVgSvg(fallbackSvg, kanji)
  }

  private _combinedCache: KanjiDetail[] | null = null

  /**
   * Returns merged complete Joyo Kanji dictionary — memoized to avoid rebuilding 2136 entries on every search.
   */
  private getCombinedDictionary(): KanjiDetail[] {
    if (this._combinedCache) return this._combinedCache
    const map = new Map<string, KanjiDetail>()

    // Add all Joyo Kanji entries
    for (const entry of ALL_JOYO_KANJI) {
      map.set(entry.kanji, {
        kanji: entry.kanji,
        hanViet: entry.hanViet,
        meaning: entry.meaning,
        onyomi: entry.onyomi,
        kunyomi: entry.kunyomi,
        jlpt: entry.jlpt,
        grade: entry.grade || 'Thường dụng',
        strokeCount: entry.strokeCount,
        radical: entry.radical,
        mnemonic: entry.mnemonic || `Chữ Hán ${entry.hanViet} (${entry.kanji}) thuộc cấp độ ${entry.jlpt}.`,
        compounds: entry.compounds || [{ word: entry.kanji, reading: entry.onyomi[0] || entry.kunyomi[0] || '-', meaning: entry.meaning }],
      })
    }

    // Overlay rich built-in details
    for (const [char, detail] of Object.entries(BUILTIN_KANJI_DICT)) {
      map.set(char, detail)
    }

    this._combinedCache = Array.from(map.values())
    return this._combinedCache
  }

  /** Clear memoized dictionary — useful for tests or hot reload. */
  public clearCache(): void {
    this._combinedCache = null
    kanjiSearchEngine.indexKanji(this.getCombinedDictionary())
  }

  /**
   * Search Kanji in database by character, Hán Việt, Romaji, Hiragana, or Vietnamese meaning.
   * Powered by Compressed Radix Trie (O(k) prefix) and BK-Tree (O(log N) metric fuzzy search).
   */
  public searchKanji(query: string, jlptFilter?: string): KanjiDetail[] {
    const q = query.trim().toLowerCase()
    if (!q) {
      return this.listAllKanji(jlptFilter)
    }
    if (!kanjiSearchEngine.isIndexed()) {
      kanjiSearchEngine.indexKanji(this.getCombinedDictionary())
    }
    return kanjiSearchEngine.search(q, jlptFilter)
  }

  /**
   * Lists all available Kanji in the curriculum, optionally filtered by JLPT.
   */
  public listAllKanji(jlptFilter?: string): KanjiDetail[] {
    const all = this.getCombinedDictionary()
    if (!jlptFilter) return all
    return all.filter((k) => k.jlpt === jlptFilter)
  }

  /**
   * Retrieves a random Kanji character for shuffle practice mode.
   * Optionally filtered by JLPT and excluding recently practiced characters.
   */
  public getRandomKanji(jlptFilter?: string, excludeKanji: string[] = []): KanjiDetail {
    const list = this.listAllKanji(jlptFilter)
    if (list.length === 0) {
      return BUILTIN_KANJI_DICT['日'] || {
        kanji: '日',
        hanViet: 'NHẬT',
        meaning: 'Mặt trời, ngày',
        onyomi: ['ニチ'],
        kunyomi: ['ひ'],
        jlpt: 'N5',
        strokeCount: 4,
        radical: '日',
        mnemonic: 'Mặt trời chiếu sáng.',
        compounds: [],
      }
    }

    // Filter out excluded characters if possible
    let available = list.filter((k) => !excludeKanji.includes(k.kanji))
    if (available.length === 0) {
      available = list
    }

    const randomIndex = Math.floor(Math.random() * available.length)
    return available[randomIndex]
  }

  /**
   * Returns a shuffled list of Kanji characters for sequential practice.
   */
  public getShuffledKanjiList(jlptFilter?: string): KanjiDetail[] {
    const list = [...this.listAllKanji(jlptFilter)]
    // Fisher-Yates Shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = list[i]
      list[i] = list[j]
      list[j] = temp
    }
    return list
  }

  /**
   * Reads user's practice mastery state for a given Kanji.
   */
  public getMastery(kanji: string): KanjiMasteryState {
    try {
      const allMastery = JSON.parse(localStorage.getItem(KANJI_MASTERY_KEY) || '{}')
      return (
        allMastery[kanji] || {
          kanji,
          practicedCount: 0,
          bestScore: 0,
          stars: 0,
        }
      )
    } catch {
      return { kanji, practicedCount: 0, bestScore: 0, stars: 0 }
    }
  }

  /**
   * Saves or updates mastery result after a practice session.
   */
  public saveMastery(kanji: string, score: number, stars: number): KanjiMasteryState {
    try {
      const allMastery = JSON.parse(localStorage.getItem(KANJI_MASTERY_KEY) || '{}')
      const current: KanjiMasteryState = allMastery[kanji] || {
        kanji,
        practicedCount: 0,
        bestScore: 0,
        stars: 0,
      }

      const updated: KanjiMasteryState = {
        kanji,
        practicedCount: current.practicedCount + 1,
        bestScore: Math.max(current.bestScore, score),
        stars: Math.max(current.stars, stars),
        lastPracticed: new Date().toISOString(),
      }

      allMastery[kanji] = updated
      localStorage.setItem(KANJI_MASTERY_KEY, JSON.stringify(allMastery))
      return updated
    } catch {
      return { kanji, practicedCount: 1, bestScore: score, stars }
    }
  }

  /**
   * Returns all recorded Kanji mastery data.
   */
  public getAllMastery(): Record<string, KanjiMasteryState> {
    try {
      return JSON.parse(localStorage.getItem(KANJI_MASTERY_KEY) || '{}')
    } catch {
      return {}
    }
  }
}

export const kanjiService = new KanjiService()
