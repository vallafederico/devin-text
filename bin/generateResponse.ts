import { CONFIG } from "./config";
import { getValidatedUrlSafe } from "../src/utils/url-validator";

interface BuildOutput {
  path: string;
}

function generateIndexHtml(outputs: BuildOutput[]) {
  // Use the new URL validation
  const vercelUrl = getValidatedUrlSafe("VERCEL_URL") || "{NO VERCEL URL}";

  const protocol = process.env.USE_SSL === "true" ? "https" : "http";
  const localUrl = `${protocol}://localhost:${CONFIG.SERVE_PORT}`;

  const jsLinks = outputs
    .filter(
      (output) =>
        output.path.endsWith(".js") && !output.path.endsWith(".js.map")
    )
    .map((output) => {
      const relativePath = output.path.split("/dist/")[1];
      return `<li>
        <a href="/${relativePath}" target="_blank" class="main-link">${relativePath}</a>
        <code class="script-tag">&lt;script defer src="${localUrl}/${relativePath}"&gt;&lt;/script&gt;</code>
        ${
          vercelUrl !== "{NO VERCEL URL}"
            ? `
        <code class="script-tag">&lt;script defer src="<a href="${vercelUrl}/${relativePath}" target="_blank">${vercelUrl}/${relativePath}</a>"&gt;&lt;/script&gt;</code>
        <div class="error-handler-box">
          <code class="script-tag">&lt;script defer src="${localUrl}/${relativePath}" onerror="(function(){const script=document.createElement('script');script.src='${vercelUrl}/${relativePath}';script.defer='true';document.head.appendChild(script);})()"&gt;&lt;/script&gt;</code>
        </div>
        `
            : ""
        }
      </li>`;
    })
    .join("\n");

  const cssLinks = outputs
    .filter((output) => output.path.endsWith(".css"))
    .map((output) => {
      const relativePath = output.path.split("/dist/")[1];
      return `<li>
        <a href="/${relativePath}" target="_blank" class="main-link">${relativePath}</a>
        <code class="script-tag">&lt;link rel="stylesheet" href="${localUrl}/${relativePath}"&gt;</code>
        ${
          vercelUrl !== "{NO VERCEL URL}"
            ? `
        <code class="script-tag">&lt;link rel="stylesheet" href="<a href="${vercelUrl}/${relativePath}" target="_blank">${vercelUrl}/${relativePath}</a>"&gt;</code>
        <div class="error-handler-box">
          <code class="script-tag">&lt;link rel="stylesheet" href="${localUrl}/${relativePath}" onerror="(function(){const link=document.createElement('link');link.rel='stylesheet';link.href='${vercelUrl}/${relativePath}';document.head.appendChild(link);})()"&gt;</code>
        </div>
        `
            : ""
        }
      </li>`;
    })
    .join("\n");

  const mapLinks = outputs
    .filter((output) => output.path.endsWith(".js.map"))
    .map((output) => {
      const relativePath = output.path.split("/dist/")[1];
      return `<li class="map-file"><a href="/${relativePath}" target="_blank" class="main-link">${relativePath}</a></li>`;
    })
    .join("\n");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Generated Files</title>
        <style>
          :root {
            --bg-color: #ffffff;
            --text-color: #333333;
            --link-color: #0066cc;
            --code-bg: #f5f5f5;
            --code-color: #666666;
            --border-color: #dee2e6;
            --notice-bg: #f8f9fa;
            --notice-text: #495057;
            --hover-bg: #e6ffe6;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #1a1a1a;
              --text-color: #e0e0e0;
              --link-color: #66b3ff;
              --code-bg: #2d2d2d;
              --code-color: #a0a0a0;
              --border-color: #404040;
              --notice-bg: #2d2d2d;
              --notice-text: #e0e0e0;
              --hover-bg: #1a331a;
            }
          }

          body { 
            font-family: system-ui; 
            padding: 2rem;
            background-color: var(--bg-color);
            color: var(--text-color);
          }
          a { 
            color: var(--link-color); 
            text-decoration: none; 
          }
          a:hover { text-decoration: underline; }
          .main-link { font-weight: bold; }
          ul { list-style: none; padding: 0; }
          li { margin: 0.5rem 0; }
          .map-file { font-size: 0.8em; opacity: 0.5; }
          h2, h3 { margin-top: 2rem; }
          h2:first-child { margin-top: 0; }
          .script-tag {
            display: block;
            margin-top: 0.25rem;
            font-size: 0.9em;
            color: var(--code-color);
            font-family: monospace;
          }
          .script-tag a {
            color: var(--link-color);
          }
          .error-handler-box {
            background-color: var(--code-bg);
            padding: 1rem;
            border-radius: 4px;
            margin-top: 0.5rem;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }
          .error-handler-box.copied {
            background-color: var(--hover-bg);
          }
          .vercel-notice {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--notice-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-size: 0.9em;
            color: var(--notice-text);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .vercel-notice .icon {
            color: var(--link-color);
            font-size: 1.2em;
          }
          .vercel-notice .close {
            margin-left: 10px;
            cursor: pointer;
            color: var(--code-color);
            font-size: 1.2em;
            padding: 0 5px;
          }
          .vercel-notice .close:hover {
            color: var(--text-color);
          }
        </style>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.error-handler-box').forEach(box => {
              box.addEventListener('click', async () => {
                const code = box.querySelector('code').textContent;
                try {
                  await navigator.clipboard.writeText(code);
                  box.classList.add('copied');
                  setTimeout(() => {
                    box.classList.remove('copied');
                  }, 1000);
                } catch (err) {
                  console.error('Failed to copy text: ', err);
                }
              });
            });

            // Add close functionality for the Vercel notice
            const closeButton = document.querySelector('.vercel-notice .close');
            if (closeButton) {
              closeButton.addEventListener('click', () => {
                const notice = document.querySelector('.vercel-notice');
                if (notice) {
                  notice.style.display = 'none';
                }
              });
            }
          });
        </script>
      </head>
      <body>
        <h2>JavaScript Files:</h2>
        <ul>${jsLinks}</ul>

        <h2>CSS Files:</h2>
        <ul>${cssLinks}</ul>
        
        ${mapLinks ? `<h3>Source Maps:</h3><ul>${mapLinks}</ul>` : ""}

        ${
          vercelUrl === "{NO VERCEL URL}"
            ? '<div class="vercel-notice"><span class="icon">&#9432;</span><span>Add VERCEL_URL to your .env file for full CI/CD functionality</span><span class="close">&#10005;</span></div>'
            : ""
        }
      </body>
    </html>
  `;
}

export function generateResponse(filePath: string, outputs: BuildOutput[]) {
  // Ignore favicon requests
  if (filePath === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // Serve index page
  if (filePath === "/") {
    const html = generateIndexHtml(outputs);
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Serve files from dist
  const file = Bun.file(`dist${filePath}`);
  const contentType =
    {
      ".js": "application/javascript",
      ".css": "text/css",
      ".html": "text/html",
    }[filePath.match(/\.[^.]+$/)?.[0] || ""] || "text/plain";

  return new Response(file, {
    headers: {
      "Content-Type": contentType,
    },
  });
}
