# AutoApply — Backend Roadmap

**Stack:** FastAPI · PostgreSQL · Celery + Redis · CrewAI (Analyzer + Writer) · OpenRouter  
**Kapsam:** Kişisel proje — production kalitesi değil, çalışan ve genişletilebilir bir sistem.

---

## Mimari Özet

```
┌─────────────────────────────────────────────────────────┐
│  TEKİKLEYİCİLER                                         │
│  Celery Beat (her 5 dk)  ──┐                            │
│  POST /api/scout/trigger ──┴──▶ scout_task (saf Python) │
└─────────────────────────────────────────────────────────┘
                  ↓
       JobFetcherService
         ├── RemoteOKSource
         └── AdzunaSource
                  ↓
       filtrele → deduplicate → DB'ye Job kaydı
                  ↓
       pipeline_task.delay(job_id, user_id)
                  ↓
┌─────────────────────────────────────────────────────────┐
│  CrewAI Pipeline (sadece bu ikisi)                      │
│  Analyzer Agent  ──▶  Writer Agent                      │
└─────────────────────────────────────────────────────────┘
                  ↓
       Apply Agent   → bildirim gönder, Gmail YOK
       Tracker Agent → DB yazma, follow-up zamanlama
                  ↓
       WebSocket → frontend'e canlı feed
```

### Agent Sorumluluk Tablosu

| Agent | CrewAI? | LLM? | Görev |
|---|---|---|---|
| Scout | ❌ Celery task | ❌ | API'den iş çek, filtrele, DB'ye yaz |
| Analyzer | ✅ | ✅ OpenRouter | CV–iş uyumu skoru + gap analizi |
| Writer | ✅ | ✅ OpenRouter | CV varyantı + cover letter üret |
| Apply | ❌ Sade Python | ❌ | Kullanıcıya bildirim gönder |
| Tracker | ❌ Celery task | ❌ | Follow-up zamanla, DB güncelle |

---

## Klasör Yapısı

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, router kayıtları
│   ├── core/
│   │   ├── config.py            # Pydantic Settings — .env okuma
│   │   ├── database.py          # SQLAlchemy engine + SessionLocal
│   │   ├── security.py          # JWT encode/decode
│   │   └── dependencies.py      # get_current_user, get_db
│   ├── api/v1/
│   │   ├── auth.py              # register, login
│   │   ├── cv.py                # upload, parse, GET
│   │   ├── jobs.py              # paginated feed
│   │   ├── applications.py      # CRUD, approve, status
│   │   ├── preferences.py       # job arama kriterleri
│   │   ├── analytics.py         # özet istatistikler
│   │   ├── scout.py             # manuel tetikleme
│   │   └── websocket.py         # WS /ws/agent-feed
│   ├── models/                  # SQLAlchemy ORM modelleri
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── application.py
│   │   ├── agent_log.py
│   │   └── follow_up.py
│   ├── schemas/                 # Pydantic request/response
│   │   ├── user.py
│   │   ├── job.py
│   │   └── application.py
│   ├── services/
│   │   ├── job_fetcher.py       # BaseJobSource, RemoteOK, Adzuna
│   │   ├── cv_parser.py         # pdfplumber + LLM → JSON
│   │   └── notification.py      # uygulama içi bildirim
│   ├── agents/
│   │   ├── crew.py              # Crew tanımı, build_crew(), step_callback
│   │   ├── analyzer_agent.py
│   │   └── writer_agent.py
│   └── tasks/
│       ├── celery_app.py        # Celery instance + Beat schedule
│       ├── scout_task.py        # run_scout_all_users, run_scout_for_user
│       ├── pipeline_task.py     # kickoff_pipeline — tüm pipeline
│       └── tracker_task.py      # follow-up zamanlama
├── migrations/                  # Alembic
├── tests/
├── .env.example
├── requirements.txt
└── Dockerfile
```

---

## Phase 1 — Foundation (~2 gün)

### Task 1.1 — Docker Compose `(~30 dk)`

**Dosya:** `docker-compose.yml`, `Dockerfile`, `.env.example`

```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [postgres, redis]
    volumes: ["./backend:/app"]
    command: uvicorn app.main:app --reload --host 0.0.0.0

  worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info
    env_file: .env
    depends_on: [postgres, redis]

  beat:
    build: ./backend
    command: celery -A app.tasks.celery_app beat --loglevel=info
    env_file: .env
    depends_on: [postgres, redis]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: autoapply
      POSTGRES_USER: autoapply
      POSTGRES_PASSWORD: secret
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

