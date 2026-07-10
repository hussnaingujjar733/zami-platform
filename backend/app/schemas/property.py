from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


DataStatus = Literal[
    "available",
    "not_found",
    "unavailable",
    "estimated",
    "declared",
]

SourceType = Literal[
    "official",
    "homeowner",
    "document",
    "photo_analysis",
    "zami_estimate",
]

ConfidenceLevel = Literal[
    "unknown",
    "low",
    "medium",
    "high",
    "very_high",
]


class SourceReference(BaseModel):
    name: str
    type: SourceType
    dataset: str | None = None
    retrieved_at: datetime
    official: bool = False


class DataPoint(BaseModel):
    value: Any | None = None
    unit: str | None = None
    status: DataStatus
    source_type: SourceType
    source_name: str
    dataset: str | None = None
    retrieved_at: datetime
    confidence: ConfidenceLevel
    verified: bool = False
    message: str | None = None


class PropertySnapshotRequest(BaseModel):
    address: str = Field(
        min_length=6,
        max_length=200,
        description="Adresse française complète du logement",
    )


class PropertySnapshotResponse(BaseModel):
    address: DataPoint
    dpe: DataPoint

    data_completeness: int = Field(ge=0, le=100)
    analysis_confidence: ConfidenceLevel
    verification_status: str

    missing_information: list[str]
    recommended_next_questions: list[str]
    sources: list[SourceReference]
