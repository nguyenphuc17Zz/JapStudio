"""Builder seed pools — 30 curated items (12 assemble + 9 expand + 9 repair).

Daily-life + business topics. Small explicit seed only; infinite variety via
dynamic_generator.py (AI) with template fallback. Each item targets ONE
clause skill: te_chain | relative_clause | conditional | nominalization | contraction.
"""

from __future__ import annotations

from typing import Any

ASSEMBLE_SEEDS: list[dict[str, Any]] = [
    {"keywords": ["昨日", "映画", "友達", "面白い"], "starter": "昨日、友達と…", "focus_skill": "te_chain", "relation": "casual_friend",
     "situation_vi": "Kể là hôm qua xem phim với bạn, hay lắm", "connectors": ["て", "で", "くて"],
     "canonical": "昨日友達と見た映画がめっちゃ面白くてさ！", "canonical_vi": "Hôm qua bộ phim xem cùng bạn hay cực kỳ luôn á!"},
    {"keywords": ["朝", "電車", "遅れる", "会社"], "starter": "朝、電車が…", "focus_skill": "te_chain", "relation": "casual_friend",
     "situation_vi": "Kể là sáng nay tàu trễ nên muộn giờ làm", "connectors": ["て", "で", "ので"],
     "canonical": "今朝電車が遅れちゃって、会社に遅刻しちゃった。", "canonical_vi": "Sáng nay tàu trễ nên mình bị muộn giờ làm mất tiêu."},
    {"keywords": ["昨日買う", "本", "面白い", "読む"], "starter": None, "focus_skill": "relative_clause", "relation": "casual_friend",
     "situation_vi": "Kể về cuốn sách mua hôm qua, hay nên đang đọc", "connectors": ["た", "てる", "ている"],
     "canonical": "昨日買った本が面白くて、今夢中で読んでるんだ。", "canonical_vi": "Quyển sách mua hôm qua hay lắm nên giờ mình đang say sưa đọc."},
    {"keywords": ["駅前", "開店", "ラーメン屋", "行列"], "starter": "駅前に…", "focus_skill": "relative_clause", "relation": "casual_friend",
     "situation_vi": "Kể về quán ramen mới mở trước ga, đông xếp hàng", "connectors": ["た", "ている", "てる"],
     "canonical": "駅前に開店したラーメン屋、すごい行列ができてるよ。", "canonical_vi": "Quán ramen mới mở trước ga đang xếp hàng dài ghê luôn."},
    {"keywords": ["時間", "ある", "京都", "行く"], "starter": None, "focus_skill": "conditional", "relation": "casual_friend",
     "situation_vi": "Nói là nếu có thời gian thì muốn đi Kyoto", "connectors": ["たら", "ば", "なら"],
     "canonical": "時間があったら、京都に旅行に行きたいな。", "canonical_vi": "Nếu có thời gian thì mình muốn đi du lịch Kyoto."},
    {"keywords": ["安い", "買う", "高い", "我慢"], "starter": "安かったら…", "focus_skill": "conditional", "relation": "casual_friend",
     "situation_vi": "Nói là nếu rẻ thì mua, đắt thì nhịn", "connectors": ["たら", "ば", "けど"],
     "canonical": "安かったら買うけど、高かったら我慢するよ。", "canonical_vi": "Nếu rẻ thì mua chứ đắt quá thì mình nhịn."},
    {"keywords": ["会議", "長い", "疲れる", "帰りたい"], "starter": None, "focus_skill": "nominalization", "relation": "business_polite",
     "situation_vi": "Nói là vì họp dài quá mệt nên muốn về", "connectors": ["ので", "わけ", "んです"],
     "canonical": "会議が長くて疲れたので、早く帰りたいです。", "canonical_vi": "Vì cuộc họp dài mệt mỏi quá nên tôi muốn về sớm."},
    {"keywords": ["資料", "確認", "明日", "提出"], "starter": "資料を確認して…", "focus_skill": "te_chain", "relation": "business_polite",
     "situation_vi": "Nói là check tài liệu xong mai nộp", "connectors": ["て", "ので", "ます"],
     "canonical": "資料を確認しまして、明日提出いたします。", "canonical_vi": "Tôi đã kiểm tra tài liệu và ngày mai sẽ xin phép nộp ạ."},
    {"keywords": ["先週提案", "企画", "通る", "嬉しい"], "starter": None, "focus_skill": "relative_clause", "relation": "business_polite",
     "situation_vi": "Kể là企画 đề xuất tuần trước được duyệt nên vui", "connectors": ["た", "ので", "です"],
     "canonical": "先週提案した企画が無事に通って、とても嬉しいです。", "canonical_vi": "Đề án đề xuất tuần trước đã được duyệt suôn sẻ nên tôi rất vui."},
    {"keywords": ["納期", "遅れる", "連絡", "謝る"], "starter": "納期が…", "focus_skill": "te_chain", "relation": "business_polite",
     "situation_vi": "Nói là deadline trễ nên liên lạc xin lỗi", "connectors": ["て", "ので", "申し訳"],
     "canonical": "納期が遅れる件につきまして、ご連絡の上お詫び申し上げます。", "canonical_vi": "Về việc chậm tiến độ, tôi xin phép liên hệ để thành thật xin lỗi."},
    {"keywords": ["雨", "降る", "試合", "中止"], "starter": None, "focus_skill": "conditional", "relation": "casual_friend",
     "situation_vi": "Nói là nếu mưa thì trận đấu hủy", "connectors": ["たら", "ば", "ので"],
     "canonical": "もし雨が降ったら、明日の試合は中止になるよ。", "canonical_vi": "Nếu mà trời mưa thì trận đấu ngày mai sẽ bị hủy đó."},
    {"keywords": ["知る", "店", "安い", "美味しい"], "starter": "知ってる…", "focus_skill": "contraction", "relation": "casual_friend",
     "situation_vi": "Giới thiệu quán quen rẻ mà ngon", "connectors": ["てる", "てる", "じゃん"],
     "canonical": "私の知ってる店は、安くてめっちゃ美味しいじゃん！", "canonical_vi": "Cái quán mà mình biết vừa rẻ lại vừa ngon tuyệt cú mèo luôn á!"},
]

