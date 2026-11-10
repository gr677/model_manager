import os

try:
    import certifi
    os.environ["SSL_CERT_FILE"] = certifi.where()
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
except ImportError:
    pass

import requests


def evaluate(ticker, shares, from_currency):
    """
    Fetch a stock price from Yahoo Finance and convert to GBP.

    Parameters:
        ticker        : Stock symbol (e.g. "TSLA", "SPCX", "LLOY.L", "SAP.DE")
        shares        : Number of shares held (float)
        from_currency : Currency the stock trades in (e.g. "USD", "EUR", "GBP")

    Examples:
        @number value asset("TSLA", 10, "USD")
        @number value asset("SPCX", 50, "USD")
        @number value asset("SAP.DE", 5, "EUR")
        @number value asset("LLOY.L", 200, "GBP")
    """
    ticker = str(ticker).upper().strip()
    shares = float(shares)
    from_curr = str(from_currency).upper().strip()

    # 1. Fetch live price from Yahoo Finance (price is in the stock's native currency)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    r = requests.get(
        url,
        params={"interval": "1m", "range": "1d"},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=15,
    )
    r.raise_for_status()
    meta = r.json()["chart"]["result"][0]["meta"]
    price_native = float(
        meta.get("regularMarketPrice")
        or meta.get("previousClose")
        or meta["chartPreviousClose"]
    )

    # 2. If already GBP, no conversion needed
    if from_curr == "GBP":
        return round(price_native * shares, 2)

    if from_curr == "GBX":
        return round((price_native / 100) * shares, 2)


    # 3. Convert from source currency to GBP
    fx_url = f"https://api.frankfurter.app/latest?from={from_curr}&to=GBP"
    fx = requests.get(fx_url, timeout=10).json()["rates"]["GBP"]

    return round(price_native * fx * shares, 2)