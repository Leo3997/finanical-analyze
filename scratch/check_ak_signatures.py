import akshare as ak
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def check_signatures():
    print("--- ak.futures_inventory_99 signature ---")
    try:
        import inspect
        print(inspect.signature(ak.futures_inventory_99))
    except Exception as e:
        print(f"Error getting signature for futures_inventory_99: {e}")

    print("\n--- ak.futures_inventory_em signature ---")
    try:
        import inspect
        print(inspect.signature(ak.futures_inventory_em))
    except Exception as e:
        print(f"Error getting signature for futures_inventory_em: {e}")

if __name__ == "__main__":
    check_signatures()
