import pandas as pd

xlsx_path = r'd:\AAA大学\竞赛\安全年会\程序\数据\动态空间数据指标总览.xlsx'
xls = pd.ExcelFile(xlsx_path)

for sheet_name in xls.sheet_names:
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
    print(f"Sheet: {sheet_name}")
    print(f"总行数: {len(df)}")
    print(f"列名: {list(df.columns)}")
    print("\n全部数据（63行）:")
    for idx, row in df.iterrows():
        print(f"{idx+1:2d}. 监测指标: {str(row['监测指标']):<6} 空间位置: {str(row['空间位置']):<12} 传感器编号: {str(row['传感器编号']):<6}")
