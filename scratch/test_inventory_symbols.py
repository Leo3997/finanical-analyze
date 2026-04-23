import akshare as ak
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def test_inventory_symbols():
    # Test symbols for Corn
    corn_symbols = ["玉米", "C", "C0", "大连玉米"]
    for s in corn_symbols:
        print(f"\n--- Testing 99qh: {s} ---")
        try:
            df = ak.futures_inventory_99(symbol=s)
            if df is not None and not df.empty:
                print(f"Success for 99qh {s}! Rows: {len(df)}")
            else:
                print(f"Empty for 99qh {s}")
        except Exception as e:
            print(f"Error for 99qh {s}: {e}")

    # Test symbols for EM
    em_symbols = ["玉米", "黄大豆1号", "豆粕"]
    for s in em_symbols:
        print(f"\n--- Testing EM: {s} ---")
        try:
            df = ak.futures_inventory_em(symbol=s)
            if df is not None and not df.empty:
                print(f"Success for EM {s}! Rows: {len(df)}")
            else:
                print(f"Empty for EM {s}")
        except Exception as e:
            print(f"Error for EM {s}: {e}")

if __name__ == "__main__":
    test_inventory_symbols()
