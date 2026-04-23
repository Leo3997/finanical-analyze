import akshare as ak
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def test_99qh():
    symbols = ["豆一", "玉米", "豆粕", "白糖", "郑棉"]
    for s in symbols:
        print(f"\n--- Testing 99qh: {s} ---")
        try:
            df = ak.futures_inventory_99(symbol=s)
            if df is not None and not df.empty:
                print(f"Success! Rows: {len(df)}")
                print(df.tail(2))
            else:
                print(f"Failed: Empty or None")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_99qh()
