from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.client_account_store import init_client_accounts_table
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_database
from app.managed_project_store import init_managed_projects_table
from app.managed_document_store import init_managed_documents_table
from app.managed_brief_store import init_managed_project_briefs_table
from app.managed_update_store import init_managed_project_updates_table
from app.managed_photo_store import init_managed_project_photos_table
from app.quote_check_store import init_quote_check_table
from app.renovation_plan_store import init_renovation_plan_table
from app.analysis_store import init_analysis_table
from app.evidence_store import init_evidence_table
from app.routers.evidence import router as evidence_router
from app.routers.projects import router as projects_router
from app.routers.managed_projects import router as managed_projects_router
from app.routers.managed_documents import router as managed_documents_router
from app.routers.managed_briefs import router as managed_briefs_router
from app.routers.client_projects import router as client_projects_router
from app.routers.client_auth import router as client_auth_router
from app.routers.managed_updates import router as managed_updates_router
from app.routers.managed_photos import router as managed_photos_router
from app.routers.client_offer import router as client_offer_router
from app.routers.quote_check import router as quote_check_router
from app.routers.renovation_plan import router as renovation_plan_router
from app.routers.analysis import router as analysis_router
from app.routers.reports import router as reports_router
from app.routers.property import router as property_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    init_managed_projects_table()
    init_managed_documents_table()
    init_managed_project_briefs_table()
    init_client_accounts_table()
    init_managed_project_updates_table()
    init_managed_project_photos_table()
    init_quote_check_table()
    init_renovation_plan_table()
    init_analysis_table()
    init_evidence_table()
    yield


app = FastAPI(
    title="ZAMI API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ZAMI API",
        "version": "0.2.0",
    }


app.include_router(property_router)
app.include_router(projects_router)
app.include_router(evidence_router)
app.include_router(reports_router)
app.include_router(analysis_router)
app.include_router(renovation_plan_router)
app.include_router(quote_check_router)
app.include_router(managed_projects_router)
app.include_router(managed_documents_router)
app.include_router(managed_briefs_router)
app.include_router(client_projects_router)
app.include_router(client_auth_router)
app.include_router(managed_updates_router)
app.include_router(managed_photos_router)
app.include_router(client_offer_router)
