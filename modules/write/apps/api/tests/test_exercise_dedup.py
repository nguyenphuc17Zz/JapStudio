from app.core.config import Settings
from app.models import Exercise, JlptLevel, Register, TargetLength
from app.repositories import ExerciseRepository
from app.services.exercise_dedup_service import (
    ExerciseDedupService,
    compute_minhash_signature,
    compute_shingles,
    estimate_jaccard,
)


def test_normalize_casefolds_and_strips_diacritics() -> None:
    assert ExerciseDedupService.normalize_prompt("Hôm nay, nhiều việc!") == "hom nay nhieu viec"
    assert ExerciseDedupService.normalize_prompt("  HÔM   NAY NHIỀU VIỆC  ") == "hom nay nhieu viec"
    assert ExerciseDedupService.normalize_prompt(
        "Hôm nay, nhiều việc!"
    ) == ExerciseDedupService.normalize_prompt("Hôm nay nhiều việc")


def test_normalize_keeps_meaningful_words() -> None:
    assert ExerciseDedupService.normalize_prompt("Tôi về muộn một chút.") == "toi ve muon mot chut"


def test_prompt_hash_stable_and_distinct() -> None:
    normalized = ExerciseDedupService.normalize_prompt("Hôm nay nhiều việc quá.")
    assert ExerciseDedupService.prompt_hash(normalized) == ExerciseDedupService.prompt_hash(
        ExerciseDedupService.normalize_prompt("Hôm nay nhiều việc quá!")
    )
    assert ExerciseDedupService.prompt_hash("a") != ExerciseDedupService.prompt_hash("b")


async def test_exact_duplicate_detected(session) -> None:
    repository = ExerciseRepository(session)
    service = ExerciseDedupService(repository)
    prompt = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    normalized = service.normalize_prompt(prompt)
    await repository.add(
        Exercise(
            exercise_type="sentence_translation",
            topic="Work",
            context="Bận rộn.",
            prompt_vi=prompt,
            prompt_vi_hash=service.prompt_hash(normalized),
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N3,
            difficulty=5,
            grammar_complexity=5,
            vocabulary_complexity=5,
            context_complexity=5,
            naturalness_target=6,
        )
    )
    match = await service.find_duplicate("Hôm nay nhiều việc quá nên chắc tui sẽ về muộn!")
    assert match.is_duplicate is True
    assert match.kind == "exact"
    assert match.matched_prompt == prompt


async def test_near_duplicate_detected(session) -> None:
    repository = ExerciseRepository(session)
    service = ExerciseDedupService(repository)
    existing = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    await repository.add(
        Exercise(
            exercise_type="sentence_translation",
            topic="Work",
            context="Bận rộn.",
            prompt_vi=existing,
            prompt_vi_hash=service.prompt_hash(service.normalize_prompt(existing)),
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N3,
            difficulty=5,
            grammar_complexity=5,
            vocabulary_complexity=5,
            context_complexity=5,
            naturalness_target=6,
        )
    )
    near = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn thôi."
    match = await service.find_duplicate(near)
    assert match.is_duplicate is True
    assert match.kind == "near"


async def test_distinct_prompt_not_duplicate(session) -> None:
    repository = ExerciseRepository(session)
    service = ExerciseDedupService(repository)
    await repository.add(
        Exercise(
            exercise_type="sentence_translation",
            topic="Food",
            context="Bữa tối.",
            prompt_vi="Tối nay tụi mình đi ăn lẩu nha.",
            prompt_vi_hash="c" * 64,
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N4,
            difficulty=4,
            grammar_complexity=4,
            vocabulary_complexity=4,
            context_complexity=4,
            naturalness_target=5,
        )
    )
    match = await service.find_duplicate("Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.")
    assert match.is_duplicate is False


async def test_threshold_respected(session) -> None:
    repository = ExerciseRepository(session)
    service = ExerciseDedupService(repository, Settings(ai_exercise_near_duplicate_threshold=0.99))
    existing = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    await repository.add(
        Exercise(
            exercise_type="sentence_translation",
            topic="Work",
            context="Bận rộn.",
            prompt_vi=existing,
            prompt_vi_hash="d" * 64,
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N3,
            difficulty=5,
            grammar_complexity=5,
            vocabulary_complexity=5,
            context_complexity=5,
            naturalness_target=6,
        )
    )
    near = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn thôi."
    match = await service.find_duplicate(near)
    assert match.is_duplicate is False


async def test_punctuation_only_prompt_not_duplicate(session) -> None:
    repository = ExerciseRepository(session)
    service = ExerciseDedupService(repository)
    match = await service.find_duplicate("!!! ??? ...")
    assert match.is_duplicate is False


def test_minhash_identical_strings_have_jaccard_one() -> None:
    text = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    shingles1 = compute_shingles(ExerciseDedupService.normalize_prompt(text))
    shingles2 = compute_shingles(ExerciseDedupService.normalize_prompt(text))
    sig1 = compute_minhash_signature(shingles1)
    sig2 = compute_minhash_signature(shingles2)
    assert estimate_jaccard(sig1, sig2) == 1.0


def test_minhash_similar_vs_disjoint_strings() -> None:
    base = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    near = "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn thôi."
    disjoint = "Ngày mai thời tiết đẹp đi dạo công viên cùng bạn bè."

    sig_base = compute_minhash_signature(compute_shingles(ExerciseDedupService.normalize_prompt(base)))
    sig_near = compute_minhash_signature(compute_shingles(ExerciseDedupService.normalize_prompt(near)))
    sig_disjoint = compute_minhash_signature(compute_shingles(ExerciseDedupService.normalize_prompt(disjoint)))

    sim_near = estimate_jaccard(sig_base, sig_near)
    sim_disjoint = estimate_jaccard(sig_base, sig_disjoint)

    assert sim_near > 0.75
    assert sim_disjoint < 0.15

