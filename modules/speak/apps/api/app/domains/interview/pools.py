"""Curated Seed Pools and Templates for Dynamic AI Interview Coach."""

from __future__ import annotations

from app.domains.interview.contracts import (
    IndustryTemplate,
    InterviewerPersonality,
    InterviewQuestion,
    PREPStarters,
)

INDUSTRY_TEMPLATES: list[IndustryTemplate] = [
    IndustryTemplate(
        id="it_engineer",
        label_vi="IT / Kỹ sư phần mềm & AI",
        label_ja="ITエンジニア・プログラマー",
        description="Lập trình viên Web/Mobile, Kỹ sư dữ liệu, Cloud/DevOps, Kỹ sư cầu nối BrSE",
        suggested_roles=[
            "Frontend React/Next.js Engineer",
            "Backend Python/Java Engineer",
            "Bridge Software Engineer (BrSE)",
            "AI / Machine Learning Engineer",
            "Mobile App Developer (Flutter/iOS)",
        ],
        icon_name="Code2",
    ),
    IndustryTemplate(
        id="sales_biz",
        label_vi="Kinh doanh & Phát triển thị trường",
        label_ja="営業・ビジネス開発",
        description="Nhân viên kinh doanh B2B/B2C, Account Executive, Tư vấn giải pháp",
        suggested_roles=[
            "法人営業 (B2B Sales Representative)",
            "海外営業 (Overseas Business Development)",
            "カスタマーサクセス (Customer Success Specialist)",
            "マーケティング担当 (Digital Marketing Executive)",
        ],
        icon_name="TrendingUp",
    ),
    IndustryTemplate(
        id="translation",
        label_vi="Thông dịch & Biên dịch tiếng Nhật",
        label_ja="通訳・翻訳・コーポレート",
        description="Thông dịch hội nghị, phiên dịch nhà xưởng, biên dịch tài liệu kỹ thuật",
        suggested_roles=[
            "日越社内通訳・翻訳者 (In-house Interpreter)",
            "プロジェクト通訳 (Project Translator)",
            "役員付バイリンガル秘書 (Bilingual Executive Assistant)",
        ],
        icon_name="Languages",
    ),
    IndustryTemplate(
        id="office_admin",
        label_vi="Hành chính & Quản trị nhân sự",
        label_ja="総務・一般事務・人事",
        description="Quản lý hồ sơ, hỗ trợ nhân sự, kế toán tổng hợp tại văn phòng Nhật",
        suggested_roles=[
            "一般事務スタッフ (General Office Clerk)",
            "人事採用アシスタント (HR & Recruitment Assistant)",
            "経理・財務アシスタント (Accounting Assistant)",
        ],
        icon_name="Building2",
    ),
    IndustryTemplate(
        id="hospitality",
        label_vi="Khách sạn & Dịch vụ khách hàng",
        label_ja="ホテル・観光・接客サービス",
        description="Lễ tân khách sạn, phục vụ nhà hàng cao cấp, chăm sóc khách quốc tế",
        suggested_roles=[
            "フロントデスク (Hotel Front Desk Staff)",
            "客室サービス・コンシェルジュ (Concierge & Guest Relations)",
            "空港グランドスタッフ (Airport Ground Staff)",
        ],
        icon_name="Utensils",
    ),
    IndustryTemplate(
        id="baito",
        label_vi="Làm thêm / Du học sinh (Baitou)",
        label_ja="アルバイト・パート",
        description="Cửa hàng tiện lợi, quán ăn gia đình, thu ngân siêu thị, phụ bếp",
        suggested_roles=[
            "コンビニスタッフ (Staff Konbini Lawson/7-Eleven)",
            "居酒屋・レストランホール (Phục vụ quán ăn/Izakaya)",
            "スーパーのレジ・品出し (Thu ngân siêu thị)",
        ],
        icon_name="ShoppingBag",
    ),
]

INTERVIEWER_PROFILES = {
    InterviewerPersonality.FRIENDLY: {
        "name": "山田 健二 (Yamada Kenji)",
        "title": "人事採用マネージャー (HR Manager)",
        "tone_vi": "Ấm áp, cởi mở, khuyến khích ứng viên thể hiện bản thân",
    },
    InterviewerPersonality.STRICT: {
        "name": "佐藤 浩 (Sato Hiroshi)",
        "title": "事業部長・採用責任者 (Division Director)",
        "tone_vi": "Nghiêm nghị, điềm tĩnh, chú trọng vào số liệu và kính ngữ chuẩn xác",
    },
    InterviewerPersonality.ANALYTICAL: {
        "name": "高橋 摩耶 (Takahashi Maya)",
        "title": "シニアテックリード / 人事統括 (Senior Tech Lead)",
        "tone_vi": "Tập trung vào tư duy logic, thích hỏi xoáy sâu lý do 'Tại sao?'",
    },
}