> **Not:** nginx, SSL, health check yok. `docker compose up --build` ile tek komut.

---

### Task 1.2 — FastAPI Skeleton `(~45 dk)`

**Dosyalar:** `main.py`, `core/config.py`, `core/database.py`

Yapılacaklar:
- Pydantic `Settings` ile `.env` okuma (`DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`, `OPENROUTER_API_KEY` vb.)
- SQLAlchemy engine + `SessionLocal` factory
- CORS middleware — `localhost:3000` için izin
- `GET /health` endpoint — servis ayakta mı?
- Tüm router'ları `main.py`'ye kaydet

> **Not:** Rate limiting, structured logging, Sentry yok.

---

### Task 1.3 — Alembic Migrations `(~1 saat)`

**Dosyalar:** `models/*.py`, `migrations/`

5 tablo — sıralı oluştur:

```
001_create_users
  id UUID PK, email UNIQUE, hashed_password,
  preferences_json JSONB, agent_active BOOL default false,
  created_at TIMESTAMP

002_create_jobs
  id UUID PK, title, company, location,
  source ENUM(remoteok, adzuna),
  apply_url TEXT UNIQUE,          ← deduplicate'in temeli
  apply_type ENUM(email, platform),
  description TEXT, salary_min INT, salary_max INT,
  scraped_at TIMESTAMP

003_create_applications
  id UUID PK,
  user_id UUID FK → users,
  job_id UUID FK → jobs,
  status ENUM(pending, applied, reviewing, interview, offer, rejected),
  fit_score INT,
  cv_variant_text TEXT,
  cover_letter_text TEXT,
  submitted_at TIMESTAMP, last_updated_at TIMESTAMP

004_create_agent_logs
  id UUID PK,
  application_id UUID FK → applications,
  agent_name TEXT, action TEXT,
  payload_json JSONB, timestamp TIMESTAMP

005_create_follow_ups
  id UUID PK,
  application_id UUID FK → applications,
  scheduled_at TIMESTAMP, sent_at TIMESTAMP, body_text TEXT
```

> **Not:** `JSONB` CV verisini tek sütunda tutar — ayrı `cv_skills` tablosu gereksiz.

---

### Task 1.4 — JWT Auth `(~1 saat)`

**Dosyalar:** `core/security.py`, `api/v1/auth.py`, `core/dependencies.py`

```python
# core/security.py
from jose import jwt
from datetime import datetime, timedelta
import bcrypt

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(hours=24)   # lokal dev — kısa tutma

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.utcnow() + ACCESS_TOKEN_EXPIRE}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
```

Endpoint'ler:
- `POST /api/auth/register` — bcrypt hash, token döndür
- `POST /api/auth/login` — doğrula, token döndür
- `get_current_user` dependency — korumalı her route'da kullan

> **Not:** Refresh token yok. Access token 24 saat — lokal geliştirmede sürekli re-login can sıkar.

---

## Phase 2 — CV Parsing `(~1 gün)`

### Task 2.1 — pdfplumber ile metin çıkarma `(~30 dk)`

**Dosya:** `services/cv_parser.py`

```python
import pdfplumber

def extract_text_from_pdf(file_path: str) -> str:
    with pdfplumber.open(file_path) as pdf:
        return "\n".join(
            page.extract_text() or "" for page in pdf.pages
        )
```

