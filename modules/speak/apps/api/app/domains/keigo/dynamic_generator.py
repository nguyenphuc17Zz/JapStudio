"""AIKeigoGenerator — 100% dynamic on-the-fly Keigo & Register Exercise Generation via Gemini AI & Sudachi.

No static hardcoded list. Generates infinite authentic Japanese Keigo challenges in real-time across 20+ business situations.
Includes Multi-Tier Scaffolding Hints, Keigo Anatomy Breakdown, and Persona Simulation.
Gracefully falls back to deterministic KeigoTransformationEngine & Factory if AI is unreachable.
"""

from __future__ import annotations

import asyncio
import json
import random
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.reflex.cache_service import ExerciseCacheService
from app.domains.ai.contracts import (
    AIMessage,
    AIMessageRole,
    AIRequest,
    AITask,
    ResponseFormat,
    ResponseFormatType,
)
from app.domains.ai.router import AIRouter
from app.domains.japanese.provider import get_language_provider
from app.domains.keigo.exercise_factory import KeigoExerciseFactory
from app.domains.keigo.keigo_vocab_pool import get_all_keigo_vocab
from app.domains.keigo.social_context import (
    Register,
)
from app.domains.keigo.transformation_engine import KeigoTransformationEngine
from app.domains.reflex.conjugation_engine import ConjugationForm, JapaneseConjugationEngine
from app.domains.reflex.pressure_profiles import timer_for_level
from app.domains.vocabulary.frequency_service import get_frequency_vocabulary_service

# 20+ Diverse Business Contexts & Scenarios for Real-life Japanese Business Keigo
BUSINESS_TOPICS_POOL = [
    ("Tiếp khách tại sảnh & quầy lễ tân (受付・来客応対)", "chào đón đối tác, hỏi thông tin hẹn trước, mời vào phòng họp, mời trà, hướng dẫn lối đi"),
    ("Nhận & gọi điện thoại đối tác (電話応対)", "nghe máy công ty, xác nhận danh tính người gọi, chuyển máy cho cấp trên, ghi nhận tin nhắn khi vắng mặt, gọi lại sau"),
    ("Báo cáo & trao đổi công việc (報告・連絡・相談 - Ho-Ren-So)", "báo cáo tiến độ dự án với sếp, xin ý kiến chỉ đạo, thông báo kết quả cuộc họp, cập nhật số liệu"),
    ("Hẹn lịch & sắp xếp cuộc gặp (アポイントメント・日程調整)", "đề xuất ngày giờ gặp mặt đối tác, xác nhận lịch trình của giám đốc, xin dời lịch hẹn vì việc đột xuất"),
    ("Xin lỗi sự cố & giải quyết phàn nàn (謝罪・クレーム対応)", "xin lỗi khách hàng vì giao hàng trễ, nhận lỗi sơ sót tài liệu, cam kết xử lý và khắc phục sự cố"),
    ("Nhờ vả & đề nghị hợp tác (依頼・お願い)", "nhờ đồng nghiệp hỗ trợ, xin chữ ký duyệt của trưởng phòng, nhờ đối tác gửi lại bảng báo giá"),
    ("Từ chối khéo léo & lịch thiệp (お断り・辞退)", "từ chối lời mời dự tiệc công ty đối tác vì trùng lịch, từ chối yêu cầu giảm giá một cách tế nhị"),
    ("Trao đổi nội bộ về sếp với khách ngoài (内外・ウチとソト)", "nói với khách hàng về sự vắng mặt của giám đốc mình, giới thiệu thành viên công ty với đối tác ngoài"),
    ("Gửi & phản hồi email thương mại (ビジネスメール)", "xác nhận đã nhận tài liệu, thông báo đính kèm file hợp đồng, lời chúc cuối thư chuẩn mực"),
    ("Đàm phán & thương thảo hợp đồng (商談・交渉)", "trình bày đề xuất kinh doanh, giải thích điều khoản hợp đồng, lắng nghe mong muốn của khách hàng"),
    ("Thuyết trình & báo cáo dự án (プレゼンテーション)", "mở đầu buổi thuyết trình trước ban giám đốc, chuyển ý giữa các phần, kết thúc và cảm ơn"),
    ("Chào hỏi & làm quen đối tác mới (初対面・名刺交換)", "giới thiệu bản thân khi trao đổi danh thiếp, bày tỏ mong muốn được hợp tác lâu dài"),
    ("Lời cảm ơn & tri ân đối tác (お礼・感謝)", "cảm ơn khách hàng đã ghé thăm gian hàng triển lãm, cảm ơn sự giúp đỡ tận tình của đối tác"),
    ("Mời dự tiệc & sự kiện công ty (招待・案内)", "mời khách hàng tham dự lễ kỷ niệm thành lập công ty, mời cấp trên dự tiệc tất niên"),
    ("Thăm hỏi & chúc mừng công việc (挨拶・お祝い)", "chúc mừng đối tác thăng chức, chúc mừng khai trương văn phòng mới, thăm hỏi sức khoẻ"),
    ("Hướng dẫn & đào tạo nhân viên mới (指導・OJT)", "hướng dẫn quy trình văn phòng cho ma mới, nhắc nhở tác phong đúng mực"),
    ("Hỏi thông tin & thu thập ý kiến (ヒアリング・確認)", "hỏi thăm nhu cầu của khách hàng, xác nhận lại thông tin đơn hàng"),
    ("Đón tiếp tại sân bay / khách sạn (送迎・アテンド)", "đón đối tác Nhật Bản tại sân bay, hướng dẫn về khách sạn và sắp xếp bữa tối"),
    ("Trao đổi tiến độ thanh toán & hoá đơn (請求・支払い)", "nhắc nhở lịch thanh toán một cách lịch sự, xác nhận đã nhận được tiền chuyển khoản"),
    ("Chào tạm biệt khi kết thúc chuyến công tác (見送り・締めくくり)", "cảm ơn vì sự đón tiếp chu đáo trong chuyến công tác, hẹn gặp lại dịp tới"),
]


def _extract_hints_and_anatomy(
    data: dict[str, Any],
    default_root: str,
    default_formula: str,
    default_rationale: str,
    canonical: str,
    prompt: str = "",
    pitfall: str = "",
) -> tuple[dict[str, str], dict[str, str]]:
    hints = data.get("hints") or {}
    t1 = hints.get("tier1") or data.get("hint_tier_1") or data.get("hint_1")
    t2 = hints.get("tier2") or data.get("hint_tier_2") or data.get("hint_2")
    if not t1:
        t1 = f"Động từ: {default_root} ➔ {default_rationale}"
    if not t2:
        prefix = canonical[:4] if len(canonical) >= 4 else canonical[:2]
        t2 = f"Gợi ý bắt đầu: 「{prefix}...」 | Mẫu câu: {default_formula}"

    anatomy_data = data.get("anatomy") or {}
    anatomy = {
        "root_verb": str(anatomy_data.get("root_verb") or data.get("root_verb") or default_root),
        "formula": str(anatomy_data.get("formula") or data.get("formula") or default_formula),
        "rationale": str(anatomy_data.get("rationale") or data.get("rationale") or default_rationale),
        "pitfall_warning": str(anatomy_data.get("pitfall_warning") or data.get("pitfall_warning") or pitfall or "Tránh nhầm lẫn giữa Tôn kính (nâng người) và Khiêm nhường (hạ mình)"),
    }
    return {"tier1": str(t1), "tier2": str(t2)}, anatomy