EXPAND_SEEDS: list[dict[str, Any]] = [
    {"source": "映画を見た。", "requirement": "relative_clause", "focus_skill": "relative_clause", "relation": "casual_friend",
     "situation_vi": "Mở rộng: nói rõ xem phim nào, với ai", "connectors": ["た", "てる"],
     "canonical": "昨日友達と一緒に、話題のアニメ映画を見たんだ。", "canonical_vi": "Hôm qua mình đã cùng bạn đi xem bộ phim hoạt hình đang hot."},
    {"source": "疲れた。", "requirement": "reason-node", "focus_skill": "nominalization", "relation": "casual_friend",
     "situation_vi": "Mở rộng: thêm lý do mệt (họp dài...)", "connectors": ["ので", "て", "わけ"],
     "canonical": "朝からずっと会議続きで、本当に疲れちゃったよ。", "canonical_vi": "Họp liên miên từ sáng tới giờ nên mình mệt lử cả người rồi."},
    {"source": "京都に行きたい。", "requirement": "conditional", "focus_skill": "conditional", "relation": "casual_friend",
     "situation_vi": "Mở rộng: thêm điều kiện (nếu có thời gian...)", "connectors": ["たら", "ば", "なら"],
     "canonical": "来週まとまった休みが取れたら、京都に行きたいな。", "canonical_vi": "Nếu tuần sau xin nghỉ được mấy ngày liền thì mình muốn đi Kyoto."},
    {"source": "この店は美味しい。", "requirement": "relative-reason", "focus_skill": "relative_clause", "relation": "casual_friend",
     "situation_vi": "Mở rộng: thêm chi tiết món nào ngon + rủ đi", "connectors": ["た", "ので", "じゃん"],
     "canonical": "この店はラーメンが安くて美味しいから、今度一緒に行こうよ！", "canonical_vi": "Quán này ramen vừa rẻ vừa ngon, hôm nào đi cùng nhau nhé!"},
    {"source": "会議が長い。", "requirement": "reason-result", "focus_skill": "nominalization", "relation": "business_polite",
     "situation_vi": "Mở rộng: thêm kết quả (mệt, muốn về sớm...)", "connectors": ["ので", "わけ", "です"],
     "canonical": "本日の会議が長引いておりまして、終了が遅れそうです。", "canonical_vi": "Cuộc họp hôm nay đang bị kéo dài nên dự kiến sẽ kết thúc muộn ạ."},
    {"source": "資料を確認しました。", "requirement": "te-next", "focus_skill": "te_chain", "relation": "business_polite",
     "situation_vi": "Mở rộng: thêm hành động tiếp theo (mai nộp...)", "connectors": ["て", "ます"],
     "canonical": "先ほど資料を確認いたしましたので、明日中にご提出いたします。", "canonical_vi": "Tôi vừa kiểm tra tài liệu xong rồi, trong ngày mai tôi sẽ gửi nộp ạ."},
    {"source": "雨が降っている。", "requirement": "conditional-result", "focus_skill": "conditional", "relation": "casual_friend",
     "situation_vi": "Mở rộng: thêm hệ quả (trận đấu sao, umbrella...)", "connectors": ["たら", "ので", "て"],
     "canonical": "外は強い雨が降っているから、傘を持って出かけた方がいいよ。", "canonical_vi": "Ngoài trời đang mưa to đấy, cậu nên cầm ô theo khi ra ngoài nhé."},
    {"source": "新しい企画を考えた。", "requirement": "reason-aim", "focus_skill": "nominalization", "relation": "business_polite",
     "situation_vi": "Mở rộng: thêm mục đích + mong muốn", "connectors": ["ので", "たい", "です"],
     "canonical": "売上向上のための新しい企画を考えましたので、ぜひご提案させてください。", "canonical_vi": "Tôi đã nghĩ ra đề án mới nhằm nâng cao doanh số, xin phép được trình bày đề xuất ạ."},
    {"source": "昨日は楽しかった。", "requirement": "te-detail", "focus_skill": "te_chain", "relation": "casual_friend",
     "situation_vi": "Mở rộng: thêm chi tiết đã làm gì mà vui", "connectors": ["て", "で", "た"],
     "canonical": "昨日はみんなで美味しい鍋を食べて、すごく楽しかったよ！", "canonical_vi": "Hôm qua mọi người cùng ăn lẩu ngon tuyệt, vui ơi là vui luôn!"},
]

