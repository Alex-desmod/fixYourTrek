from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

from backend.routers import track

app = FastAPI(
    title="fix your fucking track",
    debug=True
)

app.include_router(track.router)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_old"
STATIC_DIR = FRONTEND_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/libs", StaticFiles(directory=FRONTEND_DIR / "libs"), name="libs")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")

@app.get("/", response_class=HTMLResponse)
def root():
    return FileResponse(FRONTEND_DIR / "index.html")