`.docx` da desteklemek istersen: `python-docx` ile `doc.paragraphs` üzerinden aynı şey.

---

### Task 2.2 — LLM ile JSON'a dönüştürme `(~1 saat)`

**Dosya:** `services/cv_parser.py`

Ham metni ucuz bir OpenRouter modeline gönder, yapılandırılmış JSON al:

```python
import httpx, json

CV_PARSE_PROMPT = """
Aşağıdaki CV metnini analiz et ve SADECE şu JSON formatında döndür, başka hiçbir şey yazma:

{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string (2-3 cümle)",
  "skills": ["skill1", "skill2"],
  "languages": ["Python", "English"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": "string"
    }
  ]
}

CV Metni:
{cv_text}
"""

async def parse_cv_with_llm(cv_text: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "messages": [
                    {"role": "user", "content": CV_PARSE_PROMPT.format(cv_text=cv_text[:6000])}
                ],
                "temperature": 0,   # deterministik çıktı
            }
        )
    raw = resp.json()["choices"][0]["message"]["content"]
    # LLM bazen ```json ... ``` bloğu içinde döndürür
    raw = raw.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(raw)
```

> **Not:** `temperature=0` — her seferinde aynı format çıksın. Parsing hatası olursa `{}` döndür, kullanıcı manuel düzeltir.

---

### Task 2.3 — CV Upload Endpoint `(~30 dk)`

**Dosya:** `api/v1/cv.py`

```python
@router.post("/api/cv/upload")
async def upload_cv(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Dosyayı kaydet
    path = f"uploads/cv/{current_user.id}/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    # Arka planda parse et — kullanıcıyı beklettirme
    background_tasks.add_task(parse_and_store_cv, path, current_user.id, db)

    return {"status": "uploaded", "message": "CV işleniyor..."}

async def parse_and_store_cv(path: str, user_id: str, db: Session):
    text = extract_text_from_pdf(path)
    parsed = await parse_cv_with_llm(text)
    db.query(User).filter(User.id == user_id).update(
        {"preferences_json": {**user.preferences_json, "cv_data": parsed}}
    )
    db.commit()
```

---

## Phase 3 — Scout (Saf Python, CrewAI Yok) `(~1 gün)`

### Task 3.1 — BaseJobSource + Kaynaklar `(~1 saat)`

**Dosya:** `services/job_fetcher.py`

