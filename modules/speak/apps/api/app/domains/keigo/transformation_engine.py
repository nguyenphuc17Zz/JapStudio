"""KeigoTransformationEngine — deterministic transformation with limited overrides, not giant dict.

Uses irregular overrides + rule-based generation (o~ni naru, o~suru, etc.) + lexical provider.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.domains.japanese.lexical_provider import KEIGO_IRREGULAR_OVERRIDES, get_lexical_provider
from app.domains.japanese.provider import get_language_provider
from app.domains.keigo.double_keigo import DoubleKeigoAnalyzer
from app.domains.keigo.social_context import Register, SocialContext
from app.domains.keigo.uchi_soto import UchiSotoResolver


@dataclass
class AnswerCandidate:
    text: str
    grammatical_validity: bool = True
    semantic_validity: bool = True
    register_fit: bool = True
    context_fit: bool = True
    naturalness: float = 0.85  # 0-1
    confidence: float = 0.85
    source: str = "rule"
    provenance: str = "project_rule"


@dataclass
class KeigoTransformationResult:
    source: str
    target_register: Register
    candidates: list[AnswerCandidate] = field(default_factory=list)
    canonical: str | None = None
    accepted: list[str] = field(default_factory=list)
    alternatives: list[str] = field(default_factory=list)
    analysis: dict[str, Any] = field(default_factory=dict)


# Common Noun & Adjective Dictionaries for お (Kunyomi & familiar) vs ご (Onyomi Sino-Japanese)
O_HONORIFIC_WORDS = {
    "名前": "お名前", "宅": "お宅", "元気": "お元気", "仕事": "お仕事", "部屋": "お部屋",
    "手紙": "お手紙", "水": "お水", "茶": "お茶", "酒": "お酒", "金": "お金",
    "車": "お車", "荷物": "お荷物", "礼": "お礼", "花": "お花", "店": "お店",
    "客": "お客様", "忙しい": "お忙しい", "若い": "お若い", "早い": "お早い",
    "好き": "お好き", "上手": "お上手", "暇": "お暇",
    # Familiar Kunyomi compounds & exceptions from BCCWJ
    "見積もり": "お見積もり", "支払い": "お支払い", "受け取り": "お受け取り", "受取": "お受け取り",
    "届け": "お届け", "問い合わせ": "お問い合わせ", "手伝い": "お手伝い", "値引き": "お値引き",
    # Familiar Kango exceptions that traditionally take お
    "電話": "お電話", "食事": "お食事", "料理": "お料理", "時間": "お時間",
    "返事": "お返事", "約束": "お約束", "会計": "お会計", "祝い": "お祝い",
    "祝": "お祝い", "誕生日": "お誕生日", "誕生": "お誕生日", "世話": "お世話",
}

GO_HONORIFIC_WORDS = {
    "家族": "ご家族", "意見": "ご意見", "連絡": "ご連絡", "住所": "ご住所",
    "都合": "ご都合", "予定": "ご予定", "案内": "ご案内", "説明": "ご説明",
    "協力": "ご協力", "検討": "ご検討", "親切": "ご親切", "心配": "ご心配",
    "質問": "ご質問", "相談": "ご相談", "報告": "ご報告", "挨拶": "ご挨拶",
    "参加": "ご参加", "配慮": "ご配慮", "利用": "ご利用", "満足": "ご満足",
    "理解": "ご理解", "多忙": "ご多忙", "健康": "ご健康",
    "丁寧": "ご丁寧", "迷惑": "ご迷惑",
    # High-frequency Sino-Japanese (Onyomi) business nouns from BCCWJ
    "契約": "ご契約", "提出": "ご提出", "注文": "ご注文", "確認": "ご確認",
    "要望": "ご要望", "依頼": "ご依頼", "返信": "ご返信", "希望": "ご希望",
    "来店": "ご来店", "搭乗": "ご搭乗", "紹介": "ご紹介", "担当": "ご担当",
    "日程": "ご日程", "準備": "ご準備", "領収書": "ご領収書", "請求書": "ご請求書",
    "無沙汰": "ご無沙汰", "足労": "ご足労", "厚意": "ご厚意", "盛会": "ご盛会",
    "健勝": "ご健勝", "清祥": "ご清祥", "高配": "ご高配", "芳名": "ご芳名", "愛顧": "ご愛顧",
}

O_KANGO_EXCEPTIONS = {"電話", "食事", "料理", "時間", "返事", "約束", "会計", "世話"}


def get_honorific_prefix(word: str) -> dict[str, Any]:
    """Applies お (Kunyomi/exceptions) or ご (Onyomi) honorific prefix to noun/adjective."""
    clean = word.strip()
    if clean in O_HONORIFIC_WORDS:
        return {
            "prefix": "お",
            "result": O_HONORIFIC_WORDS[clean],
            "rule": "Kunyomi (Thuần Nhật) / Ngoại lệ đời sống quen thuộc",
            "is_o": True,
        }
    if clean in GO_HONORIFIC_WORDS:
        return {
            "prefix": "ご",
            "result": GO_HONORIFIC_WORDS[clean],
            "rule": "Onyomi (Từ Hán Nhật 2 âm tiết)",
            "is_o": False,
        }
    # Fallback heuristic: single kanji / kana -> お, 2+ kanji -> ご
    if len(clean) <= 1 or not any('\u4e00' <= ch <= '\u9fff' for ch in clean):
        return {"prefix": "お", "result": f"お{clean}", "rule": "Mặc định Kunyomi", "is_o": True}
    return {"prefix": "ご", "result": f"ご{clean}", "rule": "Mặc định Onyomi", "is_o": False}


class KeigoTransformationEngine:
    """Deterministic keigo transformation engine (small overrides + rules)."""

    def __init__(self):
        self.lex = get_lexical_provider()
        self.lang = get_language_provider()
        self.uchi = UchiSotoResolver()
        self.double_analyzer = DoubleKeigoAnalyzer()

    def transform(self, source: str, target: Register, ctx: SocialContext | None = None) -> KeigoTransformationResult:
        # Analyze source
        tokens = self.lang.analyze(source)
        # Find main verb lemma (first verb)
        verb_token = next((t for t in tokens if t.pos == "動詞"), None)
        lemma = verb_token.lemma if verb_token else source.strip()
        reading = verb_token.reading if verb_token else None

        # Check irregular overrides
        overrides = KEIGO_IRREGULAR_OVERRIDES.get(lemma) or KEIGO_IRREGULAR_OVERRIDES.get(source.strip())
        candidates: list[AnswerCandidate] = []
        canonical: str | None = None

        if target == Register.TAMEGUCHI:
            # Casual: dictionary or plain
            casual = self._to_casual(source, lemma)
            candidates.append(AnswerCandidate(text=casual, source="rule", provenance="project_rule", naturalness=0.9, confidence=0.85))
            canonical = casual
        elif target == Register.POLITE:
            polite = self._to_teineigo(source, lemma, overrides)
            candidates.append(AnswerCandidate(text=polite, source="rule", provenance="project_rule"))
            canonical = polite
            # Alternative: long polite
            if polite.endswith("します") and "いたし" not in polite:
                alt = polite.replace("します", "いたします")
                candidates.append(AnswerCandidate(text=alt, source="rule", provenance="project_rule", naturalness=0.85))
        elif target == Register.BUSINESS_POLITE:
            bp = self._to_business_polite(source, lemma, overrides)
            candidates.append(AnswerCandidate(text=bp, source="rule"))
            canonical = bp
        elif target == Register.BUSINESS_KEIGO:
            # Determine direction via SocialContext if provided
            direction = None
            if ctx:
                d = self.uchi.resolve_direction(ctx)
                if d.should_use_sonkeigo:
                    direction = "sonkeigo"
                elif d.should_use_kenjougo:
                    direction = "kenjougo"
                else:
                    direction = "teineigo"
            # If no ctx, infer from source pattern: if source mentions customer/boss, sonkeigo
            if not direction:
                direction = self._infer_direction_from_text(source)

            if direction == "sonkeigo":
                son_list = self._get_sonkeigo_variants(source, lemma, overrides)
                for s in son_list:
                    candidates.append(AnswerCandidate(text=s, source="rule" if overrides else "lexical_resource", provenance="project_rule"))
                canonical = son_list[0] if son_list else self._to_sonkeigo(source, lemma, overrides)
            elif direction == "kenjougo":
                ken_list = self._get_kenjougo_variants(source, lemma, overrides)
                for k in ken_list:
                    candidates.append(AnswerCandidate(text=k, source="rule" if overrides else "lexical_resource", provenance="project_rule"))
                canonical = ken_list[0] if ken_list else self._to_kenjougo(source, lemma, overrides)
            else:
                form = self._to_teineigo(source, lemma, overrides)
                candidates.append(AnswerCandidate(text=form, source="rule"))
                canonical = form
        elif target == Register.VERY_FORMAL:
            vf = self._to_very_formal(source, lemma, overrides)
            candidates.append(AnswerCandidate(text=vf, source="rule"))
            canonical = vf

        # Deduplicate and set accepted
        seen = set()
        uniq: list[AnswerCandidate] = []
        for c in candidates:
            if c.text not in seen:
                # Check double keigo
                dk = self.double_analyzer.analyze(c.text)
                if dk["status"] == "generally_inappropriate":
                    c.naturalness = min(c.naturalness, 0.55)
                    c.confidence = min(c.confidence, 0.6)
                uniq.append(c)
                seen.add(c.text)
        candidates = uniq
        accepted = [c.text for c in candidates]
        canonical = candidates[0].text if candidates else None

        return KeigoTransformationResult(
            source=source,
            target_register=target,
            candidates=candidates,
            canonical=canonical,
            accepted=accepted,
            alternatives=[c.text for c in candidates[1:]],
            analysis={"lemma": lemma, "reading": reading, "overrides": bool(overrides), "tokens": [t.surface for t in tokens]},
        )

    def _to_casual(self, source: str, lemma: str) -> str:
        t = source.strip()
        t = re.sub(r"です。?$", "だ。", t)
        t = re.sub(r"ます。?$", "る。", t)
        t = re.sub(r"でした。?$", "だった。", t)
        t = re.sub(r"ました。?$", "た。", t)
        return t

    def _to_teineigo(self, source: str, lemma: str, overrides: dict | None) -> str:
        if overrides and "teineigo" in overrides and overrides["teineigo"] != "—":
            if lemma in source:
                return source.replace(lemma, overrides["teineigo"])
            return overrides["teineigo"]
        try:
            from app.domains.reflex.conjugation_engine import JapaneseConjugationEngine

            ce = JapaneseConjugationEngine()
            vc = ce.identify_verb_class(lemma)
            if vc.value == "ichidan":
                stem = lemma[:-1] if lemma.endswith("る") else lemma
                masu = stem + "ます"
                if lemma in source:
                    return source.replace(lemma, masu)
                return masu
            elif vc.value == "godan":
                ending = lemma[-1]
                mapping = {"う": "い", "く": "き", "ぐ": "ぎ", "す": "し", "つ": "ち", "ぬ": "に", "ぶ": "び", "む": "み", "る": "り"}
                if ending in mapping:
                    masu = lemma[:-1] + mapping[ending] + "ます"
                    if lemma in source:
                        return source.replace(lemma, masu)
                    return masu
        except Exception:
            pass
        return source + "ます" if not source.endswith("ます") else source

    def _to_business_polite(self, source: str, lemma: str, overrides: dict | None) -> str:
        return self._to_teineigo(source, lemma, overrides)

    def _to_sonkeigo(self, source: str, lemma: str, overrides: dict | None) -> str:
        variants = self._get_sonkeigo_variants(source, lemma, overrides)
        return variants[0] if variants else f"お{lemma}になる"

    def _get_sonkeigo_variants(self, source: str, lemma: str, overrides: dict | None) -> list[str]:
        """Generates full set of Sonkeigo forms:
        1. Special irregular overrides (if applicable)
        2. Formula 1: お + V_stem + になる / になります (hoặc ご + N + になる / なさる)
        3. Formula 2: Thể bị động kính ngữ (〜れる / 〜られます, Nhóm 3: される / 来られる)
        """
        results: list[str] = []

        # 1. Check Irregular Overrides
        if overrides and "sonkeigo" in overrides and overrides["sonkeigo"] != "—":
            base_son = overrides["sonkeigo"]
            # Generate common polite variations for overrides
            over_variants = [base_son]
            if base_son.endswith("る"):
                stem = base_son[:-1]
                # Godan i-stem vs ichidan stem
                if base_son in ("なさる", "おっしゃる", "いらっしゃる", "くださる"):
                    # Special polite suffix: 〜います
                    over_variants.append(base_son[:-2] + "います")
                else:
                    over_variants.append(stem + "ます")
            elif base_son.endswith("だ"):
                over_variants.append(base_son.replace("だ", "です"))
                over_variants.append(base_son.replace("だ", "ですか"))

            for v in over_variants:
                if lemma in source:
                    results.append(source.replace(lemma, v))
                else:
                    results.append(v)

        # 2. Formula 1: お + stem + になる / になります (hoặc ご〜)
        try:
            from app.domains.reflex.conjugation_engine import JapaneseConjugationEngine, ConjugationForm

            ce = JapaneseConjugationEngine()

            # Suru group (Nhóm 3)
            if lemma.endswith("する"):
                base = lemma[:-2]
                if base:
                    pfx = "お" if base in O_KANGO_EXCEPTIONS else "ご"
                    f1_plain = f"{pfx}{base}になる"
                    f1_polite = f"{pfx}{base}になります"
                    f1_nasaru = f"{pfx}{base}なさる"
                    f1_nasaimasu = f"{pfx}{base}なさいます"
                    for f in (f1_polite, f1_plain, f1_nasaimasu, f1_nasaru):
                        results.append(source.replace(lemma, f) if lemma in source else f)
                else:
                    results.extend(["なさいます", "なさる"])
            else:
                # Godan / Ichidan: get masu stem
                masu = self._to_teineigo(lemma, lemma, None)
                if masu.endswith("ます"):
                    stem = masu[:-2]
                    f1_plain = f"お{stem}になる"
                    f1_polite = f"お{stem}になります"
                    for f in (f1_polite, f1_plain):
                        results.append(source.replace(lemma, f) if lemma in source else f)

            # 3. Formula 2: Passive Honorific (Thể Bị Động Kính Ngữ: 〜れる / 〜られます)
            # Nhóm 1: 書かれる / 書かれます
            # Nhóm 2: 食べられる / 食べられます
            # Nhóm 3: される / されます, 来られる / 来られます
            passive_target = ce.conjugate(lemma, ConjugationForm.PASSIVE)
            pass_plain = passive_target.canonical
            pass_polite = pass_plain[:-1] + "ます" if pass_plain.endswith("る") else pass_plain + "ます"

            for p in (pass_polite, pass_plain):
                if p not in results:
                    results.append(source.replace(lemma, p) if lemma in source else p)

            # 4. Formula 3: Sonkeigo Request & Polite Imperative (お/ご 〜 ください / いただけますでしょうか)
            kudasai_irregulars = {
                "見る": ["ご覧ください", "ご覧になってください", "ご覧いただけますでしょうか", "ご覧くださいませ"],
                "食べる": ["お召し上がりください", "召し上がってください", "お召し上がりいただけますでしょうか", "お召し上がりくださいませ"],
                "飲む": ["お召し上がりください", "召し上がってください", "お召し上がりいただけますでしょうか", "お召し上がりくださいませ"],
                "行く": ["お越しください", "いらしてください", "いらっしゃってください", "お越しいただけますでしょうか"],
                "来る": ["お越しください", "おいでください", "いらしてください", "お越しいただけますでしょうか"],
                "いる": ["いらしてください", "いらっしゃってください"],
                "寝る": ["お休みください", "お休みになってください"],
                "着る": ["お召しください", "お召しになってください"],
                "座る": ["お掛けください", "お座りください", "お掛けいただけますでしょうか"],
                "掛ける": ["お掛けください", "お掛けになってください"],
                "会う": ["お会いください", "お会いいただけますでしょうか"],
                "する": ["なさってください", "お願いいたします"],
            }
            if lemma in kudasai_irregulars:
                for k in kudasai_irregulars[lemma]:
                    if k not in results:
                        results.append(source.replace(lemma, k) if lemma in source else k)

            if lemma.endswith("する"):
                base = lemma[:-2]
                if base:
                    pfx = "お" if base in O_KANGO_EXCEPTIONS else "ご"
                    f3_kudasai = f"{pfx}{base}ください"
                    f3_kudasaimase = f"{pfx}{base}くださいませ"
                    f3_itadaku = f"{pfx}{base}いただけますでしょうか"
                    f3_negaemasu = f"{pfx}{base}願えますでしょうか"
                    for f in (f3_kudasai, f3_kudasaimase, f3_itadaku, f3_negaemasu):
                        if f not in results:
                            results.append(source.replace(lemma, f) if lemma in source else f)
            else:
                masu = self._to_teineigo(lemma, lemma, None)
                if masu.endswith("ます"):
                    stem = masu[:-2]
                    f3_kudasai = f"お{stem}ください"
                    f3_kudasaimase = f"お{stem}くださいませ"
                    f3_itadaku = f"お{stem}いただけますでしょうか"
                    f3_negaemasu = f"お{stem}願えますでしょうか"
                    for f in (f3_kudasai, f3_kudasaimase, f3_itadaku, f3_negaemasu):
                        if f not in results:
                            results.append(source.replace(lemma, f) if lemma in source else f)
        except Exception:
            pass

        if not results:
            results.append(f"お{lemma}になる")
        return results

    def _to_kenjougo(self, source: str, lemma: str, overrides: dict | None) -> str:
        variants = self._get_kenjougo_variants(source, lemma, overrides)
        return variants[0] if variants else f"お{lemma}する"

    def _get_kenjougo_variants(self, source: str, lemma: str, overrides: dict | None) -> list[str]:
        """Generates full set of Kenjougo forms:
        1. Special irregular overrides (if applicable)
        2. Cách 1 (Nhóm 1 & 2): お + V_stem + します / いたします (hoặc お + stem + する / いたす)
        3. Cách 2 (Nhóm 3): ご + N(bỏ する) + します / いたします (hoặc ご + N + する / いたす)
        4. Cách 3: Báo cáo thưa gửi: ご / お + ... + 申し上げます
        5. Cách 4: Xin phép: 〜させていただきます / 〜させていただけますでしょうか
        """
        results: list[str] = []

        # 1. Check Irregular Overrides
        if overrides and "kenjougo" in overrides and overrides["kenjougo"] != "—":
            base_ken = overrides["kenjougo"]
            over_variants = [base_ken]
            if base_ken.endswith("する"):
                stem = base_ken[:-2]
                over_variants.extend([stem + "します", stem + "いたします", stem + "いたす"])
            elif base_ken.endswith("る"):
                stem = base_ken[:-1]
                over_variants.append(stem + "ます")
                if base_ken in ("参る", "申す", "おる", "いただく", "存じる", "差し上げる", "拝見する"):
                    if base_ken == "申す":
                        over_variants.extend(["申します", "申し上げる", "申し上げます"])
                    elif base_ken == "存じる":
                        over_variants.extend(["存じます", "存じております", "存じ上げます"])
                    elif base_ken == "参る":
                        over_variants.extend(["参ります", "伺う", "伺います"])
                    elif base_ken == "おる":
                        over_variants.append("おります")
                    elif base_ken == "いただく":
                        over_variants.extend(["いただきます", "頂戴いたします", "頂戴する"])

            for v in over_variants:
                if lemma in source:
                    results.append(source.replace(lemma, v))
                else:
                    results.append(v)

        # 2. General Rule-based Kenjougo
        try:
            if lemma.endswith("する"):
                # Cách 2: Nhóm 3 (Dạng する) -> ご + N(bỏ する) + します / いたします
                base = lemma[:-2]
                if base:
                    pfx = "お" if base in O_KANGO_EXCEPTIONS else "ご"
                    c2_itasu_polite = f"{pfx}{base}いたします"
                    c2_shimasu = f"{pfx}{base}します"
                    c2_moushiage = f"{pfx}{base}申し上げます"
                    c2_itasu_plain = f"{pfx}{base}いたす"
                    c2_suru = f"{pfx}{base}する"
                    c2_sasete = f"{base}させていただきます"
                    for f in (c2_itasu_polite, c2_shimasu, c2_moushiage, c2_itasu_plain, c2_suru, c2_sasete):
                        if f not in results:
                            results.append(source.replace(lemma, f) if lemma in source else f)
                else:
                    results.extend(["いたします", "致す", "します", "する"])
            else:
                # Cách 1: Nhóm 1 & 2 -> お + stem + します / いたします
                masu = self._to_teineigo(lemma, lemma, None)
                if masu.endswith("ます"):
                    stem = masu[:-2]
                    c1_itasu_polite = f"お{stem}いたします"
                    c1_shimasu = f"お{stem}します"
                    c1_moushiage = f"お{stem}申し上げます"
                    c1_itasu_plain = f"お{stem}いたす"
                    c1_suru = f"お{stem}する"
                    for f in (c1_itasu_polite, c1_shimasu, c1_moushiage, c1_itasu_plain, c1_suru):
                        if f not in results:
                            results.append(source.replace(lemma, f) if lemma in source else f)
        except Exception:
            pass

        if not results:
            results.append(f"お{lemma}いたします")
        return results

    def _to_very_formal(self, source: str, lemma: str, overrides: dict | None) -> str:
        ken = self._to_kenjougo(source, lemma, overrides)
        return ken.replace("する", "いたす") if ken.endswith("する") else ken + "いたす"

    def _infer_direction_from_text(self, text: str) -> str:
        # Heuristic: if text mentions 客様, 社長, 部長, 先生 → sonkeigo
        soto_keywords = ["客様", "お客様", "社長", "部長", "先生", "課長", "先方", "貴社", "御社"]
        for kw in soto_keywords:
            if kw in text:
                return "sonkeigo"
        # If mentions 私, 弊社, 当社 → kenjougo
        uchi_keywords = ["私", "弊社", "当社", "わたくし"]
        for kw in uchi_keywords:
            if kw in text:
                return "kenjougo"
        return "teineigo"

    def validate(self, user_text: str, expected_candidates: list[str]) -> dict:
        # Normalize both via language provider
        norm_user = self.lang.normalize(user_text)
        for cand in expected_candidates:
            norm_cand = self.lang.normalize(cand)
            if norm_user == norm_cand:
                return {"is_correct": True, "matched": cand, "confidence": 0.95}
            # Allow hiragana equivalence
            hira_user = self.lang.get_reading(user_text) or norm_user
            hira_cand = self.lang.get_reading(cand) or norm_cand
            if hira_user == hira_cand:
                return {"is_correct": True, "matched": cand, "confidence": 0.88}
        return {"is_correct": False, "matched": None, "confidence": 0.7}
