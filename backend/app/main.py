import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.features.health.routes import router as health_router
from app.features.investment_aggregator.routes import router as invest_router
from app.features.itr_prep import create_router as create_itr_router

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(
    title="Financial Planner API",
    description="API for processing mutual fund PDF statements",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(invest_router, prefix="/api")
app.include_router(create_itr_router())
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Financial Planner API", "docs": "/docs"}
