from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    free = "free"
    starter = "starter"
    growth = "growth"


class AnalysisStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class AIProvider(str, Enum):
    openai = "openai"
    anthropic = "anthropic"


class IdeaInput(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=100)
    problem: str = Field(..., min_length=10, max_length=2000)
    target_customer: str = Field(..., min_length=10, max_length=1000)
    solution: str = Field(..., min_length=10, max_length=2000)
    price_point: str = Field(..., max_length=500)
    ai_provider: AIProvider = AIProvider.openai
    api_key: str = Field(..., min_length=20)


class PersonaResponse(BaseModel):
    would_use: str  # "Yes" | "No" | "Maybe"
    willingness_to_pay: str  # "€0" | "€1-10" | "€10-30" | "€30-100" | "€100+"
    biggest_concern: str
    must_have_feature: str
    network_has_problem: str


class Persona(BaseModel):
    id: int
    age: int
    location: str
    job_title: str
    industry: str
    income_level: str
    pain_points: List[str]
    current_solutions: List[str]
    tech_savviness: str
    willingness_to_pay_range: str
    response: Optional[PersonaResponse] = None


class AnalysisResult(BaseModel):
    validation_score: int
    signal_level: str  # "LOW" | "MODERATE" | "STRONG"
    icp_description: str
    market_response: dict  # {"yes": int, "no": int, "maybe": int}
    willingness_to_pay: dict  # WTP distribution
    top_objections: List[str]
    top_features: List[str]
    next_steps: List[str]
    personas_count: int = 50


class CreateAnalysisRequest(BaseModel):
    idea: IdeaInput


class AnalysisOut(BaseModel):
    id: str
    user_id: str
    product_name: str
    status: AnalysisStatus
    result: Optional[AnalysisResult] = None
    created_at: datetime
    share_token: Optional[str] = None
    ai_provider: str = "openai"


class CheckoutRequest(BaseModel):
    plan: str  # "starter" | "growth"


class ProgressUpdate(BaseModel):
    stage: str
    step: int
    total: int
    message: str
