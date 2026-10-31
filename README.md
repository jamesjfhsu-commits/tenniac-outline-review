# 訪綱共編頁

在專案根目錄重新產生資料：

```sh
python -X utf8 _review_site/tools/build_outline.py episodes/EPxxx_泳網直前_青年百億/訪綱_修訂草稿.md
```

在 `_review_site` 目錄預覽：

```sh
python -m http.server 8000
```

用瀏覽器開啟本機 8000 埠的首頁。頁面不會自動傳送回饋；讀者須使用自己的郵件程式寄出。

若需要重新產生吉祥物圖片，使用已核對版面的貼圖 PDF 執行：

```sh
python -X utf8 -B _review_site/tools/extract_stickers.py "path/to/sticker-sheet.pdf" _review_site/assets/stickers
```
