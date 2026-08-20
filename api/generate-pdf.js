// Section map -- grep "[SEC NNN]" to jump to any section; numbers are stable even as line numbers drift.
// SEC 100  Imports & entry        node-fetch · handler entry point · method check · API key check
// SEC 200  Image inlining         regex replace img src → base64 data URIs from filesystem
// SEC 300  HTML wrapping          font embedding · wrappedHtml construction with print CSS
// SEC 400  PDFlayer API call      POST to pdflayer · response streaming

// [SEC 100] Imports & entry
// Use node-fetch for server-side HTTP calls
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // 2. Check for the API key in environment variables
  const apiKey = process.env.PDFLAYER_KEY;
  if (!apiKey) {
    console.error('Server Error: PDFLAYER_KEY is not set in environment variables.');
    return res.status(500).send('Server configuration error: PDF provider key is missing.');
  }
// [SEC 100 END]

  try {
// [SEC 200] Image inlining
    // 3. Get the HTML from the request body
    let { html } = req.body;
    if (!html) {
      return res.status(400).send('Bad Request: Missing HTML content in request body.');
    }

    // 3a. Inline local images (from /public) so the remote pdflayer renderer can access them
    // This converts <img src="/path/to/file.png"> to data: URIs where possible.
    const fs = require('fs');
    const path = require('path');
    html = html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
      try {
        if (!src || src.startsWith('data:') || src.match(/^https?:\/\//i)) return match;
        const rel = src.replace(/^\//, '');

        // Candidate locations to check for the image file
        const candidates = [];
        // direct path under public
        candidates.push(path.join(process.cwd(), 'public', rel));
        // direct path as provided (relative to project)
        candidates.push(path.join(process.cwd(), rel));
        // webpack/static media paths (build output)
        candidates.push(path.join(process.cwd(), 'build', rel));
        candidates.push(path.join(process.cwd(), 'build', 'static', 'media', path.basename(rel)));
        // src assets folder fallback (search by basename)
        candidates.push(path.join(process.cwd(), 'src', 'assets', path.basename(rel)));

        // If none of the above exist, try a small repo scan for the basename
        const basename = path.basename(rel);
        if (!candidates.some(p => fs.existsSync(p))) {
          // search common folders
          const possiblePaths = [
            path.join(process.cwd(), 'src'),
            path.join(process.cwd(), 'public'),
            path.join(process.cwd(), 'build')
          ];
          for (const root of possiblePaths) {
            try {
              const stack = [root];
              while (stack.length) {
                const cur = stack.pop();
                const entries = fs.readdirSync(cur, { withFileTypes: true });
                for (const e of entries) {
                  const full = path.join(cur, e.name);
                  if (e.isDirectory()) stack.push(full);
                  else if (e.isFile() && e.name === basename) {
                    candidates.push(full);
                    // stop scanning this root once found
                    stack.length = 0;
                    break;
                  }
                }
              }
            } catch (err) {
              // ignore permission / missing directories
            }
          }
        }

        const found = candidates.find(p => p && fs.existsSync(p));
        if (found) {
          const buf = fs.readFileSync(found);
          const ext = path.extname(found).toLowerCase().replace('.', '');
          const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'application/octet-stream';
          const data = `data:${mime};base64,${buf.toString('base64')}`;
          return match.replace(src, data);
        }
        return match;
      } catch (e) {
        console.warn('Failed to inline image', src, e && e.message ? e.message : e);
        return match;
      }
    });

    // If the project provides local fonts under public/fonts, embed them as data: URIs so pdflayer renders deterministically
    let embeddedFontCss = '';
// [SEC 200 END]

// [SEC 300] HTML wrapping
    try {
      const fontDir = path.join(process.cwd(), 'public', 'fonts');
      if (fs.existsSync(fontDir)) {
        const fontFiles = fs.readdirSync(fontDir);
        for (const file of fontFiles) {
          if (!/\.woff2?$/.test(file)) continue;
          const full = path.join(fontDir, file);
          try {
            const b = fs.readFileSync(full);
            const ext = path.extname(full).toLowerCase();
            const mime = ext === '.woff2' ? 'font/woff2' : 'font/woff';
            // derive a friendly font-family name from filename
            const family = file.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[-_]/g, ' ');
            embeddedFontCss += `@font-face { font-family: '${family}'; src: url(data:${mime};base64,${b.toString('base64')}) format('${ext === '.woff2' ? 'woff2' : 'woff'}'); font-weight: normal; font-style: normal; font-display: swap; }\n`;
          } catch (e) {
            // ignore read errors
          }
        }
      }
    } catch (e) {
      // ignore embed font errors
    }

    // Wrap the HTML with proper viewport settings and CSS to match preview layout
    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Load fonts used by preview (fallback to embedded fonts if available) -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Lato:400,700&display=swap" rel="stylesheet">
  <style>
  ${embeddedFontCss}
    @page {
      size: A4;
      margin: 15mm;
    }
    /* Base styles */
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    /* Keep existing styles from source elements */
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Table styles - preserve borders and spacing */
    table {
      border-collapse: collapse;
      width: 100%;
      page-break-inside: avoid;
    }
    td, th {
      border: 1px solid black;
      padding: 4px 8px;
      text-align: left;
    }
    /* Headers */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    /* Lists */
    ul, ol {
      padding-left: 2em;
      margin: 0.5em 0;
    }
    li {
      margin: 0.25em 0;
    }
    /* Paragraphs */
    p {
      margin: 0.5em 0;
      orphans: 3;
      widows: 3;
    }
    /* Page breaks */
    .page-break {
      page-break-before: always;
    }
    /* Images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Image containers */
    div[style*="display: flex"] img,
    div[style*="justifyContent: center"] img {
      max-height: 150px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #ccc;
    }
  /* Prevent header/logo splitting from the first content block */
  .printable-document header { page-break-after: avoid; break-after: avoid; }
  .printable-document header + main { page-break-before: avoid; break-before: avoid; }
  /* Keep risk assessment blocks intact */
  .printable-document .risk-assessment-container { page-break-inside: avoid; break-inside: avoid; }
  /* Ensure tables and matrices are kept together when possible */
  .printable-document table { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>${html}</body>
</html>`;
// [SEC 300 END]

// [SEC 400] PDFlayer API call
    // 4. Construct the request to the pdflayer API
    const pdflayerUrl = `https://api.pdflayer.com/api/convert?access_key=${apiKey}`;
    
  const response = await fetch(pdflayerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        document_html: wrappedHtml,
        page_size: 'A4',
        orientation: 'portrait',
    margin_top: '20mm',
    margin_bottom: '20mm',
    margin_left: '20mm',
    margin_right: '20mm',
    render_background: 'true',
    render_delay: 8000, // Increased delay for image processing
  viewport_width: 2000,
  viewport_height: 3000,
        no_images: 0,
  scale: 2,
        use_css: 'true',
        custom_unit: 'mm',
        allow_custom_fonts: 'true',
        image_quality: 90, // Optimize image quality
        compress: 'true' // Enable compression
      })
    });

    // 5. Handle the response from pdflayer
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('pdflayer API error:', errorBody);
        return res.status(response.status).send(`PDF generation failed: ${errorBody}`);
    }

    // 6. If successful, stream the PDF file back to the client
    const pdfBuffer = await response.buffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rams-document.pdf"');
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error('An unexpected server error occurred:', err);
    return res.status(500).send('An unexpected error occurred during PDF generation.');
  }
};
// [SEC 400 END]