REPAIR_SEEDS: list[dict[str, Any]] = [
    {"source": "昨日は映画を見ました、とても面白かったです。", "focus_skill": "contraction", "relation": "casual_friend",
     "situation_vi": "Nói với bạn: hôm qua xem phim hay lắm", "fix_hint": "Nối 2 câu + contraction + sentence-end casual", "connectors": ["て", "てる", "よ"],
     "canonical": "昨日見た映画がめっちゃ面白くてさ！", "canonical_vi": "Hôm qua bộ phim mình xem hay dã man luôn á!"},
    {"source": "私は昨日友達と映画館へ行きました。", "focus_skill": "contraction", "relation": "casual_friend",
     "situation_vi": "Kể tự nhiên: hôm qua đi rạp với bạn", "fix_hint": "Bỏ 私は・へ→に + てる", "connectors": ["てる", "た"],
     "canonical": "昨日友達と映画館に行ってきたんだよね。", "canonical_vi": "Hôm qua mình vừa đi rạp chiếu phim với bạn về này."},
    {"source": "時間があれば京都へ行きたいと思います。", "focus_skill": "contraction", "relation": "casual_friend",
     "situation_vi": "Nói với bạn: có thời gian thì muốn đi Kyoto", "fix_hint": "へ→に + と思う→といいな/行きたいな", "connectors": ["たら", "たいな"],
     "canonical": "時間があったら京都に行きたいな！", "canonical_vi": "Nếu có thời gian thì muốn đi Kyoto ghê á!"},
    {"source": "電車が遅れましたので会社に遅刻しました。", "focus_skill": "te_chain", "relation": "casual_friend",
     "situation_vi": "Than với bạn: tàu trễ nên muộn làm", "fix_hint": "ので→て/で + ました→た", "connectors": ["て", "で", "ちゃって"],
     "canonical": "電車が遅れちゃって、会社に遅刻したんだ。", "canonical_vi": "Tàu điện bị trễ nên mình muộn giờ làm mất tiêu."},
    {"source": "知っています店は安くて美味しいです。", "focus_skill": "relative_clause", "relation": "casual_friend",
     "situation_vi": "Giới thiệu quán quen rẻ ngon", "fix_hint": "知っています→知ってる + relative clause", "connectors": ["てる", "て", "じゃん"],
     "canonical": "よく知ってる店なんだけど、安くて美味しいんだよね。", "canonical_vi": "Quán mình quen này rẻ mà ăn ngon lắm đấy."},
    {"source": "うん、はい、そうですね。", "focus_skill": "contraction", "relation": "casual_friend",
     "situation_vi": "Bạn kể chuyện, bạn chỉ đáp cụt", "fix_hint": "Thêm aizuchi đa dạng + followup", "connectors": ["へー", "マジ"],
     "canonical": "へー、マジで！？それでどうなったの？", "canonical_vi": "Hả, thật á!? Rồi sau đó thế nào nữa?"},
    {"source": "納期が遅れて、すみません。", "focus_skill": "nominalization", "relation": "business_polite",
     "situation_vi": "Xin lỗi khách: deadline trễ", "fix_hint": "Thêm lý do + 誠に申し訳ございません + 対応策", "connectors": ["ので", "ます", "ます"],
     "canonical": "納期が遅れてしまい、誠に申し訳ございません。明日中に挽回いたします。", "canonical_vi": "Tiến độ bàn giao bị chậm trễ, tôi vô cùng xin lỗi. Tôi sẽ cố gắng bù đắp trong ngày mai ạ."},
    {"source": "会議は長いです、疲れました。", "focus_skill": "te_chain", "relation": "business_polite",
     "situation_vi": "Báo cáo: họp dài nên mệt", "fix_hint": "Nối 2 câu bằng ので + 丁寧体 nhất quán", "connectors": ["ので", "まして", "です"],
     "canonical": "会議が長引いてしまい、大変疲れました。", "canonical_vi": "Cuộc họp bị kéo dài quá nên tôi rất mệt ạ."},
    {"source": "提案した企画は通りました、嬉しいです。", "focus_skill": "relative_clause", "relation": "business_polite",
     "situation_vi": "Báo tin:企画 được duyệt, vui", "fix_hint": "Relative clause + ので + ます", "connectors": ["た", "ので", "ます"],
     "canonical": "先週ご提案した企画が無事に通りまして、大変嬉しく存じます。", "canonical_vi": "Đề án đề xuất tuần trước đã được thông qua suôn sẻ, tôi cảm thấy rất vinh hạnh và vui mừng."},
]

