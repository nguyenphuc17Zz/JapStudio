from fastapi import APIRouter

from app.api.v1.ai import router as ai_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.challenges import router as challenges_router
from app.api.v1.culture import router as culture_router
from app.api.v1.exercises import router as exercises_router
from app.api.v1.gamification import router as gamification_router
from app.api.v1.learning import router as learning_router
from app.api.v1.memory import router as memory_router
from app.api.v1.quality import router as quality_router
from app.api.v1.scenarios import router as scenarios_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.vocabulary import router as vocabulary_router
from app.api.v1.writing import router as writing_router
from app.api.v1.furigana import router as furigana_router
from app.api.v1.writing_drills import router as writing_drills_router
from app.api.v1.writing_intelligence import router as writing_intelligence_router
from app.api.v1.rewrite_lab import router as rewrite_lab_router
from app.api.v1.expression_intelligence import router as expression_intelligence_router
from app.api.v1.writing_mastery import router as writing_mastery_router
from app.api.v1.meta import router as meta_router
from app.api.v1.system import router as system_router

api_router = APIRouter()

api_router.include_router(ai_router, prefix="/ai")
api_router.include_router(analytics_router, prefix="/analytics")
api_router.include_router(challenges_router, prefix="/challenges")
api_router.include_router(culture_router, prefix="/culture")
api_router.include_router(exercises_router, prefix="/exercises")
api_router.include_router(gamification_router, prefix="/gamification")
api_router.include_router(learning_router, prefix="/learning")
api_router.include_router(memory_router, prefix="/learning")
api_router.include_router(quality_router, prefix="/ai")
api_router.include_router(scenarios_router, prefix="/scenarios")
api_router.include_router(simulations_router, prefix="/simulations")
api_router.include_router(vocabulary_router, prefix="/vocabulary")
api_router.include_router(writing_intelligence_router, prefix="/writing/intelligence")
api_router.include_router(writing_mastery_router, prefix="/writing/mastery")
api_router.include_router(writing_drills_router, prefix="/writing/drills")
api_router.include_router(expression_intelligence_router, prefix="/writing/expressions")
api_router.include_router(rewrite_lab_router)
api_router.include_router(writing_router, prefix="/writing")
api_router.include_router(furigana_router, prefix="/furigana")
api_router.include_router(meta_router)
api_router.include_router(system_router)


