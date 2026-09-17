"""Integration tests for Interview Coach API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_interview_templates(client: AsyncClient):
    resp = await client.get("/api/v1/interview/templates")
    assert resp.status_code == 200
    data = resp.json()
    assert "templates" in data
    assert "interviewers" in data
    assert len(data["templates"]) >= 5


@pytest.mark.asyncio
async def test_generate_interview_question_endpoint(client: AsyncClient):
    payload = {
        "role": "IT Engineer (React/TypeScript)",
        "company_context": "Tech Startup in Shibuya",
        "interviewer_style": "friendly",
        "turn_index": 1,
        "previous_turns": [],
    }
    resp = await client.post("/api/v1/interview/question", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "question_ja" in data
    assert "prep_starters" in data
    assert "point" in data["prep_starters"]


@pytest.mark.asyncio
async def test_evaluate_interview_answer_endpoint(client: AsyncClient):
    payload = {
        "role": "Bridge Software Engineer",
        "question_ja": "これまでのご経験を教えてください。",
        "user_answer": "結論から申し上げますと、私は3年間日系プロジェクトでブリッジSEを務めてまいりました。具体的には、要件定義書を日本語化し、開発チームと密に連携いたしました。",
        "turn_index": 1,
        "interviewer_style": "friendly",
    }
    resp = await client.post("/api/v1/interview/coach", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_score" in data
    assert "prep_breakdown" in data
    assert "native_model_answer" in data


@pytest.mark.asyncio
async def test_finalize_interview_report_endpoint(client: AsyncClient):
    payload = {
        "role": "Sales Representative",
        "turns_history": [
            {
                "question_ja": "自己PRをお願いします。",
                "candidate_answer": "結論から申し上げますと、新規開拓力が強みです。",
                "evaluation": {
                    "overall_score": 85,
                    "prep_score": 85,
                    "keigo_score": 85,
                },
            }
        ],
    }
    resp = await client.post("/api/v1/interview/report", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "decision" in data
    assert "overall_score" in data
    assert data["overall_score"] == 85