DEFAULT_PREP_STARTERS = {
    1: PREPStarters(
        point="結論から申し上げますと、私の強みは［強み］でございます。",
        reason="その理由といたしましては、［理由・背景］だからでございます。",
        example="具体的には、前職／学生時代におきまして［具体的なエピソード・数値］を経験いたしました。",
        summary="以上の強みを活かし、貴社の［事業・ポジション］に貢献できると確信しております。",
    ),
    2: PREPStarters(
        point="私が最も力を入れて取り組んだことは、［目標・課題］の達成でございます。",
        reason="この目標を設定した理由は、［直面した課題や動機］を感じたからでございます。",
        example="具体的には、困難な状況に対して［自ら取った行動・工夫］を実践し、［成果・数字］を達成いたしました。",
        summary="この経験から培った［得た学びや粘り強さ］を、貴社の業務においても発揮してまいります。",
    ),
    3: PREPStarters(
        point="私が貴社を志望いたしました最大の理由は、［貴社の魅力・共感した理念］に深く共感したからでございます。",
        reason="なぜなら、私自身の［大切にしている価値観やキャリアビジョン］と合致しているからでございます。",
        example="具体的には、貴社が推進されている［具体的な事業やプロダクト］に携わり、［自分の経験］を活かしたいと考えております。",
        summary="入社後は即戦力として成果を出し、貴社の成長に貢献いたしたく存じます。",
    ),
    4: PREPStarters(
        point="そのような困難な状況に直面した場合、私はまず［最優先の判断・基本方針］を徹底いたします。",
        reason="なぜなら、予期せぬトラブルにおいては［原因の把握や関係者への報連相］が最も重要だからでございます。",
        example="具体的には、過去の事例でも［冷静に行った対処手順］により、迅速に問題を解決いたしました。",
        summary="今後も柔軟性と責任感を持ち、チーム一丸となって乗り越えてまいります。",
    ),
    5: PREPStarters(
        point="本日の面接を通じて、貴社の［印象的な事業やチームの姿勢］にさらに魅力を感じました。1点お伺いしてもよろしいでしょうか。",
        reason="入社後の業務イメージをより具体的に持ち、早期に立ち上がりたいと考えているためでございます。",
        example="具体的には、［現在の課題／入社までに身につけておくべき知識］について、どのように取り組むことが期待されますでしょうか。",
        summary="お答えいただきありがとうございます。ご教示いただいた点を踏まえ、精進してまいります。",
    ),
}

