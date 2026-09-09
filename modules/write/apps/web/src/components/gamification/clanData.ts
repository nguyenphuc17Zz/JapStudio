export type ClanId = 'sakura' | 'ryu' | 'tsuki' | 'raijin'

export interface ClanInfo {
  id: ClanId
  name: string
  kanji: string
  title: string
  philosophy: string
  motto: string
  color: string
  icon: string
}

export const CLANS: Record<ClanId, ClanInfo> = {
  sakura: {
    id: 'sakura',
    name: 'Gia Tộc Anh Đào',
    kanji: '桜門',
    title: 'Văn Chương & Cảm Xúc',
    philosophy: 'Nhã nhặn, thi vị, ngôn từ chạm đến trái tim người đọc.',
    motto: '一期一会 (Nhất kỳ nhất hội)',
    color: '#f472b6',
    icon: '🌸',
  },
  ryu: {
    id: 'ryu',
    name: 'Gia Tộc Hoàng Long',
    kanji: '竜門',
    title: 'Uy Lực & Luận Điểm',
    philosophy: 'Lập luận sắc bén, câu từ đanh thép và thuyết phục tuyệt đối.',
    motto: '竜騰虎闘 (Long đằng hổ đấu)',
    color: '#fbbf24',
    icon: '🐉',
  },
  tsuki: {
    id: 'tsuki',
    name: 'Gia Tộc Dạ Nguyệt',
    kanji: '月門',
    title: 'Triết Lý & Tĩnh Tâm',
    philosophy: 'Trầm mặc, sâu lắng, tìm kiếm sự an yên trong từng nét bút.',
    motto: '明鏡止水 (Minh kính chỉ thủy)',
    color: '#8b5cf6',
    icon: '🌙',
  },
  raijin: {
    id: 'raijin',
    name: 'Gia Tộc Lôi Thần',
    kanji: '雷神門',
    title: 'Tốc Độ & Phản Biện',
    philosophy: 'Tốc chiến tốc thắng, tư duy nhạy bén và xử lý tình huống siêu tốc.',
    motto: '疾風迅雷 (Tật phong tấn lôi)',
    color: '#38bdf8',
    icon: '⚡',
  },
}

export const CLAN_STORAGE_KEY = 'jws.user.clan'
