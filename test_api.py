#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试 API 的脚本"""

from app import app, fetcher

# 使用 Flask 测试客户端
with app.test_client() as client:
    print("=" * 60)
    print("测试 1: 获取日 K 数据 (period=daily)")
    print("=" * 60)
    rv = client.get('/api/intraday?symbol=豆粕&period=daily')
    print(f'Status Code: {rv.status_code}')
    data = rv.get_json()
    print(f'Response: {data}')
    if data.get('data'):
        print(f'\n第一条数据：{data["data"][0]}')
        print(f'数据量：{len(data["data"])}')
    
    print("\n" + "=" * 60)
    print("测试 2: 获取分时数据 (不传 period)")
    print("=" * 60)
    rv2 = client.get('/api/intraday?symbol=豆粕')
    print(f'Status Code: {rv2.status_code}')
    data2 = rv2.get_json()
    print(f'Response: {data2}')
    if data2.get('data'):
        print(f'\n第一条数据：{data2["data"][0]}')
        print(f'数据量：{len(data2["data"])}')
    
    print("\n" + "=" * 60)
    print("测试 3: 直接调用 fetcher.get_futures_history")
    print("=" * 60)
    df = fetcher.get_futures_history('豆粕', days=10)
    if df is not None and not df.empty:
        print(f'获取成功！数据量：{len(df)}')
        print(df.tail(3))
    else:
        print('获取失败，返回 None 或空 DataFrame')