```python
from abc import ABC, abstractmethod
import httpx

class BaseJobSource(ABC):
    source_name: str

    @abstractmethod
    async def fetch(self, prefs: dict) -> list[dict]:
        pass

    # Ortak normalize formatı — her subclass override eder
    def _normalize(self, raw: dict) -> dict:
        raise NotImplementedError


class RemoteOKSource(BaseJobSource):
    source_name = "remoteok"

    async def fetch(self, prefs: dict) -> list[dict]:
        keywords = [k.lower() for k in prefs.get("role_keywords", [])]
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://remoteok.com/api",
                headers={"User-Agent": "AutoApply/1.0"}
            )
        jobs = resp.json()[1:]
        return [
            self._normalize(j) for j in jobs
            if any(kw in (j.get("position") or "").lower() for kw in keywords)
        ]

    def _normalize(self, j: dict) -> dict:
        return {
            "title": j.get("position", ""),
            "company": j.get("company", ""),
            "location": "Remote",
            "apply_url": j.get("url", ""),
            "apply_type": "platform",
            "description": (j.get("description") or "")[:5000],
            "source": self.source_name,
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
        }


class AdzunaSource(BaseJobSource):
    source_name = "adzuna"

    COUNTRY_URLS = {
        "gb": "https://api.adzuna.com/v1/api/jobs/gb/search/1",
        "us": "https://api.adzuna.com/v1/api/jobs/us/search/1",
        "de": "https://api.adzuna.com/v1/api/jobs/de/search/1",
    }

    async def fetch(self, prefs: dict) -> list[dict]:
        url = self.COUNTRY_URLS.get(prefs.get("country", "gb"))
        params = {
            "app_id": settings.ADZUNA_APP_ID,
            "app_key": settings.ADZUNA_APP_KEY,
            "what": " ".join(prefs.get("role_keywords", [])),
            "results_per_page": 50,
        }
        if prefs.get("location"):
            params["where"] = prefs["location"]
        if prefs.get("salary_min"):
            params["salary_min"] = prefs["salary_min"]

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)

        return [self._normalize(j) for j in resp.json().get("results", [])]

    def _normalize(self, j: dict) -> dict:
        apply_url = j.get("redirect_url", "")
        return {
            "title": j.get("title", ""),
            "company": j.get("company", {}).get("display_name", ""),
            "location": j.get("location", {}).get("display_name", ""),
            "apply_url": apply_url,
            "apply_type": "email" if "mailto:" in apply_url else "platform",
            "description": (j.get("description") or "")[:5000],
            "source": self.source_name,
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
        }


# Yeni kaynak eklemek = burada bir satır
class JobFetcherService:
    def __init__(self):
        self.sources: list[BaseJobSource] = [
            RemoteOKSource(),
            AdzunaSource(),
        ]

    async def fetch_for_user(self, prefs: dict) -> list[dict]:
        all_jobs = []
        for source in self.sources:
            try:
                jobs = await source.fetch(prefs)
                all_jobs.extend(jobs)
            except httpx.HTTPError as e:
                print(f"[Scout] {source.source_name} failed: {e}")
        return self._deduplicate(all_jobs)

    def _deduplicate(self, jobs: list[dict]) -> list[dict]:
        # 1. Kendi listesinde URL unique
        seen, unique = set(), []
        for j in jobs:
            if j["apply_url"] and j["apply_url"] not in seen:
                seen.add(j["apply_url"])
                unique.append(j)

        # 2. DB'de var mı?
        db = SessionLocal()
        existing = {r[0] for r in db.query(Job.apply_url).all()}
        db.close()
        return [j for j in unique if j["apply_url"] not in existing]
```

---

### Task 3.2 — Celery Scout Tasks `(~45 dk)`

**Dosya:** `tasks/scout_task.py`

```python
@celery_app.task(name="scout.run_all_users")
def run_scout_all_users():
    """Celery Beat tarafından her 5 dakikada tetiklenir."""
    db = SessionLocal()
    user_ids = [
        str(u.id) for u in
        db.query(User).filter(User.agent_active == True).all()
    ]
    db.close()
    for uid in user_ids:
        run_scout_for_user.delay(uid)


@celery_app.task(name="scout.run_for_user", bind=True, max_retries=2)
def run_scout_for_user(self, user_id: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.preferences_json:
            return

        prefs = user.preferences_json
        fetcher = JobFetcherService()
        new_jobs = asyncio.run(fetcher.fetch_for_user(prefs))

        for job_data in new_jobs:
            job = Job(**job_data)
            db.add(job)
            db.flush()
            kickoff_pipeline.delay(str(job.id), user_id)

        db.commit()
        return {"new_jobs": len(new_jobs)}

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
```

**Dosya:** `tasks/celery_app.py`

```python
celery_app.conf.beat_schedule = {
    "scout-every-5-min": {
        "task": "scout.run_all_users",
        "schedule": crontab(minute="*/5"),
    },
    "tracker-daily": {
        "task": "tracker.run_follow_ups",
        "schedule": crontab(hour=9, minute=0),
    },
}
```

---

### Task 3.3 — Manuel Tetikleme Endpoint `(~20 dk)`

**Dosya:** `api/v1/scout.py`

```python
@router.post("/api/scout/trigger")
def trigger_scout(current_user = Depends(get_current_user)):
    task = run_scout_for_user.delay(str(current_user.id))
    return {"task_id": task.id, "status": "queued"}

@router.get("/api/scout/status/{task_id}")
def scout_status(task_id: str):
    result = celery_app.AsyncResult(task_id)
    return {
        "state": result.state,
        "result": result.result if result.ready() else None
    }
```

