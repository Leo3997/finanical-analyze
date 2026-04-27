from app import app, fetcher
from flask import jsonify

# 模拟 get_intraday 函数
with app.test_request_context('/api/intraday?symbol=豆粕&period=daily'):
    from flask import request
    symbol = request.args.get('symbol', '豆粕')
    period = request.args.get('period', '1')
    
    print(f'symbol={symbol}, period={period}')
    print(f'period == "daily": {period == "daily"}')
    
    if period == 'daily':
        print('进入日 K 分支')
        df = fetcher.get_futures_history(symbol, days=10)
        print(f'df is not None: {df is not None}')
        print(f'not df.empty: {not df.empty if df is not None else "N/A"}')
    else:
        print('进入分时分支')
        df = fetcher.get_futures_intraday(symbol)
        print(f'df is not None: {df is not None}')
