#!/bin/bash
source ~/miniconda3/etc/profile.d/conda.sh 2>/dev/null
conda activate base 2>/dev/null
cd /home/greatwall/桌面/期货看版/期货看板2/期货看板new
python main.py
echo ""
echo "===== 按回车键关闭 ====="
read
