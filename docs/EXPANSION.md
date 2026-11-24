# 秦朝歷史知識庫 — 擴充與維護標準手冊 (EXPANSION GUIDE)

本知識庫採用**資料驅動（Data-Driven）＋獨立簡報模組**架構。自己或團隊成員未來新增任何秦朝史學著作、出土簡牘專題或制度分析簡報時，只需依照以下 **3 個標準步驟**即可完成整合，無須修改首頁主程式。

---

## 步驟一：建立新書／新資料的麥肯錫 10 分鐘簡報

1. 複製 `decks/qinhan-lectures-nie.html` 作為範本，於 `decks/` 目錄下建立新檔（例如：`decks/sleeping-tiger-qin-slips.html`）。
2. 遵循**麥肯錫顧問風格四大守則**：
   - **完全忠於來源**：所有史實、出土文獻與數據僅取自來源文本；來源未載明確標註「原文未載」，嚴禁憑記憶臆測補充。
   - **金字塔行動標題（Action Title）**：每頁標題必須是一句完整結論，而非主題名詞。
   - **圖表優先於文字**：核心邏輯使用原創內嵌 **SVG 向量圖解**；書籍封面與主視覺圖片必須重新繪製並儲存於 `assets/images/`，避免外部熱連結或版權風險。
   - **三段式講者備忘稿（Speaker Notes）**：每頁於 `data-note-*` 屬性填寫 `① 本頁結論`、`② 補充說明`、`③ 下一頁轉場`，全長建議 12–16 頁（每頁 40–50 秒，共約 10 分鐘）。

---

## 步驟二：註冊至首頁書庫 (`data/library.json`)

在 `data/library.json` 的 `books` 陣列中新增條目，或將既有 `planned` 預留書目的 `status` 更新為 `"ready"`：

```json
{
  "id": "qin-002",
  "slug": "shuihudi-qin-slips",
  "code": "QIN-02",
  "title": "《睡虎地秦墓竹簡》專題",
  "subtitle": "基層秦吏的法律日常與行政運作實態",
  "author": "整理者／講者姓名",
  "sourceMeta": "Obsidian 史學庫來源資訊",
  "category": "archaeology",
  "categoryLabel": "出土簡牘與基層實證",
  "status": "ready",
  "badge": "完整簡報",
  "readingTime": "10 分鐘導讀",
  "slidesCount": 14,
  "svgCount": 10,
  "coverImage": "assets/images/book-shuihudi-cover.png",
  "deckUrl": "decks/shuihudi-qin-slips.html",
  "publishedDate": "2026-12-01",
  "coreThesis": "一句話核心主張...",
  "keyPillars": [],
  "teamActions": [],
  "modules": []
}
```

首頁 `index.html` 會自動讀取 `library.json` 並生成對應書籍卡片、分類篩選統計與團隊行動清單。

---

## 步驟三：同步寫入全域搜尋索引 (`data/search-index.json`)

為讓首頁 `Ctrl+K` 全域搜尋能夠精準定位到新簡報的每一頁投影片，在 `data/search-index.json` 追加每頁條目：

```json
{
  "id": "qin02-s01",
  "bookSlug": "shuihudi-qin-slips",
  "bookTitle": "《睡虎地秦墓竹簡》專題",
  "author": "整理者",
  "slideNo": 1,
  "module": "封面與核心主張",
  "actionTitle": "本頁麥肯錫行動結論標題",
  "summary": "摘要、出土簡牘證據與關鍵人物...",
  "keywords": ["睡虎地秦簡", "關鍵字2"],
  "url": "decks/shuihudi-qin-slips.html#slide-1"
}
```

---

## Supabase 團隊共學雲端同步說明

- 本站點透過 `assets/js/supabase-sync.js` 串接 Supabase（前端僅使用公開 `publishable / anon key`，嚴禁置入 `service_role key`）。
- 資料表定義與 RLS 行級安全策略位於 `supabase/schema.sql`（包含 `qin_team_notes` 與 `qin_action_checkins`）。
- 新書上架後，只要 `book_slug` 與 `library.json` 一致，團隊共學筆記與行動打卡即自動支援新書歸檔與雲端同步，無需修改資料庫結構。
