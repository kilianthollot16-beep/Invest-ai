import numpy as np, pandas as pd, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from engine import metrics as M, scoring as S, simulate as SIM

def series(ret_annual, vol, years=10, seed=1):
    rng = np.random.default_rng(seed)
    n = int(years * 252)
    idx = pd.bdate_range(end="2026-11-20", periods=n)
    r = rng.normal(ret_annual / 252, vol / np.sqrt(252), n)
    return pd.Series(100 * np.cumprod(1 + r), index=idx)

def test_constant_growth():
    idx = pd.bdate_range(end="2026-11-20", periods=2521)
    p = pd.Series(100 * (1.07 ** (np.arange(2521) / 252)), index=idx)
    assert abs(M.cagr(p) - 0.07) < 0.005
    assert M.max_drawdown(p) == 0

def test_drawdown():
    idx = pd.bdate_range("2020-01-01", periods=4)
    p = pd.Series([100, 120, 60, 90.0], index=idx)
    assert abs(M.max_drawdown(p) + 0.5) < 1e-9

def test_dca_zero_return_no_tax():
    r = SIM.simulate_dca(200, 10, 0.0, ter=0.0, inflation=0.0, tax_rate=0.3)
    assert abs(r["gross"] - 24000) < 1e-6 and r["gain"] == 0

def test_dca_known_value():
    i = 1.07 ** (1/12) - 1
    expected = 200 * ((1 + i) ** 120 - 1) / i
    r = SIM.simulate_dca(200, 10, 0.07, ter=0.0, inflation=0.0, tax_rate=0.0)
    assert abs(r["gross"] - expected) < 1e-6

def test_short_history_waits():
    m = M.all_metrics(series(0.08, 0.15, years=1))
    s = S.score_asset(m, 0.002)
    rec, _ = S.recommend(s, held=False)
    assert rec == "ATTENDRE"

def test_risky_avoided():
    m = M.all_metrics(series(0.10, 0.70, years=10))
    s = S.score_asset(m, 0.002)
    rec, _ = S.recommend(s, held=False)
    assert rec in ("ÉVITER", "ALLÉGER")

def test_dca_vs_lump_runs():
    r = SIM.dca_vs_lump(series(0.08, 0.15, years=12), 6000, 12)
    assert r["windows"] > 0 and 0 <= r["dca_better_share"] <= 1

if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"): f(); print("OK", k)
