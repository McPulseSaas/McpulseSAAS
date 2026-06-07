import asyncio
import json
from typing import Callable
from openai import AsyncOpenAI
from app.models.schemas import AnalysisResult

# Testing: 1000 personas. Will be controlled per-plan via Supabase later.
DEFAULT_PERSONA_COUNT = 1000
GEN_BATCH_SIZE = 100   # 100 personas per generation call (10 calls for 1000)
SURVEY_BATCH_SIZE = 25  # 25 personas per survey call (40 calls for 1000)


PERSONA_GENERATION_PROMPT = """You are generating {count} realistic synthetic customer personas for market research.

PRODUCT BEING VALIDATED:
- Name: {product_name}
- Problem it solves: {problem}
- Target customer: {target_customer}
- Solution: {solution}
- Price point: {price_point}

Generate exactly {count} diverse, realistic potential customers. Include a wide range of:
- Ages (18-65)
- Locations (mix of US, Europe, Asia)
- Job titles and industries
- Income levels
- Tech savviness levels

Return a JSON array with exactly {count} objects. Each object must have:
{{
  "id": <number>,
  "age": <integer>,
  "location": "<city, country>",
  "job_title": "<title>",
  "industry": "<industry>",
  "income_level": "<Low/Medium/High/Very High>",
  "pain_points": ["<pain1>", "<pain2>", "<pain3>"],
  "current_solutions": ["<solution1>", "<solution2>"],
  "tech_savviness": "<Low/Medium/High>",
  "willingness_to_pay_range": "<€0/€1-10/€10-30/€30-100/€100+>"
}}

Return ONLY the JSON array, no other text."""


SURVEY_BATCH_PROMPT = """You are simulating honest responses from {count} different customer personas to a product survey.

PRODUCT BEING SURVEYED:
- Name: {product_name}
- Problem: {problem}
- Solution: {solution}
- Price point: {price_point}

PERSONAS TO SURVEY:
{personas_json}

For each persona, simulate their honest, realistic response based on their profile.

Return a JSON array with exactly {count} objects. Each must have:
{{
  "persona_id": <id from persona>,
  "would_use": "<Yes|No|Maybe>",
  "willingness_to_pay": "<€0|€1-10|€10-30|€30-100|€100+>",
  "biggest_concern": "<their main objection in 1-2 sentences>",
  "must_have_feature": "<one feature that would make them buy>",
  "network_has_problem": "<Yes|No|Some>"
}}

Be realistic: for most ideas, 20-40% say Yes, 30-50% say Maybe, 20-40% say No.
Vary the concerns and features — don't repeat the same ones.
Return ONLY the JSON array."""


ANALYSIS_PROMPT = """You are analyzing market validation data from {total} synthetic customer surveys.

PRODUCT:
- Name: {product_name}
- Problem: {problem}
- Target customer: {target_customer}
- Solution: {solution}
- Price point: {price_point}

SURVEY RESULTS SUMMARY:
- Yes: {yes_count} ({yes_pct}%)
- Maybe: {maybe_count} ({maybe_pct}%)
- No: {no_count} ({no_pct}%)

Willingness to Pay distribution:
{wtp_summary}

Top concerns mentioned:
{concerns_list}

Top features requested:
{features_list}

Based on this data, provide:

1. A validation score from 0-100 based on:
   - % saying Yes (weighted most heavily)
   - % saying Maybe
   - WTP alignment with stated price point
   - Strength of demand signals

2. The Ideal Customer Profile (ICP): describe in 2-3 sentences who is most likely to buy.

3. Top 3 objections (summarized from the concerns)

4. Top 3 most-requested features

5. 3 concrete next steps for the founder

Return JSON:
{{
  "validation_score": <0-100>,
  "icp_description": "<2-3 sentence ICP description>",
  "top_objections": ["<objection1>", "<objection2>", "<objection3>"],
  "top_features": ["<feature1>", "<feature2>", "<feature3>"],
  "next_steps": ["<step1>", "<step2>", "<step3>"]
}}

Return ONLY the JSON."""


async def _generate_persona_batch(client: AsyncOpenAI, count: int, product_name: str, problem: str,
                                   target_customer: str, solution: str, price_point: str) -> list:
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": PERSONA_GENERATION_PROMPT.format(
            count=count,
            product_name=product_name,
            problem=problem,
            target_customer=target_customer,
            solution=solution,
            price_point=price_point,
        )}],
        response_format={"type": "json_object"},
        temperature=0.9,
    )
    raw = resp.choices[0].message.content
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, list) else parsed.get(list(parsed.keys())[0], [])


async def _survey_batch(client: AsyncOpenAI, batch: list, product_name: str, problem: str,
                         solution: str, price_point: str) -> list:
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": SURVEY_BATCH_PROMPT.format(
            count=len(batch),
            product_name=product_name,
            problem=problem,
            solution=solution,
            price_point=price_point,
            personas_json=json.dumps(batch, indent=2),
        )}],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    raw = resp.choices[0].message.content
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, list) else parsed.get(list(parsed.keys())[0], [])


