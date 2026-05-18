#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_CHILDREN_PER_REQUEST = 100;
const MAX_RICH_TEXT_LENGTH = 1900;
const DOCS_DIR = path.join(process.cwd(), 'docs');
const DEFAULT_TOGGLE_TITLE = '데이터베이스실습';
const DEFAULT_PROJECT_TITLE = 'BBS_project';

const notionToken = process.env.NOTION_TOKEN;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
const targetToggleTitle = process.env.NOTION_TARGET_TOGGLE_TITLE || DEFAULT_TOGGLE_TITLE;
const projectPageTitle = process.env.NOTION_PROJECT_PAGE_TITLE || DEFAULT_PROJECT_TITLE;

if (!notionToken || !parentPageId) {
  console.error('Missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID environment variable.');
  process.exit(1);
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

async function getChildBlocks(parentId) {
  const blocks = [];
  let cursor;

  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const result = await notionRequest('GET', `/blocks/${parentId}/children${query}`);

    blocks.push(...(result.results || []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);

  return blocks;
}

function getBlockTitle(block) {
  const value = block[block.type];

  if (!value || !Array.isArray(value.rich_text)) {
    return '';
  }

  return value.rich_text.map((text) => text.plain_text || '').join('').trim();
}

async function findChildToggle(parentId, title) {
  const blocks = await getChildBlocks(parentId);

  return blocks.find((block) => block.type === 'toggle' && getBlockTitle(block) === title);
}

async function createToggle(parentId, title) {
  const result = await notionRequest('PATCH', `/blocks/${parentId}/children`, {
    children: [
      {
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [plainText(title)],
          children: []
        }
      }
    ]
  });

  return result.results[0];
}

async function createChildPageBlock(parentId, title) {
  const result = await notionRequest('PATCH', `/blocks/${parentId}/children`, {
    children: [
      {
        object: 'block',
        type: 'child_page',
        child_page: {
          title
        }
      }
    ]
  });

  return result.results[0].id;
}

async function ensureLinkToPage(parentBlockId, pageId, title) {
  const blocks = await getChildBlocks(parentBlockId);
  const existingLink = blocks.find(
    (block) =>
      block.type === 'link_to_page' &&
      block.link_to_page &&
      block.link_to_page.type === 'page_id' &&
      block.link_to_page.page_id === pageId
  );

  if (existingLink) {
    return;
  }

  const existingChildPage = blocks.find((block) => block.type === 'child_page' && block.child_page.title === title);

  if (existingChildPage) {
    await notionRequest('DELETE', `/blocks/${existingChildPage.id}`);
  }

  await notionRequest('PATCH', `/blocks/${parentBlockId}/children`, {
    children: [
      {
        object: 'block',
        type: 'link_to_page',
        link_to_page: {
          type: 'page_id',
          page_id: pageId
        }
      }
    ]
  });
}

async function getOrCreateToggle(parentId, title) {
  const existing = await findChildToggle(parentId, title);

  if (existing) {
    return existing.id;
  }

  const created = await createToggle(parentId, title);
  console.log(`Created Notion toggle: ${title}`);
  return created.id;
}

function buildPageParent(parentId, parentType) {
  if (parentType === 'block') {
    return {
      type: 'block_id',
      block_id: parentId
    };
  }

  return {
    type: 'page_id',
    page_id: parentId
  };
}

async function createChildPage(parentId, parentType, title) {
  if (parentType === 'block') {
    return createChildPageBlock(parentId, title);
  }

  const page = await notionRequest('POST', '/pages', {
    parent: buildPageParent(parentId, parentType),
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

async function getOrCreateChildPage(parentId, parentType, title) {
  const pages = await getChildPages(parentId);
  const existingPageId = pages.get(title);

  if (existingPageId) {
    return existingPageId;
  }

  const pageId = await createChildPage(parentId, parentType, title);
  console.log(`Created Notion project page: ${title}`);
  return pageId;
}

async function getOrCreateProjectPage(parentPageIdValue, toggleId, title) {
  const pages = await getChildPages(parentPageIdValue);
  let pageId = pages.get(title);

  if (!pageId) {
    pageId = await createChildPage(parentPageIdValue, 'page', title);
    console.log(`Created Notion project page: ${title}`);
  }

  await ensureLinkToPage(toggleId, pageId, title);

  return pageId;
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
    pageId = await createChildPage(existingPages.parentId, existingPages.parentType, title);
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

  const toggleId = await getOrCreateToggle(parentPageId, targetToggleTitle);
  const projectPageId = await getOrCreateProjectPage(parentPageId, toggleId, projectPageTitle);
  const existingPages = await getChildPages(projectPageId);

  existingPages.parentId = projectPageId;
  existingPages.parentType = 'page';

  for (const file of files) {
    await syncFile(file, existingPages);
  }

  console.log(`Synced ${files.length} markdown file(s) to Notion.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