---

## Phase 4 — CrewAI Pipeline (Analyzer + Writer) `(~2 gün)`

### Task 4.1 — OpenRouter LLM Kurulumu `(~20 dk)`

**Dosya:** `agents/crew.py`

```python
from crewai import LLM

analyzer_llm = LLM(
    model="openrouter/meta-llama/llama-3.1-8b-instruct:free",
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    extra_headers={
        "HTTP-Referer": "https://autoapply.local",
        "X-Title": "AutoApply",
    }
)

writer_llm = LLM(
    model="openrouter/google/gemma-4-31b-it:free",
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    extra_headers={
        "HTTP-Referer": "https://autoapply.local",
        "X-Title": "AutoApply",
    }
)
```

> **Model seçimi:** Geliştirme boyunca her ikisi için de `:free` modelleri kullan.  
> Production'a geçince `writer_llm`'i `gpt-4o-mini` ile değiştir — tek satır.

---

### Task 4.2 — Analyzer Agent `(~1 saat)`

**Dosya:** `agents/analyzer_agent.py`

```python
from crewai import Agent, Task

analyzer_agent = Agent(
    role="Job Fit Analyzer",
    goal="Score the fit between a candidate CV and a job listing, produce gap analysis",
    backstory="Expert technical recruiter with 10 years of experience matching candidates.",
    llm=analyzer_llm,
    verbose=True,
    allow_delegation=False,
)

def build_analyze_task(job: dict, cv_data: dict) -> Task:
    return Task(
        description=f"""
        Aşağıdaki iş ilanı ile adayın CV'sini karşılaştır.
        
        İş İlanı:
        - Başlık: {job['title']} @ {job['company']}
        - Açıklama: {job['description'][:3000]}
        
        Aday CV:
        - Beceriler: {cv_data.get('skills', [])}
        - Deneyim: {cv_data.get('experience', [])}
        
        SADECE şu JSON formatında döndür:
        {{
          "fit_score": 0-100 arası integer,
          "matched_skills": ["skill1", "skill2"],
          "missing_skills": ["skill3"],
          "recommendation": "apply|skip",
          "notes": "kısa açıklama"
        }}
        """,
        expected_output="JSON formatında fit analizi",
        agent=analyzer_agent,
    )
```

---

### Task 4.3 — Writer Agent `(~1 saat)`

**Dosya:** `agents/writer_agent.py`

```python
writer_agent = Agent(
    role="Application Writer",
    goal="Write tailored CV summary and cover letter for the specific job",
    backstory="Professional career coach who crafts compelling, ATS-friendly applications.",
    llm=writer_llm,
    verbose=True,
    allow_delegation=False,
)

def build_write_task(job: dict, cv_data: dict, analysis: dict) -> Task:
    return Task(
        description=f"""
        Aşağıdaki bilgileri kullanarak başvuru materyali hazırla.
        
        Pozisyon: {job['title']} @ {job['company']}
        Eşleşen beceriler: {analysis.get('matched_skills', [])}
        Eksik beceriler: {analysis.get('missing_skills', [])}
        Aday özeti: {cv_data.get('summary', '')}
        
        SADECE şu JSON formatında döndür:
        {{
          "cv_summary": "Bu pozisyon için özelleştirilmiş 3-4 cümlelik özet",
          "cover_letter": "Tam cover letter metni (3 paragraf)"
        }}
        """,
        expected_output="JSON formatında cv_summary ve cover_letter",
        agent=writer_agent,
    )
```

---

### Task 4.4 — Crew + Pipeline Celery Task `(~1 saat)`

**Dosya:** `agents/crew.py`, `tasks/pipeline_task.py`

