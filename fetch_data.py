#!/usr/bin/env python3
"""Récupère les cours (Yahoo via yfinance, gratuit, non officiel), calcule métriques/scores,
écrit docs/data.json et journalise les recommandations. Lancé chaque jour par GitHub Actions."""
import json, sys, datetime as dt, pathlib
import pandas as pd
from engine import metrics as M, scoring as S

ROOT = pathlib.Path(__file__).parent

def load_prices_yf(tickers, years=15):
    import yfinance as yf  # absent en local sans pip ; installé par le workflow
    df = yf.download(tickers, period=f"{years}y", auto_adjust=True, progress=False, group_by="ticker")
    out = {}
    for t in tickers:
        try:
            s = df[t]["Close"].dropna()
            if len(s) > 30: out[t] = s
        except Exception:
            pass
    return out

def build(prices, wl, portfolio, now=None, synthetic=False):
    now = now or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    held = {p["isin"] for p in portfolio.get("positions", [])}
    ceiling = portfolio.get("settings", {}).get("risk_ceiling", 65)
    assets, missing = [], []
    for a in wl["assets"]:
        s = prices.get(a["ticker"])
        if s is None: missing.append(a["ticker"]); continue
        m = M.all_metrics(s); sc = S.score_asset(m, a["ter"])
        rec, why = S.recommend(sc, a["isin"] in held, ceiling)
        assets.append({**a, "metrics": m, "scores": sc, "recommendation": rec, "why": why})
    bench = []
    for b in wl["benchmarks"]:
        s = prices.get(b["ticker"])
        if s is None: missing.append(b["ticker"]); continue
        m = M.all_metrics(s)
        bench.append({"name": b["name"], "ticker": b["ticker"], "last": m["last_price"],
                      "date": m["last_date"], "ret_1m": m["ret_1m"], "ret_1y": m["ret_1y"],
                      "dd_now": m["dd_now"], "vol": m["vol"]})
    alerts = []
    for x in bench + [{"name": a["name"], **a["metrics"]} for a in assets]:
        if x.get("dd_now") is not None and x["dd_now"] < -0.10:
            alerts.append({"level": "info", "text": f"{x['name']} est à {x['dd_now']:.1%} de son plus haut."})
        if x.get("ret_1m") is not None and abs(x["ret_1m"]) > 0.08:
            alerts.append({"level": "warn", "text": f"{x['name']} : mouvement de {x['ret_1m']:+.1%} sur 1 mois."})
    corr = None
    ids = [a["ticker"] for a in assets] + [b["ticker"] for b in bench]
    if len([i for i in ids if i in prices]) >= 2:
        df = pd.concat({i: prices[i] for i in ids if i in prices}, axis=1).dropna()
        if len(df) > 60: corr = M.correlation_matrix(df).round(2).to_dict()
    verdict = "Aujourd'hui, la meilleure décision est de ne rien changer à ton plan régulier." \
        if not any(a["recommendation"] in ("ACHETER","RENFORCER") for a in assets) else None
    return {"generated_at": now, "synthetic": synthetic, "assets": assets, "benchmarks": bench,
            "alerts": alerts, "correlation": corr, "missing": missing, "verdict": verdict,
            "disclaimer": "Outil d'aide à la décision, pas un conseil en investissement. Données Yahoo non officielles."}

def log_recos(out, path):
    path.parent.mkdir(exist_ok=True)
    with path.open("a") as f:
        for a in out["assets"]:
            f.write(json.dumps({"ts": out["generated_at"], "isin": a["isin"], "reco": a["recommendation"],
                                "price": a["metrics"]["last_price"], "price_date": a["metrics"]["last_date"],
                                "scores": a["scores"]}, ensure_ascii=False) + "\n")

def main():
    wl = json.loads((ROOT / "data/watchlist.json").read_text())
    pf = json.loads((ROOT / "data/portfolio.json").read_text())
    tickers = [a["ticker"] for a in wl["assets"]] + [b["ticker"] for b in wl["benchmarks"]]
    prices = load_prices_yf(tickers)
    out = build(prices, wl, pf)
    (ROOT / "docs/data.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, default=float))
    log_recos(out, ROOT / "data/reco_log.jsonl")
    print(f"OK {len(out['assets'])} actifs, {len(out['benchmarks'])} indices, manquants: {out['missing']}")

if __name__ == "__main__":
    main()
