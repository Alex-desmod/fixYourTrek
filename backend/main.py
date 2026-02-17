from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from starlette.staticfiles import StaticFiles

from backend.routers import track

app = FastAPI(
    title="fix your fucking track",
    debug=True
)

app.include_router(track.router)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
def frontend():
    return FileResponse(FRONTEND_DIR / "dist/index.html")