# Clause connector markers per skill (deterministic detection, policy <300 lines)
SKILL_MARKERS: dict[str, list[str]] = {
    "te_chain": ["て", "で", "くて", "いて", "んで", "っちゃって", "ちゃって", "まして"],
    "relative_clause": [],  # detected structurally (verb-plain + noun), see scoring
    "conditional": ["たら", "れば", "なら", "と", "ても", "でも"],
    "nominalization": ["わけ", "はず", "こと", "の", "んです", "のです", "ため"],
    "contraction": ["てる", "ちゃう", "じゃう", "じゃん", "っけ", "もん", "っす", "てる"],
}

# Casual vs business register markers (shared with aizuchi policy)
CASUAL_MARKERS = ["じゃん", "っけ", "もん", "マジ", "まじ", "めっちゃ", "やば", "だよね", "なんだ", "てる", "ちゃう"]
BUSINESS_MARKERS = ["です", "ます", "ございます", "存じます", "いただ", "させていただ", "恐れ入り", "申し訳"]


def get_seed_pool(sub_mode: str) -> list[dict[str, Any]]:
    if sub_mode == "sentence_expand":
        return EXPAND_SEEDS
    if sub_mode == "sentence_repair":
        return REPAIR_SEEDS
    return ASSEMBLE_SEEDS


def coverage_of(transcript: str, keywords: list[str]) -> tuple[list[str], list[str]]:
    """Returns (used, missing) keyword stems found as substrings."""
    used, missing = [], []
    for kw in keywords or []:
        stem = kw.replace("する", "").replace("ある", "")[:2] if len(kw) > 2 else kw
        if kw and (kw in transcript or (stem and stem in transcript)):
            used.append(kw)
        else:
            missing.append(kw)
    return used, missing
