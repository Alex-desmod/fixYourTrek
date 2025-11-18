from fastapi import FastAPI

app = FastAPI(
    title="fix your fucking trek",
)

@app.get("/")
def root():
    return {"status": "ok"}