async def run_analysis(
    analysis_id: str,
    product_name: str,
    problem: str,
    target_customer: str,
    solution: str,
    price_point: str,
    openai_api_key: str,
    progress_callback: Callable | None = None,
    persona_count: int = DEFAULT_PERSONA_COUNT,
) -> AnalysisResult:
    """
    Main engine: generate personas, survey them, analyze results.
    progress_callback(stage, step, total, message) is called for real-time updates.
    """
    client = AsyncOpenAI(api_key=openai_api_key)

    async def emit(stage: str, step: int, total: int, message: str):
        if progress_callback:
            await progress_callback(stage, step, total, message)

    # ── STAGE 1: Generate personas in parallel batches of GEN_BATCH_SIZE ──
    await emit("personas", 0, 3, f"[ 1/3 ] Generating {persona_count} synthetic personas...")

    gen_tasks = [
        _generate_persona_batch(client, GEN_BATCH_SIZE, product_name, problem,
                                target_customer, solution, price_point)
        for _ in range(persona_count // GEN_BATCH_SIZE)
    ]
    # Handle remainder
    remainder = persona_count % GEN_BATCH_SIZE
    if remainder:
        gen_tasks.append(_generate_persona_batch(client, remainder, product_name, problem,
                                                  target_customer, solution, price_point))

    gen_results = await asyncio.gather(*gen_tasks, return_exceptions=True)

    personas = []
    for r in gen_results:
        if isinstance(r, list):
            personas.extend(r)

    await emit("personas", 1, 3, f"[ 1/3 ] Generated {len(personas)} personas ✓")

    # ── STAGE 2: Survey in parallel batches of SURVEY_BATCH_SIZE ──
    await emit("survey", 1, 3, f"[ 2/3 ] Surveying {len(personas)} personas...")

    survey_batches = [personas[i:i + SURVEY_BATCH_SIZE] for i in range(0, len(personas), SURVEY_BATCH_SIZE)]
    survey_tasks = [
        _survey_batch(client, batch, product_name, problem, solution, price_point)
        for batch in survey_batches
    ]

    survey_results = await asyncio.gather(*survey_tasks, return_exceptions=True)

    all_responses = []
    for r in survey_results:
        if isinstance(r, list):
            all_responses.extend(r)

    await emit("survey", 2, 3, f"[ 2/3 ] Surveyed {len(all_responses)} personas ✓")

    # ── STAGE 3: Analyze ──
    await emit("analysis", 2, 3, "[ 3/3 ] Analysing patterns and segments...")

    yes_count = sum(1 for r in all_responses if r.get("would_use") == "Yes")
    maybe_count = sum(1 for r in all_responses if r.get("would_use") == "Maybe")
    no_count = sum(1 for r in all_responses if r.get("would_use") == "No")
    total = len(all_responses) or 1

    wtp_counts: dict[str, int] = {}
    concerns: list[str] = []
    features: list[str] = []

    for r in all_responses:
        wtp = r.get("willingness_to_pay", "€0")
        wtp_counts[wtp] = wtp_counts.get(wtp, 0) + 1
        if r.get("biggest_concern"):
            concerns.append(r["biggest_concern"])
        if r.get("must_have_feature"):
            features.append(r["must_have_feature"])

    wtp_summary = "\n".join(f"  {k}: {v} respondents" for k, v in sorted(wtp_counts.items()))
    concerns_sample = "\n".join(f"- {c}" for c in concerns[:30])
    features_sample = "\n".join(f"- {f}" for f in features[:30])

    analysis_response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": ANALYSIS_PROMPT.format(
            total=total,
            product_name=product_name,
            problem=problem,
            target_customer=target_customer,
            solution=solution,
            price_point=price_point,
            yes_count=yes_count,
            yes_pct=round(yes_count / total * 100),
            maybe_count=maybe_count,
            maybe_pct=round(maybe_count / total * 100),
            no_count=no_count,
            no_pct=round(no_count / total * 100),
            wtp_summary=wtp_summary,
            concerns_list=concerns_sample,
            features_list=features_sample,
        )}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    analysis_data = json.loads(analysis_response.choices[0].message.content)

    score = analysis_data.get("validation_score", 0)
    signal = "STRONG" if score >= 71 else "MODERATE" if score >= 41 else "LOW"

    result = AnalysisResult(
        validation_score=score,
        signal_level=signal,
        icp_description=analysis_data.get("icp_description", ""),
        market_response={"yes": yes_count, "no": no_count, "maybe": maybe_count},
        willingness_to_pay=wtp_counts,
        top_objections=analysis_data.get("top_objections", []),
        top_features=analysis_data.get("top_features", []),
        next_steps=analysis_data.get("next_steps", []),
        personas_count=len(all_responses),
    )

    await emit("complete", 3, 3, f"[ ✓ ] Analysis complete — {len(all_responses)} personas surveyed")
    return result
