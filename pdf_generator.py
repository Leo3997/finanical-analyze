import os
import re
import logging
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, PageBreak, Table, TableStyle, Image
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PDFGenerator:
    def __init__(self, output_dir="pdf_reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self._register_fonts()
        
        self.styles = self._create_styles()

    def _register_fonts(self):
        font_path = '/usr/share/fonts/gb/国标黑体.ttf'
        pdfmetrics.registerFont(TTFont('Noto', font_path))
        pdfmetrics.registerFont(TTFont('Noto-Bold', font_path))
        logger.info("字体注册成功")

    def _create_styles(self):
        styles = getSampleStyleSheet()
        
        styles.add(ParagraphStyle(
            name='MainTitle',
            fontName='Noto-Bold',
            fontSize=20,
            leading=28,
            alignment=TA_CENTER,
            textColor=HexColor('#2C3E50'),
            spaceAfter=15,
            spaceBefore=10
        ))
        
        styles.add(ParagraphStyle(
            name='ChapterTitle',
            fontName='Noto-Bold',
            fontSize=16,
            leading=22,
            textColor=HexColor('#2C3E50'),
            spaceBefore=15,
            spaceAfter=8
        ))
        
        styles.add(ParagraphStyle(
            name='SectionTitle',
            fontName='Noto-Bold',
            fontSize=13,
            leading=18,
            textColor=HexColor('#34495E'),
            spaceBefore=12,
            spaceAfter=6
        ))
        
        styles.add(ParagraphStyle(
            name='CustomBodyText',
            fontName='Noto',
            fontSize=11,
            leading=16,
            textColor=HexColor('#333333'),
            alignment=TA_LEFT,
            spaceAfter=6,
            spaceBefore=2
        ))
        
        styles.add(ParagraphStyle(
            name='CustomBoldText',
            fontName='Noto-Bold',
            fontSize=11,
            leading=16,
            textColor=HexColor('#000000'),
            spaceAfter=6,
            spaceBefore=2
        ))
        
        styles.add(ParagraphStyle(
            name='BulletPoint',
            fontName='Noto',
            fontSize=11,
            leading=16,
            textColor=HexColor('#333333'),
            leftIndent=20,
            firstLineIndent=-15,
            spaceAfter=4,
            spaceBefore=2
        ))
        
        styles.add(ParagraphStyle(
            name='Quote',
            fontName='Noto',
            fontSize=10,
            leading=14,
            textColor=HexColor('#666666'),
            leftIndent=25,
            rightIndent=10,
            spaceAfter=8,
            spaceBefore=4
        ))
        
        return styles

    def _clean_markdown(self, text):
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        return text

    def _parse_line(self, line):
        if line.startswith('#### '):
            return 'section_title', line[5:]
        elif line.startswith('### '):
            return 'section_title', line[4:]
        elif line.startswith('## '):
            return 'chapter_title', line[3:]
        elif line.startswith('# '):
            return 'main_title', line[2:]
        elif line.startswith('- ') or line.startswith('* '):
            return 'bullet', line[2:]
        elif line.startswith('> '):
            return 'quote', line[2:]
        elif line.startswith('---') or line.startswith('***') or line.startswith('___'):
            return 'hr', ''
        elif line.startswith('|') and line.endswith('|'):
            return 'table_row', line
        else:
            return 'text', line

    def _is_table_separator(self, line):
        return bool(re.match(r'^\|[\s\-:|]+\|$', line))

    def _parse_table_row(self, line):
        cells = line.split('|')
        cells = [c.strip() for c in cells[1:-1]]
        return cells

    def _is_table_row(self, line):
        return line.startswith('|') and line.endswith('|')

    def _format_text(self, text):
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&apos;', "'")
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&mdash;', '—')
        text = text.replace('&ndash;', '–')
        text = text.replace('&hellip;', '…')
        text = text.replace('&lsquo;', '\u2018')
        text = text.replace('&rsquo;', '\u2019')
        text = text.replace('&ldquo;', '\u201c')
        text = text.replace('&rdquo;', '\u201d')
        
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        
        parts = re.split(r'(\*\*.*?\*\*)', text)
        result = []
        for part in parts:
            if part.startswith('**') and part.endswith('**'):
                result.append(f'<b>{part[2:-2]}</b>')
            else:
                result.append(part)
        return ''.join(result)

    def _render_table(self, story, rows, page_width):
        if len(rows) < 2:
            return

        data = []
        header = self._parse_table_row(rows[0])
        data.append([Paragraph(self._format_text(h), self.styles['CustomBoldText']) for h in header])

        i = 1
        if i < len(rows) and self._is_table_separator(rows[i]):
            i += 1

        for row_idx in range(i, len(rows)):
            cells = self._parse_table_row(rows[row_idx])
            data.append([Paragraph(self._format_text(c), self.styles['CustomBodyText']) for c in cells])

        col_count = len(header)
        col_widths = [(page_width - 4*cm) / col_count] * col_count

        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Noto'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#F8F9FA'), HexColor('#FFFFFF')]),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, HexColor('#1A252F')),
        ]))

        story.append(Spacer(1, 8))
        story.append(table)
        story.append(Spacer(1, 10))

    def _embed_charts_section(self, story, charts):
        story.append(PageBreak())
        story.append(Paragraph('行情走势图表', self.styles['ChapterTitle']))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#CCCCCC'), spaceAfter=10))
        
        page_width = A4[0] - 4*cm
        img_width = page_width * 0.95

        img_charts = [(t, n, p, a) for t, n, p, a in charts if t != 'position_rank']
        for chart_type, name, path, analysis in img_charts:
            if path and isinstance(path, str) and os.path.exists(path):
                display_name = {
                    'performance': '品种涨跌幅排行',
                    'comparison': '核心品种价格走势对比',
                }.get(chart_type, name)
                
                story.append(Paragraph(display_name, self.styles['ChapterTitle']))
                
                if chart_type == 'performance':
                    story.append(Image(path, width=img_width, height=img_width * 0.45))
                elif chart_type == 'comparison':
                    story.append(Image(path, width=img_width, height=img_width * 0.38))
                
                story.append(Spacer(1, 10))
                story.append(PageBreak())

        position_data_list = [(t, n, p, a) for t, n, p, a in charts if t == 'position_rank']
        for _, _, position_data, _ in position_data_list:
            if not position_data or not isinstance(position_data, list):
                continue
            
            for item in position_data:
                variety = item.get('variety', '')
                contract = item.get('contract', '')
                date_str = item.get('date', '')
                
                story.append(Paragraph(f'{variety} · 主力持仓排名 ({contract})', self.styles['ChapterTitle']))
                story.append(Paragraph(f'数据日期: {date_str}', self.styles['Quote']))
                story.append(Spacer(1, 6))
                
                story.append(Paragraph('多头持仓 TOP20', self.styles['SectionTitle']))
                long_data = item.get('long', [])
                if long_data:
                    self._build_position_table(story, long_data, page_width)
                    story.append(Spacer(1, 6))
                else:
                    story.append(Paragraph('暂无数据', self.styles['Quote']))
                
                story.append(Paragraph('空头持仓 TOP20', self.styles['SectionTitle']))
                short_data = item.get('short', [])
                if short_data:
                    self._build_position_table(story, short_data, page_width)
                    story.append(Spacer(1, 6))
                else:
                    story.append(Paragraph('暂无数据', self.styles['Quote']))

                if long_data or short_data:
                    summary = self._compute_position_summary(variety, long_data, short_data)
                    if summary:
                        story.append(Spacer(1, 4))
                        story.append(Paragraph('主力动向', self.styles['SectionTitle']))
                        story.append(Paragraph(self._format_text(summary), self.styles['CustomBodyText']))
                
                story.append(PageBreak())

    def _build_position_table(self, story, members, page_width):
        header = [Paragraph('排名', self.styles['CustomBoldText']),
                  Paragraph('会员简称', self.styles['CustomBoldText']),
                  Paragraph('持仓量', self.styles['CustomBoldText']),
                  Paragraph('增减', self.styles['CustomBoldText'])]

        data = [header]
        for m in members:
            change_val = m.get('change', '0')
            data.append([
                Paragraph(str(m['rank']), self.styles['CustomBodyText']),
                Paragraph(str(m['name']), self.styles['CustomBodyText']),
                Paragraph(f"{m['volume']:,}", self.styles['CustomBodyText']),
                Paragraph(change_val, self.styles['CustomBodyText']),
            ])

        col_widths = [page_width * 0.12, page_width * 0.40, page_width * 0.28, page_width * 0.20]
        
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Noto'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#F8F9FA'), HexColor('#FFFFFF')]),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, HexColor('#1A252F')),
        ]))
        
        story.append(table)

    def _compute_position_summary(self, variety, long_data, short_data):
        def parse_change(c):
            try:
                return float(str(c).replace('+', ''))
            except (ValueError, TypeError):
                return 0

        long_total = sum(parse_change(m.get('change', '0')) for m in long_data)
        short_total = sum(parse_change(m.get('change', '0')) for m in short_data)
        net = long_total - short_total

        long_top_inc = sorted(long_data, key=lambda m: parse_change(m.get('change', '0')), reverse=True)[:2]
        short_top_inc = sorted(short_data, key=lambda m: parse_change(m.get('change', '0')), reverse=True)[:2]

        long_trend = "多头增仓" if long_total > 0 else "多头减仓"
        short_trend = "空头增仓" if short_total > 0 else "空头减仓"

        if net > 2000:
            direction = "偏多"
        elif net < -2000:
            direction = "偏空"
        else:
            direction = "多空博弈均衡"

        parts = [f"**{variety}**：{long_trend}{abs(long_total):.0f}手，{short_trend}{abs(short_total):.0f}手，整体{direction}。"]

        if long_top_inc:
            inc_names = [f"{m['name']}({m['change']})" for m in long_top_inc if parse_change(m.get('change', '0')) != 0]
            if inc_names:
                parts.append(f"多头领跑：{'、'.join(inc_names)}。")

        if short_top_inc:
            inc_names = [f"{m['name']}({m['change']})" for m in short_top_inc if parse_change(m.get('change', '0')) != 0]
            if inc_names:
                parts.append(f"空头领跑：{'、'.join(inc_names)}。")

        return ' '.join(parts)

    def markdown_to_pdf(self, markdown_content, title, filename=None, report_date=None, charts=None):
        if not filename:
            date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_title = "".join(c for c in title if c.isalnum() or c in ('-', '_', '【', '】'))
            filename = f"{safe_title}_{date_str}.pdf"
        
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2.5*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        story.append(Paragraph(title, self.styles['MainTitle']))
        
        if not report_date:
            report_date = datetime.now().strftime('%Y年%m月%d日')
        story.append(Paragraph(f"生成日期：{report_date}", self.styles['Quote']))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#CCCCCC'), spaceAfter=10))
        
        cleaned_content = self._clean_markdown(markdown_content)
        
        lines = cleaned_content.split('\n')
        
        page_width = A4[0] - 4*cm
        
        idx = 0
        while idx < len(lines):
            line = lines[idx].strip()
            
            if self._is_table_row(line):
                table_lines = [line]
                idx += 1
                while idx < len(lines) and self._is_table_row(lines[idx].strip()):
                    table_lines.append(lines[idx].strip())
                    idx += 1
                self._render_table(story, table_lines, page_width)
                continue
            
            line_type, content = self._parse_line(line)
            
            if not content.strip() and line_type != 'hr' and line_type != 'table_row':
                story.append(Spacer(1, 6))
                idx += 1
                continue
            
            if line_type == 'main_title':
                story.append(Paragraph(self._format_text(content), self.styles['MainTitle']))
            elif line_type == 'chapter_title':
                story.append(Paragraph(self._format_text(content), self.styles['ChapterTitle']))
            elif line_type == 'section_title':
                story.append(Paragraph(self._format_text(content), self.styles['SectionTitle']))
            elif line_type == 'bullet':
                bullet_text = f"• {self._format_text(content)}"
                story.append(Paragraph(bullet_text, self.styles['BulletPoint']))
            elif line_type == 'quote':
                story.append(Paragraph(self._format_text(content), self.styles['Quote']))
            elif line_type == 'hr':
                story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CCCCCC'), spaceAfter=8))
            elif line_type == 'table_row':
                pass
            elif line_type == 'text':
                if '**' in content:
                    formatted = self._format_text(content)
                    if content.startswith('**') and content.endswith('**'):
                        story.append(Paragraph(formatted, self.styles['CustomBoldText']))
                    else:
                        story.append(Paragraph(formatted, self.styles['CustomBodyText']))
                else:
                    story.append(Paragraph(self._format_text(content), self.styles['CustomBodyText']))
            
            idx += 1
        
        if charts:
            self._embed_charts_section(story, charts)
        
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CCCCCC'), spaceAfter=8))
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            fontName='Noto',
            fontSize=9,
            leading=13,
            textColor=HexColor('#999999'),
            alignment=TA_CENTER
        )
        story.append(Paragraph("免责声明：本报告仅供参考，不构成投资建议。投资有风险，入市需谨慎。", disclaimer_style))
        
        try:
            doc.build(story)
            logger.info(f"PDF生成成功: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"PDF生成失败: {e}")
            raise

if __name__ == "__main__":
    test_md = """# 测试报告

## 第一部分
这是**加粗文本**和普通文本的测试。

### 期现价差分析
下表展示了主要品种的期现价差情况：

| 品种 | 期货价 | 现货价 | 基差 | 基差率 |
|------|--------|--------|------|--------|
| 玉米 | 2600 | 2550 | +50 | +1.96% |
| 鸡蛋 | 4200 | 4350 | -150 | -3.45% |
| 豆粕 | 3100 | 3200 | -100 | -3.13% |
| 豆油 | 8500 | 8400 | +100 | +1.19% |

### 列表测试
- 项目1
- 项目2
- 项目3

> 这是一段引用文本

**核心观点**: 这是一个测试报告，用于验证PDF生成功能。
"""
    
    generator = PDFGenerator()
    filepath = generator.markdown_to_pdf(test_md, "测试报告")
    print(f"生成的PDF文件: {filepath}")
