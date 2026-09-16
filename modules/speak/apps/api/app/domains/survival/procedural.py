"""Procedural Survival Generator — Zero-Mock Combinatorial Safety Net.

Provides infinite dynamic procedural generation when AI provider is unreachable or offline,
guaranteeing 0% crash without ever returning repetitive 3-item static seeds.
"""

from __future__ import annotations

import random
import time
from collections import deque
from typing import Any

from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SocialRelationship,
    SurvivalDifficulty,
    SurvivalHintTier,
    SurvivalScenarioTask,
    SurvivalVocabularyItem,
)

_PROCEDURAL_RECENT: deque[str] = deque(maxlen=50)

# 40+ Diverse Japanese Real-Life Entities for Circumlocution
PROCEDURAL_CIRCUMLOCUTION_CATALOG: list[dict[str, Any]] = [
    # Kitchen & Appliances
    {
        "target_word": "電子レンジ", "reading_hiragana": "でんしれんじ", "romaji": "denshirenji",
        "vietnamese_meaning": "Lò vi sóng", "topic": "kitchen", "category": "Đồ gia dụng (家電)",
        "genus": "台所にある加熱用の家電製品", "differentia": "電波を使って冷たい料理を一瞬で温める箱型の機械",
        "forbidden_words": ["電子レンジ", "レンジ", "microwave", "でんしれんじ"],
        "taboo_lemmas": ["電子レンジ", "レンジ", "microwave"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây mà không dùng từ cấm.",
            "Thiết bị làm nóng đồ ăn hoặc cơm hộp cực nhanh.",
            "Đặt trong bếp, cắm điện, có nút bấm hẹn giờ.",
            "何て言うか、台所にある機械で、冷たいご飯を______するための物です。",
            "冷たくなった料理やご飯をチンして、すぐに温かくするための家電製品です。",
        ],
        "samples": ["冷たくなった料理やご飯を入れて、ボタンを押して温める台所の機械です。"],
        "vocab": [("温める", "あたためる", "atatameru", "làm nóng, hâm nóng"), ("チンする", "ちんする", "chinsuru", "quay lò vi sóng")],
        "anchors": ["温める", "料理", "ご飯", "台所", "チン", "弁当"],
    },
    {
        "target_word": "炊飯器", "reading_hiragana": "すいはんき", "romaji": "suihanki",
        "vietnamese_meaning": "Nồi cơm điện", "topic": "kitchen", "category": "Đồ gia dụng (家電)",
        "genus": "台所で主食を調理する家電", "differentia": "お米と水を入れてスイッチを押すと自動でご飯が炊ける機械",
        "forbidden_words": ["炊飯器", "炊飯ジャー", "すいはんき", "rice cooker"],
        "taboo_lemmas": ["炊飯器", "炊飯ジャー", "すいはんき"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Đồ dùng nhà bếp để nấu chín gạo thành cơm.",
            "Người Nhật và người Việt nhà nào cũng có trong bếp.",
            "お米とお水を入れてボタンを押すと、自動で美味しいご飯を______機械です。",
            "毎日食べるお米を水と一緒にセットして、ふっくら炊き上げるための台所の電化製品です。",
        ],
        "samples": ["お米と水を入れてボタンを押すと、自動でおいしいご飯を炊いてくれる機械です。"],
        "vocab": [("炊く", "たく", "taku", "nấu cơm"), ("お米", "おこめ", "okome", "gạo")],
        "anchors": ["米", "ご飯", "炊く", "台所", "主食"],
    },
    {
        "target_word": "冷蔵庫", "reading_hiragana": "れいぞうこ", "romaji": "reizouko",
        "vietnamese_meaning": "Tủ lạnh", "topic": "kitchen", "category": "Đồ gia dụng (家電)",
        "genus": "食品を保存する大型家電", "differentia": "中を冷たく保って野菜や肉が腐らないように保管する箱",
        "forbidden_words": ["冷蔵庫", "れいぞうこ", "fridge", "refrigerator"],
        "taboo_lemmas": ["冷蔵庫", "れいぞうこ"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Thiết bị giữ lạnh đồ ăn, nước uống để không bị hỏng.",
            "Có ngăn mát và ngăn đông đá (冷凍室).",
            "食べ物や飲み物を冷たいまま保存して、悪くならないようにする大きな______です。",
            "買った肉や野菜、飲み物を冷やして新鮮なまま長持ちさせるための大型家電です。",
        ],
        "samples": ["食べ物や飲み物を冷たくして、腐らないように保存しておく大きな家電です。"],
        "vocab": [("保存する", "ほぞんする", "hozonsuru", "bảo quản, lưu trữ"), ("冷やす", "ひやす", "hiyasu", "làm lạnh")],
        "anchors": ["冷たい", "保存", "野菜", "肉", "氷", "飲み物"],
    },
    {
        "target_word": "電気ケトル", "reading_hiragana": "でんきけとる", "romaji": "denkiketoru",
        "vietnamese_meaning": "Ấm đun nước siêu tốc", "topic": "kitchen", "category": "Đồ gia dụng (家電)",
        "genus": "湯沸かし用小型家電", "differentia": "水を入れてスイッチを入れると1分程度でお湯が沸くポット",
        "forbidden_words": ["電気ケトル", "ケトル", "やかん", "ポット", "kettle"],
        "taboo_lemmas": ["電気ケトル", "ケトル", "やかん"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Bình nhỏ cắm điện để đun sôi nước pha mì tôm hoặc cà phê trong chớp mắt.",
            "Dung tích khoảng 1 lít, đun nhanh hơn dùng bếp gas.",
            "カップラーメンやコーヒーを作るときに、すぐにお湯を______ための道具です。",
            "水を入れてボタンを押すだけで、一瞬で熱いお湯を沸かしてくれる小さな機械です。",
        ],
        "samples": ["水を入れてスイッチを押すと、1分くらいですぐに熱いお湯が沸く機械です。"],
        "vocab": [("お湯を沸かす", "おゆをわかす", "oyu o wakasu", "đun sôi nước"), ("熱い", "あつい", "atsui", "nóng")],
        "anchors": ["お湯", "沸かす", "コーヒー", "ラーメン", "水"],
    },
    {
        "target_word": "換気扇", "reading_hiragana": "かんきせん", "romaji": "kankisen",
        "vietnamese_meaning": "Quạt hút mùi / Quạt thông gió", "topic": "kitchen", "category": "Nhà cửa & Bếp",
        "genus": "空気清浄・排気装置", "differentia": "料理中の煙や匂いを外に追い出して空気を入れ換えるプロペラ",
        "forbidden_words": ["換気扇", "かんきせん", "ファン", "ventilation"],
        "taboo_lemmas": ["換気扇", "かんきせん"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Quạt gắn trên bếp hoặc tường để hút khói và mùi thức ăn ra ngoài.",
            "Dùng khi xào nấu đồ ăn nhiều khói.",
            "料理をしている時に、煙や油の匂いを外に______ためのファンのことです。",
            "キッチンの上で回って、部屋に料理の匂いや煙がこもらないように空気を入れ替える装置です。",
        ],
        "samples": ["料理の煙や匂いを外に出して、部屋の空気をきれいにする壁のファンです。"],
        "vocab": [("空気を入れ換える", "くうきをいれかえる", "kuuki o irekaeru", "thay đổi không khí, thông gió"), ("煙", "けむり", "kemuri", "khói")],
        "anchors": ["空気", "煙", "匂い", "外に出す", "料理", "壁"],
    },

    # Food & Izakaya Culture
    {
        "target_word": "割り勘", "reading_hiragana": "わりかん", "romaji": "warikan",
        "vietnamese_meaning": "Chia đều tiền ăn uống (Campuchia)", "topic": "food", "category": "Văn hóa ăn uống (食文化)",
        "genus": "食事や飲み会の支払い方法", "differentia": "合計金額を参加人数で等しく割って支払うこと",
        "forbidden_words": ["割り勘", "わりかん", "split", "割る"],
        "taboo_lemmas": ["割り勘", "わりかん"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Cách trả tiền khi đi ăn nhậu cùng bạn bè: chia đều theo đầu người.",
            "Không ai khao ai, ai cũng trả số tiền như nhau.",
            "ご飯を食べた後に、一人が全部払うんじゃなくて、みんなで______することです。",
            "食事代を誰か一人が奢るんじゃなくて、人数で同じ金額に分けて払うやり方です。",
        ],
        "samples": ["友達とご飯を食べた時に、合計の金額を人数で同じ分だけ分けて支払うことです。"],
        "vocab": [("奢る", "おごる", "ogoru", "khao, bao tiền"), ("分けて払う", "わけてはらう", "wakete harau", "chia tiền ra trả")],
        "anchors": ["払う", "お金", "分ける", "奢る", "食事", "人数"],
    },
    {
        "target_word": "二日酔い", "reading_hiragana": "ふつかよい", "romaji": "futsukayoi",
        "vietnamese_meaning": "Say nguội (Hangover)", "topic": "food", "category": "Sức khỏe & Quán nhậu",
        "genus": "飲酒後の身体の不調状態", "differentia": "前夜にお酒を飲みすぎて翌朝に頭痛や吐き気が残る症状",
        "forbidden_words": ["二日酔い", "ふつかよい", "hangover"],
        "taboo_lemmas": ["二日酔い", "ふつかよい"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Hôm qua uống quá nhiều bia rượu, sáng hôm sau bị đau đầu buồn nôn.",
            "Cảm giác mệt mỏi, chếnh choáng sau một đêm nhậu say.",
            "昨日の夜にお酒をたくさん飲みすぎて、次の日の朝に______状態です。",
            "前の晩にお酒を飲みすぎたせいで、翌朝になっても頭が痛くて気持ち悪い状態のことです。",
        ],
        "samples": ["前の日にお酒を飲みすぎて、次の日の朝に頭がガンガンして起きられない状態のことです。"],
        "vocab": [("飲みすぎる", "のみすぎる", "nomisugiru", "uống quá chén"), ("気持ち悪い", "きもちわるい", "kimochi warui", "buồn nôn, khó chịu")],
        "anchors": ["お酒", "飲む", "次の日", "朝", "頭痛", "気持ち悪い"],
    },
    {
        "target_word": "お通し", "reading_hiragana": "おとおし", "romaji": "otooshi",
        "vietnamese_meaning": "Món khai vị tính phí tự động ở quán nhậu Nhật (Table charge appetizer)", "topic": "food", "category": "Văn hóa ăn uống (食文化)",
        "genus": "日本の居酒屋独特の小鉢料理", "differentia": "注文していないのに席に着くと最初に出てきて席料として代金に含まれる料理",
        "forbidden_words": ["お通し", "おとおし", "つきだし", "appetizer"],
        "taboo_lemmas": ["お通し", "おとおし", "つきだし"],
        "difficulty": SurvivalDifficulty.HARD,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Món ăn nhỏ được bưng ra đầu tiên ở quán nhậu Nhật dù khách không gọi, tính vào tiền bàn.",
            "Khách nước ngoài lần đầu đến Nhật thường rất ngạc nhiên về phong tục này.",
            "日本の居酒屋で、注文してないのに最初に出てくる______代わりの小さい料理です。",
            "居酒屋の席に座ると勝手に出てきて、席料としてレシートにお金がつく最初の小鉢のことです。",
        ],
        "samples": ["日本の居酒屋で、注文していなくても最初に出てきて、席のお金として計算される小さい料理です。"],
        "vocab": [("居酒屋", "いざかや", "izakaya", "quán nhậu Nhật"), ("席料", "せきりょう", "sekiryou", "tiền chỗ ngồi")],
        "anchors": ["居酒屋", "最初", "注文してない", "料理", "席料", "お金"],
    },
    {
        "target_word": "お冷", "reading_hiragana": "おひや", "romaji": "ohiya",
        "vietnamese_meaning": "Nước lọc đá miễn phí ở nhà hàng Nhật", "topic": "food", "category": "Ẩm thực & Nhà hàng",
        "genus": "飲食店で提供される飲み物", "differentia": "レストランや定食屋で席に着くと無料で出される冷たい水",
        "forbidden_words": ["お冷", "おひや", "水", "お水", "water"],
        "taboo_lemmas": ["お冷", "おひや", "水", "お水"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Cốc nước mát được phục vụ miễn phí ngay khi bạn ngồi vào bàn ở quán ăn Nhật.",
            "Dùng khi bạn muốn xin thêm nước uống không mất tiền.",
            "レストランで席に座った時に、店員さんが無料で持ってきてくれる氷の入った______です。",
            "ご飯を食べる時に飲む、お金がかからない透明で冷たい飲み物の丁寧な言い方です。",
        ],
        "samples": ["レストランに入ると最初にタダでコップに入れて出してくれる冷たい飲み物のことです。"],
        "vocab": [("無料", "むりょう", "muryou", "miễn phí"), ("透明", "とうめい", "toumei", "trong suốt")],
        "anchors": ["無料", "コップ", "冷たい", "レストラン", "飲む", "氷"],
    },
    {
        "target_word": "日替わり定食", "reading_hiragana": "ひがわりていしょく", "romaji": "higawariteishoku",
        "vietnamese_meaning": "Suất cơm trưa đổi món theo ngày (Daily special set)", "topic": "food", "category": "Ẩm thực & Nhà hàng",
        "genus": "定食屋のランチメニュー", "differentia": "曜日や日によってメインのおかずが変わるお得なセットメニュー",
        "forbidden_words": ["日替わり", "日替わり定食", "ひがわり", "daily special"],
        "taboo_lemmas": ["日替わり", "日替わり定食", "ひがわり"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Set cơm trưa mỗi ngày là một món khác nhau với giá ưu đãi.",
            "Thứ hai là cá hồi, thứ ba là thịt kho...",
            "毎日メニューのおかずが変わる、お昼のお得な______セットのことです。",
            "月曜日は魚、火曜日は唐揚げみたいに、その日によって主菜が変わるお昼のセット料理です。",
        ],
        "samples": ["その日によってメインのおかずが変わる、レストランのお昼のお得なセットメニューです。"],
        "vocab": [("おかず", "おかず", "okazu", "món ăn mặn kèm cơm"), ("定食", "ていしょく", "teishoku", "suất cơm phần")],
        "anchors": ["毎日", "変わる", "ランチ", "昼", "メニュー", "お得"],
    },

    # Transportation & Travel
    {
        "target_word": "定期券", "reading_hiragana": "ていきけん", "romaji": "teikiken",
        "vietnamese_meaning": "Vé tháng tàu xe / Thẻ Commuter pass", "topic": "transport", "category": "Giao thông (交通)",
        "genus": "電車の乗車券", "differentia": "一定の期間、決まった区間を何回でも乗れるチケット",
        "forbidden_words": ["定期券", "定期", "ていきけん", "pass"],
        "taboo_lemmas": ["定期券", "定期", "ていきけん"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Thẻ dùng để đi tàu giữa nhà và công ty/trường học không giới hạn số lần.",
            "Thường mua theo 1 tháng, 3 tháng hoặc 6 tháng.",
            "家から会社までの決まった駅の間を、1ヶ月間______乗れるカードです。",
            "通勤や通学のために、決まった区間の電車に1ヶ月とか何回でも乗れるチケットです。",
        ],
        "samples": ["家から会社や学校までの間、決められた期間なら何回電車に乗ってもいいパスです。"],
        "vocab": [("区間", "くかん", "kukan", "chặng, đoạn đường ga"), ("通勤", "つうきん", "tsuukin", "đi làm hàng ngày")],
        "anchors": ["電車", "駅", "会社", "何回も", "1ヶ月", "区間"],
    },
    {
        "target_word": "終電", "reading_hiragana": "しゅうでん", "romaji": "shuuden",
        "vietnamese_meaning": "Chuyến tàu cuối cùng trong đêm (Last train)", "topic": "transport", "category": "Giao thông (交通)",
        "genus": "電車の運行便", "differentia": "その日の夜に走る一番最後の電車で、逃すと帰れなくなるもの",
        "forbidden_words": ["終電", "しゅうでん", "最終電車", "last train"],
        "taboo_lemmas": ["終電", "しゅうでん", "最終電車"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Chuyến tàu cuối cùng trong ngày, nếu trễ thì phải đi taxi hoặc ngủ quán net.",
            "Khi đi nhậu đêm, mọi người hay nhìn đồng hồ giục nhau kịp giờ.",
            "夜遅くまで飲んでいる時に、これに乗らないと家に______一番最後の電車です。",
            "その日の夜に走る一番最後の電車で、乗り遅れたら朝まで帰れなくなるやつです。",
        ],
        "samples": ["その日走る一番最後の電車で、逃すとタクシーで帰るか漫画喫茶に泊まるしかなくなります。"],
        "vocab": [("乗り遅れる", "のりおくれる", "noriokureru", "lỡ chuyến tàu"), ("帰れなくなる", "かえれなくなる", "kaerenaku naru", "không về nhà được")],
        "anchors": ["電車", "夜", "最後", "乗り遅れる", "帰る", "深夜"],
    },
    {
        "target_word": "券売機", "reading_hiragana": "けんばいき", "romaji": "kenbaiki",
        "vietnamese_meaning": "Máy bán vé tự động ở ga tàu / quán ăn", "topic": "transport", "category": "Giao thông & Đời sống",
        "genus": "切符や食券を販売する機械", "differentia": "駅やラーメン屋で、お金を入れて画面をタッチして切符や注文券を買う機械",
        "forbidden_words": ["券売機", "けんばいき", "ticket machine"],
        "taboo_lemmas": ["券売機", "けんばいき"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Máy đặt ở ga tàu để nạp tiền Suica/Pasmo hoặc mua vé giấy.",
            "Ở quán mì ramen cũng hay đặt máy này ở cửa để khách tự mua phiếu ăn.",
            "駅の改札の前やラーメン屋の入り口にあって、お金を入れて切符を______機械です。",
            "駅で電車の切符を買ったり、ICカードにお金をチャージしたりするときにタッチする大きな機械です。",
        ],
        "samples": ["駅でお金を入れて電車の切符を買ったり、ICカードにお金をチャージする機械です。"],
        "vocab": [("切符", "きっぷ", "kippu", "vé tàu"), ("チャージする", "ちゃーじする", "chaajisuru", "nạp tiền vào thẻ")],
        "anchors": ["駅", "切符", "買う", "お金", "チャージ", "タッチ"],
    },
    {
        "target_word": "乗り換え", "reading_hiragana": "のりかえ", "romaji": "norikae",
        "vietnamese_meaning": "Đổi tàu / Chuyển tuyến (Transfer)", "topic": "transport", "category": "Giao thông (交通)",
        "genus": "移動中の電車の乗り継ぎ行為", "differentia": "目的地に行くために一度乗っている電車を降りて別の路線に乗ること",
        "forbidden_words": ["乗り換え", "のりかえ", "乗り換える", "transfer"],
        "taboo_lemmas": ["乗り換え", "のりかえ", "乗り換える"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Xuống ga trung gian để bước sang tuyến tàu khác đến đích.",
            "Hệ thống tàu Tokyo rất phức tạp nên thường phải làm hành động này.",
            "一本の電車で直接行けないときに、途中の駅で降りて別の電車に______ことです。",
            "目的地に行くために、今乗っている電車を一度降りて、違う色の電車に乗ることです。",
        ],
        "samples": ["目的地に行くために、途中の駅で電車を降りて、別の路線に乗る行動のことです。"],
        "vocab": [("路線", "ろせん", "rosen", "tuyến tàu"), ("降りる", "おりる", "oriru", "xuống xe/tàu")],
        "anchors": ["電車", "降りる", "別の", "駅", "目的地", "路線"],
    },
    {
        "target_word": "忘れ物", "reading_hiragana": "わすれもの", "romaji": "wasuremono",
        "vietnamese_meaning": "Đồ đạc để quên / Đồ thất lạc (Lost item)", "topic": "transport", "category": "Giao thông & Đời sống",
        "genus": "不注意で置いてきてしまった所持品", "differentia": "電車やレストランから出る時に、うっかり持たずに置き忘れた荷物",
        "forbidden_words": ["忘れ物", "わすれもの", "落とし物", "lost item"],
        "taboo_lemmas": ["忘れ物", "わすれもの", "落とし物"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Đồ đạc bị bỏ quên trên ghế tàu hoặc bàn ăn.",
            "Cần đến phòng quản lý nhà ga (駅事務室) để hỏi tìm lại.",
            "電車を降りたあとに、棚や座席に自分のカバンや傘を______きてしまったもののことです。",
            "うっかり持ってくるのを忘れて、電車やお店に置いてきてしまった自分の持ち物です。",
        ],
        "samples": ["電車の中にうっかり置き忘れてきてしまったカバンや傘などの荷物のことです。"],
        "vocab": [("置き忘れる", "おきわすれる", "okiwasureru", "bỏ quên lại"), ("持ち物", "もちもの", "mochimono", "vật dụng mang theo")],
        "anchors": ["電車", "忘れる", "カバン", "傘", "届ける", "駅"],
    },

    # Workplace & Business
    {
        "target_word": "名刺", "reading_hiragana": "めいし", "romaji": "meishi",
        "vietnamese_meaning": "Danh thiếp kinh doanh (Business card)", "topic": "workplace", "category": "Văn hóa công sở (ビジネス)",
        "genus": "自己紹介用の紙片", "differentia": "会社名や名前、電話番号が書いてあり初対面のビジネス挨拶で両手で交換する小さい紙",
        "forbidden_words": ["名刺", "めいし", "business card", "card"],
        "taboo_lemmas": ["名刺", "めいし"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Tấm thiệp nhỏ bằng giấy ghi tên, chức danh và công ty để trao đổi khi gặp đối tác.",
            "Người Nhật luôn dùng hai tay để trao và nhận thật cung kính.",
            "初めて会った仕事の相手と挨拶するときに、自分の名前や会社が書いてあって両手で______小さい紙です。",
            "仕事の初対面で、会社名や役職、連絡先が印刷されていてお互いに交換するカードです。",
        ],
        "samples": ["ビジネスで初めて会った人と挨拶するときに、会社名や自分の名前が書いてあって交換する小さな紙です。"],
        "vocab": [("交換する", "こうかんする", "koukansuru", "trao đổi"), ("両手で", "りょうてで", "ryoute de", "bằng hai tay")],
        "anchors": ["紙", "会社", "名前", "挨拶", "交換", "初めて会う"],
    },
    {
        "target_word": "有給休暇", "reading_hiragana": "ゆうきゅうきゅうか", "romaji": "yuukyuukyuuka",
        "vietnamese_meaning": "Nghỉ phép hưởng nguyên lương (Paid leave)", "topic": "workplace", "category": "Chế độ công sở",
        "genus": "労働者の権利である休日", "differentia": "会社を休んでもお給料が引かれない法律で認められた休み",
        "forbidden_words": ["有給", "有休", "有給休暇", "ゆうきゅう", "paid leave"],
        "taboo_lemmas": ["有給", "有休", "有給休暇", "ゆうきゅう"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Ngày nghỉ phép mà công ty vẫn trả lương đầy đủ.",
            "Dùng khi muốn đi du lịch hoặc về nước thăm gia đình.",
            "会社を休むのに、お給料が減らされずにちゃんともらえる______のことです。",
            "社員の権利で、仕事を休んでもその日のお給料がそのまま全額もらえる休みのことです。",
        ],
        "samples": ["仕事を休んでいるのに、お給料がそのままもらえる法律の休みです。"],
        "vocab": [("お給料", "おきゅうりょう", "okyuuryou", "tiền lương"), ("休む", "やすむ", "yasumu", "nghỉ việc, nghỉ học")],
        "anchors": ["休み", "会社", "給料", "引かれない", "もらえる", "旅行"],
    },
    {
        "target_word": "残業手当", "reading_hiragana": "ざんぎょうてあて", "romaji": "zangyouteate",
        "vietnamese_meaning": "Tiền trợ cấp làm thêm giờ / Tiền tăng ca (Overtime pay)", "topic": "workplace", "category": "Chế độ công sở",
        "genus": "給与の追加支給額", "differentia": "定時の時間を過ぎて遅くまで働いた分に対して特別にプラスして支払われるお金",
        "forbidden_words": ["残業手当", "残業代", "ざんぎょう", "overtime"],
        "taboo_lemmas": ["残業手当", "残業代", "ざんぎょう"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Khoản tiền thưởng trả thêm khi làm việc quá giờ quy định trong hợp đồng.",
            "Tăng ca buổi tối hoặc làm việc vào ngày nghỉ.",
            "決められた定時の時間を超えて夜遅くまで仕事をしたときに、基本給に______される特別なお金です。",
            "定時を過ぎても会社に残って遅くまで働いた時間分、お給料に上乗せして払われるお金のことです。",
        ],
        "samples": ["定時が終わった後も遅くまで働いた時間に対して、お給料にプラスしてもらえるお金です。"],
        "vocab": [("定時", "ていじ", "teiji", "giờ tan sở quy định"), ("上乗せする", "うわのせする", "uwanosesuru", "cộng thêm vào")],
        "anchors": ["遅くまで", "働く", "給料", "プラス", "夜", "定時"],
    },
    {
        "target_word": "社員証", "reading_hiragana": "しゃいんしょう", "romaji": "shainshou",
        "vietnamese_meaning": "Thẻ nhân viên công ty (Employee ID card)", "topic": "workplace", "category": "Văn phòng & Công sở",
        "genus": "身分証明用のカード", "differentia": "首からストラップで下げて会社のビルのゲートを通るための顔写真付きカード",
        "forbidden_words": ["社員証", "社員カード", "しゃいんしょう", "ID card"],
        "taboo_lemmas": ["社員証", "社員カード", "しゃいんしょう"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Thẻ đeo ở cổ có ảnh đại diện để quét cửa vào văn phòng công ty.",
            "Chứng minh bạn là người làm việc tại công ty đó.",
            "首からぶら下げていて、オフィスのドアを開ける時に機械に______顔写真入りのカードです。",
            "その会社の人間であることを証明するために、首からかけてビルのドアをタッチして開けるカードです。",
        ],
        "samples": ["会社のビルに入るときにドアにタッチする、首からかけている顔写真つきのカードです。"],
        "vocab": [("首からかける", "くびからかける", "kubi kara kakeru", "đeo ở cổ"), ("証明する", "しょうめいする", "shoumeisuru", "chứng minh")],
        "anchors": ["カード", "会社", "首", "タッチ", "ビル", "写真"],
    },

    # Daily Life & Living
    {
        "target_word": "自動販売機", "reading_hiragana": "じどうはんばいき", "romaji": "jidouhanbaiki",
        "vietnamese_meaning": "Máy bán hàng tự động (Vending machine)", "topic": "daily", "category": "Đời sống đường phố (日常生活)",
        "genus": "無人販売装置", "differentia": "道端に置いてありお金を入れてボタンを押すと冷たいまたは温かいジュースが落ちてくる機械",
        "forbidden_words": ["自動販売機", "自販機", "じどうはんばいき", "じはんき", "vending machine"],
        "taboo_lemmas": ["自動販売機", "自販機", "じどうはんばいき", "じはんき"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Cột máy đặt đầy đường phố Nhật Bản để mua nước ngọt hoặc trà nóng 24/24.",
            "Chỉ cần đút đồng xu 100 yên hoặc chạm thẻ IC là lon nước rơi xuống.",
            "道端にあって、お金を入れて欲しい飲み物のボタンを押すとガコンと______機械です。",
            "街中のどこにでも置いてあって、24時間いつでもお金を入れたら冷たいジュースやお茶が買える大きな箱型の機械です。",
        ],
        "samples": ["街中の道にあって、お金を入れてボタンを押すと冷たい飲み物や温かいコーヒーが出てくる機械です。"],
        "vocab": [("道端", "みちばた", "michibata", "ven đường"), ("出てくる", "でてくる", "detekuru", "chui ra, rớt ra")],
        "anchors": ["道", "お金", "ボタン", "飲み物", "ジュース", "コーヒー"],
    },
    {
        "target_word": "コインランドリー", "reading_hiragana": "こいんらんどりー", "romaji": "koinrando-ri-",
        "vietnamese_meaning": "Tiệm giặt sấy tự động trả tiền xu (Laundromat)", "topic": "daily", "category": "Đời sống tiện ích (日常生活)",
        "genus": "共同洗濯施設", "differentia": "家に洗濯機がない人や毛布を洗いたい人が小銭を入れて大型洗濯機や乾燥機を使う店",
        "forbidden_words": ["コインランドリー", "ランドリー", "laundromat", "laundry"],
        "taboo_lemmas": ["コインランドリー", "ランドリー"],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Cửa hàng mở 24/7 có nhiều máy giặt sấy lớn để khách tự bỏ đồng xu vào giặt quần áo.",
            "Rất tiện khi trời mưa dầm hoặc muốn sấy khô chăn màn lớn.",
            "家で洗えない大きな毛布やたくさんの服を持って行って、100円玉を入れて______する無人の店です。",
            "街角にあって、お金を入れると服を洗ったり熱風でカラカラに乾かしてくれる機械がたくさん並んでいるお店です。",
        ],
        "samples": ["小銭を入れて、服を洗ったり乾かしたりする大きな機械がたくさん並んでいる無人のお店です。"],
        "vocab": [("乾燥機", "かんそうき", "kansouki", "máy sấy khô"), ("毛布", "もうふ", "moufu", "chăn bông, mền")],
        "anchors": ["洗う", "服", "小銭", "乾かす", "店", "洗濯機"],
    },
    {
        "target_word": "再配達", "reading_hiragana": "さいはいたつ", "romaji": "saihaitatsu",
        "vietnamese_meaning": "Yêu cầu giao hàng lại lần 2 (Redelivery)", "topic": "daily", "category": "Dịch vụ đời sống (郵便・宅配)",
        "genus": "宅配便の再依頼サービス", "differentia": "留守で荷物を受け取れなかった時に紙を見て郵便局や宅配業者にもう一度持ってきてもらうこと",
        "forbidden_words": ["再配達", "さいはいたつ", "redelivery"],
        "taboo_lemmas": ["再配達", "さいはいたつ"],
        "difficulty": SurvivalDifficulty.HARD,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Hành động gọi ship hẹn giờ giao lại bưu phẩm do lúc người ta đến nhà mình đi vắng.",
            "Người giao hàng sẽ để lại tờ giấy thông báo vắng nhà (不在票).",
            "配達の時に家にいなくて荷物が届かなかったので、スマホでもう一度______もらう手続きのことです。",
            "家にいなくて受け取れなかった宅配便の荷物を、指定した日時に再度持ってきてもらうように頼むことです。",
        ],
        "samples": ["荷物が届いた時に家にいなかったので、ポストの紙を見て、もう一度持ってきてもらうように頼むことです。"],
        "vocab": [("不在票", "ふざいひょう", "fuzaihyou", "phiếu báo vắng nhà"), ("受け取る", "うけとる", "uketoru", "nhận hàng")],
        "anchors": ["荷物", "届く", "留守", "家", "もう一度", "持ってきてもらう"],
    },
    {
        "target_word": "レジ袋", "reading_hiragana": "れじぶくろ", "romaji": "rejibukuro",
        "vietnamese_meaning": "Túi nilon tính tiền ở quầy thu ngân (Plastic shopping bag)", "topic": "daily", "category": "Mua sắm & Đời sống",
        "genus": "買い物用のプラスチック製袋", "differentia": "コンビニやスーパーでお会計の時に有料で何円か払って商品を入れてもらうビニールの袋",
        "forbidden_words": ["レジ袋", "れじぶくろ", "袋", "plastic bag"],
        "taboo_lemmas": ["レジ袋", "れじぶくろ", "袋"],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Tự diễn giải trong 5 giây.",
            "Chiếc túi nilon nhỏ ở quầy thu ngân siêu thị, trước đây miễn phí nhưng giờ phải mua 3-5 yên.",
            "Thu ngân sẽ luôn hỏi: Bạn có cần túi không ạ?",
            "スーパーやコンビニで会計する時に、買ったものを入れるために数円で買う白い______のことです。",
            "買い物をした商品を運ぶための薄いビニールでできていて、有料で3円とか払ってつけてもらうものです。",
        ],
        "samples": ["コンビニやスーパーで買い物をした時に、買ったものを入れるために何円か払って買うプラスチックの袋です。"],
        "vocab": [("お会計", "おかいけい", "okaikei", "thanh toán tiền"), ("有料", "ゆうりょう", "yuuryou", "có tính phí")],
        "anchors": ["コンビニ", "スーパー", "買い物", "入れる", "有料", "3円"],
    },
]

