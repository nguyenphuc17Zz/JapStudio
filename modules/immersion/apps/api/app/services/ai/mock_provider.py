import time
import re
from typing import Optional, List, Dict, Any
from app.services.ai.base import AIProviderBase, AIModelMeta, AIGenerationResult


class MockAIProvider(AIProviderBase):
    """Deterministic, zero-cost AI provider for testing and offline local development."""

    name = "mock"
    display_name = "Deterministic Mock AI (Offline & Testing)"
    requires_key = False

    @property
    def is_configured(self) -> bool:
        return True

    @property
    def default_model(self) -> str:
        return "mock-japanese-pedagogy-v1"

    async def list_models(self) -> List[AIModelMeta]:
        return [
            AIModelMeta(
                id="mock-japanese-pedagogy-v1",
                name="Mock Japanese Pedagogy Engine v1",
                provider="mock",
                description="Deterministic offline analyzer for Japanese immersion",
                context_window=32768,
                pricing_input_1m=0.0,
                pricing_output_1m=0.0,
                is_active=True
            ),
            AIModelMeta(
                id="mock-lightweight-fast",
                name="Mock Fast Analyzer",
                provider="mock",
                description="Fast rule-based mock analyzer",
                context_window=16384,
                pricing_input_1m=0.0,
                pricing_output_1m=0.0,
                is_active=False
            )
        ]

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> AIGenerationResult:
        start_time = time.time()
        chosen_model = model or self.default_model

        # Extract content inside <japanese_source_content> if present
        content_match = re.search(r"<japanese_source_content>(.*?)</japanese_source_content>", prompt, re.DOTALL)
        source_text = content_match.group(1).strip() if content_match else prompt

        # 1. Specialized Task: Translation
        if ("translation" in response_schema.get("properties", {}) or "Dịch" in prompt) and "blueprint" not in response_schema.get("properties", {}) and "Quiz" not in prompt:
            data = {"translation": f"Bản dịch tiếng Việt tự nhiên cho câu: {source_text[:80]}..."}
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=25,
                output_tokens=35,
                estimated_cost=0.0,
                latency_ms=10,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 2. Specialized Task: Sentence Pedagogical Explanation
        if "literal_translation" in response_schema.get("properties", {}) or "Phân tích sư phạm" in prompt:
            data = {
                "literal_translation": f"Dịch sát nghĩa từng từ cho: {source_text[:60]}",
                "natural_meaning": f"Ý nghĩa tự nhiên trong ngữ cảnh: {source_text[:60]}",
                "context_nuance": "Văn phong trang trọng (Keigo / Thể báo chí), diễn đạt chính sách khách quan.",
                "key_grammar_notes": ["Mẫu ngữ pháp quan trọng cần ghi nhớ", "Cụm collocations chuẩn xác"]
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=35,
                output_tokens=55,
                estimated_cost=0.0,
                latency_ms=15,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 3. Specialized Task: AI Reading Companion
        if "answer_markdown" in response_schema.get("properties", {}) or "AI Companion" in prompt:
            data = {
                "answer_title": "Giải thích chi tiết từ Trợ lý AI",
                "answer_markdown": f"Câu văn `{source_text[:50]}...` sử dụng cấu trúc ngữ pháp tự nhiên với sắc thái chuẩn mực. Từ vựng này được dùng để nhấn mạnh tính khách quan trong văn phong báo chí.",
                "key_takeaways": [
                    "Chú ý trợ từ liên kết giữa các vế câu",
                    "Sắc thái trang trọng phù hợp với tin tức và văn bản chính thức"
                ]
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=40,
                output_tokens=60,
                estimated_cost=0.0,
                latency_ms=20,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 4. Specialized Task: Sentence Decomposition
        if "syntax_pattern" in response_schema.get("properties", {}) or "phân rã ngữ pháp" in prompt:
            data = {
                "syntax_pattern": "[Chủ đề / Chủ ngữ] + [Bổ ngữ] + [Vị ngữ chính]",
                "explanation": "Câu được cấu tạo với trợ từ は xác lập chủ đề lớn, theo sau bởi cụm bổ nghĩa trực tiếp cho vị ngữ cuối câu.",
                "components": [
                    {"text": source_text[:10] if len(source_text) >= 10 else source_text, "role": "Topic", "role_vi": "Chủ đề chính"},
                    {"text": source_text[10:25] if len(source_text) >= 25 else "...", "role": "Modifier", "role_vi": "Bổ ngữ chỉ thời gian / đối tượng"},
                    {"text": source_text[-12:] if len(source_text) >= 12 else source_text, "role": "Predicate", "role_vi": "Vị ngữ kết thúc câu"}
                ]
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=35,
                output_tokens=50,
                estimated_cost=0.0,
                latency_ms=15,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 4.5. Specialized Task: Reading Checkpoints
        if "overall_explanation" in response_schema.get("properties", {}) or "reading comprehension checkpoint" in prompt.lower():
            data = {
                "question_text": "Đoạn văn vừa rồi chủ yếu tập trung vào ý chính nào sau đây?",
                "options": [
                    {"text": "Tóm lược các chi tiết thực tế được nêu trong bài đọc.", "is_correct": True, "explanation": "Thông tin này bám sát nội dung đoạn trích."},
                    {"text": "Đưa ra các giả định mơ hồ không có dẫn chứng.", "is_correct": False, "explanation": "Nội dung này không có trong văn bản."},
                    {"text": "Báo cáo sự việc hoàn toàn khác ở nước ngoài.", "is_correct": False, "explanation": "Không liên quan đến nội dung đoạn trích."}
                ],
                "overall_explanation": "Đoạn văn tóm tắt ý chính và cung cấp thông tin trực tiếp cho người đọc."
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=30,
                output_tokens=50,
                estimated_cost=0.0,
                latency_ms=15,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 5. Specialized Task: Reading Quiz Generation
        if "blueprint" in response_schema.get("properties", {}) or "reading_quiz" in prompt:
            sentences = [s.strip() for s in re.split(r"[。\n！？]+", source_text) if s.strip()]
            first_s = sentences[0] if sentences else "日本の技術と社会に関する記事です。"
            second_s = sentences[1] if len(sentences) > 1 else first_s

            data = {
                "blueprint": {
                    "questionCount": 4,
                    "difficulty": "STANDARD",
                    "skills": ["MAIN_IDEA", "DETAIL", "INFERENCE", "VOCABULARY"]
                },
                "questions": [
                    {
                        "type": "MULTIPLE_CHOICE",
                        "skill": "MAIN_IDEA",
                        "prompt": "この記事の最も重要な主題は何ですか？",
                        "prompt_vi": "Chủ đề quan trọng nhất của bài viết này là gì?",
                        "options": [
                            {"text": f"{first_s[:30]}に関する動向と現状", "text_vi": "Xu hướng và hiện trạng liên quan", "isCorrect": True, "explanation": "Bài viết đặt trọng tâm vào việc phân tích chủ đề này."},
                            {"text": "過去の古い歴史的背景のみを解説すること", "text_vi": "Chỉ giải thích bối cảnh lịch sử cũ trong quá khứ", "isCorrect": False, "explanation": "Bài viết không chỉ nói về lịch sử."},
                            {"text": "海外の無関係な出来事についての報告", "text_vi": "Báo cáo về các sự kiện không liên quan ở nước ngoài", "isCorrect": False, "explanation": "Thông tin không khớp với trọng tâm bài viết."},
                            {"text": "特定の個人に対する批判", "text_vi": "Phê phán một cá nhân cụ thể", "isCorrect": False, "explanation": "Bài viết mang tính khách quan, không công kích cá nhân."}
                        ],
                        "explanation": f"Bài viết tập trung làm rõ: {first_s[:40]}... Đây là thông điệp chính xuyên suốt.",
                        "explanation_vi": "Thông tin chính được thể hiện rõ ràng ở phần mở đầu và kết luận của bài.",
                        "difficulty": "STANDARD",
                        "points": 10,
                        "sourceScope": "ARTICLE",
                        "sourceSentenceId": "s_1",
                        "hints": [
                            "Đọc lại câu mở đầu của bài viết.",
                            "Chú ý đến các từ khóa xuất hiện lặp lại.",
                            "Ý chính thường bao quát toàn bộ diễn biến chứ không chỉ một chi tiết nhỏ."
                        ],
                        "metadata": {"misconception_distractor_type": "DETAIL_OVERLOOK"}
                    },
                    {
                        "type": "MULTIPLE_CHOICE",
                        "skill": "DETAIL",
                        "prompt": "本文の内容と一致しているものはどれですか？",
                        "prompt_vi": "Nội dung nào sau đây trùng khớp với bài viết?",
                        "options": [
                            {"text": f"{first_s[:35]}と述べられている", "text_vi": "Được nêu rõ trong bài viết", "isCorrect": True, "explanation": "Nội dung này khớp chính xác với câu trong bài."},
                            {"text": "まったく逆の結果になったこと", "text_vi": "Kết quả hoàn toàn trái ngược", "isCorrect": False, "explanation": "Không đúng với thực tế nêu trong bài."},
                            {"text": "すでに全ての問題が解決したこと", "text_vi": "Mọi vấn đề đã được giải quyết xong", "isCorrect": False, "explanation": "Bài viết nêu rõ vẫn còn thách thức."},
                            {"text": "関係者が全員反対したこと", "text_vi": "Tất cả các bên liên quan đều phản đối", "isCorrect": False, "explanation": "Thông tin phóng đại, không có trong bài."}
                        ],
                        "explanation": f"Theo bài viết: '{first_s[:50]}...', chi tiết này được ghi nhận trực tiếp.",
                        "explanation_vi": "Chi tiết nêu rõ trong câu đầu tiên của văn bản.",
                        "difficulty": "EASY",
                        "points": 10,
                        "sourceScope": "SENTENCE",
                        "sourceSentenceId": "s_1",
                        "hints": [
                            "Tìm từ khóa trong câu đầu tiên.",
                            "Đối chiếu trực tiếp từng phương án với văn bản.",
                            "Cẩn thận với các từ mang tính tuyệt đối hóa như 'toàn bộ', 'hoàn toàn'."
                        ],
                        "metadata": {"misconception_distractor_type": "DETAIL_OVERLOOK"}
                    },
                    {
                        "type": "MULTIPLE_CHOICE",
                        "skill": "INFERENCE",
                        "prompt": "本文からどのようなことが推測できますか？",
                        "prompt_vi": "Từ bài viết có thể suy luận ra điều gì?",
                        "options": [
                            {"text": "今後の取り組みや変化に高い関心が寄せられていること", "text_vi": "Có sự quan tâm lớn đối với các nỗ lực và thay đổi sắp tới", "isCorrect": True, "explanation": "Dựa trên các phân tích trong bài, có thể suy luận hợp lý về xu hướng tương lai."},
                            {"text": "今後一切の進展が期待できないこと", "text_vi": "Hoàn toàn không thể kỳ vọng bất kỳ tiến triển nào trong tương lai", "isCorrect": False, "explanation": "Suy luận quá bi quan và không có căn cứ."},
                            {"text": "過去の方式に完全に逆戻りすること", "text_vi": "Sẽ quay trở lại hoàn toàn phương thức cũ trong quá khứ", "isCorrect": False, "explanation": "Bài viết hướng tới cải tiến và tương lai."},
                            {"text": "誰もこの問題に関心を持っていないこと", "text_vi": "Không ai quan tâm đến vấn đề này", "isCorrect": False, "explanation": "Trái ngược với tinh thần của bài báo."}
                        ],
                        "explanation": "Từ các nhận định về thách thức và định hướng phát triển, ta suy luận được sự quan tâm của xã hội/ngành đối với vấn đề.",
                        "explanation_vi": "Suy luận dựa trên luận cứ có sẵn mà không cần kiến thức bên ngoài bài.",
                        "difficulty": "CHALLENGING",
                        "points": 10,
                        "sourceScope": "SECTION",
                        "sourceSentenceId": "s_2",
                        "hints": [
                            "Quan sát cách tác giả đặt vấn đề ở phần kết.",
                            "Phân biệt giữa suy luận hợp lý và suy đoán vô căn cứ.",
                            "Xem xét hàm ý đằng sau các con số và dẫn chứng."
                        ],
                        "metadata": {"misconception_distractor_type": "INFERENCE_OVERREACH"}
                    },
                    {
                        "type": "MULTIPLE_CHOICE",
                        "skill": "VOCABULARY",
                        "prompt": "本文の文脈において、最も適切な意味を持つ語句はどれですか？",
                        "prompt_vi": "Trong ngữ cảnh của bài viết, từ ngữ nào mang ý nghĩa phù hợp nhất?",
                        "options": [
                            {"text": "文脈に即した正確な状況や方向性を示す意味", "text_vi": "Nghĩa chỉ tình hình hoặc phương hướng chính xác theo ngữ cảnh", "isCorrect": True, "explanation": "Từ này được dùng với nghĩa chuẩn xác trong văn cảnh báo chí."},
                            {"text": "まったく異なる日常会話のスラング的意味", "text_vi": "Nghĩa tiếng lóng khác biệt hoàn toàn", "isCorrect": False, "explanation": "Sai sắc thái và ngữ cảnh."},
                            {"text": "反対の意味を表す反意語", "text_vi": "Từ mang ý nghĩa trái ngược hoàn toàn", "isCorrect": False, "explanation": "Đây là từ trái nghĩa, không phải nghĩa của từ trong bài."},
                            {"text": "発音だけが似ている無関係な単語", "text_vi": "Từ đồng âm nhưng không liên quan", "isCorrect": False, "explanation": "Nhầm lẫn do phát âm tương tự."}
                        ],
                        "explanation": "Trong văn cảnh bài đọc, từ này mang nghĩa xác định đúng hiện trạng được thảo luận.",
                        "explanation_vi": "Kiểm tra khả năng hiểu nghĩa theo ngữ cảnh thực tế thay vì tra từ điển đơn thuần.",
                        "difficulty": "STANDARD",
                        "points": 10,
                        "sourceScope": "SENTENCE",
                        "sourceSentenceId": "s_1",
                        "hints": [
                            "Đọc cả câu chứa từ này để nắm được mạch ý.",
                            "Thử thay thế các nghĩa vào câu xem nghĩa nào xuôi nhất.",
                            "Chú ý trợ từ đứng trước và sau từ đó."
                        ],
                        "metadata": {"misconception_distractor_type": "SIMILAR_VOCAB"}
                    }
                ]
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=60,
                output_tokens=180,
                estimated_cost=0.0,
                latency_ms=25,
                model_provider=self.name,
                model_name=chosen_model
            )

        # 5b. Specialized Task: Free-Selection Dictionary Lookup (bôi đen tra từ)
        if "meaning_vi" in response_schema.get("properties", {}):
            term_match = re.search(r"<selected_text>(.*?)</selected_text>", prompt, re.DOTALL)
            term = term_match.group(1).strip() if term_match else source_text[:20]
            data = {
                "reading": f"{term} (cách đọc mẫu)",
                "meaning_vi": f"Nghĩa mẫu trong ngữ cảnh cho: {term}",
                "part_of_speech": "noun",
                "jlpt_level": "N3",
                "nuance": f"Sắc thái mẫu khi dùng {term} trong văn phong báo chí.",
                "collocation": f"{term}に関する (liên quan đến {term})",
                "example_usage": f"{term}を使った例文です。 (Câu ví dụ mẫu dùng cụm này.)",
                "examples": [
                    {"sentence_ja": f"{term}が重要です。", "sentence_vi": f"{term} rất quan trọng."},
                    {"sentence_ja": f"{term}について説明します。", "sentence_vi": f"Giải thích về {term}."},
                ],
                "alternatives": [
                    {"expression": f"{term}関連", "reading": "れんかん", "meaning_vi": "liên quan", "difference": "Từ gần nghĩa mẫu."},
                ],
            }
            return AIGenerationResult(
                structured_data=data,
                raw_text=str(data),
                input_tokens=20,
                output_tokens=40,
                estimated_cost=0.0,
                latency_ms=10,
                model_provider=self.name,
                model_name=chosen_model
            )

        # Basic text heuristics for realistic mock values
        char_count = len(source_text)
        kanji_count = len(re.findall(r"[\u4E00-\u9FAF]", source_text))
        sentences = [s.strip() for s in re.split(r"[。\n！？]+", source_text) if s.strip()]
        first_sentence = sentences[0] if sentences else "日本語の学習コンテンツです。"
        second_sentence = sentences[1] if len(sentences) > 1 else first_sentence

        # Extract high-frequency candidate Japanese words from text if present
        vocab_candidates = [
            ("傾向", "けいこう", "noun", "trend / tendency", 5, 85, 6),
            ("影響", "えいきょう", "noun", "influence / impact", 5, 80, 5),
            ("対策", "たいさく", "noun", "countermeasure / measures", 4, 75, 6),
            ("経済", "けいざい", "noun", "economy", 4, 70, 5),
            ("技術", "ぎじゅつ", "noun", "technology / technique", 4, 75, 5),
            ("重要", "じゅうよう", "na-adjective", "important / essential", 4, 65, 4),
            ("検討", "けんとう", "noun", "consideration / examination", 4, 70, 6),
            ("開発", "かいはつ", "noun", "development", 4, 72, 5),
            ("日本", "にほん", "noun", "Japan", 3, 60, 2),
            ("社会", "しゃかい", "noun", "society", 4, 68, 4),
        ]

        extracted_vocab = []
        for word, reading, pos, meaning, imp, prio, diff in vocab_candidates:
            if word in source_text:
                # Find matching sentence
                matching_s = next((s for s in sentences if word in s), first_sentence)
                extracted_vocab.append({
                    "surface_form": word,
                    "normalized_form": word,
                    "reading": reading,
                    "part_of_speech": pos,
                    "meaning_in_context": meaning,
                    "importance": imp,
                    "learning_priority": prio,
                    "difficulty": diff,
                    "source_sentence": matching_s
                })

        # Fallback if no matching vocab candidates found
        if not extracted_vocab and sentences:
            extracted_vocab.append({
                "surface_form": "学習",
                "normalized_form": "学習",
                "reading": "がくしゅう",
                "part_of_speech": "noun",
                "meaning_in_context": "study / learning",
                "importance": 4,
                "learning_priority": 70,
                "difficulty": 4,
                "source_sentence": first_sentence
            })

        # Expressions detection
        expression_candidates = [
            ("〜傾向にある", "〜けいこうにある", "tends to / has a tendency to", "FORMAL_PATTERN", 6, 75),
            ("影響を及ぼす", "えいきょうをおよぼす", "to exert an influence / have an effect", "COLLOCATION", 7, 80),
            ("対策を講じる", "たいさくをこうじる", "to take measures / countermeasures", "COLLOCATION", 7, 85),
            ("注目を集める", "ちゅうもくをあつめる", "to attract attention", "COLLOCATION", 5, 70),
        ]
        extracted_expressions = []
        for expr, reading, meaning, expr_type, diff, prio in expression_candidates:
            expr_stem = expr.replace("〜", "")
            if expr_stem in source_text:
                matching_s = next((s for s in sentences if expr_stem in s), first_sentence)
                extracted_expressions.append({
                    "expression": expr,
                    "reading": reading,
                    "meaning_in_context": meaning,
                    "type": expr_type,
                    "difficulty": diff,
                    "learning_priority": prio,
                    "source_sentence": matching_s
                })

        # Grammar detection
        grammar_candidates = [
            ("〜わけではない", "it does not mean that / not necessarily", "INTERMEDIATE", 6),
            ("〜ことになった", "it has been decided that", "INTERMEDIATE", 5),
            ("〜をめぐって", "concerning / surrounding (a dispute)", "ADVANCED", 7),
            ("〜に違いない", "must be / without a doubt", "INTERMEDIATE", 5),
            ("〜傾向にある", "tendency to do", "INTERMEDIATE", 6),
        ]
        extracted_grammar = []
        for pattern, meaning, category, diff in grammar_candidates:
            stem = pattern.replace("〜", "")
            if stem in source_text:
                matching_s = next((s for s in sentences if stem in s), first_sentence)
                extracted_grammar.append({
                    "pattern": pattern,
                    "meaning_in_context": meaning,
                    "category": category,
                    "difficulty": diff,
                    "source_sentence": matching_s
                })

        # Estimate JLPT level based on kanji density
        kanji_ratio = (kanji_count / max(char_count, 1)) * 100
        if kanji_ratio > 30:
            est_jlpt = "N1"
            overall_diff = 8
        elif kanji_ratio > 20:
            est_jlpt = "N2"
            overall_diff = 7
        elif kanji_ratio > 12:
            est_jlpt = "N3"
            overall_diff = 5
        elif kanji_ratio > 5:
            est_jlpt = "N4"
            overall_diff = 3
        else:
            est_jlpt = "N5"
            overall_diff = 2

        # Construct comprehensive structured dictionary
        data: Dict[str, Any] = {
            "language_analysis": {
                "language": "ja",
                "language_confidence": 0.98,
                "is_japanese": True,
                "mixed_language": bool(re.search(r"[a-zA-Z]", source_text))
            },
            "classification": {
                "primary_type": "NEWS" if "ニュース" in source_text or "発表" in source_text else "ARTICLE",
                "secondary_types": ["ANALYSIS", "REPORT"],
                "content_role": "FORMAL" if "である" in source_text or "ました" in source_text else "CASUAL"
            },
            "topics": {
                "primary_topic": "Technology" if "技術" in source_text or "AI" in source_text else "Society",
                "secondary_topics": ["Business", "Japan"],
                "topic_confidence": 0.92
            },
            "keywords": ["日本", "技術", "動向", "社会", "発表"],
            "entities": [
                {"name": "日本", "type": "place", "confidence": 0.99},
                {"name": "政府", "type": "organization", "confidence": 0.90}
            ],
            "difficulty": {
                "overall_difficulty": overall_diff,
                "vocabulary_difficulty": min(overall_diff + 1, 10),
                "grammar_difficulty": overall_diff,
                "kanji_difficulty": min(overall_diff + 1, 10),
                "sentence_complexity": max(overall_diff - 1, 1),
                "conceptual_difficulty": overall_diff,
                "estimated_jlpt": est_jlpt,
                "difficulty_reasons": [
                    "Sử dụng từ vựng chuyên ngành hoặc tin tức",
                    "Cấu trúc câu đa mệnh đề với trợ từ nối",
                    "Tần suất chữ Hán cao"
                ]
            },
            "summary": {
                "micro_summary": first_sentence[:80] + "..." if len(first_sentence) > 80 else first_sentence,
                "short_summary": (first_sentence + " " + second_sentence)[:200],
                "detailed_summary": [
                    "Nội dung chính xoay quanh các diễn biến và thông tin mới cập nhật.",
                    "Đưa ra các số liệu và phân tích từ các chuyên gia trong ngành.",
                    "Khuyến nghị các biện pháp phù hợp cho người học và đối tượng liên quan."
                ]
            },
            "register": {
                "register": "FORMAL",
                "formality_score": 85,
                "casualness_score": 15,
                "internet_slang_score": 0,
                "requires_cultural_context": True if "文化" in source_text or "習慣" in source_text else False,
                "cultural_topics": ["ビジネス習慣", "社会情勢"]
            },
            "vocabulary": extracted_vocab,
            "expressions": extracted_expressions,
            "grammar": extracted_grammar,
            "quality": {
                "quality_score": 88,
                "learning_readiness_score": 85,
                "freshness_score": 100,
                "learning_ready": True
            }
        }

        latency_ms = int((time.time() - start_time) * 1000)
        input_tokens = max(int(char_count / 2), 10)
        output_tokens = 350

        return AIGenerationResult(
            structured_data=data,
            raw_text="{}",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=0.0,
            latency_ms=latency_ms,
            model_provider=self.name,
            model_name=chosen_model
        )

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        return 0.0
