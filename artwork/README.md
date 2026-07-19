# Art Vault — Artwork Folder

Place your artwork images here. Supported formats: `.webp`, `.jpg`, `.jpeg`, `.png`, `.gif`

## How to Add Your Artwork

1. Drop your image files into this folder.
2. Open `js/app.js` and find the `ARTWORK_FILES` array near the top.
3. Add your filename(s) to the array:

```js
const ARTWORK_FILES = [
  'my_painting.webp',
  'sunset_study.jpg',
  // etc.
];
```

## Automatic Title Generation

Filenames are automatically converted to display titles:

| Filename | Displayed As |
|---|---|
| `siggi_in_the_trees.webp` | Siggi In The Trees |
| `my-dark-portrait.jpg` | My Dark Portrait |
| `abstract_001.png` | Abstract 001 |

## Placeholder Artwork

While no real artwork files are present, the gallery uses beautiful
procedurally-generated abstract art as placeholders. Each placeholder
is unique and color-matched to a distinct palette.

Once you add a real image file and register it in `ARTWORK_FILES`,
the placeholder will automatically be replaced by your real image.