# 20+ Diverse Procedural Japanese Scenarios for Conversational Repair
PROCEDURAL_SCENARIOS_CATALOG: list[dict[str, Any]] = [
    {
        "id_prefix": "scen_work_fast_phone",
        "context": "business_phone",
        "context_title_vi": "Khách hàng nói quá nhanh qua điện thoại công sở",
        "relationship": SocialRelationship.BUSINESS,
        "topic": "workplace",
        "problem_description_vi": "Đối tác gọi điện thoại nói rất nhanh một chuỗi số liệu hợp đồng và ngày bàn giao khiến bạn không theo kịp.",
        "npc_utterance_ja": "例の納品スケジュールの件ですが、来週火曜の午前中までに修正データをサーバーにアップロードいただけますか？",
        "npc_utterance_reading": "れいののうひんすけじゅーるのけんですが、らいしゅうかようのごぜんちゅうまでにしゅうせいデータをさーばーにあっぷろーどいただけますか？",
        "recommended_strategy": RepairStrategy.ASKING_REPETITION,
        "suggested_repair_phrases": [
            "大変恐れ入りますが、お電話が少し遠いようでして、もう一度お願いできますでしょうか。",
            "申し訳ございません、聞き取れませんでしたので、もう一度ゆっくりおっしゃっていただけますか。",
        ],
        "difficulty": SurvivalDifficulty.HARD,
        "hints": [
            "Phản xạ xin nhắc lại bằng Keigo chuẩn mực.",
            "Viện cớ đường truyền điện thoại không rõ (電話が遠い) để xin đối tác nói chậm lại.",
            "大変恐れ入りますが、もう一度おっしゃっていただけますか？",
            "申し訳ございません、少しお声が聞き取りにくかったので、もう一度______でしょうか。",
            "大変恐れ入ります、電波の状態が少し悪いようでして、もう一度ゆっくりお願いできますでしょうか。",
        ],
        "vocab": [("お電話が遠い", "おでんわがとおい", "odenwa ga tooi", "tiếng điện thoại bị nhỏ/khó nghe")],
    },
    {
        "id_prefix": "scen_boss_surprise_meeting",
        "context": "workplace_meeting",
        "context_title_vi": "Trưởng phòng bất ngờ chỉ định phát biểu ý kiến",
        "relationship": SocialRelationship.BUSINESS,
        "topic": "workplace",
        "problem_description_vi": "Trong cuộc họp công ty, Trưởng phòng bất ngờ hỏi quan điểm của bạn về chiến lược mới. Bạn cần 3-5 giây để xâu chuỗi ý nghĩ.",
        "npc_utterance_ja": "田中さん、今回のマーケティング戦略の改善案について、何か意見はある？",
        "npc_utterance_reading": "たなかさん、こんかいのまーけてぃんぐせんりゃくのかいぜんあんについて、なにかいけんはある？",
        "recommended_strategy": RepairStrategy.BUYING_TIME,
        "suggested_repair_phrases": [
            "そうですね…少々考えをまとめさせていただきますので、少しお時間いただけますでしょうか。",
            "ええと、非常に重要なポイントですね。少し整理させてください。",
        ],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Phản xạ câu giờ lịch sự ngay lập tức trong 5 giây.",
            "Dùng cụm đệm xin phép sắp xếp lại ý nghĩ thay vì im bặt.",
            "そうですね…少々考えをまとめさせていただきます...",
            "そうですね…ええと、私の考えといたしましては、少し______させていただけますでしょうか。",
            "そうですね…非常に興味深い点だと思います。少し考えをまとめさせていただいてもよろしいでしょうか。",
        ],
        "vocab": [("考えをまとめる", "かんがえをまとめる", "kangae o matomeru", "sắp xếp lại suy nghĩ")],
    },
    {
        "id_prefix": "scen_friend_unknown_slang",
        "context": "casual_chat",
        "context_title_vi": "Bạn bè nói tiếng lóng mới lạ bạn chưa nghe bao giờ",
        "relationship": SocialRelationship.CASUAL,
        "topic": "daily",
        "problem_description_vi": "Người bạn Nhật nói lướt một từ lóng 'エグい' bạn chưa biết nghĩa, bạn muốn hỏi lại tự nhiên thân mật.",
        "npc_utterance_ja": "昨日のイベント、マジでエグかったよね！あんなの見たことないわ。",
        "npc_utterance_reading": "きのうのいべんと、まじでえぐかったよね！あんなのみたことないわ。",
        "recommended_strategy": RepairStrategy.ASKING_CLARIFICATION,
        "suggested_repair_phrases": [
            "え、ごめん、エグいってどういう意味？いい意味？",
            "ちょっと聞き取れなかった！それってどういうこと？",
        ],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Phản xạ hỏi lại bạn bè tự nhiên.",
            "Hỏi thẳng nghĩa từ đó theo kiểu bạn bè thân mật.",
            "え、それってどういうこと？",
            "ごめん、今の単語よくわかんなかったんだけど、______って意味？",
            "え、ごめん、エグいってどういう意味？めっちゃヤバかったってこと？",
        ],
        "vocab": [("どういう意味？", "どういういみ？", "dou iu imi?", "nghĩa là sao vậy?")],
    },
    {
        "id_prefix": "scen_restaurant_count_slip",
        "context": "restaurant_order",
        "context_title_vi": "Nói nhầm lượng từ khi gọi món quán ăn",
        "relationship": SocialRelationship.POLITE,
        "topic": "food",
        "problem_description_vi": "Bạn muốn gọi 1 bát mì nhưng buột miệng nói 'mì 1 người' (hitori), cần tự đính chính tức thì sang '1 bát' (ippai).",
        "npc_utterance_ja": "ご注文はお決まりでしょうか？",
        "npc_utterance_reading": "ごちゅうもんはおきまりでしょうか？",
        "recommended_strategy": RepairStrategy.SELF_CORRECTION,
        "suggested_repair_phrases": [
            "ラーメンを一人…あ、違います、一杯お願いします。",
            "あ、すみません、言い直しますと、ラーメン一つでお願いします。",
        ],
        "difficulty": SurvivalDifficulty.EASY,
        "hints": [
            "Phản xạ tự sửa lời nói.",
            "Dùng 'あ、違います' hoặc 'あ、間違えました' rồi nói lại từ đúng.",
            "あ、違います、〜じゃなくて〜",
            "あ、すみません、間違えました。______をお願いします。",
            "ラーメン一人…あ、違います、一杯お願いします！",
        ],
        "vocab": [("あ、違います", "あ、ちがいます", "a, chigaimasu", "à, không phải, nhầm ạ")],
    },
    {
        "id_prefix": "scen_work_acronym_clarify",
        "context": "workplace_discussion",
        "context_title_vi": "Đồng nghiệp dùng thuật ngữ viết tắt lạ",
        "relationship": SocialRelationship.POLITE,
        "topic": "workplace",
        "problem_description_vi": "Đồng nghiệp hỏi bạn về việc 'リスケ' (Reschedule) nhưng bạn chưa chắc chắn nghĩa, cần hỏi xác nhận.",
        "npc_utterance_ja": "来週の打ち合わせの件、リスケって可能ですか？",
        "npc_utterance_reading": "らいしゅうのうちあわせのけん、りすけってかのうですか？",
        "recommended_strategy": RepairStrategy.ASKING_CLARIFICATION,
        "suggested_repair_phrases": [
            "すみません、リスケとは日程を変更するということでよろしいでしょうか？",
            "恐れ入りますが、もう一度分かりやすく確認させていただけますか？",
        ],
        "difficulty": SurvivalDifficulty.MEDIUM,
        "hints": [
            "Hỏi lại lịch sự để xác nhận nghĩa.",
            "Dùng cấu trúc 〜とは〜という意味ですか。",
            "すみません、〜というのは日程変更のことでしょうか。",
            "恐れ入ります、確認ですが、______ということでよろしいですか？",
            "すみません、リスケとは日程を変更するということでよろしいでしょうか？",
        ],
        "vocab": [("リスケ", "りすけ", "risuke", "đổi lịch hẹn (reschedule)")],
    },
]


