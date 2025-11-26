from fastapi import FastAPI
from backend.routers import track

app = FastAPI(
    title="fix your fucking track",
)

app.include_router(track.router)

@app.get("/")
def root():
    return {"status": "ok"}
