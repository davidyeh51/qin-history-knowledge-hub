# 秦朝歷史知識庫（Qin Dynasty History Knowledge Hub）

> 對象：自己與團隊成員 ｜ 架構：麥肯錫結構化 10 分鐘簡報 ✕ 原創 SVG 圖解 ✕ 全域關鍵字檢索 ✕ 可擴充多書入口 ✕ Supabase BaaS (RLS) ✕ GitHub Pages

## 核心特色

1. **首頁可擴充書庫架構 (`data/library.json`)**：
   - 首頁直接連結各本書籍／專題的獨立簡報，並已預留《睡虎地秦墓竹簡》《里耶秦簡》《商君書》《史記·秦始皇本紀》等擴充席位。
   - 新增書籍僅需 3 個步驟（詳見 [`docs/EXPANSION.md`](docs/EXPANSION.md)），無須修改首頁主程式。
2. **全域關鍵字即時檢索 (`Ctrl + K`)**：
   - 由 `data/search-index.json` 驅動，輸入任何史實人物、出土簡牘或制度詞彙，即可跨書搜尋並精準跳轉至目標簡報頁碼（`#slide-N`）。
3. **麥肯錫 10 分鐘精華簡報 (`decks/qinhan-lectures-nie.html`)**：
   - 嚴格忠於來源文稿（秦暉著、聶輝華解讀《秦漢史講義》），零幻覺。
   - 15 頁 16:9 投影片（金字塔行動結論標題、原創向量 SVG 圖表、三段式講者備忘稿 `N`、10 分鐘計時器 `T`、縮圖總覽與頁內檢索 `G`）。
   - 重新繪製首頁光橋視覺與典藏封面插畫（儲存於 `assets/images/`）。
4. **Supabase 雲端團隊共學 + RLS 行級安全 (`supabase/schema.sql`)**：
   - 前端僅使用公開 `publishable key`（零私鑰外洩風險）。
   - 透過 `qin_team_notes` 與 `qin_action_checkins` 實現團隊共學筆記與讀史行動打卡同步；未登入時自動降級至本機 `localStorage` 暫存。

## 專案結構

```text
qin-history-knowledge-hub/
├── index.html                        # 知識庫門戶首頁（搜尋、書庫、委託-代理診斷器、團隊共學）
├── decks/
│   └── qinhan-lectures-nie.html      # 《秦漢史講義》15 頁麥肯錫 10 分鐘完整簡報
├── assets/
│   ├── css/                          # portal.css, deck.css
│   ├── js/                           # portal.js, deck.js, supabase-sync.js
│   └── images/                       # 重新繪製之首頁主視覺與書籍封面插畫
├── data/
│   ├── library.json                  # 書目註冊檔與預留擴充槽位
│   └── search-index.json             # 跨書全域關鍵字搜尋索引
├── docs/
│   └── EXPANSION.md                  # 3 步驟擴充維護手冊
└── supabase/
    └── schema.sql                    # PostgreSQL 資料表與 RLS 安全策略
```
