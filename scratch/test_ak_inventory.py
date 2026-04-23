import akshare as ak
import pandas as pd

def test_inventory():
    symbols = ["玉米", "豆粕", "豆一", "大豆"]
    for s in symbols:
        print(f"\n--- Testing {s} (99qh) ---")
        try:
            df = ak.futures_inventory_99(symbol=s)
            if df is not None and not df.empty:
                print(f"Success for {s}:")
                print(df.tail(3))
            else:
                print(f"No data for {s} via 99qh")
        except Exception as e:
            print(f"Error for {s} (99qh): {e}")

    for s in symbols:
        print(f"\n--- Testing {s} (EM) ---")
        try:
            exchange = "大连商品交易所"
            df = ak.futures_inventory_em(exchange=exchange, symbol=s)
            if df is not None and not df.empty:
                print(f"Success for {s} (EM):")
                print(df.tail(3))
            else:
                print(f"No data for {s} (EM)")
        except Exception as e:
            print(f"Error for {s} (EM): {e}")

if __name__ == "__main__":
    test_inventory()