```python
# agents/crew.py
import redis, json
from crewai import Crew, Process

r = redis.Redis.from_url(settings.REDIS_URL)

def step_callback(step_output, application_id: str, user_id: str):
    """Her agent adımı bitince AgentLog'a yaz + WebSocket'e push."""
    db = SessionLocal()
    log = AgentLog(
        application_id=application_id,
        agent_name=str(step_output.agent),
        action=str(step_output.type),
        payload_json=str(step_output.output)[:2000],
    )
    db.add(log)
    db.commit()
    db.close()

    r.publish(f"agent_events:{user_id}", json.dumps({
        "agent": str(step_output.agent),
        "message": str(step_output.output)[:300],
        "application_id": application_id,
    }))


def run_application_crew(
    job: dict, cv_data: dict, user_prefs: dict,
    application_id: str, user_id: str
) -> dict:
    analyze_task = build_analyze_task(job, cv_data)
    write_task = build_write_task(job, cv_data, {})
    write_task.context = [analyze_task]

    crew = Crew(
        agents=[analyzer_agent, writer_agent],
        tasks=[analyze_task, write_task],
        process=Process.sequential,
        verbose=True,
        memory=False,
        step_callback=lambda s: step_callback(s, application_id, user_id),
    )
    return crew.kickoff()
```

```python
# tasks/pipeline_task.py
@celery_app.task(name="pipeline.kickoff", bind=True, max_retries=2)
def kickoff_pipeline(self, job_id: str, user_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        cv_data = (user.preferences_json or {}).get("cv_data", {})

        # Application kaydı oluştur
        app = Application(
            user_id=user_id, job_id=job_id, status="pending"
        )
        db.add(app)
        db.flush()

        # Crew çalıştır
        result = run_application_crew(
            job=job.__dict__, cv_data=cv_data,
            user_prefs=user.preferences_json,
            application_id=str(app.id), user_id=user_id
        )

        # Sonuçları parse et ve kaydet
        # result.raw üzerinden JSON çıkar
        analysis = extract_json(result.tasks_output[0].raw)
        writing = extract_json(result.tasks_output[1].raw)

        app.fit_score = analysis.get("fit_score", 0)
        app.cv_variant_text = writing.get("cv_summary", "")
        app.cover_letter_text = writing.get("cover_letter", "")
        app.status = "applied" if analysis.get("recommendation") == "apply" else "rejected"
        db.commit()

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc, countdown=120)
    finally:
        db.close()
```

---

### Task 4.5 — Apply Agent (Bildirim, Gmail Yok) `(~30 dk)`

**Dosya:** `services/notification.py`

Apply Agent için ayrı CrewAI agent gerekmez — fit_score yüksekse kullanıcıya in-app bildirim gönder, onay bekle.

```python
def notify_application_ready(application_id: str, user_id: str, job: dict):
    """
    Kullanıcıya: 'Başvuru hazır, onaylamak ister misin?' bildirimi.
    Gerçek email gönderimi yok — sadece DB'ye bildirim kaydı.
    """
    r.publish(f"agent_events:{user_id}", json.dumps({
        "type": "application_ready",
        "application_id": application_id,
        "job_title": job["title"],
        "company": job["company"],
        "message": "Başvuru materyali hazır. Onaylamak için tıkla.",
    }))
```

`POST /api/applications/{id}/approve` endpoint'i onay gelince `status = "applied"` yapar.

---

### Task 4.6 — Tracker (Saf Python, CrewAI Yok) `(~30 dk)`

**Dosya:** `tasks/tracker_task.py`

```python
@celery_app.task(name="tracker.run_follow_ups")
def run_follow_ups():
    """Her sabah 09:00'da çalışır."""
    db = SessionLocal()
    due = db.query(FollowUp).filter(
        FollowUp.scheduled_at <= datetime.utcnow(),
        FollowUp.sent_at == None
    ).all()

    for fu in due:
        # Sadece WebSocket bildirimi — Gmail yok
        app = fu.application
        r.publish(f"agent_events:{app.user_id}", json.dumps({
            "type": "follow_up_reminder",
            "application_id": str(app.id),
            "message": f"{app.job.company} başvurusu için takip zamanı geldi.",
        }))
        fu.sent_at = datetime.utcnow()

    db.commit()
    db.close()
```

