# leonshi.dev

Static portfolio and archive for Leon Shi — Decision Scientist & AI Engineer.
The site is plain HTML, CSS, and vanilla JavaScript: no framework, no build step,
no package manager. Every page is a static file served as-is.

Live at **https://leonshi.dev/**.

---

## Architecture

### Pages and archive structure

The site is organized as a museum or archive. The homepage is the curated
catalog; subdirectories hold interactive studies and research notes.

| Path | Purpose |
|---|---|
| `index.html` | Main page — a curated collection of "rooms," "artifacts," and "accessions." Introduces the work and links into the archive. |
| `lab/` | Interactive **Field Lab** — a study browser rendering 262,144 particles (512 × 512) with pointer-reactive controls and a navigable study index. |
| `hyper/` | **Hyperdimensional Field Index** — 170 generative studies organized across ten named hyperdimensional families, with keyboard navigation and deep-linkable URLs. |
| `notes/` | Long-form essays and research notes (HTML + Markdown source + PDF attachments), each styled with its own `notes/styles.css`. |
| `review/` | Internal review index. |

Supporting scripts at the root:

- `field.js` — scroll-driven field orchestration for the homepage (see below).
- `background.js` — small IIFE that repositions the `#background` element
  relative to the collection and colophon based on a `?background=` query param.

### The shared WebGL renderer: `lab/renderer.js`

A single self-contained module exposes
`window.createMuseumStudyRenderer(canvas, pointCount, options)`. It:

- Acquires a **WebGL 1** context (`alpha: false`, `antialias: false`,
  `depth: false`, `powerPreference: "high-performance"`).
- Uploads a monotonically increasing index buffer of `pointCount` floats and
  renders them as `gl.POINTS` — the vertex shader does all geometry
  computation per-point.
- Compiles and links its own inline vertex and fragment shaders, deletes the
  shader objects after linking, and returns `{ render }` on success.
- The `render(time, from, study, transition, point)` method draws a single
  frame; the caller is responsible for scheduling.

The module gracefully degrades: if WebGL is unavailable it returns `null`,
and host pages show a fallback message (`#fallback` element).

This renderer is shared verbatim by the homepage (`index.html` loads
`lab/renderer.js`), the Field Lab (`lab/index.html` loads `renderer.js`
locally), and the Hyperdimensional Field Index (`hyper/index.html` loads
`../lab/renderer.js`).

### Scroll-driven orchestration: `field.js`

`field.js` is an IIFE that powers the homepage's background field. It:

- Instantiates the shared renderer on the `#museum-field` canvas with a point
  count of 512 × 512 = **262,144** particles.
- Maintains a catalog of study families (hyperdimensional, volatility terrain,
  amorphous growth) and a set of 170 featured study indices.
- Uses an **`IntersectionObserver`** to watch page sections marked with
  `data-field-state` attributes and cross-fades the rendered study when the
  dominant section changes.
- Reacts to `pointermove` to bend the field, and pauses rendering when the tab
  is hidden (`visibilitychange`).
- Respects `prefers-reduced-motion: reduce` and supports deep-linking to a
  specific study via `?study=NNN`.
- Renders only on demand via `requestAnimationFrame`, re-scheduling when the
  render loop has no work pending — this avoids a continuous render loop when
  the page is idle or off-screen.

### Styling

All pages share a museum-catalog aesthetic driven by CSS custom properties
(`:root` tokens for ink, muted text, spacing, and focus width). Fonts are
served from Google Fonts: **Newsreader** (serif display/body) and
**DM Mono** (monospace labels, catalog lines, room/object numbers).

Each archive section may carry its own `styles.css`:
- Root `styles.css` — homepage and shared layout.
- `lab/styles.css` — Field Lab layout.
- `hyper/styles.css` — hyperdimensional index.
- `notes/styles.css` — essay typography.

### Assets

`assets/` holds the portrait (`leon-pencil.webp`) and essay-attached images
and PDFs. The portrait is referenced from the homepage and Open Graph
metadata.

---

## Local preview

Because the site is fully static with no build step, you can preview it with
any static file server. For example, from the repository root:

```bash
# Python 3 (built-in)
python3 -m http.server 8000

# Or, if Node is available
npx serve -l 8000
```

Then open **http://localhost:8000/**.

A static server is preferred over `file://` URLs because some browsers
restrict script loading and WebGL canvas sizing under the `file:` scheme.
No environment variables, secrets, or API keys are required.

---

## Design intent

The site presents the author's work as a **museum or archive** rather than a
conventional portfolio. The homepage reads as a curated catalog: sections are
"rooms," entries are "artifacts" with "accession" metadata and "object
labels," and a colophon closes the page. The WebGL particle field functions
as a living backdrop whose form shifts as the visitor scrolls through the
collection — tying the visual system to the content's progression.

The `lab/` and `hyper/` subdirectories extend this concept into interactive
study indices: generative particulate studies that the visitor can browse,
compare, and deep-link to. The `notes/` directory holds longer research
writing. Together these form an archive of systems, studies, and research
notes rather than a list of credentials.
