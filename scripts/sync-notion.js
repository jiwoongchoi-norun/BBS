#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_CHILDREN_PER_REQUEST = 100;
const MAX_RICH_TEXT_LENGTH = 1900;
const DOCS_DIR = path.join(process.cwd(), 'docs');

const notionToken = process.env.NOTION_TOKEN;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

if (!notionToken || !parentPageId) {
  console.error('Missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID environment variable.');
  process.exit(1);
}

function maskPageId(pageId) {
  if (!pageId || pageId.length < 8) {
    return '(invalid)';
  }

  return `${pageId.slice(0, 4)}...${pageId.slice(-4)}`;
}

async function notionRequest(method, endpoint, body) {
  const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${endpoint} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function validateParentPage() {
  await notionRequest('GET', `/pages/${parentPageId}`);
}

function getMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function getTitle(filePath, markdown) {
  const h1 = markdown.match(/^#\s+(.+)$/m);

  if (h1 && h1[1].trim()) {
    return h1[1].trim().replace(/[#*_`]/g, '');
  }

  return path.basename(filePath, '.md');
}

function plainText(content) {
  return {
    type: 'text',
    text: {
      content
    }
  };
}

function textBlock(type, content) {
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: splitRichText(content)
    }
  };
}

function splitRichText(content) {
  const text = content || ' ';
  const chunks = [];

  for (let index = 0; index < text.length; index += MAX_RICH_TEXT_LENGTH) {
    chunks.push(plainText(text.slice(index, index + MAX_RICH_TEXT_LENGTH)));
  }

  return chunks.length ? chunks : [plainText(' ')];
}

function codeBlock(content, language) {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: splitRichText(content || ' '),
      language: normalizeCodeLanguage(language)
    }
  };
}

function normalizeCodeLanguage(language) {
  const value = (language || 'plain text').trim().toLowerCase();
  const languageMap = {
    js: 'javascript',
    text: 'plain text',
    shell: 'shell',
    sh: 'shell',
    bash: 'shell',
    html: 'html',
    sql: 'sql',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown'
  };

  return languageMap[value] || 'plain text';
}

function flushParagraph(blocks, paragraphLines) {
  if (!paragraphLines.length) {
    return;
  }

  blocks.push(textBlock('paragraph', paragraphLines.join('\n').trim()));
  paragraphLines.length = 0;
}

function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const paragraphLines = [];
  let inCode = false;
  let codeLanguage = '';
  let codeLines = [];

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);

    if (fence) {
      if (inCode) {
        blocks.push(codeBlock(codeLines.join('\n'), codeLanguage));
        inCode = false;
        codeLanguage = '';
        codeLines = [];
      } else {
        flushParagraph(blocks, paragraphLines);
        inCode = true;
        codeLanguage = fence[1];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph(blocks, paragraphLines);
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      flushParagraph(blocks, paragraphLines);
      blocks.push(codeBlock(line, 'markdown'));
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      flushParagraph(blocks, paragraphLines);
      const type = `heading_${heading[1].length}`;
      blocks.push(textBlock(type, heading[2].trim()));
      continue;
    }

    const todo = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);

    if (todo) {
      flushParagraph(blocks, paragraphLines);
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: splitRichText(todo[2].trim()),
          checked: todo[1].toLowerCase() === 'x'
        }
      });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      flushParagraph(blocks, paragraphLines);
      blocks.push(textBlock('bulleted_list_item', bullet[1].trim()));
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);

    if (numbered) {
      flushParagraph(blocks, paragraphLines);
      blocks.push(textBlock('numbered_list_item', numbered[1].trim()));
      continue;
    }

    paragraphLines.push(line);
  }

  if (inCode) {
    blocks.push(codeBlock(codeLines.join('\n'), codeLanguage));
  }

  flushParagraph(blocks, paragraphLines);

  return blocks.length ? blocks : [textBlock('paragraph', 'Empty document')];
}

async function getChildPages(parentId) {
  const pages = new Map();
  let cursor;

  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const result = await notionRequest('GET', `/blocks/${parentId}/children${query}`);

    for (const block of result.results || []) {
      if (block.type === 'child_page' && block.child_page && block.child_page.title) {
        pages.set(block.child_page.title, block.id);
      }
    }

    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);

  return pages;
}

async function createChildPage(parentId, title) {
  const page = await notionRequest('POST', '/pages', {
    parent: {
      type: 'page_id',
      page_id: parentId
    },
    properties: {
      title: {
        title: [
          {
            type: 'text',
            text: {
              content: title
            }
          }
        ]
      }
    }
  });

  return page.id;
}

async function updatePageTitle(pageId, title) {
  await notionRequest('PATCH', `/pages/${pageId}`, {
    properties: {
      title: {
        title: [
          {
            type: 'text',
            text: {
              content: title
            }
          }
        ]
      }
    }
  });
}

async function clearPageChildren(pageId) {
  let cursor;

  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const result = await notionRequest('GET', `/blocks/${pageId}/children${query}`);

    for (const block of result.results || []) {
      await notionRequest('DELETE', `/blocks/${block.id}`);
    }

    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
}

async function appendBlocks(pageId, blocks) {
  for (let index = 0; index < blocks.length; index += MAX_CHILDREN_PER_REQUEST) {
    await notionRequest('PATCH', `/blocks/${pageId}/children`, {
      children: blocks.slice(index, index + MAX_CHILDREN_PER_REQUEST)
    });
  }
}

async function syncFile(filePath, existingPages) {
  const markdown = fs.readFileSync(filePath, 'utf8');
  const title = getTitle(filePath, markdown);
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  let pageId = existingPages.get(title);
  const blocks = [
    textBlock('paragraph', `Source: ${relativePath}`),
    ...markdownToBlocks(markdown)
  ];

  if (!pageId) {
    pageId = await createChildPage(existingPages.parentId, title);
    existingPages.set(title, pageId);
    console.log(`Created Notion page: ${title}`);
  } else {
    await clearPageChildren(pageId);
    console.log(`Updated Notion page: ${title}`);
  }

  await appendBlocks(pageId, blocks);
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.log('docs directory does not exist. Nothing to sync.');
    return;
  }

  const files = getMarkdownFiles(DOCS_DIR);

  if (!files.length) {
    console.log('No markdown files found under docs.');
    return;
  }

  console.log(`Notion sync mode: direct-page (${maskPageId(parentPageId)})`);
  await validateParentPage();

  const existingPages = await getChildPages(parentPageId);

  existingPages.parentId = parentPageId;

  for (const file of files) {
    await syncFile(file, existingPages);
  }

  console.log(`Synced ${files.length} markdown file(s) to Notion.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