def _extract_persona(data: dict[str, Any], topic: str = "") -> dict[str, str]:
    persona_data = data.get("persona") or {}
    name = persona_data.get("name") or data.get("persona_name")
    role = persona_data.get("role") or data.get("persona_role")
    avatar = persona_data.get("avatar") or data.get("persona_avatar")
    if not name:
        if "SOTO" in str(data.get("listener_group", "")) or "CUSTOMER" in str(data.get("listener_role", "")):
            name = "Khách hàng Sato (佐藤様)"
            role = "CUSTOMER / PARTNER"
            avatar = "💼"
        elif "MANAGER" in str(data.get("listener_role", "")) or "MANAGER" in str(data.get("referent_role", "")):
            name = "Trưởng phòng Tanaka (田中部長)"
            role = "MANAGER"
            avatar = "👨‍💼"
        else:
            name = "Đối tác Yamada (山田様)"
            role = "BUSINESS PARTNER"
            avatar = "🧑‍💼"
    return {"name": str(name), "role": str(role or "COLLABORATOR"), "avatar": str(avatar or "🧑‍💼")}


class AIKeigoGenerator:
    """Generates infinite, creative, non-repeating Keigo speaking exercises using Gemini AI and Sudachi."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)
        self.factory = KeigoExerciseFactory()
        self.engine = KeigoTransformationEngine()
        self.lang_provider = get_language_provider()
        self.recent_signatures: set[str] = set()
        self.cache_service = ExerciseCacheService(db)

    async def _dispatch_smart_cached_exercise(
        self,
        sub_mode: str,
        difficulty: str,
        pressure_level: str,
        generator_coro_factory,
        category: str | None = None,
        formulas: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Orchestrates Adaptive Bandit, Spaced Decay Zero-Latency Serving, and Async Pool Growth for Keigo.
        Returns smart cached exercise instantly if available, while expanding the pool in the background.
        """
        if not formulas:
            is_explore, pool_size = await self.cache_service.should_explore(
                domain="keigo", sub_mode=sub_mode, difficulty=difficulty
            )
            if not is_explore:
                cached = await self.cache_service.get_smart_exercise(
                    domain="keigo",
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    recent_prompts=list(self.recent_signatures)[-6:],
                )
                if cached:
                    cached["timer_limit_ms"] = timer_for_level(pressure_level)
                    cached["pressure_level"] = pressure_level
                    # Trigger background expansion to continuously enrich pool without blocking user
                    self.cache_service.trigger_background_expansion(
                        domain="keigo",
                        sub_mode=sub_mode,
                        difficulty=difficulty,
                        generator_coroutine_factory=generator_coro_factory,
                        category=category,
                    )
                    return cached

        # Exploration turn or cache miss: generate fresh via Gemini
        fresh = await generator_coro_factory()
        if fresh and fresh.get("ai_generated") is not False:
            async def _save_bg(item):
                try:
                    svc = ExerciseCacheService()
                    await svc.save_exercise_to_pool(
                        domain="keigo",
                        sub_mode=sub_mode,
                        difficulty=difficulty,
                        exercise_dict=item,
                        category=category,
                    )
                except Exception as err:
                    logger.warning(f"[AIKeigoGenerator] Background pool save failed: {err}")

            asyncio.create_task(_save_bg(fresh))
        return fresh

    async def generate_dynamic_exercise(
        self,
        sub_mode: str,
        difficulty: str = "normal",
        pressure_level: str = "normal",
        user_id: str = "keigo_user",
        tier: int | None = None,
        category: str | None = None,
        formulas: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generates dynamic Keigo exercise via Gemini AI with linguistic verification, smart cache pool, and zero-latency serving."""
        try:
            if sub_mode == "keigo_vocab_blitz":
                return await self._generate_dynamic_vocab_blitz(difficulty, pressure_level, user_id, tier=tier, category=category, formulas=formulas)
            elif sub_mode == "keigo_sonkeigo":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_sonkeigo(difficulty, pressure_level, user_id, formulas=formulas),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_kenjougo":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_kenjougo(difficulty, pressure_level, user_id, formulas=formulas),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_teineigo":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_teineigo(difficulty, pressure_level, user_id),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_transformation":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_shift(difficulty, pressure_level, user_id),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_context":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_uchi_soto(difficulty, pressure_level, user_id),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_doctor":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_doctor(difficulty, pressure_level, user_id),
                    category=category,
                    formulas=formulas,
                )
            elif sub_mode == "keigo_naturalness":
                return await self._dispatch_smart_cached_exercise(
                    sub_mode=sub_mode,
                    difficulty=difficulty,
                    pressure_level=pressure_level,
                    generator_coro_factory=lambda: self._generate_dynamic_naturalness(difficulty, pressure_level, user_id),
                    category=category,
                    formulas=formulas,
                )
            else:
                candidate_modes = [
                    "keigo_sonkeigo",
                    "keigo_kenjougo",
                    "keigo_vocab_blitz",
                    "keigo_teineigo",
                    "keigo_transformation",
                    "keigo_context",
                ]
                if formulas:
                    has_son = any(f.startswith("sonkeigo_") for f in formulas)
                    has_ken = any(f.startswith("kenjougo_") for f in formulas)
                    has_tei = any(f in ("bikago_prefix", "teineigo_desu_masu") for f in formulas)
                    filtered_modes = []
                    if has_son:
                        filtered_modes.extend(["keigo_sonkeigo", "keigo_vocab_blitz"])
                    if has_ken:
                        filtered_modes.extend(["keigo_kenjougo", "keigo_vocab_blitz"])
                    if has_tei:
                        filtered_modes.extend(["keigo_teineigo", "keigo_vocab_blitz"])
                    if filtered_modes:
                        candidate_modes = filtered_modes
                eff = random.choice(candidate_modes)
                return await self.generate_dynamic_exercise(eff, difficulty, pressure_level, user_id, tier=tier, category=category, formulas=formulas)
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] AI generation exception, falling back to rule factory: {e}")
            result = self.factory.generate(sub_mode=sub_mode, difficulty=difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            if tier:
                result["frequency_tier"] = tier
            if category:
                result["vocab_category"] = category
            return result

    async def _generate_dynamic_vocab_blitz(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
        tier: int | None = None,
        category: str | None = None,
        formulas: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generates dynamic 1-to-1 Keigo Verb Flash-Blitz exercise from rich pool and BCCWJ high frequency vocabulary."""
        timer_ms = min(timer_for_level(pressure_level), 4000)

        # If specific formulas are requested, select targeting that formula
        target_formula = random.choice(formulas) if formulas else None

        if target_formula in ("sonkeigo_irregular", "kenjougo_irregular"):
            use_bccwj = False
        elif target_formula in ("bikago_prefix", "sonkeigo_o_ni_naru", "sonkeigo_passive", "sonkeigo_kudasai", "kenjougo_o_suru", "kenjougo_moushiageru", "kenjougo_permissive"):
            use_bccwj = True
        else:
            use_bccwj = (
                tier is not None
                or (category is not None and category != "all")
                or (random.random() < 0.5)
            )

        if use_bccwj:
            try:
                freq_svc = get_frequency_vocabulary_service()
                regular_entries = freq_svc.get_regular_keigo_entries(category=category, tier=tier)
                if target_formula:
                    if target_formula == "bikago_prefix":
                        filtered_entries = [e for e in regular_entries if e.get("type") == "noun_prefix"]
                        if filtered_entries:
                            regular_entries = filtered_entries
                    elif target_formula in ("sonkeigo_o_ni_naru", "sonkeigo_passive", "sonkeigo_kudasai", "kenjougo_o_suru", "kenjougo_moushiageru", "kenjougo_permissive"):
                        filtered_entries = [e for e in regular_entries if e.get("type") in ("regular_verb", "suru_verb")]
                        if filtered_entries:
                            regular_entries = filtered_entries

                if regular_entries:
                    item = random.choice(regular_entries)
                    item_type = item.get("type")
                    rank = item.get("rank", 500)
                    item_tier = item.get("tier") or tier or 1
                    item_cat = item.get("category") or category or "daily_life"

                    if item_type == "noun_prefix":
                        clean_word = item["source_word"]
                        prefix = item["prefix"]
                        canonical = item["canonical"]
                        variants = [canonical]
                        is_o = prefix == "お"
                        formula = "Thêm tiền tố お (Kunyomi thuần Nhật / quen thuộc)" if is_o else "Thêm tiền tố ご (Onyomi Hán Nhật 2 âm tiết)"
                        explanation = f"Từ '{clean_word}' là từ {'thuần Nhật (Kunyomi)' if is_o else 'gốc Hán (Onyomi)'}, do đó gắn tiền tố 「{prefix}」 để tôn kính hóa hoặc mỹ hóa."

                        return {
                            "title": f"Keigo Blitz (Mỹ Từ {prefix}): {clean_word} ➔ {canonical}",
                            "objective": f"Nói dạng kính ngữ có tiền tố 「{prefix}」 trong {timer_ms/1000:.1f}s",
                            "scenario": f"Biến đổi tiền tố danh từ • Top #{rank} (Tier {item_tier}) BCCWJ",
                            "instructions": f"Từ: '{clean_word}' ({item.get('meaning_vi', '')}) — Thêm tiền tố お hoặc ご đúng chuẩn!",
                            "prompt": clean_word,
                            "source": clean_word,
                            "canonical": canonical,
                            "acceptable_variants": variants,
                            "translation": f"{clean_word}: {item.get('meaning_vi', '')} ➔ {canonical}",
                            "vietnamese": f"{clean_word}: {item.get('meaning_vi', '')}",
                            "hints": {
                                "tier1": f"Danh từ: {clean_word} ({item.get('meaning_vi', '')}) ➔ Gắn tiền tố 「{prefix}」",
                                "tier2": f"Gợi ý: {formula}",
                            },
                            "anatomy": {
                                "root_verb": clean_word,
                                "formula": formula,
                                "rationale": explanation,
                                "pitfall_warning": "Tránh nhầm giữa tiền tố お (Kunyomi) và ご (Onyomi)",
                            },
                            "persona": {"name": "Keigo Sensei", "role": "COACH", "avatar": "🌸"},
                            "timer_limit_ms": timer_ms,
                            "pressure_level": pressure_level,
                            "difficulty": difficulty,
                            "constraints": ["Thêm đúng tiền tố tôn kính"],
                            "target_patterns": variants[:2],
                            "estimated_minutes": 1,
                            "ai_generated": True,
                            "generation_source": "bccwj_frequency_pool",
                            "frequency_rank": rank,
                            "frequency_tier": item_tier,
                            "vocab_category": item_cat,
                        }

                    elif item_type == "suru_verb":
                        clean_word = item["source_word"]
                        noun_part = clean_word[:-2]
                        prefix = item["prefix"]

                        if target_formula in ("sonkeigo_o_ni_naru", "sonkeigo_passive", "sonkeigo_kudasai"):
                            is_sonkeigo = True
                        elif target_formula in ("kenjougo_o_suru", "kenjougo_moushiageru", "kenjougo_permissive"):
                            is_sonkeigo = False
                        else:
                            is_sonkeigo = random.choice([True, False])

                        if target_formula == "sonkeigo_kudasai":
                            canonical = f"{prefix}{noun_part}ください"
                            variants = [f"{prefix}{noun_part}ください", f"{prefix}{noun_part}くださいませ", f"{prefix}{noun_part}いただけますでしょうか"]
                            target_label = "Thể Nhờ Vả / Yêu Cầu (お/ご〜ください)"
                            formula = f"Công thức: {prefix} + Danh từ gốc Hán + ください / いただけますでしょうか"
                            rationale = f"Đề nghị đối phương/khách hàng: {clean_word} ➔ {prefix}{noun_part}ください"
                        elif target_formula == "kenjougo_moushiageru":
                            canonical = f"{prefix}{noun_part}申し上げます"
                            variants = [f"{prefix}{noun_part}申し上げます"]
                            target_label = "Thưa Gửi & Báo Cáo Trang Trọng (〜申し上げます)"
                            formula = f"Công thức: {prefix} + Danh từ gốc Hán + 申し上げます"
                            rationale = f"Báo cáo thưa gửi trang trọng với khách: {clean_word} ➔ {prefix}{noun_part}申し上げます"
                        elif target_formula == "kenjougo_permissive":
                            canonical = f"{noun_part}させていただきます"
                            variants = [f"{noun_part}させていただきます", f"{noun_part}させていただけますでしょうか"]
                            target_label = "Xin Phép Được Làm (〜させていただきます)"
                            formula = f"Công thức: Danh từ gốc Hán + させていただきます"
                            rationale = f"Xin phép người nghe cho mình được thực hiện: {clean_word} ➔ {noun_part}させていただきます"
                        elif is_sonkeigo:
                            canonical = item["sonkeigo_polite"]
                            variants = [
                                item["sonkeigo_polite"],
                                item["sonkeigo"],
                                item["sonkeigo_nasaru"],
                                f"{prefix}{noun_part}なさいます",
                                item["passive_sonkeigo"],
                                f"{noun_part}されます",
                            ]
                            target_label = "Tôn kính ngữ (尊敬語)"
                            formula = f"Công thức: {prefix} + Danh từ gốc Hán + になる / になります (hoặc Bị động: 〜される)"
                            rationale = f"Hành động của Đối tác/Khách hàng/Sếp: biến {clean_word} thành {prefix}{noun_part}になります"
                        else:
                            canonical = item["kenjougo_polite"]
                            variants = [
                                item["kenjougo_polite"],
                                item["kenjougo"],
                                f"{prefix}{noun_part}いたします",
                                f"{prefix}{noun_part}します",
                            ]
                            target_label = "Khiêm nhường ngữ (謙譲語)"
                            formula = f"Công thức: {prefix} + Danh từ gốc Hán + する / いたします"
                            rationale = f"Hành động của Bản thân/Công ty mình: biến {clean_word} thành {prefix}{noun_part}いたします"

                        return {
                            "title": f"Keigo Blitz ({target_label}): {clean_word} ➔ {canonical}",
                            "objective": f"Chuyển '{clean_word}' sang {target_label} trong {timer_ms/1000:.1f}s",
                            "scenario": f"Quy tắc Kính ngữ động từ する • Top #{rank} (Tier {item_tier}) BCCWJ",
                            "instructions": f"Từ: '{clean_word}' ({item.get('meaning_vi', '')}) — Nói ngay dạng {target_label}!",
                            "prompt": clean_word,
                            "source": clean_word,
                            "canonical": canonical,
                            "acceptable_variants": variants,
                            "translation": f"{clean_word}: {item.get('meaning_vi', '')} ➔ {canonical}",
                            "vietnamese": f"{clean_word}: {item.get('meaning_vi', '')}",
                            "hints": {
                                "tier1": f"Động từ: {clean_word} ({item.get('meaning_vi', '')}) ➔ Cần biến sang {target_label}",
                                "tier2": f"Gợi ý: {formula}",
                            },
                            "anatomy": {
                                "root_verb": clean_word,
                                "formula": formula,
                                "rationale": rationale,
                                "pitfall_warning": "Tránh nhầm giữa Tôn kính ngữ (đối phương) và Khiêm nhường ngữ (bản thân)",
                            },
                            "persona": {"name": "Keigo Sensei", "role": "COACH", "avatar": "👔"},
                            "timer_limit_ms": timer_ms,
                            "pressure_level": pressure_level,
                            "difficulty": difficulty,
                            "constraints": [f"Chuyển đúng dạng {target_label}"],
                            "target_patterns": variants[:2],
                            "estimated_minutes": 1,
                            "ai_generated": True,
                            "generation_source": "bccwj_frequency_pool",
                            "frequency_rank": rank,
                            "frequency_tier": item_tier,
                            "vocab_category": item_cat,
                        }

                    elif item_type == "regular_verb":
                        clean_word = item["source_word"]
                        ce = JapaneseConjugationEngine()
                        vc = ce.identify_verb_class(clean_word)
                        if vc.value == "ichidan":
                            stem = clean_word[:-1] if clean_word.endswith("る") else clean_word
                        else:
                            ending = clean_word[-1]
                            mapping = {"う": "い", "く": "き", "ぐ": "ぎ", "す": "し", "つ": "ち", "ぬ": "に", "ぶ": "び", "む": "み", "る": "り"}
                            stem = clean_word[:-1] + mapping.get(ending, "")
                        passive_obj = ce.conjugate(clean_word, ConjugationForm.PASSIVE)
                        passive_form = passive_obj.canonical

                        if target_formula in ("sonkeigo_o_ni_naru", "sonkeigo_passive", "sonkeigo_kudasai"):
                            is_sonkeigo = True
                        elif target_formula in ("kenjougo_o_suru", "kenjougo_moushiageru", "kenjougo_permissive"):
                            is_sonkeigo = False
                        else:
                            is_sonkeigo = random.choice([True, False])

                        if target_formula == "sonkeigo_passive":
                            canonical = f"{passive_form[:-1]}ます" if passive_form.endswith("る") else f"{passive_form}ます"
                            variants = [canonical, passive_form]
                            target_label = "Thể Bị Động Kính Ngữ (〜れる / 〜られる)"
                            formula = "Công thức: V(bị động) 〜れる / 〜られる / 〜されます"
                            rationale = f"Kính ngữ bị động tôn trọng đối phương: {clean_word} ➔ {canonical}"
                        elif target_formula == "sonkeigo_kudasai":
                            canonical = f"お{stem}ください"
                            variants = [f"お{stem}ください", f"お{stem}くださいませ", f"お{stem}いただけますでしょうか"]
                            target_label = "Thể Nhờ Vả / Yêu Cầu (お〜ください)"
                            formula = "Công thức: お + V_stem + ください / いただけますでしょうか"
                            rationale = f"Khuyên nhủ đối phương lịch thiệp: {clean_word} ➔ {canonical}"
                        elif target_formula == "kenjougo_moushiageru":
                            canonical = f"お{stem}申し上げます"
                            variants = [f"お{stem}申し上げます"]
                            target_label = "Thưa Gửi & Báo Cáo (〜申し上げます)"
                            formula = "Công thức: お + V_stem + 申し上げます"
                            rationale = f"Thưa gửi báo cáo hạ mình trước khách: {clean_word} ➔ {canonical}"
                        elif target_formula == "kenjougo_permissive":
                            causative_obj = ce.conjugate(clean_word, ConjugationForm.CAUSATIVE)
                            causative_form = causative_obj.canonical
                            c_stem = causative_form[:-1] if causative_form.endswith("る") else causative_form
                            canonical = f"{c_stem}ていただきます"
                            variants = [canonical, f"{c_stem}ていただけますでしょうか"]
                            target_label = "Xin Phép Được Làm (〜させていただきます)"
                            formula = "Công thức: V(sai khiến) + いただきます / させていただきます"
                            rationale = f"Xin phép được thực hiện hành động: {clean_word} ➔ {canonical}"
                        elif is_sonkeigo:
                            canonical = f"お{stem}になります"
                            variants = [f"お{stem}になります", f"お{stem}になる", passive_form, f"{passive_form[:-1]}ます"]
                            target_label = "Tôn kính ngữ (尊敬語)"
                            formula = "Công thức: お + V_stem + になる / になります (hoặc Bị động: 〜れる / 〜られる)"
                            rationale = f"Hành động của Đối tác/Khách hàng/Sếp: nâng cao thành お{stem}になります"
                        else:
                            canonical = f"お{stem}いたします"
                            variants = [f"お{stem}いたします", f"お{stem}する", f"お{stem}します", f"お{stem}いたす"]
                            target_label = "Khiêm nhường ngữ (謙譲語)"
                            formula = "Công thức: お + V_stem + する / いたします"
                            rationale = f"Hành động của Bản thân/Công ty mình: hạ mình thành お{stem}いたします"

                        return {
                            "title": f"Keigo Blitz ({target_label}): {clean_word} ➔ {canonical}",
                            "objective": f"Chuyển '{clean_word}' sang {target_label} trong {timer_ms/1000:.1f}s",
                            "scenario": f"Quy tắc お + V_stem • Top #{rank} (Tier {item_tier}) BCCWJ",
                            "instructions": f"Từ: '{clean_word}' ({item.get('meaning_vi', '')}) — Nói ngay dạng {target_label}!",
                            "prompt": clean_word,
                            "source": clean_word,
                            "canonical": canonical,
                            "acceptable_variants": variants,
                            "translation": f"{clean_word}: {item.get('meaning_vi', '')} ➔ {canonical}",
                            "vietnamese": f"{clean_word}: {item.get('meaning_vi', '')}",
                            "hints": {
                                "tier1": f"Động từ: {clean_word} ({item.get('meaning_vi', '')}) ➔ Cần biến sang {target_label}",
                                "tier2": f"Gợi ý: {formula}",
                            },
                            "anatomy": {
                                "root_verb": clean_word,
                                "formula": formula,
                                "rationale": rationale,
                                "pitfall_warning": "Tránh dùng nhầm thể Tôn kính ngữ cho hành động của chính mình",
                            },
                            "persona": {"name": "Keigo Sensei", "role": "COACH", "avatar": "🥋"},
                            "timer_limit_ms": timer_ms,
                            "pressure_level": pressure_level,
                            "difficulty": difficulty,
                            "constraints": [f"Chuyển đúng dạng {target_label}"],
                            "target_patterns": variants[:2],
                            "estimated_minutes": 1,
                            "ai_generated": True,
                            "generation_source": "bccwj_frequency_pool",
                            "frequency_rank": rank,
                            "frequency_tier": item_tier,
                            "vocab_category": item_cat,
                        }
            except Exception as err:
                logger.warning(f"Regular keigo generator fallback to pool: {err}")

        # Fallback / Default: Standard irregular keigo vocab pool
        pool = get_all_keigo_vocab()
        if target_formula == "sonkeigo_irregular":
            filtered_pool = [e for e in pool if e.target_type == "sonkeigo"]
            if filtered_pool:
                pool = filtered_pool
        elif target_formula == "kenjougo_irregular":
            filtered_pool = [e for e in pool if e.target_type == "kenjougo"]
            if filtered_pool:
                pool = filtered_pool
        entry = random.choice(pool)

        target_name = "Tôn Kính Ngữ (尊敬語 ↑)" if entry.target_type == "sonkeigo" else "Khiêm Nhường Ngữ (謙譲語 ↓)" if entry.target_type == "kenjougo" else "Kính Ngữ / Lịch Sự"
        clean_word = entry.source_word.split("(")[0].split("（")[0].strip()
        prompt = clean_word
        canonical = entry.canonical
        variants = [canonical] + [v for v in entry.acceptable_variants if v != canonical]

        hints = {
            "tier1": f"Động từ: {clean_word} ({entry.meaning_vi}) ➔ Cần biến sang {entry.target_label_vi}",
            "tier2": f"Gợi ý bắt đầu: 「{entry.canonical[:2]}...」 | Dạng: {entry.formula or 'Bất quy tắc'}",
        }
        anatomy = {
            "root_verb": f"{clean_word} ({entry.meaning_vi})",
            "formula": entry.formula or "Dạng bất quy tắc",
            "rationale": entry.explanation_vi or entry.subject_hint_vi or f"Dùng cho {target_name}",
            "pitfall_warning": "Tránh dùng nhầm hướng Tôn kính (nâng người) vs Khiêm nhường (hạ mình)",
        }
        persona = {
            "name": "Keigo Drill Sensei",
            "role": "DRILL COACH",
            "avatar": "🥋",
        }

        return {
            "title": "Keigo Flash-Blitz: Phản Xạ Động Từ (瞬間反射 ⚡)",
            "objective": f"Phản xạ nhanh động từ {entry.target_label_vi} trong {timer_ms/1000:.1f}s",
            "scenario": f"Chuyển nhanh từ thường sang {entry.target_label_vi}",
            "instructions": f"Hãy nói ngay dạng {entry.target_label_vi} của 「{clean_word}」",
            "prompt": prompt,
            "source": clean_word,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": f"{clean_word}: {entry.meaning_vi} ➔ {canonical}",
            "vietnamese": f"{clean_word}: {entry.meaning_vi}",
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": [f"Chuyển đúng dạng {entry.target_label_vi}"],
            "target_patterns": variants[:2],
            "estimated_minutes": 1,
            "ai_generated": True,
            "generation_source": "vocab_pool",
            "frequency_rank": 35 if (tier == 1 or not tier) else 1250,
            "frequency_tier": tier or 1,
            "vocab_category": category or "action_verbs",
        }

    async def _generate_dynamic_sonkeigo(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
        formulas: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generates dynamic Sonkeigo (尊敬語) exercise - honoring the listener/customer/boss."""
        timer_ms = timer_for_level(pressure_level)
        chosen_topic, topic_detail = random.choice(BUSINESS_TOPICS_POOL)
        nonce = uuid.uuid4().hex[:8]

        formula_constraint = ""
        if formulas:
            son_cand = [f for f in formulas if f.startswith("sonkeigo_")] or formulas
            picked_f = random.choice(son_cand)
            if picked_f == "sonkeigo_kudasai":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Thể Yêu Cầu / Nhờ Vả Lịch Sự (お/ご + V_stem + ください hoặc いただけますでしょうか), ví dụ: ご確認ください, お待ちください, ご覧ください.\n"
            elif picked_f == "sonkeigo_passive":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Thể Bị Động Kính Ngữ (〜れる / 〜られる / 〜される), ví dụ: 書かれる, 読まれる, 食べられる, 帰られる, される.\n"
            elif picked_f == "sonkeigo_o_ni_naru":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Khuôn mẫu quy tắc chuẩn お + V_stem + になる / になります (hoặc ご + N + になる / なさる), ví dụ: お待ちになる, お読みになります, ご連絡なさる.\n"
            elif picked_f == "sonkeigo_irregular":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Động từ tình huống BẮT BUỘC là Động từ Bất quy tắc tôn kính đặc biệt (như 召し上がる, いらっしゃる, おっしゃる, ご覧になる, なさる, ご存知...).\n"

        prompt_text = (
            f"Hãy tạo 1 bài tập Tôn Kính Ngữ (尊敬語 - Sonkeigo) độc đáo, tự nhiên trong bối cảnh công sở Nhật Bản. "
            f"Chủ đề: '{chosen_topic}' ({topic_detail}). [Nonce: {nonce}]\n"
            f"Quy tắc: Cho 1 câu nói về hành động của Đối tác/Khách hàng/Sếp (thể thông thường hoặc lịch sự nhẹ), "
            f"và yêu cầu người học chuyển sang câu Tôn Kính Ngữ (Sonkeigo) chuẩn mực cao nhất.\n"
            f"{formula_constraint}"
            f"TIÊU CHUẨN THỰC CHIẾN BẮT BUỘC: CHỈ dùng các từ vựng, động từ và tình huống thường xuyên gặp 100% ngoài đời thực "
            f"(như xem tài liệu, chờ đợi, gọi điện, gửi báo cáo, trao đổi, tiếp khách, chỉ dẫn, ký hợp đồng). "
            f"Tuyệt đối KHÔNG dùng từ hiếm, từ học thuật trừu tượng xa rời đời sống.\n"
            f"Trả về duy nhất JSON định dạng:\n"
            f"{{\n"
            f"  \"source_prompt\": \"<câu gốc tiếng Nhật, VD: 部長、この資料を見ましたか？>\",\n"
            f"  \"scenario\": \"<mô tả ngắn bối cảnh, VD: Bạn hỏi Trưởng phòng xem đã đọc tài liệu chưa>\",\n"
            f"  \"instructions\": \"<hướng dẫn ngắn, VD: Hãy nâng cao hành động của Trưởng phòng bằng Tôn kính ngữ (尊敬語)>\",\n"
            f"  \"canonical\": \"<câu đáp án Tôn kính ngữ chuẩn, VD: 部長、こちらの資料をご覧になりましたか？>\",\n"
            f"  \"acceptable_variants\": [\"<biến thể tương đương 1>\", \"<biến thể tương đương 2>\"],\n"
            f"  \"translation_vi\": \"<dịch nghĩa câu gốc tiếng Việt>\",\n"
            f"  \"hint_tier_1\": \"<gợi ý cấp 1: động từ gốc và hướng tôn kính, VD: Động từ: 見る ➔ Cần dùng Tôn kính ngữ (尊敬語 ↑) vì chủ ngữ là Trưởng phòng>\",\n"
            f"  \"hint_tier_2\": \"<gợi ý cấp 2: chữ đầu hoặc khung câu, VD: 部長、こちらの資料をご.../ご覧に...>\",\n"
            f"  \"root_verb\": \"<động từ gốc, VD: 見る (Xem/Nhìn)>\",\n"
            f"  \"formula\": \"<công thức, VD: Dạng bất quy tắc: ご覧になる hoặc お+V_stem+になる>\",\n"
            f"  \"rationale\": \"<lý do, VD: Nâng cao hành động của đối phương/cấp trên>\",\n"
            f"  \"pitfall_warning\": \"<lỗi cần tránh, VD: Tránh dùng 拝見する (đây là Khiêm nhường ngữ)>\",\n"
            f"  \"speaker_role\": \"SELF\",\n"
            f"  \"listener_role\": \"MANAGER\",\n"
            f"  \"referent_role\": \"MANAGER\",\n"
            f"  \"speaker_group\": \"UCHI\",\n"
            f"  \"listener_group\": \"SOTO\"\n"
            f"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Bạn là chuyên gia giảng dạy Kính ngữ công sở Nhật Bản (ビジネス敬語). Trả về duy nhất JSON hợp lệ, không kèm markdown thừa.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.9,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            source = data.get("source_prompt", "社長はもう来ましたか？")
            scenario = data.get("scenario", "Bạn hỏi về sự có mặt của Giám đốc")
            instructions = data.get("instructions", "Dùng Tôn kính ngữ để nâng cao hành động của đối phương")
            canonical = data.get("canonical", "社長はもういらっしゃいましたか？")
            variants = data.get("acceptable_variants", [canonical])
            trans_vi = data.get("translation_vi", "Giám đốc đã đến chưa ạ?")
            ctx = {
                "speaker_role": data.get("speaker_role", "SELF"),
                "listener_role": data.get("listener_role", "MANAGER"),
                "referent_role": data.get("referent_role", "MANAGER"),
                "speaker_group": data.get("speaker_group", "UCHI"),
                "listener_group": data.get("listener_group", "SOTO"),
                "relationship": "BUSINESS",
                "situation": chosen_topic.split("(")[0].strip(),
            }
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Hành động của đối phương",
                default_formula="Dạng bất quy tắc hoặc お+V_stem+になる",
                default_rationale="Nâng cao hành động của người nghe/đối tác (尊敬語 ↑)",
                canonical=canonical,
                pitfall="Tránh dùng Khiêm nhường ngữ (謙譲語) cho hành động của đối tác",
            )
            persona = _extract_persona(data, chosen_topic)
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Sonkeigo generation fallback: {e}")
            result = self.factory.generate_shift(Register.POLITE, Register.BUSINESS_KEIGO, difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Sonkeigo: Tôn Kính Ngữ (尊敬語 ↑)",
            "objective": f"Nói câu Tôn kính ngữ nâng cao hành động đối tác trong {timer_ms/1000:.1f}s",
            "scenario": scenario,
            "instructions": instructions,
            "prompt": source,
            "source": source,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "social_context": ctx,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Đúng hướng Tôn kính ngữ, không dùng khiêm nhường"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
            "ai_generated": True,
            "generation_source": "gemini_ai",
        }

    async def _generate_dynamic_kenjougo(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
        formulas: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generates dynamic Kenjougo (謙譲語) exercise - humbling own actions to customer/external partner."""
        timer_ms = timer_for_level(pressure_level)
        chosen_topic, topic_detail = random.choice(BUSINESS_TOPICS_POOL)
        nonce = uuid.uuid4().hex[:8]

        formula_constraint = ""
        if formulas:
            ken_cand = [f for f in formulas if f.startswith("kenjougo_")] or formulas
            picked_f = random.choice(ken_cand)
            if picked_f == "kenjougo_moushiageru":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Thưa gửi & Báo cáo trang trọng 〜申し上げます (ví dụ: お願い申し上げます, ご報告申し上げます, お詫び申し上げます, お礼申し上げます).\n"
            elif picked_f == "kenjougo_permissive":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Mẫu xin phép bản thân được làm 〜させていただきます / させていただけますでしょうか (ví dụ: 说明させていただきます, 担当させていただきます, ご連絡させていただきます).\n"
            elif picked_f == "kenjougo_o_suru":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Yêu cầu người học dùng Khuôn mẫu quy tắc khiêm nhường chuẩn お + V_stem + いたします / します (hoặc ご + N + いたします), ví dụ: お届けいたします, お待ちいたします, ご案内いたします, ご連絡いたします.\n"
            elif picked_f == "kenjougo_irregular":
                formula_constraint = "ĐẶC BIỆT BẮT BUỘC: Động từ tình huống BẮT BUỘC là Động từ Bất quy tắc khiêm nhường đặc biệt (như いただく, 参る, 伺う, 申す, 拝見する, 致す, 存じる...).\n"

        prompt_text = (
            f"Hãy tạo 1 bài tập Khiêm Nhường Ngữ (謙譲語 - Kenjougo) thực tế trong công sở Nhật Bản. "
            f"Chủ đề: '{chosen_topic}' ({topic_detail}). [Nonce: {nonce}]\n"
            f"Quy tắc: Cho 1 câu nói về hành động của Bản thân / Công ty mình khi nói với Khách hàng/Đối tác, "
            f"và yêu cầu người học chuyển sang câu Khiêm Nhường Ngữ (Kenjougo I/II) chuẩn mực.\n"
            f"{formula_constraint}"
            f"TIÊU CHUẨN THỰC CHIẾN BẮT BUỘC: CHỈ dùng các từ vựng, động từ và tình huống thường xuyên gặp 100% ngoài đời thực "
            f"(như đến thăm công ty khách, gọi điện, gửi tài liệu, chào hỏi, báo cáo tiến độ, giải thích, tiếp nhận yêu cầu). "
            f"Tuyệt đối KHÔNG dùng từ hiếm, từ học thuật trừu tượng xa rời đời sống.\n"
            f"Trả về duy nhất JSON định dạng:\n"
            f"{{\n"
            f"  \"source_prompt\": \"<câu gốc tiếng Nhật, VD: 明日の14時にそちらの会社に行きます。>\",\n"
            f"  \"scenario\": \"<mô tả ngắn bối cảnh, VD: Bạn thông báo với khách hàng ngày mai sẽ đến công ty họ>\",\n"
            f"  \"instructions\": \"<hướng dẫn ngắn, VD: Hãy hạ thấp hành động bản thân bằng Khiêm nhường ngữ (謙譲語)>\",\n"
            f"  \"canonical\": \"<câu đáp án Khiêm nhường chuẩn, VD: 明日の14時に御社へ伺います。>\",\n"
            f"  \"acceptable_variants\": [\"<biến thể 1>\", \"<biến thể 2>\"],\n"
            f"  \"translation_vi\": \"<dịch nghĩa tiếng Việt>\",\n"
            f"  \"hint_tier_1\": \"<gợi ý cấp 1: động từ gốc và hướng khiêm nhường, VD: Động từ: 行く ➔ Dùng Khiêm nhường ngữ (謙譲語 ↓) vì chủ ngữ là bản thân>\",\n"
            f"  \"hint_tier_2\": \"<gợi ý cấp 2: chữ đầu, VD: 明日の14時に御社へ伺... / 参り...>\",\n"
            f"  \"root_verb\": \"<động từ gốc, VD: 行く (Đi)>\",\n"
            f"  \"formula\": \"<công thức, VD: Dạng bất quy tắc: 伺う / 参る hoặc お+V_stem+する/いたす>\",\n"
            f"  \"rationale\": \"<lý do, VD: Hạ thấp hành động bản thân/công ty mình khi nói với người ngoài>\",\n"
            f"  \"pitfall_warning\": \"<lỗi cần tránh, VD: Tránh dùng いらっしゃる (đây là Tôn kính ngữ)>\",\n"
            f"  \"speaker_role\": \"SELF\",\n"
            f"  \"listener_role\": \"CUSTOMER\",\n"
            f"  \"referent_role\": \"SELF\",\n"
            f"  \"speaker_group\": \"UCHI\",\n"
            f"  \"listener_group\": \"SOTO\"\n"
            f"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Bạn là chuyên gia Kính ngữ công sở Nhật Bản. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.9,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            source = data.get("source_prompt", "明日、社長に会います。")
            scenario = data.get("scenario", "Bạn nói với đối tác về việc gặp gỡ")
            instructions = data.get("instructions", "Dùng Khiêm nhường ngữ để hạ thấp hành động bản thân")
            canonical = data.get("canonical", "明日、社長にお目にかかります。")
            variants = data.get("acceptable_variants", [canonical, "明日、社長にお会いいたします。"])
            trans_vi = data.get("translation_vi", "Ngày mai tôi sẽ gặp giám đốc ạ.")
            ctx = {
                "speaker_role": "SELF",
                "listener_role": "CUSTOMER",
                "referent_role": "SELF",
                "speaker_group": "UCHI",
                "listener_group": "SOTO",
                "relationship": "CUSTOMER_PROVIDER",
                "situation": chosen_topic.split("(")[0].strip(),
            }
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Hành động của bản thân",
                default_formula="Dạng bất quy tắc hoặc お+V_stem+する/いたす",
                default_rationale="Hạ thấp bản thân/người công ty mình trước đối tác (謙譲語 ↓)",
                canonical=canonical,
                pitfall="Tránh dùng Tôn kính ngữ (尊敬語) cho bản thân",
            )
            persona = _extract_persona(data, chosen_topic)
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Kenjougo generation fallback: {e}")
            result = self.factory.generate_shift(Register.POLITE, Register.BUSINESS_KEIGO, difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Kenjougo: Khiêm Nhường Ngữ (謙譲語 ↓)",
            "objective": f"Nói câu Khiêm nhường ngữ hạ mình trước đối tác trong {timer_ms/1000:.1f}s",
            "scenario": scenario,
            "instructions": instructions,
            "prompt": source,
            "source": source,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "social_context": ctx,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Đúng hướng Khiêm nhường ngữ, hạ thấp bản thân"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
        }

    async def _generate_dynamic_teineigo(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Generates dynamic Teineigo & Bikago (丁寧語・美化語) exercise."""
        timer_ms = timer_for_level(pressure_level)
        chosen_topic, topic_detail = random.choice(BUSINESS_TOPICS_POOL)
        nonce = uuid.uuid4().hex[:8]

        prompt_text = (
            f"Hãy tạo 1 bài tập Thể Lịch Sự & Mỹ Từ (丁寧語・美化語) trong giao tiếp văn phòng. "
            f"Chủ đề: '{chosen_topic}'. [Nonce: {nonce}]\n"
            f"Yêu cầu: Cho 1 câu văn suồng sã hoặc thiếu mỹ từ お/ご, yêu cầu chuyển sang câu chuẩn lịch sự desu/masu/gozaimasu.\n"
            f"Trả về JSON: {{\"source_prompt\": \"<câu gốc>\", \"scenario\": \"<bối cảnh>\", \"instructions\": \"<hướng dẫn>\", \"canonical\": \"<câu chuẩn>\", \"acceptable_variants\": [\"<câu tương đương>\"], \"translation_vi\": \"<dịch tiếng Việt>\", \"hint_tier_1\": \"<gợi ý cấp 1>\", \"hint_tier_2\": \"<gợi ý cấp 2>\", \"root_verb\": \"<từ/động từ chính>\", \"formula\": \"<công thức desu/masu/gozaimasu + お/ご>\", \"rationale\": \"<lý do lịch sự>\"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Chuyên gia Nhật ngữ. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.85,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            source = data.get("source_prompt", "名前は何ですか？")
            scenario = data.get("scenario", "Hỏi tên khách hàng lịch sự")
            instructions = data.get("instructions", "Sử dụng Thể Lịch Sự & Mỹ từ お/ご")
            canonical = data.get("canonical", "お名前をお伺いしてもよろしいでしょうか？")
            variants = data.get("acceptable_variants", [canonical, "お名前を教えていただけますか？"])
            trans_vi = data.get("translation_vi", "Tôi có thể xin quý danh của quý khách được không ạ?")
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Thể lịch sự",
                default_formula="Thêm お/ご + desu/masu/gozaimasu",
                default_rationale="Nói lịch sự nhã nhặn, tôn trọng đối phương",
                canonical=canonical,
            )
            persona = _extract_persona(data, chosen_topic)
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Teineigo generation fallback: {e}")
            result = self.factory.generate_shift(Register.TAMEGUCHI, Register.POLITE, difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Teineigo: Lịch Sự & Mỹ Từ (丁寧語・美化語)",
            "objective": f"Nói câu lịch sự chuẩn mực có mỹ từ trong {timer_ms/1000:.1f}s",
            "scenario": scenario,
            "instructions": instructions,
            "prompt": source,
            "source": source,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Lịch sự, tự nhiên, đúng mỹ từ お/ご"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
            "ai_generated": True,
            "generation_source": "gemini_ai",
        }

    async def _generate_dynamic_shift(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Generates dynamic Register Shift (Tameguchi <-> Business Keigo)."""
        timer_ms = timer_for_level(pressure_level)
        chosen_topic, topic_detail = random.choice(BUSINESS_TOPICS_POOL)
        nonce = uuid.uuid4().hex[:8]

        prompt_text = (
            f"Hãy tạo 1 bài tập Chuyển Đổi Văn Phong (Register Shift) phản xạ tức thì. "
            f"Chủ đề: '{chosen_topic}'. [Nonce: {nonce}]\n"
            f"Cho 1 câu nói thân mật (Tameguchi) ngắn gọn giữa bạn bè hoặc suy nghĩ nội tâm, "
            f"yêu cầu người học chuyển sang câu Kính ngữ thương mại (Business Keigo) hoàn chỉnh.\n"
            f"Trả về JSON: {{\"source_prompt\": \"<câu thân mật>\", \"scenario\": \"<bối cảnh>\", \"instructions\": \"<hướng dẫn>\", \"canonical\": \"<câu thương mại chuẩn>\", \"acceptable_variants\": [\"<câu biến thể>\"], \"translation_vi\": \"<dịch tiếng Việt>\", \"hint_tier_1\": \"<gợi ý cấp 1>\", \"hint_tier_2\": \"<gợi ý cấp 2>\", \"root_verb\": \"<từ gốc>\", \"formula\": \"<cấu trúc thương mại>\", \"rationale\": \"<lý do chuyển đổi>\"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Chuyên gia Nhật ngữ công sở. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.9,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            source = data.get("source_prompt", "ちょっと待って。")
            scenario = data.get("scenario", "Chuyển câu nhờ đợi sang văn phong tiếp khách")
            instructions = data.get("instructions", "Chuyển từ Thân mật (Tameguchi) sang Kính ngữ thương mại")
            canonical = data.get("canonical", "少々お待ちいただけますでしょうか。")
            variants = data.get("acceptable_variants", [canonical, "少々お待ちくださいませ。"])
            trans_vi = data.get("translation_vi", "Xin vui lòng đợi một chút.")
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Chuyển thể văn phong",
                default_formula="Thân mật ➔ Kính ngữ thương mại",
                default_rationale="Sử dụng trong giao tiếp với khách hàng/đối tác",
                canonical=canonical,
            )
            persona = _extract_persona(data, chosen_topic)
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Shift generation fallback: {e}")
            result = self.factory.generate_shift(Register.TAMEGUCHI, Register.BUSINESS_KEIGO, difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Register Shift: Chuyển Đổi Văn Phong (変換 ⇄)",
            "objective": f"Chuyển từ thân mật sang kính ngữ thương mại trong {timer_ms/1000:.1f}s",
            "scenario": scenario,
            "instructions": instructions,
            "prompt": source,
            "source": source,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Đúng văn phong công sở trang trọng"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
            "ai_generated": True,
            "generation_source": "gemini_ai",
        }

    async def _generate_dynamic_uchi_soto(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Generates dynamic Uchi / Soto Battle contextual challenge."""
        timer_ms = timer_for_level(pressure_level)
        nonce = uuid.uuid4().hex[:8]

        prompt_text = (
            f"Hãy tạo 1 tình huống kinh điển thử thách phân biệt Trong/Ngoài (Uchi - Soto) trong văn hóa công sở Nhật. [Nonce: {nonce}]\n"
            f"Ví dụ: Đối tác ngoài gọi điện hỏi về Giám đốc/Trưởng phòng bên bạn. "
            f"Người học phải phản xạ hạ sếp mình xuống bằng Khiêm nhường ngữ và bỏ chức danh (VD: 社長の田中は席を外しております).\n"
            f"Trả về JSON: {{\"prompt\": \"<câu hỏi của đối tác ngoài>\", \"scenario\": \"<bối cảnh vai vế rõ ràng>\", \"instructions\": \"<hướng dẫn chọn đúng hướng Kính ngữ>\", \"canonical\": \"<câu trả lời chuẩn>\", \"acceptable_variants\": [\"<biến thể>\"], \"translation_vi\": \"<dịch tiếng Việt>\", \"hint_tier_1\": \"<gợi ý cấp 1>\", \"hint_tier_2\": \"<gợi ý cấp 2>\", \"root_verb\": \"<từ/hành động chính>\", \"formula\": \"<quy tắc bỏ chức danh + Khiêm nhường>\", \"rationale\": \"<giải thích Uchi-Soto>\", \"speaker_group\": \"UCHI\", \"listener_group\": \"SOTO\", \"referent_group\": \"UCHI\"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Chuyên gia văn hóa doanh nghiệp Nhật. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.9,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            prompt = data.get("prompt", "田中社長はいらっしゃいますか？")
            scenario = data.get("scenario", "Khách hàng gọi điện hỏi gặp Giám đốc Tanaka bên công ty bạn")
            instructions = data.get("instructions", "Nói về sếp mình với khách ngoài: dùng Khiêm nhường ngữ và bỏ chức danh")
            canonical = data.get("canonical", "あいにく社長の田中は外出しております。")
            variants = data.get("acceptable_variants", [canonical, "社長の田中はただいま席を外しております。"])
            trans_vi = data.get("translation_vi", "Giám đốc Tanaka có ở đó không ạ?")
            ctx = {
                "speaker_role": "EMPLOYEE",
                "listener_role": "CUSTOMER",
                "referent_role": "MANAGER",
                "speaker_group": "UCHI",
                "listener_group": "SOTO",
                "referent_group": "UCHI",
                "relationship": "CUSTOMER_PROVIDER",
                "situation": "電話応対",
            }
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Sếp công ty mình (Uchi)",
                default_formula="Bỏ chức danh 'san/sama' + Dùng Khiêm nhường ngữ (謙譲語 ↓)",
                default_rationale="Nói về người công ty mình với đối tác ngoài (Soto) phải hạ thấp mình",
                canonical=canonical,
                pitfall="Không dùng Tôn kính ngữ (おっしゃる/いらっしゃる) cho sếp mình trước mặt khách ngoài",
            )
            persona = _extract_persona(data, "電話応対")
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Uchi-Soto generation fallback: {e}")
            result = self.factory.generate_uchi_soto(difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Uchi / Soto Battle: Văn Hóa Trong - Ngoài (内外 ⚔️)",
            "objective": f"Xác định đúng vai vế Trong/Ngoài và phản xạ chuẩn trong {timer_ms/1000:.1f}s",
            "scenario": scenario,
            "instructions": instructions,
            "prompt": prompt,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "social_context": ctx,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Đúng quan hệ Uchi/Soto, không tôn xưng sếp mình trước khách"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
            "ai_generated": True,
            "generation_source": "gemini_ai",
        }

    async def _generate_dynamic_doctor(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Generates dynamic Keigo Doctor (fixing Double Keigo / Direction errors)."""
        timer_ms = timer_for_level(pressure_level)
        nonce = uuid.uuid4().hex[:8]

        prompt_text = (
            f"Hãy tạo 1 câu tiếng Nhật có LỖI SAI KÍNH NGỮ thực tế (Nhị trùng kính ngữ 二重敬語 hoặc lộn hướng Tôn kính/Khiêm nhường). [Nonce: {nonce}]\n"
            f"Yêu cầu người học phát hiện lỗi và nói lại câu đúng hoàn chỉnh.\n"
            f"Ví dụ lỗi: おっしゃられる (lỗi nhị trùng), 社長がお召し上がりになられた (lỗi thừa kính ngữ), ご覧いたす (lộn hướng).\n"
            f"Trả về JSON: {{\"faulty_sentence_ja\": \"<câu có lỗi sai>\", \"error_type\": \"<DOUBLE_KEIGO | WRONG_DIRECTION>\", \"scenario\": \"<mô tả lỗi>\", \"instructions\": \"<hướng dẫn sửa lỗi>\", \"canonical_fix_ja\": \"<câu đã sửa đúng hoàn chỉnh>\", \"acceptable_variants\": [\"<câu sửa đúng biến thể>\"], \"translation_vi\": \"<dịch nghĩa tiếng Việt>\", \"hint_tier_1\": \"<gợi ý lỗi nằm ở đâu>\", \"hint_tier_2\": \"<gợi ý cách sửa>\", \"root_verb\": \"<từ bị lỗi>\", \"formula\": \"<cách sửa chuẩn mực>\", \"rationale\": \"<giải thích tại sao sai>\"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Bác sĩ Kính ngữ Nhật Bản. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.9,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            faulty = data.get("faulty_sentence_ja", "社長がおっしゃられました。")
            scenario = data.get("scenario", "Phát hiện lỗi Nhị trùng kính ngữ (Double Keigo)")
            instructions = data.get("instructions", "Câu này bị lỗi kính ngữ trùng lặp. Hãy nói lại câu đúng chuẩn.")
            canonical = data.get("canonical_fix_ja", "社長がおっしゃいました。")
            variants = data.get("acceptable_variants", [canonical, "社長が言われました。"])
            trans_vi = data.get("translation_vi", "Giám đốc đã nói như vậy.")
            err_type = data.get("error_type", "DOUBLE_KEIGO")
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Lỗi trùng kính ngữ",
                default_formula="Bỏ hậu tố 'られる' thừa",
                default_rationale="Đã dùng động từ tôn kính đặc biệt thì không cộng thêm られる",
                canonical=canonical,
                pitfall="Nhị trùng kính ngữ làm câu rườm rà và sai chuẩn mực",
            )
            persona = {
                "name": "Bác Sĩ Kính Ngữ (Keigo Doctor)",
                "role": "EXPERT DIAGNOSTICIAN",
                "avatar": "🩺",
            }
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Doctor generation fallback: {e}")
            result = self.factory.generate_doctor(difficulty)
            result["ai_generated"] = False
            result["fallback_reason"] = str(e)[:150]
            return result

        return {
            "title": "Keigo Doctor: Bắt Lỗi Kính Ngữ (診断 🩺)",
            "objective": f"Phát hiện lỗi sai và nói lại câu đúng trong {timer_ms/1000:.1f}s",
            "scenario": f"Câu có lỗi: “{faulty}” — {scenario}",
            "instructions": instructions,
            "prompt": faulty,
            "error_type": err_type,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Sửa đúng ngữ pháp, loại bỏ lặp kính ngữ"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
            "ai_generated": True,
            "generation_source": "gemini_ai",
        }

    async def _generate_dynamic_naturalness(
        self,
        difficulty: str,
        pressure_level: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Generates dynamic Naturalness Check challenge."""
        timer_ms = timer_for_level(pressure_level)
        nonce = uuid.uuid4().hex[:8]

        prompt_text = (
            f"Hãy tạo 1 câu giao tiếp tiếng Nhật và yêu cầu người học đánh giá mức độ tự nhiên công sở. [Nonce: {nonce}]\n"
            f"Trả về JSON: {{\"sentence_ja\": \"<câu tiếng Nhật>\", \"scenario\": \"<bối cảnh>\", \"is_natural\": true/false, \"expected_label\": \"NATURAL | INAPPROPRIATE\", \"canonical_correction\": \"<câu tự nhiên nhất>\", \"acceptable_variants\": [\"<câu biến thể>\"], \"translation_vi\": \"<dịch nghĩa tiếng Việt>\", \"hint_tier_1\": \"<gợi ý độ tự nhiên>\", \"hint_tier_2\": \"<gợi ý cách nói chuẩn>\", \"root_verb\": \"<từ/ngữ cảnh>\", \"formula\": \"<cách diễn đạt tự nhiên>\", \"rationale\": \"<giải thích ngữ dụng học>\"}}"
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=prompt_text)],
            system_instruction="Chuyên gia tự nhiên ngữ dụng học tiếng Nhật. Trả về duy nhất JSON hợp lệ.",
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.85,
            metadata={"idempotency_key": str(uuid.uuid4())},
        )
        try:
            resp = await self.ai_router.generate(task=AITask.KEIGO_GENERATION, request=req, user_id=user_id)
            data = json.loads(resp.text.strip())
            sentence = data.get("sentence_ja", "明日、社長にお会いします。")
            data.get("scenario", "Đánh giá mức độ tự nhiên trong văn phòng")
            canonical = data.get("canonical_correction", sentence)
            variants = data.get("acceptable_variants", [canonical])
            trans_vi = data.get("translation_vi", "Ngày mai tôi sẽ gặp giám đốc.")
            label = data.get("expected_label", "NATURAL")
            hints, anatomy = _extract_hints_and_anatomy(
                data,
                default_root="Độ tự nhiên ngữ dụng",
                default_formula="Diễn đạt chuẩn công sở Nhật",
                default_rationale="Tránh các câu nói đúng ngữ pháp nhưng người Nhật không dùng",
                canonical=canonical,
            )
            persona = _extract_persona(data, "自然度判定")
        except Exception as e:
            logger.warning(f"[AIKeigoGenerator] Naturalness generation fallback: {e}")
            return self.factory.generate_naturalness(difficulty)

        return {
            "title": "Naturalness Check: Độ Tự Nhiên (自然 🍃)",
            "objective": f"Đánh giá và nói lại câu tự nhiên chuẩn Nhật trong {timer_ms/1000:.1f}s",
            "scenario": f"Đánh giá câu: “{sentence}” ({label})",
            "instructions": "Nói lại câu tiếng Nhật chuẩn mực và tự nhiên nhất",
            "prompt": sentence,
            "expected_label": label,
            "canonical": canonical,
            "acceptable_variants": variants,
            "translation": trans_vi,
            "vietnamese": trans_vi,
            "hints": hints,
            "anatomy": anatomy,
            "persona": persona,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Tự nhiên, đúng sắc thái"],
            "target_patterns": variants[:2],
            "estimated_minutes": 3,
        }
