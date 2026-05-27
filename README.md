# ⛏ 6b6t Mapart Archive

> A community gallery and archive for Minecraft map art from **6b6t.org**

Live demo: Deploy to GitHub Pages and visit your repo URL.

---

## 🗂 Folder Structure

```
6b6t-mapart/
├── index.html              ← Main site (all pages in one file)
├── css/
│   └── style.css           ← All styles
├── js/
│   └── app.js              ← Gallery engine, upload, modal, filters
├── data/
│   └── maparts.json        ← Master data file — edit this to add entries!
├── images/
│   └── maparts/            ← PNG files for each mapart
└── README.md
```

---

## 🚀 Hosting on GitHub Pages

1. Fork or clone this repo
2. Push to GitHub
3. Go to **Settings → Pages → Source → main branch**
4. Your site is live at `https://yourusername.github.io/6b6t-mapart/`

---

## ➕ Adding Maarts (Two Ways)

### Option A — Upload via the Website (Easy)
1. Open the site, click **Upload** in the nav
2. Drop your PNG, fill in details, hit **Publish**
3. Mapart appears instantly (stored in your browser)

> ⚠️ Browser-uploaded maparts are stored in `localStorage` and only visible to **you**.
> For everyone to see them, use Option B.

### Option B — Edit JSON (Permanent, for everyone)
1. Open `data/maparts.json`
2. Add an entry to the `maparts` array:

```json
{
  "id": "ma_009",
  "title": "My Cool Build",
  "image": "images/maparts/my_cool_build.png",
  "width": 8,
  "height": 6,
  "creator": "YourIGN",
  "uploadDate": "2024-08-01",
  "description": "Description of the build.",
  "tags": ["tag1", "tag2"],
  "totalMaps": 48,
  "views": 0,
  "featured": false
}
```

3. Copy your PNG to `images/maparts/my_cool_build.png`
4. Commit and push → automatically live on GitHub Pages!

---

## 🎨 Design Features

- **Dark Minecraft × modern gallery** aesthetic
- **VT323** pixel font + **Rajdhani** UI font + **Space Mono** monospace
- Dynamic card sizing — larger maparts appear bigger in the grid
- Masonry/responsive grid layout
- Smooth animations, hover effects, particle system
- Modal detail view with download button
- Search + filter by creator, size, tags
- Sort by: newest, oldest, biggest, most viewed
- Stats counter (total maparts, maps used, largest, artists)
- Featured section on homepage
- Upload form with drag-and-drop
- Toast notifications
- Mobile responsive
- No build step — pure HTML/CSS/JS

---

## 🛠 Customization

| What | Where |
|------|-------|
| Server name / branding | `index.html` navbar section |
| Color scheme | `css/style.css` `:root` variables |
| Fonts | Google Fonts import in `index.html` |
| Social links | About page in `index.html` |
| Sample data | `data/maparts.json` |

---

## 📝 Notes

- Images are rendered with `image-rendering: pixelated` for crisp Minecraft look
- Cards scale visually: XL builds span more columns, small builds are compact
- The `featured: true` flag in JSON puts a ⭐ badge and adds it to the homepage featured section
- No backend needed — 100% static, GitHub Pages compatible

---

*Built for the 6b6t.org community* ⛏
