# Document reader for wgcassetguide.com: Docling + RapidOCR + field rules.
# Private service: no public domain; the API calls it over the private network.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/opt/models/hf \
    OMP_NUM_THREADS=2

RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY wgc_extract ./wgc_extract
COPY start.sh ./start.sh
# Download and load every model at BUILD time (layout, table, OCR), then
# forbid network model downloads at runtime.
RUN python -c "from wgc_extract.reader import warm_up; warm_up()" \
    && python -m wgc_extract.selftest
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1

RUN useradd --system --uid 10001 app && chown -R app /app /opt/models
USER app

EXPOSE 8080
CMD ["./start.sh"]
