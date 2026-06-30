# store_address_search

本目录包含 Python 脚本与浏览器 userscript。项目总览见上级目录 **[README.md](../README.md)**，详细步骤见 **[使用说明.md](../使用说明.md)**。

---

## 脚本说明

| 文件 | 用途 |
|------|------|
| `merge_scraped.py` | **主程序**：读取 JSON → 去重 → 更新 `地址表.xlsx` |
| `search_stores.py` | 可选：Google Places API 批量搜索 |
| `userscripts/google-maps-export.user.js` | Tampermonkey 导出脚本 |
| `userscripts/console-fallback.js` | F12 控制台备用导出脚本 |

---

## 常用命令

```powershell
# 合并 JSON 到 Excel（默认更新 ../地址表.xlsx）
python merge_scraped.py

# API 批量搜索（需配置 .env）
python search_stores.py -i "..\地址表.xlsx" -o "..\地址表_API结果.xlsx"
```

---

## API 方案配置

1. [Google Cloud Console](https://console.cloud.google.com/) 启用 **Places API (New)**
2. `copy .env.example .env` 并填入 `GOOGLE_PLACES_API_KEY`
3. 运行 `search_stores.py`

API 按请求计费，大批量前请查看 [定价说明](https://developers.google.com/maps/billing-and-pricing/pricing)。
