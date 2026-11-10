import urllib.request
import json

def evaluate(amount, crypto_symbol):
    """
    Convert an amount of cryptocurrency to GBP using live market rates.

    Example decorators:
        @number value crypto_gbp(0.5, "BTC")
        @number value crypto_gbp(10, "ETH")
        @number value crypto_gbp(1000, "SOL")
    """
    try:
        amount = float(amount)
        symbol = str(crypto_symbol).upper().strip()

        # Coinbase public API — no key required
        url = f"https://api.coinbase.com/v2/exchange-rates?currency={symbol}"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Cortex-Engine)"}
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))

        gbp_rate = float(data["data"]["rates"]["GBP"])
        result = amount * gbp_rate
        return round(result, 2)

    except KeyError:
        return f"[Crypto Error: Unknown symbol '{symbol}' or no GBP rate available]"
    except Exception as e:
        return f"[Crypto Error: {e}]"