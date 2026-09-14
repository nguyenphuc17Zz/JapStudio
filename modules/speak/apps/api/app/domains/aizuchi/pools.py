"""Aizuchi turn pools — 30 curated NPC turns (15 casual + 15 business).

Small explicit seed pool only. Infinite variety comes from AIReflex-style
dynamic generation (dynamic_generator.py) with template fallback.
Each turn: NPC line + expected backchannel types.
Types: surprise | empathy | continuer | followup | polite_interrupt
"""

from __future__ import annotations

from typing import Any

CASUAL_TURNS: list[dict[str, Any]] = [
    {"text": "昨日さ、電車が止まっちゃってさー", "text_vi": "Hôm qua ấy, tàu điện đột nhiên bị dừng lại luôn á.",
     "expected_types": ["surprise", "empathy"], "sample_responses": ["えー、マジで！？", "えっ、本当？", "大変だったね"]},
    {"text": "で、タクシー乗ろうと思ったんだけどー", "text_vi": "Thế là định bắt taxi đi...",
     "expected_types": ["continuer"], "sample_responses": ["うんうん", "それで？", "うん"]},
    {"text": "なんと1時間も待たされてさ、マジ最悪だったよ", "text_vi": "Thế quái nào bị bắt đợi tận 1 tiếng đồng hồ, tệ dã man luôn.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["うわー、最悪だね…", "それは大変だったね", "で、間に合ったの？"]},
    {"text": "この前の飲み会、めっちゃ盛り上がったんだよね", "text_vi": "Bữa nhậu hôm nọ vui vẻ náo nhiệt dã man luôn á.",
     "expected_types": ["surprise", "continuer"], "sample_responses": ["へー、よかったじゃん！", "楽しそうだね", "誰が来たの？"]},
    {"text": "田中さん、彼女できたらしいよ", "text_vi": "Nghe nói anh Tanaka mới có người yêu rồi đấy!",
     "expected_types": ["surprise", "followup"], "sample_responses": ["へー！そうなんだ！", "えっ、マジで！？", "誰と付き合ったの？"]},
    {"text": "それでさ、告白するって言ってたんだけど", "text_vi": "Xong rồi bảo là đi tỏ tình ấy...",
     "expected_types": ["continuer", "surprise"], "sample_responses": ["うんうん、それで？", "え、ついに！？", "どうなったの？"]},
    {"text": "結果、フラれちゃったんだって", "text_vi": "Kết quả là bị từ chối rồi, tiếc thật.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["えー…残念だね…", "マジで？かわいそう…", "大丈夫だったのかな？"]},
    {"text": "新しいラーメン屋、行列がやばかったんだよ", "text_vi": "Quán ramen mới mở, người ta xếp hàng đông kinh khủng khiếp luôn.",
     "expected_types": ["surprise", "continuer"], "sample_responses": ["へー！そんなに！？", "マジで？人気なんだね", "うんうん"]},
    {"text": "2時間並んで、やっと食べられたんだけど", "text_vi": "Xếp hàng 2 tiếng đồng hồ mới được ăn đấy...",
     "expected_types": ["empathy", "continuer"], "sample_responses": ["2時間も！？大変だったね", "お疲れー！", "それで味はどうだった？"]},
    {"text": "味はね、正直微妙だったんだよね", "text_vi": "Vị thì nói thật là cũng bình thường, không ngon lắm.",
     "expected_types": ["surprise", "followup"], "sample_responses": ["えー、マジで！？", "あんなに並んだのに！？", "もったいなかったね"]},
    {"text": "来週、京都に旅行行くことにしたんだ", "text_vi": "Tuần sau mình quyết định đi du lịch Kyoto rồi!",
     "expected_types": ["surprise", "followup"], "sample_responses": ["いいねー！", "へー、京都！誰と行くの？", "楽しんできてね！"]},
    {"text": "紅葉の時期だから、ホテル高くてさー", "text_vi": "Đang mùa lá đỏ nên giá khách sạn đắt đỏ ghê luôn.",
     "expected_types": ["empathy", "continuer"], "sample_responses": ["確かに、シーズンだもんね", "そうだよねー、高いよね", "うんうん"]},
    {"text": "でも、どうしても行きたくて予約しちゃった", "text_vi": "Nhưng mà muốn đi quá nên đặt phòng luôn rồi.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["あはは、思い切ったね！", "いいじゃん！どこ泊まるの？", "楽しそうだね"]},
    {"text": "昨日、財布落としちゃったんだよね", "text_vi": "Hôm qua mình đánh rơi ví tiền mất tiêu...",
     "expected_types": ["surprise", "empathy"], "sample_responses": ["えっ、マジで！？大丈夫！？", "うわー、大変だ…", "見つかったの！？"]},
    {"text": "交番に届けられてて、無事戻ってきたんだけど", "text_vi": "Có người mang nộp đồn công an nên đã nhận lại an toàn rồi.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["よかったー！本当に安心したね", "日本ってすごいね", "中身は無事だった？"]},
]

BUSINESS_TURNS: list[dict[str, Any]] = [
    {"text": "先日のご提案ですが、社内で検討させていただきました", "text_vi": "Về đề xuất hôm trước của quý công ty, chúng tôi đã thảo luận trong nội bộ.",
     "expected_types": ["continuer"], "sample_responses": ["はい", "ありがとうございます", "いかがでしたでしょうか"]},
    {"text": "コスト面で少し厳しいという意見が出ておりまして", "text_vi": "Hiện đang có ý kiến cho rằng mức chi phí hơi khó để thông qua.",
     "expected_types": ["empathy", "continuer"], "sample_responses": ["さようでございますか", "ご懸念ごもっともです", "なるほど"]},
    {"text": "ただ、内容自体は高く評価しております", "text_vi": "Tuy nhiên, bản thân nội dung đề án thì được đánh giá rất cao.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["ありがとうございます", "そう言っていただけて光栄です", "具体的にはどの部分でしょうか"]},
    {"text": "来週の会議の日程を調整させていただきたいのですが", "text_vi": "Tôi xin phép được điều chỉnh lịch cuộc họp vào tuần tới.",
     "expected_types": ["continuer"], "sample_responses": ["はい、承知いたしました", "かしこまりました", "日程はいかがでしょうか"]},
    {"text": "火曜か水曜の午後でご都合いかがでしょうか", "text_vi": "Chiều thứ Ba hoặc thứ Tư thì lịch trình của quý vị có tiện không ạ?",
     "expected_types": ["followup"], "sample_responses": ["火曜日の午後でしたら問題ございません", "確認いたします", "水曜日でお願いいたします"]},
    {"text": "納期についてなのですが、少し遅れる見込みです", "text_vi": "Về tiến độ bàn giao sản phẩm, dự kiến sẽ bị chậm một chút ạ.",
     "expected_types": ["empathy", "continuer"], "sample_responses": ["さようでございますか", "どれくらいの遅れになりそうでしょうか", "かしこまりました"]},
    {"text": "最大で3日程度の遅延かと存じます", "text_vi": "Tôi e là sẽ chậm tối đa khoảng 3 ngày ạ.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["3日ですね、承知いたしました", "対応策は何かございますでしょうか", "分かりました"]},
    {"text": "ご迷惑をおかけし、誠に申し訳ございません", "text_vi": "Chúng tôi vô cùng xin lỗi vì sự bất tiện này.",
     "expected_types": ["empathy"], "sample_responses": ["いえ、事前にご連絡いただき助かります", "引き続きよろしくお願いいたします", "承知いたしました"]},
    {"text": "新商品の売れ行きが予想を上回っておりまして", "text_vi": "Tình hình tiêu thụ sản phẩm mới đang vượt mức dự kiến ban đầu.",
     "expected_types": ["surprise", "continuer"], "sample_responses": ["素晴らしいですね！", "それは何よりでございます", "おめでとうございます"]},
    {"text": "在庫の追加発注を検討している段階です", "text_vi": "Chúng tôi đang trong giai đoạn xem xét đặt thêm hàng tồn kho.",
     "expected_types": ["continuer", "followup"], "sample_responses": ["はい、かしこまりました", "迅速に対応させていただきます", "数量はどのくらいでしょうか"]},
    {"text": "部長からも高い評価をいただきました", "text_vi": "Trưởng phòng cũng đã dành lời khen ngợi rất cao ạ.",
     "expected_types": ["surprise", "empathy"], "sample_responses": ["恐れ入ります、光栄です", "大変励みになります", "ありがとうございます"]},
    {"text": "この調子で年末商戦に臨みたいと思います", "text_vi": "Chúng tôi muốn duy trì đà này để chuẩn bị cho đợt kinh doanh cuối năm.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["ぜひ協力させてください", "応援しております", "弊社もお力添えいたします"]},
    {"text": "システム障害の件でご報告がございます", "text_vi": "Tôi xin phép được báo cáo về sự cố hệ thống vừa qua.",
     "expected_types": ["continuer"], "sample_responses": ["はい、お願いします", "どのような状況でしょうか", "かしこまりました"]},
    {"text": "現在、原因を調査中でして、復旧は明日中の見込みです", "text_vi": "Hiện chúng tôi đang điều tra nguyên nhân, dự kiến sẽ khắc phục xong trong ngày mai.",
     "expected_types": ["empathy", "followup"], "sample_responses": ["承知いたしました、よろしくお願いいたします", "原因が判明次第ご連絡いただけますか", "大変ですね"]},
    {"text": "お客様へのご説明は弊社から対応させていただきます", "text_vi": "Việc giải thích với khách hàng sẽ do phía chúng tôi trực tiếp phụ trách.",
     "expected_types": ["empathy", "continuer"], "sample_responses": ["お手数をおかけいたします", "助かります、よろしくお願いいたします", "承知いたしました"]},
]

# Backchannel surface forms per type (deterministic classification, policy <300 lines)
BC_FORMS: dict[str, list[str]] = {
    "surprise": ["へー", "えー", "マジで", "まじで", "そうなんだ", "本当に", "ほんと", "うそ", "やば"],
    "empathy": ["確かに", "だよね", "そうだよね", "大変だね", "たいへんだね", "それは", "最悪だね", "よかったね", "お疲れ"],
    "continuer": ["うん", "うんうん", "はい", "ええ", "ふーん", "なるほど"],
    "followup": ["それで", "どうしたの", "どうなったの", "その後", "じゃあ", "でどう", "でその", "でそれ", "でじゃあ", "で"],
    "polite_interrupt": ["すみません", "ちょっとよろしい", "恐れ入ります", "失礼ですが", "お時間よろしい"],
}

# Single-char forms only match standalone (exact) to avoid particle false-positives,
# e.g. bare 'で' continuer must NOT match inside 'でしょうか'.
_STANDALONE_ONLY = {"で"}

# Casual register markers (informal) vs business register markers (polite)
CASUAL_MARKERS = ["じゃん", "っけ", "もん", "マジ", "まじ", "めっちゃ", "やば", "だよね", "なんだ"]
BUSINESS_MARKERS = ["です", "ます", "ございます", "存じます", "いただ", "させていただ", "恐れ入り", "申し訳"]


def get_pool(relation: str) -> list[dict[str, Any]]:
    if relation == "business_polite":
        return BUSINESS_TURNS
    return CASUAL_TURNS


def classify_bc_type(normalized_text: str) -> str:
    """Deterministic backchannel type classification. Returns 'other' when unknown."""
    t = (normalized_text or "").strip()
    if not t:
        return "other"
    # Multi-char forms first (substring); single-char starters only at string head
    # to avoid 'で' matching inside 'でしょうか' etc.
    for bc_type, forms in BC_FORMS.items():
        for form in sorted(forms, key=len, reverse=True):
            if len(form) == 1:
                continue
            if form in t:
                return bc_type
    for bc_type, forms in BC_FORMS.items():
        for form in forms:
            if form in _STANDALONE_ONLY:
                if t == form:
                    return bc_type
            elif len(form) == 1 and len(t) > 2 and t.startswith(form):
                return bc_type
    return "other"
