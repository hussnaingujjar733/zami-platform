from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ProjectStatus = Literal[
    "draft",
    "questionnaire",
    "documents",
    "report_ready",
    "archived",
]


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address_label: str | None = Field(
        default=None,
        max_length=300,
    )

    address: dict[str, Any] = Field(default_factory=dict)
    snapshot: dict[str, Any] = Field(default_factory=dict)


class ProjectSnapshotPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshot: dict[str, Any]


class ProjectAnswersPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: dict[str, Any]


class ProjectReportPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report: dict[str, Any]


class ProjectStatusPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ProjectStatus


class ProjectResponse(BaseModel):
    id: str
    status: ProjectStatus
    address_label: str | None
    address: dict[str, Any]
    snapshot: dict[str, Any]
    answers: dict[str, Any]
    report: dict[str, Any]
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
