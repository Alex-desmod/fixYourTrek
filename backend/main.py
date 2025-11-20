from fastapi import FastAPI
from backend.routers import upload

app = FastAPI(
    title="fix your fucking trek",
)

app.include_router(upload.router)

@app.get("/")
def root():
    return {"status": "ok"}
