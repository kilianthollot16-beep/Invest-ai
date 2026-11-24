"""Métriques quantitatives calculées uniquement à partir de séries de prix réelles."""
import numpy as np
import pandas as pd

TD = 252  # jours de bourse / an

def returns(prices: pd.Series) -> pd.Series:
    return prices.pct_change().dropna()

def cagr(prices: pd.Series) -> float:
    years = (prices.index[-1] - prices.index[0]).days / 365.25
    if years <= 0: return float("nan")
    return float((prices.iloc[-1] / prices.iloc[0]) ** (1 / years) - 1)

def volatility(prices: pd.Series) -> float:
    return float(returns(prices).std() * np.sqrt(TD))

def max_drawdown(prices: pd.Series) -> float:
    peak = prices.cummax()
    return float((prices / peak - 1).min())

def sharpe(prices: pd.Series, rf: float = 0.02) -> float:
    v = volatility(prices)
    return float((cagr(prices) - rf) / v) if v > 0 else float("nan")

def sortino(prices: pd.Series, rf: float = 0.02) -> float:
    r = returns(prices)
    downside = r[r < 0].std() * np.sqrt(TD)
    return float((cagr(prices) - rf) / downside) if downside > 0 else float("nan")

def trailing_return(prices: pd.Series, days: int) -> float:
    if len(prices) <= days: return float("nan")
    return float(prices.iloc[-1] / prices.iloc[-1 - days] - 1)

def drawdown_now(prices: pd.Series) -> float:
    return float(prices.iloc[-1] / prices.cummax().iloc[-1] - 1)

def correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df.pct_change().dropna().corr()

def all_metrics(prices: pd.Series) -> dict:
    p = prices.dropna()
    return {
        "history_years": round((p.index[-1] - p.index[0]).days / 365.25, 2),
        "cagr": cagr(p), "vol": volatility(p), "max_dd": max_drawdown(p),
        "sharpe": sharpe(p), "sortino": sortino(p),
        "ret_1m": trailing_return(p, 21), "ret_1y": trailing_return(p, TD),
        "dd_now": drawdown_now(p),
        "last_price": float(p.iloc[-1]), "last_date": str(p.index[-1].date()),
    }
