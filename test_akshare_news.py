import akshare as ak
import pandas as pd

def test_news():
    print("Testing ak.news_commodity_zh_sina()...")
    try:
        df = ak.news_commodity_zh_sina()
        print(df.head())
    except Exception as e:
        print(f"Error: {e}")

    print("\nTesting ak.futures_news_shmet()...")
    try:
        df = ak.futures_news_shmet()
        print(df.head())
    except Exception as e:
        print(f"Error: {e}")

    print("\nTesting ak.news_cctv()...")
    try:
        df = ak.news_cctv()
        print(df.head())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_news()
