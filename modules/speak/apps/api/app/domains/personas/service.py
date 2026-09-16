import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.personas.models import Persona
from app.domains.personas.schemas import PersonaCreate, PersonaGenerateRequest, PersonaGenerateResponse, PersonaUpdate
from app.domains.personas.seeds import SYSTEM_PERSONAS_SEED
from app.shared.errors.exceptions import NotFoundException, ValidationException


class PersonaService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def seed_system_personas(self) -> None:
        """Seeds standard built-in personas into the database, adding any missing system personas."""
        for p_data in SYSTEM_PERSONAS_SEED:
            result = await self.session.execute(
                select(Persona).where(Persona.id == p_data["id"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                persona = Persona(
                    id=p_data["id"],
                    name=p_data["name"],
                    description=p_data["description"],
                    role=p_data["role"],
                    personality=p_data["personality"],
                    speaking_style=p_data["speaking_style"],
                    difficulty=p_data["difficulty"],
                    is_system=True,
                    avatar_url=p_data.get("avatar_url"),
                    system_prompt=p_data.get("system_prompt"),
                )
                self.session.add(persona)
        await self.session.commit()

    async def restore_default_personas(self) -> list[Persona]:
        """Restores missing standard built-in personas and syncs system defaults."""
        for p_data in SYSTEM_PERSONAS_SEED:
            result = await self.session.execute(
                select(Persona).where(Persona.id == p_data["id"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                persona = Persona(
                    id=p_data["id"],
                    name=p_data["name"],
                    description=p_data["description"],
                    role=p_data["role"],
                    personality=p_data["personality"],
                    speaking_style=p_data["speaking_style"],
                    difficulty=p_data["difficulty"],
                    is_system=True,
                    avatar_url=p_data.get("avatar_url"),
                    system_prompt=p_data.get("system_prompt"),
                )
                self.session.add(persona)
            else:
                existing.name = p_data["name"]
                existing.description = p_data["description"]
                existing.role = p_data["role"]
                existing.personality = p_data["personality"]
                existing.speaking_style = p_data["speaking_style"]
                existing.difficulty = p_data["difficulty"]
                existing.avatar_url = p_data.get("avatar_url")
                existing.system_prompt = p_data.get("system_prompt")
        await self.session.commit()
        return await self.list_personas()

    async def list_personas(self) -> list[Persona]:
        result = await self.session.execute(
            select(Persona).order_by(Persona.is_system.desc(), Persona.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, persona_id: str) -> Persona:
        result = await self.session.execute(
            select(Persona).where(Persona.id == persona_id)
        )
        persona = result.scalar_one_or_none()
        if not persona:
            raise NotFoundException(f"Persona with ID '{persona_id}' not found")
        return persona

    async def create_persona(self, payload: PersonaCreate) -> Persona:
        if not payload.name.strip():
            raise ValidationException("Persona name cannot be empty")

        persona = Persona(
            name=payload.name.strip(),
            description=payload.description.strip(),
            role=payload.role.strip(),
            personality=payload.personality.strip(),
            speaking_style=payload.speaking_style.strip(),
            difficulty=payload.difficulty.strip().upper(),
            is_system=False,
            avatar_url=payload.avatar_url,
            system_prompt=payload.system_prompt,
        )
        self.session.add(persona)
        await self.session.commit()
        await self.session.refresh(persona)
        return persona

    async def update_persona(self, persona_id: str, payload: PersonaUpdate) -> Persona:
        persona = await self.get_by_id(persona_id)

        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(persona, key, val)

        await self.session.commit()
        await self.session.refresh(persona)
        return persona

    async def delete_persona(self, persona_id: str) -> None:
        persona = await self.get_by_id(persona_id)
        await self.session.delete(persona)
        await self.session.commit()

    # --- AI random generation ---

    async def generate_random_persona(
        self, req: PersonaGenerateRequest, user_id: str | None = None
    ) -> PersonaGenerateResponse:
        # Lazy import to avoid circular dependencies
        from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask
        from app.domains.ai.router import AIRouter

        raw_diff = (req.difficulty or "N3").upper().strip()
        if raw_diff in ["NATIVE", "BUSINESS", "BẢN XỨ", "DOANH NGHIỆP"]:
            difficulty = "NATIVE"
            level_desc = "Native Japanese speaker (bản ngữ tự nhiên, thương mại cao cấp, tự nhiên chuẩn Nhật)"
        elif raw_diff in ["ADAPTIVE", "ALL", "TỰ THÍCH ỨNG", "TẤT CẢ"]:
            difficulty = "ADAPTIVE"
            level_desc = "Adaptive level (tự động điều chỉnh linh hoạt theo trình độ và phản xạ của người học)"
        elif raw_diff in ["N5", "N4", "N3", "N2", "N1"]:
            difficulty = raw_diff
            level_desc = f"JLPT Level {raw_diff}"
        else:
            difficulty = "N3"
            level_desc = "JLPT Level N3"

        theme_hint = (req.theme or "").strip()

        system = (
            "You are an expert Japanese conversation persona designer for immersive speaking training. "
            "Generate ONE highly realistic, engaging Japanese conversation partner (persona) tailored to the requested scenario or theme. "
            "Format the output strictly as a JSON object with keys: "
            "name (Japanese name with kanji/kana and romaji, e.g., 'Kenji Sato (佐藤 健司)'), "
            "role (Role, profession, or relationship in Vietnamese, e.g., 'Trưởng nhóm phát triển phần mềm tại Shibuya'), "
            "description (1-2 sentences in Vietnamese describing the exact situation, physical setting, and scenario context), "
            "personality (Vietnamese description of personality traits, temperament, and friendliness), "
            "speaking_style (Vietnamese description of speech style, tone, politeness/keigo/casual), "
            "difficulty (One of 'N5', 'N4', 'N3', 'N2', 'N1', 'ADAPTIVE', or 'NATIVE'), "
            "system_prompt (Comprehensive system prompt in English instructing the AI how to roleplay this persona naturally, opening the dialogue with a natural initial greeting in Japanese, and keeping responses concise in 1-3 sentences suitable for spoken interaction). "
            "Return ONLY raw valid JSON, no markdown formatting."
        )

        user_content = f"Generate a vivid Japanese conversation partner. Target Level: {level_desc}."
        if theme_hint:
            user_content += f" Specific situation / scenario / context: {theme_hint}."

        try:
            ai_router = AIRouter(self.session)
            ai_req = AIRequest(
                messages=[AIMessage(role=AIMessageRole.USER, content=user_content)],
                system_instruction=system,
                temperature=0.85,
                max_output_tokens=650,
                response_format=None,
            )
            resp = await ai_router.generate(task=AITask.GENERAL, request=ai_req, user_id=user_id)
            text = resp.text.strip()

            # Extract JSON
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1:
                raise ValidationException("AI response could not be parsed as JSON.")

            obj = json.loads(text[start : end + 1])
            for k in ["name", "role", "description", "personality", "speaking_style"]:
                if k not in obj or not str(obj[k]).strip():
                    raise ValidationException(f"AI generated incomplete persona: missing '{k}'")

            diff = str(obj.get("difficulty", difficulty)).upper().strip()
            if diff not in ["N5", "N4", "N3", "N2", "N1", "NATIVE", "ADAPTIVE"]:
                diff = difficulty

            return PersonaGenerateResponse(
                name=str(obj["name"]).strip()[:100],
                role=str(obj["role"]).strip()[:100],
                description=str(obj["description"]).strip(),
                personality=str(obj["personality"]).strip(),
                speaking_style=str(obj["speaking_style"]).strip()[:100],
                difficulty=diff,
                avatar_url=None,
                system_prompt=str(obj.get("system_prompt", "")).strip() or f"You are {obj['name']}, {obj['role']}. Respond naturally in Japanese in 1-3 sentences.",
                reasoning=f"AI ({resp.provider}/{resp.model})",
            )
        except ValidationException:
            raise
        except Exception as e:
            raise ValidationException(f"Không thể tạo persona ngẫu nhiên bằng AI: {e}")
