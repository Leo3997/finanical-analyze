from datetime import datetime
import requests
import json
import re
from bs4 import BeautifulSoup
import akshare as ak
import pandas as pd


class SpotPriceScraper:
    """现货价格采集器"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def get_weather_data(self, city='锦州'):
        """
        获取天气数据
        使用 Open-Meteo 免费天气 API
        """
        try:
            print(f"正在获取 {city} 天气数据...")
            
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                'latitude': 41.11,  # 锦州纬度
                'longitude': 121.15,  # 锦州经度
                'current': 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
                'daily': 'temperature_2m_max,temperature_2m_min,weather_code',
                'timezone': 'Asia/Shanghai',
                'forecast_days': 1
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                current = data.get('current', {})
                daily = data.get('daily', {})
                
                weather_code = current.get('weather_code', -1)
                weather_desc = self._parse_weather_code(weather_code)
                
                temp_max = daily.get('temperature_2m_max', [''])[0]
                temp_min = daily.get('temperature_2m_min', [''])[0]
                
                return {
                    'city': city,
                    'weather': weather_desc,
                    'temperature': f"{current.get('temperature_2m', '未知')}°C",
                    'temperature_range': f"{int(temp_max)}°-{int(temp_min)}°",
                    'date': datetime.now().strftime('%Y年%m月%d日')
                }
        except Exception as e:
            print(f"天气数据获取失败: {e}")
        
        return None
    
    def _parse_weather_code(self, code):
        """解析天气代码"""
        weather_map = {
            0: '晴',
            1: '晴间多云',
            2: '多云',
            3: '阴',
            45: '雾',
            48: '雾凇',
            51: '小毛毛雨',
            53: '中毛毛雨',
            55: '大毛毛雨',
            61: '小雨',
            63: '中雨',
            65: '大雨',
            71: '小雪',
            73: '中雪',
            75: '大雪',
            80: '小阵雨',
            81: '中阵雨',
            82: '大阵雨',
            95: '雷暴',
            96: '雷暴伴小冰雹',
            99: '雷暴伴大冰雹'
        }
        return weather_map.get(code, '未知')
    
    def get_corn_spot_price_from_akshare(self):
        """
        使用 akshare 获取玉米现货价格
        """
        try:
            print("正在使用 akshare 获取玉米现货价格...")
            
            df = ak.spot_corn_price_soozhu()
            
            if df is not None and not df.empty:
                print(f"成功获取 {len(df)} 条玉米现货价格数据")
                return df
        except Exception as e:
            print(f"akshare 获取失败: {e}")
        
        return None
    
    def get_corn_futures_spot_price(self):
        """
        获取玉米期货现货价格对比
        """
        try:
            print("正在获取玉米期货现货价格对比...")
            
            df = ak.futures_spot_price()
            
            if df is not None and not df.empty:
                corn_data = df[df['symbol'] == 'C']
                if not corn_data.empty:
                    print(f"成功获取玉米期货现货价格数据")
                    return corn_data
        except Exception as e:
            print(f"期货现货价格对比获取失败: {e}")
        
        return None
    
    def get_corn_inventory_data(self):
        """
        获取玉米库存数据
        """
        try:
            print("正在获取玉米库存数据...")
            
            df = ak.futures_inventory_em(symbol='玉米')
            
            if df is not None and not df.empty:
                print(f"成功获取 {len(df)} 条库存数据")
                return df
        except Exception as e:
            print(f"库存数据获取失败: {e}")
        
        return None
    
    def format_push_message(self, weather_data, spot_data, futures_spot_data, inventory_data):
        """
        格式化推送信息
        """
        print("\n正在生成推送信息...")
        
        message_parts = []
        
        if weather_data:
            weather_msg = f"{weather_data['date']} {weather_data['city']}天气{weather_data['weather']}，{weather_data['temperature_range']}。"
            message_parts.append(weather_msg)
        
        message_parts.append("锦州港玉米价格信息")
        message_parts.append("")
        
        if spot_data is not None and not spot_data.empty:
            latest_price = spot_data.iloc[-1]
            message_parts.append(f"最新玉米现货价格：{latest_price['价格']}元/吨（{latest_price['日期']}）")
            message_parts.append("")
            
            if len(spot_data) >= 2:
                prev_price = spot_data.iloc[-2]
                price_change = float(latest_price['价格']) - float(prev_price['价格'])
                if price_change > 0:
                    message_parts.append(f"较前一日上涨{price_change:.2f}元/吨")
                elif price_change < 0:
                    message_parts.append(f"较前一日下跌{abs(price_change):.2f}元/吨")
                else:
                    message_parts.append("较前一日价格持平")
                message_parts.append("")
        
        if futures_spot_data is not None and not futures_spot_data.empty:
            message_parts.append("期货现货价格对比：")
            for idx, row in futures_spot_data.head(3).iterrows():
                info = f"日期：{row['date']}，现货价格：{row['spot_price']}，主力合约价格：{row['dominant_contract_price']}"
                message_parts.append(info)
            message_parts.append("")
        
        if inventory_data is not None and not inventory_data.empty:
            latest_inv = inventory_data.iloc[-1]
            message_parts.append(f"最新玉米库存数据：{latest_inv.get('库存', '未知')}（{latest_inv.get('日期', '未知')}）")
            message_parts.append("")
        
        message_parts.append("以实际成交价格为准。")
        
        return "\n".join(message_parts)
    
    def run(self):
        """
        运行采集任务
        """
        print("=" * 60)
        print("玉米现货价格自动化采集系统")
        print(f"采集时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()
        
        weather_data = self.get_weather_data()
        spot_data = self.get_corn_spot_price_from_akshare()
        futures_spot_data = self.get_corn_futures_spot_price()
        inventory_data = self.get_corn_inventory_data()
        
        print("\n" + "=" * 60)
        print("采集结果汇总")
        print("=" * 60)
        
        if weather_data:
            print(f"\n天气数据: {weather_data}")
        else:
            print("\n天气数据获取失败")
        
        if spot_data is not None:
            print(f"\n现货价格数据: {len(spot_data)} 条")
            print(spot_data.tail(5))
        else:
            print("\n现货价格数据获取失败")
        
        if futures_spot_data is not None:
            print(f"\n期货现货价格对比: {len(futures_spot_data)} 条")
            print(futures_spot_data.head())
        else:
            print("\n期货现货价格对比获取失败")
        
        if inventory_data is not None:
            print(f"\n库存数据: {len(inventory_data)} 条")
            print(inventory_data.tail(5))
        else:
            print("\n库存数据获取失败")
        
        print("\n" + "=" * 60)
        print("格式化推送信息")
        print("=" * 60)
        
        push_message = self.format_push_message(weather_data, spot_data, futures_spot_data, inventory_data)
        print("\n" + push_message)
        
        return {
            'weather': weather_data,
            'spot_price': spot_data,
            'futures_spot': futures_spot_data,
            'inventory': inventory_data,
            'push_message': push_message
        }


if __name__ == "__main__":
    scraper = SpotPriceScraper()
    result = scraper.run()
    
    print("\n" + "=" * 60)
    print("采集完成！")
    print("=" * 60)
