from app import app
from flask import request

with app.test_request_context('/api/intraday?symbol=豆粕&period=daily'):
    symbol = request.args.get('symbol', '豆粕')
    period = request.args.get('period', '1')
    print(f'symbol: "{symbol}"')
    print(f'period: "{period}"')
    print(f'period == "daily": {period == "daily"}')
    print(f'period type: {type(period)}')
    print(f'period repr: {repr(period)}')