SEED_QUESTIONS_BY_TURN: dict[int, dict[str, Any]] = {
    1: {
        "question_ja": "本日はお時間をいただきありがとうございます。まずは1分程度で、自己紹介とご自身の強み（自己PR）をお聞かせいただけますでしょうか。",
        "question_vi": "Cảm ơn bạn đã dành thời gian hôm nay. Trước hết, xin mời bạn tự giới thiệu bản thân và điểm mạnh của mình trong khoảng 1 phút.",
        "reading_hiragana": "ほんじつはおじかんをいただきありがとうございます。まずは1ぷんていどで、じこしょうかいとごじしんのつよみをおきかせいただけますでしょうか。",
        "intent_vi": "Nhà tuyển dụng muốn nắm bắt phong thái mở đầu, khả năng tóm tắt súc tích và điểm nổi bật nhất của ứng viên.",
        "key_vocab": [
            {"ja": "お時間をいただき", "vi": "dành thời gian cho tôi"},
            {"ja": "自己紹介", "vi": "giới thiệu bản thân"},
            {"ja": "自己PR", "vi": "nêu bật điểm mạnh"},
            {"ja": "貢献できる", "vi": "có thể đóng góp"},
        ],
    },
    2: {
        "question_ja": "ありがとうございます。これまでのご経験の中で、最も高い目標に向かって努力されたエピソードや、チームで乗り越えた実績について詳しく教えてください。",
        "question_vi": "Cảm ơn bạn. Trong các trải nghiệm vừa qua, xin hãy chia sẻ chi tiết về thử thách bạn nỗ lực nhiều nhất hoặc thành tích bạn cùng đội ngũ vượt qua.",
        "reading_hiragana": "ありがとうございます。これまでのごけいけんのなかで、もっともたかいもくひょうにむかってどりょくされたえぴそーどについておしえてください。",
        "intent_vi": "Kiểm tra năng lực giải quyết vấn đề (Gakuchika / Project Experience), khả năng phối hợp đồng đội và số liệu dẫn chứng thực tế.",
        "key_vocab": [
            {"ja": "力を入れて取り組む", "vi": "nỗ lực dồn sức làm"},
            {"ja": "課題を解決する", "vi": "giải quyết thách thức"},
            {"ja": "チームで協力する", "vi": "hợp tác trong đội ngũ"},
            {"ja": "成果を収める", "vi": "đạt được kết quả"},
        ],
    },
    3: {
        "question_ja": "数ある企業の中で、なぜ他社ではなく弊社を志望されたのでしょうか。具体的な志望動機と、入社後に実現したいことをお聞かせください。",
        "question_vi": "Trong số rất nhiều doanh nghiệp, tại sao bạn lại chọn công ty chúng tôi mà không phải công ty khác? Hãy nêu lý do ứng tuyển và mục tiêu bạn muốn thực hiện.",
        "reading_hiragana": "かずあるきぎょうのなかで、なぜたしゃではなくへいしゃをしぼうされたのでしょうか。ぐたいてきなしぼうどうきをおきかせください。",
        "intent_vi": "Đánh giá mức độ nghiên cứu về công ty (Kigyou Kenkyuu), sự thấu hiểu sản phẩm và động lực gắn bó lâu dài.",
        "key_vocab": [
            {"ja": "貴社を志望した理由", "vi": "lý do ứng tuyển quý công ty"},
            {"ja": "企業理念に共感", "vi": "đồng cảm với triết lý doanh nghiệp"},
            {"ja": "強みを活かす", "vi": "phát huy thế mạnh"},
            {"ja": "成長に寄与する", "vi": "đóng góp vào sự phát triển"},
        ],
    },
    4: {
        "question_ja": "仕事を進める中で、想定外のトラブルやメンバー間での意見の対立が発生した場合、あなたならどのように判断し対応されますか。",
        "question_vi": "Khi đang làm việc, nếu phát sinh sự cố bất ngờ hoặc bất đồng ý kiến giữa các thành viên, bạn sẽ phán đoán và xử lý tình huống như thế nào?",
        "reading_hiragana": "しごとをすすめるなかで、そうていがいのとらぶるやいけんのたいりつがはっせいしたばあい、あなたならどのようにたいおうされますか。",
        "intent_vi": "Đo lường trí tuệ cảm xúc (EQ), kỹ năng ứng biến dưới áp lực, tinh thần trách nhiệm và thói quen Horenso (Báo cáo - Liên lạc - Thảo luận).",
        "key_vocab": [
            {"ja": "想定外のトラブル", "vi": "sự cố bất ngờ"},
            {"ja": "報連相を徹底する", "vi": "triệt để thực hiện Horenso"},
            {"ja": "冷静に対処する", "vi": "bình tĩnh xử lý"},
            {"ja": "柔軟な姿勢", "vi": "thái độ linh hoạt"},
        ],
    },
    5: {
        "question_ja": "私からの質問は以上となります。最後に、あなたから弊社や業務について何か質問（逆質問）はございますか。",
        "question_vi": "Câu hỏi từ phía chúng tôi đến đây là hết. Cuối cùng, bạn có câu hỏi nào (câu hỏi ngược) muốn dành cho công ty và công việc không?",
        "reading_hiragana": "わたしからのしつもんはいいじょうとなります。さいごに、あなたからへいしゃについてなにかしつもんはございますか。",
        "intent_vi": "Đo lường nhiệt huyết, sự chủ động và tư duy chiến lược của ứng viên qua chất lượng câu hỏi ngược.",
        "key_vocab": [
            {"ja": "逆質問", "vi": "đặt câu hỏi ngược cho nhà tuyển dụng"},
            {"ja": "早期に活躍する", "vi": "nhanh chóng đóng góp hiệu quả"},
            {"ja": "期待される役割", "vi": "vai trò được kỳ vọng"},
            {"ja": "精進いたします", "vi": "tôi sẽ nỗ lực hết mình"},
        ],
    },
}