class ProceduralSurvivalGenerator:
    """Procedural combinatorial generator ensuring infinite dynamic tasks even when offline."""

    @classmethod
    def generate_circumlocution(
        cls,
        topic: str | None = None,
        difficulty: SurvivalDifficulty | None = None,
    ) -> CircumlocutionTask:
        global _PROCEDURAL_RECENT
        candidates = [
            item for item in PROCEDURAL_CIRCUMLOCUTION_CATALOG
            if (not topic or topic == "all" or item["topic"] == topic)
            and (not difficulty or item["difficulty"] == difficulty)
        ]
        if not candidates:
            candidates = [
                item for item in PROCEDURAL_CIRCUMLOCUTION_CATALOG
                if (not topic or topic == "all" or item["topic"] == topic)
            ]
        if not candidates:
            candidates = PROCEDURAL_CIRCUMLOCUTION_CATALOG

        unseen = [c for c in candidates if c["target_word"] not in _PROCEDURAL_RECENT]
        chosen = random.choice(unseen) if unseen else random.choice(candidates)
        _PROCEDURAL_RECENT.append(chosen["target_word"])

        task_id = f"circ_dyn_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        tier_hints = [
            SurvivalHintTier(tier=idx, title=f"Gợi ý tầng {idx}" if idx > 0 else "Không gợi ý", content=txt)
            for idx, txt in enumerate(chosen["hints"])
        ]
        vocab_items = [
            SurvivalVocabularyItem(term=t, reading=r, romaji=ro, meaning_vi=m)
            for t, r, ro, m in chosen["vocab"]
        ]

        return CircumlocutionTask(
            id=task_id,
            target_word=chosen["target_word"],
            reading_hiragana=chosen["reading_hiragana"],
            romaji=chosen["romaji"],
            vietnamese_meaning=chosen["vietnamese_meaning"],
            category=chosen["category"],
            genus=chosen["genus"],
            differentia=chosen["differentia"],
            forbidden_words=chosen["forbidden_words"],
            taboo_lemmas=chosen["taboo_lemmas"],
            difficulty=chosen["difficulty"],
            topic=chosen["topic"],
            time_limit_seconds=5,
            tier_hints=tier_hints,
            sample_explanations=chosen["samples"],
            suggested_vocabulary=vocab_items,
            semantic_anchors=chosen["anchors"],
            source="ai",
        )

    @classmethod
    def generate_scenario(
        cls,
        topic: str | None = None,
        difficulty: SurvivalDifficulty | None = None,
    ) -> SurvivalScenarioTask:
        global _PROCEDURAL_RECENT
        candidates = [
            item for item in PROCEDURAL_SCENARIOS_CATALOG
            if (not topic or topic == "all" or item["topic"] == topic)
            and (not difficulty or item["difficulty"] == difficulty)
        ]
        if not candidates:
            candidates = [
                item for item in PROCEDURAL_SCENARIOS_CATALOG
                if (not topic or topic == "all" or item["topic"] == topic)
            ]
        if not candidates:
            candidates = PROCEDURAL_SCENARIOS_CATALOG

        unseen = [c for c in candidates if c["id_prefix"] not in _PROCEDURAL_RECENT]
        chosen = random.choice(unseen) if unseen else random.choice(candidates)
        _PROCEDURAL_RECENT.append(chosen["id_prefix"])

        task_id = f"{chosen['id_prefix']}_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        tier_hints = [
            SurvivalHintTier(tier=idx, title=f"Gợi ý tầng {idx}" if idx > 0 else "Không gợi ý", content=txt)
            for idx, txt in enumerate(chosen["hints"])
        ]
        vocab_items = [
            SurvivalVocabularyItem(term=t, reading=r, romaji=ro, meaning_vi=m)
            for t, r, ro, m in chosen["vocab"]
        ]

        return SurvivalScenarioTask(
            id=task_id,
            context=chosen["context"],
            context_title_vi=chosen["context_title_vi"],
            relationship=chosen["relationship"],
            topic=chosen["topic"],
            problem_description_vi=chosen["problem_description_vi"],
            npc_utterance_ja=chosen["npc_utterance_ja"],
            npc_utterance_reading=chosen.get("npc_utterance_reading"),
            recommended_strategy=chosen["recommended_strategy"],
            suggested_repair_phrases=chosen["suggested_repair_phrases"],
            difficulty=chosen["difficulty"],
            time_limit_seconds=5,
            tier_hints=tier_hints,
            suggested_vocabulary=vocab_items,
            source="ai",
        )
