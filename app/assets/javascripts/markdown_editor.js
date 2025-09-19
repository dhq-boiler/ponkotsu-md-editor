(function() {
    'use strict';

    // Safe DOM element retrieval
    function getElement(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            console.warn('Element not found:', selector);
            return null;
        }
    }

    // Wait for DOM content loaded
    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    onReady(function() {
        console.log('Enhanced Markdown editor initializing...');

        // Get DOM elements
        const textarea = document.getElementById('editor_content');
        const previewContainer = getElement('#markdownPreview');
        const previewToggle = getElement('#previewToggle');

        let isPreviewMode = false;

        // Selection range utilities for contenteditable elements
        function getContentEditableSelection(element) {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) {
                return { start: 0, end: 0, selectedText: '' };
            }

            const range = selection.getRangeAt(0);
            const fullText = element.innerText;

            // Walk through text nodes to calculate accurate positions
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            // Calculate start position
            let startPos = 0;
            let foundStart = false;
            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                if (textNode === range.startContainer) {
                    startPos += range.startOffset;
                    foundStart = true;
                    break;
                } else {
                    startPos += textNode.textContent.length;
                }
            }

            // Calculate end position
            let endPos = 0;
            let foundEnd = false;
            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                if (textNode === range.endContainer) {
                    endPos += range.endOffset;
                    foundEnd = true;
                    break;
                } else {
                    endPos += textNode.textContent.length;
                }
            }

            // Fallback handling
            if (!foundStart || !foundEnd) {
                const preRange = document.createRange();
                preRange.selectNodeContents(element);
                preRange.setEnd(range.startContainer, range.startOffset);
                const preText = preRange.toString();

                startPos = preText.length;
                endPos = startPos + range.toString().length;
            }

            // Get accurate selected text from innerText
            const selectedText = fullText.substring(startPos, endPos);

            return {
                start: startPos,
                end: endPos,
                selectedText: selectedText
            };
        }

        // Set selection range at specified position
        function setContentEditableSelection(element, start, end) {
            element.focus();

            const fullText = element.innerText;

            // Range validation
            start = Math.max(0, Math.min(start, fullText.length));
            end = Math.max(0, Math.min(end, fullText.length));

            // Get text nodes
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            // Calculate node and offset from cumulative position
            let currentOffset = 0;
            let startNode = null, startOffset = 0;
            let endNode = null, endOffset = 0;

            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                const nodeLength = textNode.textContent.length;

                // Find start position
                if (!startNode && currentOffset + nodeLength >= start) {
                    startNode = textNode;
                    startOffset = start - currentOffset;
                }

                // Find end position
                if (!endNode && currentOffset + nodeLength >= end) {
                    endNode = textNode;
                    endOffset = end - currentOffset;
                    break;
                }

                currentOffset += nodeLength;
            }

            if (startNode && endNode) {
                try {
                    // Adjust boundary values
                    startOffset = Math.max(0, Math.min(startOffset, startNode.textContent.length));
                    endOffset = Math.max(0, Math.min(endOffset, endNode.textContent.length));

                    const range = document.createRange();
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);

                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);

                } catch (e) {
                    console.error('Selection setting failed:', e);
                    // Fallback: set cursor at end of element
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                console.warn('Could not find appropriate text nodes for selection');
            }
        }

        // Text utilities for contenteditable elements (preserve line breaks)
        function getContentEditableText(element) {
            // Use innerText to preserve line breaks
            return element.innerText || element.textContent || '';
        }

        // Set text for contenteditable elements (preserve line breaks)
        function setContentEditableText(element, text) {
            // Use innerText for accurate line break handling
            element.innerText = text;
        }

        // Markdown text insertion functionality
        window.insertMarkdown = function(before, after) {
            after = after || '';

            if (!textarea) {
                console.warn('Textarea not found');
                return;
            }

            try {
                // Check if element is contenteditable
                const isContentEditable = textarea.contentEditable === 'true' ||
                                        textarea.getAttribute('contenteditable') === 'true';

                let start, end, selectedText;

                if (isContentEditable) {
                    // For contenteditable elements
                    const selection = getContentEditableSelection(textarea);
                    start = selection.start;
                    end = selection.end;
                    selectedText = selection.selectedText;
                } else {
                    // For regular textarea elements
                    start = textarea.selectionStart || 0;
                    end = textarea.selectionEnd || 0;
                    selectedText = textarea.value.substring(start, end);
                }

                const fullText = isContentEditable ?
                    (textarea.innerText || textarea.textContent || '') :
                    textarea.value;

                const beforeText = fullText.substring(0, start);
                const afterText = fullText.substring(end);
                const newText = before + selectedText + after;

                const newFullText = beforeText + newText + afterText;

                if (isContentEditable) {
                    textarea.innerText = newFullText;
                } else {
                    textarea.value = newFullText;
                }

                // Adjust cursor position
                const newCursorPos = selectedText.length > 0 ?
                    start + newText.length :
                    start + before.length;

                textarea.focus();

                if (isContentEditable) {
                    setContentEditableSelection(textarea, newCursorPos, newCursorPos);
                } else if (textarea.setSelectionRange) {
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                }

                // Fire input event
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

            } catch (e) {
                console.error('Error inserting markdown:', e);
            }
        };

        window.insertCode = function() {
            const textarea = document.getElementById('editor_content');

            // Check if element is contenteditable
            const isContentEditable = textarea.contentEditable === 'true' ||
                                    textarea.getAttribute('contenteditable') === 'true';

            let selectedText;
            if (isContentEditable) {
                const selection = getContentEditableSelection(textarea);
                selectedText = selection.selectedText;
            } else {
                selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
            }

            if (selectedText.includes('\n')) {
                // Use code block if line breaks are included
                insertMarkdown('```\n', '\n```');
            } else {
                // Use code span for single line
                insertMarkdown('`', '`');
            }
        }

        // Preview toggle functionality
        window.togglePreview = function() {
            if (!textarea || !previewContainer) {
                console.warn('Preview elements not found');
                return;
            }

            try {
                isPreviewMode = !isPreviewMode;

                if (isPreviewMode) {
                    // Switch to preview mode
                    // Check if element is contenteditable and get text
                    const isContentEditable = textarea.contentEditable === 'true' ||
                                            textarea.getAttribute('contenteditable') === 'true';

                    const markdownText = isContentEditable ?
                        (textarea.innerText || textarea.textContent || '') :
                        (textarea.value || '');

                    const htmlContent = convertMarkdownToHtml(markdownText);

                    previewContainer.innerHTML = htmlContent;
                    previewContainer.style.display = 'block';
                    textarea.style.display = 'none';

                    if (previewToggle) {
                        previewToggle.innerHTML = '<i class="bi bi-pencil"></i> Back to Edit';
                    }
                } else {
                    // Return to edit mode
                    previewContainer.style.display = 'none';
                    textarea.style.display = 'block';

                    if (previewToggle) {
                        previewToggle.innerHTML = '<i class="bi bi-eye"></i> Preview';
                    }
                }
            } catch (e) {
                console.error('Error toggling preview:', e);
            }
        };

        // Allowed script tag sources (whitelist)
        const ALLOWED_SCRIPT_SOURCES = [
            'https://platform.twitter.com/widgets.js',
            'https://www.youtube.com/iframe_api',
            'https://connect.facebook.net/en_US/sdk.js',
            'https://www.instagram.com/embed.js'
        ];

        // HTML entities map
        const HTML_ENTITIES = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#39;': "'",
            '&mdash;': '—',
            '&ndash;': '–',
            '&hellip;': '…',
            '&nbsp;': ' ',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&laquo;': '«',
            '&raquo;': '»',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&lsquo;': '\'',
            '&rsquo;': '\'',
            '&bull;': '•',
            '&middot;': '·',
            '&sect;': '§',
            '&para;': '¶',
            '&dagger;': '†',
            '&Dagger;': '‡',
            '&permil;': '‰',
            '&prime;': '′',
            '&Prime;': '″',
            '&lsaquo;': '‹',
            '&rsaquo;': '›',
            '&oline;': '‾',
            '&frasl;': '⁄',
            '&euro;': '€',
            '&image;': 'ℑ',
            '&weierp;': '℘',
            '&real;': 'ℜ',
            '&alefsym;': 'ℵ',
            '&larr;': '←',
            '&uarr;': '↑',
            '&rarr;': '→',
            '&darr;': '↓',
            '&harr;': '↔',
            '&crarr;': '↵'
        };

        // Twitter widgets.js manager
        class TwitterWidgetManager {
            constructor() {
                this.loaded = false;
                this.loading = false;
                this.loadPromise = null;
            }

            // Load Twitter widgets.js
            async loadWidgets() {
                if (this.loaded && window.twttr && window.twttr.widgets) {
                    return Promise.resolve();
                }

                if (this.loading) {
                    return this.loadPromise;
                }

                this.loading = true;
                this.loadPromise = new Promise((resolve, reject) => {
                    // Already loaded
                    if (window.twttr && window.twttr.widgets) {
                        this.loaded = true;
                        this.loading = false;
                        resolve();
                        return;
                    }

                    // Remove existing script tag
                    const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
                    if (existingScript) {
                        existingScript.remove();
                    }

                    // Create new script tag
                    const script = document.createElement('script');
                    script.src = 'https://platform.twitter.com/widgets.js';
                    script.async = true;
                    script.charset = 'utf-8';

                    script.onload = () => {
                        this.loaded = true;
                        this.loading = false;
                        console.log('Twitter widgets.js loaded successfully');
                        resolve();
                    };

                    script.onerror = (error) => {
                        this.loading = false;
                        console.error('Failed to load Twitter widgets.js:', error);
                        reject(error);
                    };

                    document.head.appendChild(script);

                    // Timeout handling
                    setTimeout(() => {
                        if (!this.loaded) {
                            this.loading = false;
                            reject(new Error('Twitter widgets.js load timeout'));
                        }
                    }, 10000);
                });

                return this.loadPromise;
            }

            // Initialize tweets
            async initializeTweets(container = document) {
                try {
                    await this.loadWidgets();

                    if (window.twttr && window.twttr.widgets) {
                        await window.twttr.widgets.load(container);
                        console.log('Twitter widgets initialized');
                    }
                } catch (error) {
                    console.error('Failed to initialize Twitter widgets:', error);
                    this.showFallbackMessage(container);
                }
            }

            // Fallback display
            showFallbackMessage(container) {
                const tweets = container.querySelectorAll('.twitter-tweet');
                tweets.forEach(tweet => {
                    if (!tweet.querySelector('.twitter-widget')) {
                        tweet.style.border = '1px solid #e1e8ed';
                        tweet.style.borderRadius = '8px';
                        tweet.style.padding = '12px';
                        tweet.style.backgroundColor = '#f7f9fa';
                        tweet.style.color = '#14171a';
                        tweet.style.fontFamily = 'system-ui, -apple-system, sans-serif';

                        // Add error message
                        const errorDiv = document.createElement('div');
                        errorDiv.style.marginTop = '8px';
                        errorDiv.style.fontSize = '14px';
                        errorDiv.style.color = '#657786';
                        errorDiv.innerHTML = '⚠️ Failed to load Twitter embed. Please check the tweet directly via the link above.';

                        if (!tweet.querySelector('.twitter-error-message')) {
                            errorDiv.className = 'twitter-error-message';
                            tweet.appendChild(errorDiv);
                        }
                    }
                });
            }
        }

        // Global instance
        const twitterManager = new TwitterWidgetManager();

        // Complex HTML structure protection (script execution support)
        class HTMLSanitizer {
            constructor() {
                this.protectedElements = [];
                this.placeholderMap = new Map();
                this.placeholderCounter = 0;
                this.foundScripts = [];
            }

            // Generate placeholder
            generatePlaceholder(type = 'ELEMENT') {
                const placeholder = `__PROTECTED_${type}_${this.placeholderCounter}__`;
                this.placeholderCounter++;
                return placeholder;
            }

            // Protect HTML entities
            protectHtmlEntities(html) {
                Object.keys(HTML_ENTITIES).forEach(entity => {
                    const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    html = html.replace(regex, (match) => {
                        const placeholder = this.generatePlaceholder('ENTITY');
                        this.protectedElements.push(match);
                        this.placeholderMap.set(placeholder, match);
                        return placeholder;
                    });
                });
                return html;
            }

            // Protect Twitter embeds (script separation)
            protectTwitterEmbeds(html) {
                // Detect and save Twitter script tag
                const scriptRegex = /<script[^>]*src="https:\/\/platform\.twitter\.com\/widgets\.js"[^>]*><\/script>/gi;
                html = html.replace(scriptRegex, (match) => {
                    this.foundScripts.push(match);
                    return ''; // Remove script tag (execute manually later)
                });

                // Protect only blockquote
                const blockquoteRegex = /<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*?<\/blockquote>/gi;
                html = html.replace(blockquoteRegex, (match) => {
                    const placeholder = this.generatePlaceholder('TWITTER_BLOCKQUOTE');
                    this.protectedElements.push(match);
                    this.placeholderMap.set(placeholder, match);
                    return placeholder;
                });

                return html;
            }

            // Protect individual HTML tags
            protectAllowedTags(html) {
                const allowedTags = [
                    'blockquote', 'p', 'a', 'strong', 'em', 'code', 'del', 'b', 'i', 'u',
                    'br', 'hr', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
                ];

                allowedTags.forEach(tag => {
                    // Self-closing tags
                    if (['br', 'hr', 'img'].includes(tag)) {
                        const regex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
                        html = html.replace(regex, (match) => {
                            if (this.isValidTag(tag, match)) {
                                const placeholder = this.generatePlaceholder(tag.toUpperCase());
                                this.protectedElements.push(match);
                                this.placeholderMap.set(placeholder, match);
                                return placeholder;
                            }
                            return match;
                        });
                    } else {
                        // Opening tag
                        const openRegex = new RegExp(`<${tag}(\\s[^>]*)?\\s*>`, 'gi');
                        html = html.replace(openRegex, (match, attributes) => {
                            if (this.isValidTag(tag, match)) {
                                const placeholder = this.generatePlaceholder(`${tag.toUpperCase()}_OPEN`);
                                this.protectedElements.push(match);
                                this.placeholderMap.set(placeholder, match);
                                return placeholder;
                            }
                            return match;
                        });

                        // Closing tag
                        const closeRegex = new RegExp(`</${tag}>`, 'gi');
                        html = html.replace(closeRegex, (match) => {
                            const placeholder = this.generatePlaceholder(`${tag.toUpperCase()}_CLOSE`);
                            this.protectedElements.push(match);
                            this.placeholderMap.set(placeholder, match);
                            return placeholder;
                        });
                    }
                });

                return html;
            }

            // Tag validity check
            isValidTag(tagName, tagContent) {
                const tag = tagName.toLowerCase();

                // img、aタグのURL検証
                if (tag === 'img' || tag === 'a') {
                    const srcMatch = tagContent.match(/(?:src|href)\s*=\s*["']([^"']+)["']/i);
                    if (srcMatch) {
                        return this.isValidUrl(srcMatch[1]);
                    }
                }

                return true;
            }

            // URL検証
            isValidUrl(url) {
                if (!url) return false;

                // 相対パスは許可
                if (url.startsWith('/')) return true;

                try {
                    const urlObj = new URL(url);
                    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
                } catch {
                    return false;
                }
            }

            // Restore protected tags
            restoreProtectedElements(html) {
                // Restore in reverse order
                const sortedPlaceholders = Array.from(this.placeholderMap.entries())
                    .sort((a, b) => {
                        const aNum = parseInt(a[0].match(/_(\d+)__$/)[1]);
                        const bNum = parseInt(b[0].match(/_(\d+)__$/)[1]);
                        return bNum - aNum;
                    });

                sortedPlaceholders.forEach(([placeholder, original]) => {
                    html = html.replace(new RegExp(placeholder, 'g'), original);
                });

                return html;
            }

            // Get detected scripts
            getFoundScripts() {
                return this.foundScripts;
            }

            // Reset
            reset() {
                this.protectedElements = [];
                this.placeholderMap.clear();
                this.placeholderCounter = 0;
                this.foundScripts = [];
            }
        }

        // Markdown to HTML conversion (script execution support)
        function convertMarkdownToHtml(markdown) {
            if (!markdown || typeof markdown !== 'string') {
                return '<p class="text-muted">No content available</p>';
            }

            try {
                const sanitizer = new HTMLSanitizer();
                let html = markdown;

                // 1. Protect HTML entities
                html = sanitizer.protectHtmlEntities(html);

                // 2. Protect Twitter embeds (script separation)
                html = sanitizer.protectTwitterEmbeds(html);

                // 3. Protect individual HTML tags
                html = sanitizer.protectAllowedTags(html);

                // 4. Escape remaining HTML
                html = html.replace(/&(?![a-zA-Z][a-zA-Z0-9]*;)/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');

                // 5. Markdown conversion
                html = processMarkdown(html);

                // 6. Restore protected HTML tags and entities
                html = sanitizer.restoreProtectedElements(html);

                // 7. Convert line breaks to br tags
                html = html.replace(/\n/g, '<br>');

                // 8. Initialize Twitter widgets if scripts were detected
                const foundScripts = sanitizer.getFoundScripts();
                if (foundScripts.length > 0) {
                    // Initialize Twitter widgets on next tick
                    setTimeout(() => {
                        const previewContainer = document.getElementById('markdownPreview');
                        if (previewContainer && previewContainer.style.display !== 'none') {
                            twitterManager.initializeTweets(previewContainer);
                        }
                    }, 100);
                }

                return html || '<p class="text-muted">No preview content available</p>';

            } catch (e) {
                console.error('Markdown conversion error:', e);
                return '<p class="text-danger">Preview error: ' + e.message + '</p>';
            }
        }

        // Markdown processing function
        function processMarkdown(html) {
            // Code blocks
            html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-light p-3 rounded"><code>$1</code></pre>');

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code class="bg-light px-1 rounded">$1</code>');

            // Headers
            html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // Horizontal rules
            html = html.replace(/^---$/gm, '<hr>');

            // Bold, italic, strikethrough
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
            html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

            // Blockquotes
            html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="blockquote border-start border-3 border-secondary ps-3 my-3"><p class="mb-0">$1</p></blockquote>');

            // Checkboxes
            html = html.replace(/^- \[x\] (.+)$/gm, '<div class="form-check my-2"><input class="form-check-input" type="checkbox" checked disabled><label class="form-check-label text-decoration-line-through">$1</label></div>');
            html = html.replace(/^- \[ \] (.+)$/gm, '<div class="form-check my-2"><input class="form-check-input" type="checkbox" disabled><label class="form-check-label">$1</label></div>');

            // Numbered lists
            html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

            // Markdown images
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
                if (isValidUrl(url)) {
                    return `<img src="${url}" alt="${alt}" class="img-fluid rounded my-2" style="max-width: 100%; height: auto;" loading="lazy">`;
                }
                return match;
            });

            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                if (isValidUrl(url)) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-pink); text-decoration: none;">${text}</a>`;
                }
                return text;
            });

            // Regular list items
            html = html.replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>');

            // Wrap lists in ul/ol elements
            html = wrapListItems(html);

            return html;
        }

        // URL validation function
        function isValidUrl(url) {
            if (!url) return false;
            if (url.startsWith('/')) return true;
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
            } catch {
                return false;
            }
        }

        // Wrap list items in ul/ol elements
        function wrapListItems(html) {
            const lines = html.split('\n');
            let inUnorderedList = false;
            let inOrderedList = false;
            const processedLines = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const isUnorderedListItem = line.includes('<li class="mb-1">') && !line.match(/^\d+\./);
                const isOrderedListItem = line.includes('<li class="mb-1">') && line.match(/^\d+\./);

                if (isUnorderedListItem) {
                    if (!inUnorderedList) {
                        if (inOrderedList) {
                            processedLines.push('</ol>');
                            inOrderedList = false;
                        }
                        processedLines.push('<ul class="my-3">');
                        inUnorderedList = true;
                    }
                    processedLines.push(line);
                } else if (isOrderedListItem) {
                    if (!inOrderedList) {
                        if (inUnorderedList) {
                            processedLines.push('</ul>');
                            inUnorderedList = false;
                        }
                        processedLines.push('<ol class="my-3">');
                        inOrderedList = true;
                    }
                    processedLines.push(line);
                } else {
                    if (inUnorderedList) {
                        processedLines.push('</ul>');
                        inUnorderedList = false;
                    }
                    if (inOrderedList) {
                        processedLines.push('</ol>');
                        inOrderedList = false;
                    }
                    processedLines.push(line);
                }
            }

            if (inUnorderedList) {
                processedLines.push('</ul>');
            }
            if (inOrderedList) {
                processedLines.push('</ol>');
            }

            return processedLines.join('\n');
        }

        // Initialize Twitter widgets when preview is toggled
        const originalTogglePreview = window.togglePreview;
        window.togglePreview = function() {
            if (originalTogglePreview) {
                originalTogglePreview.call(this);
            }

            // When switched to preview mode
            const previewContainer = document.getElementById('markdownPreview');
            if (previewContainer && previewContainer.style.display !== 'none') {
                // Initialize if Twitter embeds are present
                const twitterTweets = previewContainer.querySelectorAll('.twitter-tweet');
                if (twitterTweets.length > 0) {
                    twitterManager.initializeTweets(previewContainer);
                }
            }
        };

        // Twitter embed helper function
        window.insertTwitterEmbed = function() {
            const tweetUrl = prompt('Enter Twitter tweet URL:');
            if (!tweetUrl) return;

            // Twitter URL validation
            if (!tweetUrl.match(/^https?:\/\/(twitter\.com|x\.com)\/.+\/status\/\d+/)) {
                alert('Please enter a valid Twitter tweet URL.\nExample: https://twitter.com/username/status/1234567890');
                return;
            }

            const textarea = document.getElementById('editor_content');
            if (!textarea) return;

            // Basic Twitter embed code template
            const embedCode = `
<blockquote class="twitter-tweet">
<p>Loading tweet...</p>
<a href="${tweetUrl}">View Tweet</a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
`;

            insertTextAtCursor(textarea, embedCode);

            alert('Basic Twitter embed has been inserted.\n\nFor complete embeds, please use the official code generated from Twitter.');
        };

        // Insert text at cursor position in textarea
        window.insertTextAtCursor = function(textarea, text) {
            if (!textarea || !text) return;

            // Check if element is contenteditable
            const isContentEditable = textarea.contentEditable === 'true' ||
                                    textarea.getAttribute('contenteditable') === 'true';

            if (isContentEditable) {
                // For contenteditable elements
                const selection = getContentEditableSelection(textarea);
                const start = selection.start;
                const end = selection.end;
                const currentValue = textarea.innerText || textarea.textContent || '';

                // Add line breaks before/after insertion as needed
                let insertText = text;
                if (start > 0 && currentValue[start - 1] !== '\n') {
                    insertText = '\n' + insertText;
                }
                if (end < currentValue.length && currentValue[end] !== '\n') {
                    insertText = insertText + '\n';
                }

                const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end);
                textarea.innerText = newValue;
                textarea.focus();

                const newCursorPos = start + insertText.length;
                setContentEditableSelection(textarea, newCursorPos, newCursorPos);

                // Fire input event
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

            } else {
                // For regular textarea elements
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;

                // Add line breaks before/after insertion as needed
                let insertText = text;
                if (start > 0 && currentValue[start - 1] !== '\n') {
                    insertText = '\n' + insertText;
                }
                if (end < currentValue.length && currentValue[end] !== '\n') {
                    insertText = insertText + '\n';
                }

                textarea.value = currentValue.substring(0, start) + insertText + currentValue.substring(end);
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + insertText.length;

                // Fire change event for Rails form validation
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Debounce function for delayed execution
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Keyboard shortcuts
        if (textarea) {
            textarea.addEventListener('keydown', function(e) {
                try {
                    // Ctrl+B: Bold
                    if (e.ctrlKey && e.key === 'b') {
                        e.preventDefault();
                        window.insertMarkdown('**', '**');
                    }

                    // Ctrl+I: Italic
                    if (e.ctrlKey && e.key === 'i') {
                        e.preventDefault();
                        window.insertMarkdown('*', '*');
                    }

                    // Ctrl+K: Link
                    if (e.ctrlKey && e.key === 'k') {
                        e.preventDefault();
                        window.insertMarkdown('[', '](https://)');
                    }

                    // Tab: Indent
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        window.insertMarkdown('  '); // 2-space indent
                    }

                    // Ctrl+Shift+P: Toggle preview
                    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                        e.preventDefault();
                        window.togglePreview();
                    }
                } catch (error) {
                    console.error('Keyboard shortcut error:', error);
                }
            });
        }

        console.log('ponkotsu Markdown editor initialized successfully');
    });

    // Enhanced error handling
    window.addEventListener('error', function(e) {
        if (e.message.includes('markdown') || e.message.includes('slug')) {
            console.error('Markdown Editor Error:', e);
            // User-friendly error display
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-warning alert-dismissible fade show';
            errorDiv.innerHTML = `
                <strong>An error occurred in the editor</strong><br>
                Please reload the page. If the problem persists, contact the administrator.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(errorDiv, container.firstChild);
            }
        }
    });

})();