---

## Phase 5 — WebSocket Feed `(~30 dk)`

**Dosya:** `api/v1/websocket.py`

```python
import redis.asyncio as aioredis
from fastapi import WebSocket

async def agent_feed(websocket: WebSocket, token: str):
    # Token'dan user_id al
    user_id = decode_token(token)
    await websocket.accept()

    r = await aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"agent_events:{user_id}")

    async for message in pubsub.listen():
        if message["type"] == "message":
            await websocket.send_text(message["data"].decode())
```

Frontend bağlantısı: `ws://localhost:8000/ws/agent-feed?token=<JWT>`

> **Not:** Reconnect logic, heartbeat frontend'e bırakılıyor.

---

## Phase 6 — Kalan API Endpoint'leri `(~1 saat)`

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/jobs` | Paginated feed, filtreli (source, search) |
| `GET` | `/api/applications` | Kullanıcının tüm başvuruları |
| `GET` | `/api/applications/{id}` | Detay + AgentLog geçmişi |
| `POST` | `/api/applications/{id}/approve` | Semi-auto onay |
| `PATCH` | `/api/applications/{id}/status` | Manuel Kanban güncelleme |
| `GET` | `/api/analytics/summary` | Toplam başvuru, response rate, haftalık sayı |
| `PUT` | `/api/preferences` | Arama kriterleri güncelle |

Hepsi basit CRUD — özel bir mantık yok.

---

## .env.example

```bash
# Database
DATABASE_URL=postgresql://autoapply:secret@postgres:5432/autoapply

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=change-this-to-a-random-256-bit-string
ACCESS_TOKEN_EXPIRE_HOURS=24

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxx

# Adzuna
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Opsiyonel — varsayılan: gb
ADZUNA_COUNTRY=gb
```

---

## Implementasyon Sırası

```
1. Docker Compose + FastAPI skeleton          (çalışıyor mu?)
2. Alembic migrations                         (tablolar var mı?)
3. JWT auth endpoint'leri                     (login olabiliyor musun?)
4. CV upload + pdfplumber parse               (metin çıkıyor mu?)
5. LLM ile CV → JSON dönüşümü                (OpenRouter bağlantısı?)
6. BaseJobSource + RemoteOK                   (ilanlar geliyor mu?)
7. AdzunaSource                               (Adzuna da geliyor mu?)
8. Scout Celery task + Beat schedule          (5 dk'da bir çalışıyor mu?)
9. Manuel /api/scout/trigger endpoint         (UI'dan tetikleyebiliyor musun?)
10. Analyzer Agent (izole test)               (score çıkıyor mu?)
11. Writer Agent (izole test)                 (cover letter geliyor mu?)
12. Crew pipeline + kickoff_pipeline task     (tam akış çalışıyor mu?)
13. step_callback → AgentLog + Redis publish  (loglar DB'de var mı?)
14. WebSocket endpoint                        (frontend'de event görünüyor mu?)
15. Kalan CRUD endpoint'leri                  (Kanban, analytics)
```

Her adım kendi başına test edilebilir. Bir sonrakine geçmeden önceki adımın çalıştığını doğrula.

---

## Toplam Süre Tahmini

| Faz | Süre |
|---|---|
| Phase 1 — Foundation | ~2 gün |
| Phase 2 — CV Parsing | ~1 gün |
| Phase 3 — Scout | ~1 gün |
| Phase 4 — CrewAI Pipeline | ~2 gün |
| Phase 5 — WebSocket | ~0.5 gün |
| Phase 6 — API endpoint'leri | ~0.5 gün |
| **Toplam** | **~7 gün** |
