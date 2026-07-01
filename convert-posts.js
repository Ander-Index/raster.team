#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rawDir = join(__dirname, 'src/content/__RAW_BACKUP');
const targetDir = join(__dirname, 'src/content/posts/zh');

function generateDescription(title, contentLines) {
  const firstNonEmpty = contentLines.find(line => {
    const trimmed = line.trim();
    return trimmed && 
           !trimmed.startsWith('<!--') && 
           !trimmed.startsWith('#') && 
           !trimmed.startsWith('<') &&
           !trimmed.startsWith('>') &&
           !trimmed.startsWith('---') &&
           !trimmed.startsWith('---') &&
           trimmed.length > 0;
  });
  if (firstNonEmpty) {
    let desc = firstNonEmpty.trim();
    desc = desc.replace(/^>\s*/, ''); // Remove Markdown blockquote prefix
    return desc.substring(0, 260);
  }
  return `${title} - 来自 Team Raster 的文章`;
}

function cleanFieldValue(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function convertFrontmatter(frontmatterLines, contentLines) {
  const oldFields = {};
  
  frontmatterLines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      let value = line.substring(colonIdx + 1).trim();
      
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.substring(1, value.length - 1).split(',').map(v => v.trim());
      }
      
      oldFields[key] = cleanFieldValue(value);
    }
  });

  const newFields = {
    title: oldFields.title || '未命名文章',
    description: generateDescription(oldFields.title || '未命名文章', contentLines),
    pubDate: oldFields.date || new Date().toISOString(),
    tags: Array.isArray(oldFields.tags) ? oldFields.tags : [],
    categories: [],
    draft: false,
    heroImage: (oldFields.feature && oldFields.feature.trim() !== '') ? oldFields.feature : undefined,
    heroImageAlt: undefined,
    showFeaturedImage: undefined,
    dynamicPostCardHeight: undefined,
    canonicalURL: undefined,
    comments: undefined,
    toc: true,
    pinned: oldFields.isTop === 'true',
    math: false,
    lang: 'zh',
    translationKey: undefined,
    unlisted: oldFields.hideInList === 'true' || true,
    unlistedHideFromSeo: undefined,
  };

  return newFields;
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function formatYamlString(str) {
  if (str === undefined || str === null) return undefined;
  const stringified = String(str).trim();
  
  if (stringified === '') return undefined;
  
  const needsQuotes = stringified.includes('\n') || stringified.includes(':') || 
                      stringified.includes('#') || stringified.includes('[') ||
                      stringified.includes(']') || stringified.includes('{') ||
                      stringified.includes('}') || stringified.includes(',') ||
                      stringified.includes("'") || stringified.includes('"') ||
                      /^\s/.test(stringified) || /\s$/.test(stringified);
  
  if (needsQuotes) {
    return `"${stringified.replace(/"/g, '\\"')}"`;
  }
  return stringified;
}

function formatYamlArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '[]';
  return `[${arr.map(v => formatYamlString(v)).join(', ')}]`;
}

function formatYamlValue(key, value) {
  if (value === undefined || value === null) {
    return null;
  }
  
  if (key === 'pubDate' || key === 'updatedDate') {
    return `${key}: ${formatDate(value)}`;
  }
  
  if (typeof value === 'boolean') {
    return `${key}: ${value}`;
  }
  
  if (Array.isArray(value)) {
    return `${key}: ${formatYamlArray(value)}`;
  }
  
  return `${key}: ${formatYamlString(value)}`;
}

function processFile(filename) {
  const sourcePath = join(rawDir, filename);
  let content = readFileSync(sourcePath, 'utf-8');
  
  // Normalize line endings to LF
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        frontmatterEnd = i;
        break;
      }
    }
  }
  
  if (frontmatterEnd === -1) {
    console.warn(`No frontmatter found in ${filename}`);
    return;
  }
  
  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const contentLines = lines.slice(frontmatterEnd + 1);
  
  const newFields = convertFrontmatter(frontmatterLines, contentLines);
  
  const newFrontmatterLines = [
    '---',
    ...Object.entries(newFields)
      .map(([key, value]) => formatYamlValue(key, value))
      .filter(line => line !== null),
    '---',
    ''
  ];
  
  const newContent = newFrontmatterLines.join('\n') + contentLines.join('\n');
  
  const targetPath = join(targetDir, filename);
  writeFileSync(targetPath, newContent, 'utf-8');
  console.log(`✓ Converted ${filename}`);
}

const files = readdirSync(rawDir).filter(f => f.endsWith('.md'));
console.log(`Found ${files.length} files to convert...`);

files.forEach(processFile);

console.log(`\n✓ Done! Converted ${files.length} files.`);