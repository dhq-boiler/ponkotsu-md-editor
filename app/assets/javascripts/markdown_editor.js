(function() {
    'use strict';

    // DOM要素の安全な取得
    function getElement(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            console.warn('Element not found:', selector);
            return null;
        }
    }

    // DOM読み込み完了を待つ
    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    onReady(function() {
        console.log('Enhanced Markdown editor initializing...');

        // DOM要素の取得
        const textarea = getElement('.markdown-textarea');
        const previewContainer = getElement('#markdownPreview');
        const previewToggle = getElement('#previewToggle');
        const titleField = getElement('#article_title');
        const slugField = getElement('#article_slug');
        const generateBtn = getElement('#generateSlugBtn');
        const slugPreview = getElement('#slugPreview');

        let isPreviewMode = false;

        // Markdownテキスト挿入機能
        window.insertMarkdown = function(before, after) {
            after = after || '';

            if (!textarea) {
                console.warn('Textarea not found');
                return;
            }

            try {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const selectedText = textarea.value.substring(start, end);

                const beforeText = textarea.value.substring(0, start);
                const afterText = textarea.value.substring(end);
                const newText = before + selectedText + after;

                textarea.value = beforeText + newText + afterText;

                // カーソル位置調整
                const newCursorPos = selectedText.length > 0 ?
                    start + newText.length :
                    start + before.length;

                textarea.focus();
                if (textarea.setSelectionRange) {
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                }

                // 入力イベントを発火
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

            } catch (e) {
                console.error('Error inserting markdown:', e);
            }
        };

        window.insertCode = function() {
            const textarea = document.getElementById('article_content');
            const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);

            if (selectedText.includes('\n')) {
                // 改行が含まれている場合はコードブロック
                insertMarkdown('```\n', '\n```');
            } else {
                // 単一行の場合はコードスパン
                insertMarkdown('`', '`');
            }
        }

        // プレビュー切り替え機能
        window.togglePreview = function() {
            if (!textarea || !previewContainer) {
                console.warn('Preview elements not found');
                return;
            }

            try {
                isPreviewMode = !isPreviewMode;

                if (isPreviewMode) {
                    // プレビューモードに切り替え
                    const markdownText = textarea.value || '';
                    const htmlContent = convertMarkdownToHtml(markdownText);

                    previewContainer.innerHTML = htmlContent;
                    previewContainer.style.display = 'block';
                    textarea.style.display = 'none';

                    if (previewToggle) {
                        previewToggle.innerHTML = '<i class="bi bi-pencil"></i> 編集に戻る';
                    }
                } else {
                    // 編集モードに戻す
                    previewContainer.style.display = 'none';
                    textarea.style.display = 'block';

                    if (previewToggle) {
                        previewToggle.innerHTML = '<i class="bi bi-eye"></i> プレビュー';
                    }
                }
            } catch (e) {
                console.error('Error toggling preview:', e);
            }
        };

        // 許可するscriptタグのsrc（ホワイトリスト）
        const ALLOWED_SCRIPT_SOURCES = [
            'https://platform.twitter.com/widgets.js',
            'https://www.youtube.com/iframe_api',
            'https://connect.facebook.net/en_US/sdk.js',
            'https://www.instagram.com/embed.js'
        ];

        // HTMLエンティティのマップ
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

        // Twitter widgets.js の管理
        class TwitterWidgetManager {
            constructor() {
                this.loaded = false;
                this.loading = false;
                this.loadPromise = null;
            }

            // Twitter widgets.js を読み込み
            async loadWidgets() {
                if (this.loaded && window.twttr && window.twttr.widgets) {
                    return Promise.resolve();
                }

                if (this.loading) {
                    return this.loadPromise;
                }

                this.loading = true;
                this.loadPromise = new Promise((resolve, reject) => {
                    // 既に読み込まれている場合
                    if (window.twttr && window.twttr.widgets) {
                        this.loaded = true;
                        this.loading = false;
                        resolve();
                        return;
                    }

                    // 既存のscriptタグを削除
                    const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
                    if (existingScript) {
                        existingScript.remove();
                    }

                    // 新しいscriptタグを作成
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

                    // タイムアウト処理
                    setTimeout(() => {
                        if (!this.loaded) {
                            this.loading = false;
                            reject(new Error('Twitter widgets.js load timeout'));
                        }
                    }, 10000);
                });

                return this.loadPromise;
            }

            // ツイートを初期化
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

            // フォールバック表示
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

                        // エラーメッセージを追加
                        const errorDiv = document.createElement('div');
                        errorDiv.style.marginTop = '8px';
                        errorDiv.style.fontSize = '14px';
                        errorDiv.style.color = '#657786';
                        errorDiv.innerHTML = '⚠️ Twitter埋め込みの読み込みに失敗しました。上記のリンクから直接ツイートを確認してください。';

                        if (!tweet.querySelector('.twitter-error-message')) {
                            errorDiv.className = 'twitter-error-message';
                            tweet.appendChild(errorDiv);
                        }
                    }
                });
            }
        }

        // グローバルインスタンス
        const twitterManager = new TwitterWidgetManager();

        // 複合的なHTML構造の保護機能（スクリプト実行対応版）
        class HTMLSanitizer {
            constructor() {
                this.protectedElements = [];
                this.placeholderMap = new Map();
                this.placeholderCounter = 0;
                this.foundScripts = [];
            }

            // プレースホルダーの生成
            generatePlaceholder(type = 'ELEMENT') {
                const placeholder = `__PROTECTED_${type}_${this.placeholderCounter}__`;
                this.placeholderCounter++;
                return placeholder;
            }

            // HTMLエンティティを保護
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

            // Twitter埋め込み全体を保護（スクリプト分離版）
            protectTwitterEmbeds(html) {
                // Twitter scriptタグを検出・保存
                const scriptRegex = /<script[^>]*src="https:\/\/platform\.twitter\.com\/widgets\.js"[^>]*><\/script>/gi;
                html = html.replace(scriptRegex, (match) => {
                    this.foundScripts.push(match);
                    return ''; // scriptタグは削除（後で手動実行）
                });

                // blockquoteのみを保護
                const blockquoteRegex = /<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*?<\/blockquote>/gi;
                html = html.replace(blockquoteRegex, (match) => {
                    const placeholder = this.generatePlaceholder('TWITTER_BLOCKQUOTE');
                    this.protectedElements.push(match);
                    this.placeholderMap.set(placeholder, match);
                    return placeholder;
                });

                return html;
            }

            // 個別のHTMLタグを保護
            protectAllowedTags(html) {
                const allowedTags = [
                    'blockquote', 'p', 'a', 'strong', 'em', 'code', 'del', 'b', 'i', 'u',
                    'br', 'hr', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
                ];

                allowedTags.forEach(tag => {
                    // 自己完結タグ
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
                        // 開始タグ
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

                        // 終了タグ
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

            // タグの妥当性チェック
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

            // 保護されたタグを復元
            restoreProtectedElements(html) {
                // 逆順で復元
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

            // 検出されたスクリプトを取得
            getFoundScripts() {
                return this.foundScripts;
            }

            // リセット
            reset() {
                this.protectedElements = [];
                this.placeholderMap.clear();
                this.placeholderCounter = 0;
                this.foundScripts = [];
            }
        }

        // Markdown→HTML変換（スクリプト実行対応版）
        function convertMarkdownToHtml(markdown) {
            if (!markdown || typeof markdown !== 'string') {
                return '<p class="text-muted">内容がありません</p>';
            }

            try {
                const sanitizer = new HTMLSanitizer();
                let html = markdown;

                // 1. HTMLエンティティを保護
                html = sanitizer.protectHtmlEntities(html);

                // 2. Twitter埋め込みを保護（スクリプト分離）
                html = sanitizer.protectTwitterEmbeds(html);

                // 3. 個別のHTMLタグを保護
                html = sanitizer.protectAllowedTags(html);

                // 4. 残りのHTMLをエスケープ
                html = html.replace(/&(?![a-zA-Z][a-zA-Z0-9]*;)/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');

                // 5. Markdown変換
                html = processMarkdown(html);

                // 6. 保護されたHTMLタグとエンティティを復元
                html = sanitizer.restoreProtectedElements(html);

                // 7. 改行をbrタグに変換
                html = html.replace(/\n/g, '<br>');

                // 8. Twitter scriptが検出された場合は、Twitter widgets を初期化
                const foundScripts = sanitizer.getFoundScripts();
                if (foundScripts.length > 0) {
                    // 次のティック後にTwitter widgets を初期化
                    setTimeout(() => {
                        const previewContainer = document.getElementById('markdownPreview');
                        if (previewContainer && previewContainer.style.display !== 'none') {
                            twitterManager.initializeTweets(previewContainer);
                        }
                    }, 100);
                }

                return html || '<p class="text-muted">プレビュー内容がありません</p>';

            } catch (e) {
                console.error('Markdown conversion error:', e);
                return '<p class="text-danger">プレビューエラー: ' + e.message + '</p>';
            }
        }

        // Markdown処理関数
        function processMarkdown(html) {
            // コードブロック
            html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-light p-3 rounded"><code>$1</code></pre>');

            // インラインコード
            html = html.replace(/`([^`]+)`/g, '<code class="bg-light px-1 rounded">$1</code>');

            // 見出し
            html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // 水平線
            html = html.replace(/^---$/gm, '<hr>');

            // 太字・斜体・打ち消し線
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
            html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

            // 引用
            html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="blockquote border-start border-3 border-secondary ps-3 my-3"><p class="mb-0">$1</p></blockquote>');

            // チェックボックス
            html = html.replace(/^- \[x\] (.+)$/gm, '<div class="form-check my-2"><input class="form-check-input" type="checkbox" checked disabled><label class="form-check-label text-decoration-line-through">$1</label></div>');
            html = html.replace(/^- \[ \] (.+)$/gm, '<div class="form-check my-2"><input class="form-check-input" type="checkbox" disabled><label class="form-check-label">$1</label></div>');

            // 番号付きリスト
            html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

            // Markdown画像
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
                if (isValidUrl(url)) {
                    return `<img src="${url}" alt="${alt}" class="img-fluid rounded my-2" style="max-width: 100%; height: auto;" loading="lazy">`;
                }
                return match;
            });

            // リンク
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                if (isValidUrl(url)) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-pink); text-decoration: none;">${text}</a>`;
                }
                return text;
            });

            // 通常のリスト項目
            html = html.replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>');

            // リストをul/ol要素で囲む
            html = wrapListItems(html);

            return html;
        }

        // URL検証関数
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

        // リストアイテムをul/ol要素で囲む
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

        // プレビュー切り替え時にTwitter widgets を初期化
        const originalTogglePreview = window.togglePreview;
        window.togglePreview = function() {
            if (originalTogglePreview) {
                originalTogglePreview.call(this);
            }

            // プレビューモードに切り替わった場合
            const previewContainer = document.getElementById('markdownPreview');
            if (previewContainer && previewContainer.style.display !== 'none') {
                // Twitter埋め込みがある場合は初期化
                const twitterTweets = previewContainer.querySelectorAll('.twitter-tweet');
                if (twitterTweets.length > 0) {
                    twitterManager.initializeTweets(previewContainer);
                }
            }
        };

// デバッグ用：サニタイズテスト
        window.testSanitization = function() {
            const testInput = `<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">ニーアでも聞きながら作業しますかね。<a href="https://t.co/Ac9X8lEaZL">https://t.co/Ac9X8lEaZL</a></p>&mdash; ボイラー (@dhq_boiler) <a href="https://twitter.com/dhq_boiler/status/1942584009550409780?ref_src=twsrc%5Etfw">July 8, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;

            const result = convertMarkdownToHtml(testInput);
            console.log('Original:', testInput);
            console.log('Converted:', result);
            return result;
        };

        // Twitter埋め込み用のヘルパー関数
        window.insertTwitterEmbed = function() {
            const tweetUrl = prompt('TwitterのツイートURLを入力してください：');
            if (!tweetUrl) return;

            // Twitter URL検証
            if (!tweetUrl.match(/^https?:\/\/(twitter\.com|x\.com)\/.+\/status\/\d+/)) {
                alert('有効なTwitterのツイートURLを入力してください。\n例: https://twitter.com/username/status/1234567890');
                return;
            }

            const textarea = document.getElementById('article_content');
            if (!textarea) return;

            // 簡単なTwitter埋め込みコードのテンプレート
            const embedCode = `
<blockquote class="twitter-tweet">
<p>Loading tweet...</p>
<a href="${tweetUrl}">View Tweet</a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
`;

            insertTextAtCursor(textarea, embedCode);

            alert('基本的なTwitter埋め込みを挿入しました。\n\n完全な埋め込みには、Twitter公式から生成されたコードを使用してください。');
        };

        // 遅延実行のためのデバウンス関数
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

        // キーボードショートカット
        if (textarea) {
            textarea.addEventListener('keydown', function(e) {
                try {
                    // Ctrl+B: 太字
                    if (e.ctrlKey && e.key === 'b') {
                        e.preventDefault();
                        window.insertMarkdown('**', '**');
                    }

                    // Ctrl+I: 斜体
                    if (e.ctrlKey && e.key === 'i') {
                        e.preventDefault();
                        window.insertMarkdown('*', '*');
                    }

                    // Ctrl+K: リンク
                    if (e.ctrlKey && e.key === 'k') {
                        e.preventDefault();
                        window.insertMarkdown('[', '](https://)');
                    }

                    // Tab: インデント
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        window.insertMarkdown('  '); // 2スペースのインデント
                    }

                    // Ctrl+Shift+P: プレビュー切り替え
                    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                        e.preventDefault();
                        window.togglePreview();
                    }
                } catch (error) {
                    console.error('Keyboard shortcut error:', error);
                }
            });
        }

        // フォームバリデーション
        const form = getElement('.article-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                const title = titleField && titleField.value.trim();
                const content = textarea && textarea.value.trim();

                if (!title) {
                    e.preventDefault();
                    alert('タイトルを入力してください');
                    if (titleField) {
                        titleField.focus();
                        titleField.scrollIntoView({ behavior: 'smooth' });
                    }
                    return false;
                }

                if (!content) {
                    e.preventDefault();
                    alert('本文を入力してください');
                    if (textarea) {
                        textarea.focus();
                        textarea.scrollIntoView({ behavior: 'smooth' });
                    }
                    return false;
                }

                // スラッグが空の場合は最後の努力で生成
                if (slugField && !slugField.value.trim() && title) {
                    e.preventDefault();

                    generateHighQualitySlug(title).then(slug => {
                        if (slug) {
                            slugField.value = slug;
                            form.submit(); // 再送信
                        } else {
                            alert('スラッグの生成に失敗しました。手動で入力してください。');
                            slugField.focus();
                        }
                    }).catch(error => {
                        console.error('Final slug generation failed:', error);
                        alert('スラッグの生成でエラーが発生しました。手動で入力してください。');
                        slugField.focus();
                    });

                    return false;
                }

                // スラッグの形式チェック
                if (slugField && slugField.value.trim()) {
                    const slug = slugField.value.trim();
                    if (!/^[a-z0-9\-]+$/.test(slug)) {
                        e.preventDefault();
                        alert('スラッグは英小文字、数字、ハイフンのみ使用できます');
                        slugField.focus();
                        slugField.select();
                        return false;
                    }
                }
            });
        }

        // リアルタイムバリデーション
        if (slugField) {
            slugField.addEventListener('blur', function() {
                const slug = this.value.trim();
                if (slug && !/^[a-z0-9\-]+$/.test(slug)) {
                    this.classList.add('is-invalid');

                    // エラーメッセージを表示
                    let errorDiv = this.parentNode.querySelector('.invalid-feedback');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'invalid-feedback';
                        this.parentNode.appendChild(errorDiv);
                    }
                    errorDiv.textContent = '英小文字、数字、ハイフンのみ使用できます';
                } else {
                    this.classList.remove('is-invalid');
                    const errorDiv = this.parentNode.querySelector('.invalid-feedback');
                    if (errorDiv) {
                        errorDiv.remove();
                    }
                }
            });
        }

        console.log('ponkotsu Markdown editor initialized successfully');
    });

    // ページ離脱確認
    window.addEventListener('beforeunload', function(e) {
        try {
            const textarea = getElement('.markdown-textarea');
            const titleField = getElement('#article_title');

            const hasContent = (textarea && textarea.value.trim()) ||
                (titleField && titleField.value.trim());

            if (hasContent) {
                const message = '編集中の内容が失われますがよろしいですか？';
                e.returnValue = message;
                return message;
            }
        } catch (error) {
            console.error('Beforeunload error:', error);
        }
    });

    // エラーハンドリングの強化
    window.addEventListener('error', function(e) {
        if (e.message.includes('markdown') || e.message.includes('slug')) {
            console.error('Markdown Editor Error:', e);
            // ユーザーフレンドリーなエラー表示
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-warning alert-dismissible fade show';
            errorDiv.innerHTML = `
                <strong>エディタでエラーが発生しました</strong><br>
                ページを再読み込みしてください。問題が続く場合は管理者にお問い合わせください。
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(errorDiv, container.firstChild);
            }
        }
    });

})();