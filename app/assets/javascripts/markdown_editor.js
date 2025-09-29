(function() {
    'use strict';

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

            const textarea = document.getElementById('editor_content');
            const hiddenField = document.getElementById('content_hidden_field');

            if (textarea && hiddenField) {
                const syncToHidden = () => {
                    hiddenField.value = (textarea.innerText || '').replaceAll('\u00A0', ' ');
                };
                textarea.addEventListener('input', debounce(syncToHidden, 150));
                textarea.addEventListener('blur', syncToHidden);
                // 初期化時にも同期
                syncToHidden();

                // 初期状態でプレースホルダを表示するための空要素チェック
                function updatePlaceholderVisibility() {
                    // <br>のみの場合も空とみなす
                    if (textarea.innerHTML.trim() === '&nbsp;' || textarea.innerHTML.trim() === '' || textarea.innerHTML.trim() === '\<br\>') {
                        textarea.classList.add('empty');
                    } else {
                        textarea.classList.remove('empty');
                    }
                }

                // 初期状態をチェック
                updatePlaceholderVisibility();

                // 入力時にプレースホルダの表示/非表示を制御
                textarea.addEventListener('input', debounce(updatePlaceholderVisibility, 150));
                textarea.addEventListener('blur', updatePlaceholderVisibility);
            }
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

        // カレット位置保存用変数
        let caretPosition = { start: 0, end: 0 };

        // 外部から取得できるgetter関数
        window.getCaretPosition = function() {
            return { start: caretPosition.start, end: caretPosition.end };
        };

        // カレット位置保存イベント
        if (textarea) {
            const saveCaretPosition = () => {
                if (textarea.isContentEditable || textarea.getAttribute('contenteditable') === 'true') {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        // start位置
                        const beforeStartRange = document.createRange();
                        beforeStartRange.selectNodeContents(textarea);
                        beforeStartRange.setEnd(range.startContainer, range.startOffset);
                        let startPos = beforeStartRange.toString().length;
                        // end位置
                        const beforeEndRange = document.createRange();
                        beforeEndRange.selectNodeContents(textarea);
                        beforeEndRange.setEnd(range.endContainer, range.endOffset);
                        let endPos = beforeEndRange.toString().length;

                        function scanOffset(pos) {
                            // キャッシュを追加
                            if (this._scanOffsetCache && this._scanOffsetCache.pos === pos) {
                                return this._scanOffsetCache.result;
                            }

                            // HTML全体を一度だけ取得（これは良い改善）
                            const fullHTML = textarea.innerHTML;
                            const fullText = textarea.innerText;

                            let offset = pos;
                            let lastAdded = -1;
                            let iterations = 0;
                            const MAX_ITERATIONS = 100; // より安全な上限

                            while (iterations < MAX_ITERATIONS) {
                                const htmlUpTo = fullHTML.substring(0, offset);
                                const textUpTo = fullText.substring(0, offset);

                                // 元の正規表現を維持（安全性優先）
                                const brCount = (htmlUpTo.match(/<br\s*\/?>(?![\w\W]*<)/g) || []).length;
                                const nlCount = (textUpTo.match(/\n/g) || []).length;

                                const added = brCount + nlCount;
                                if (added === lastAdded) break;

                                offset = pos + added;
                                lastAdded = added;
                                iterations++;
                            }

                            if (iterations >= MAX_ITERATIONS) {
                                console.warn('scanOffset: Maximum iterations reached, possible infinite loop');
                            }

                            // 結果をキャッシュ
                            this._scanOffsetCache = { pos: pos, result: offset };

                            return offset;
                        }
                        startPos = scanOffset(startPos);
                        endPos = scanOffset(endPos);
                        // -----------------------------------

                        caretPosition.start = startPos;
                        caretPosition.end = endPos;
                    } else {
                        caretPosition.start = 0;
                        caretPosition.end = 0;
                    }
                } else {
                    caretPosition.start = textarea.selectionStart;
                    caretPosition.end = textarea.selectionEnd;
                }
            };
            textarea.addEventListener('input', debounce(saveCaretPosition, 100));
            textarea.addEventListener('keyup', saveCaretPosition);
            textarea.addEventListener('click', saveCaretPosition);
        }

        const sampleHtml = "aaa bbb ccc ddd eee\n" +
            "    \n" +
            "  <div>aaa bbb ccc ddd eee</div><div><br></div><div>###  aaa bbb ccc ddd eee</div><div></div><div>####</div><div><br></div><div>aaa bbb ccc ddd eee</div>";

        const actual = analyzeHtml(sampleHtml);

        function assertEqual(actual, expected, message) {
            if (actual !== expected) {
                console.error('Assertion failed:' + message + '\n' +
                    'Expected:' + expected + '\n' +
                    'Actual:', actual);
            } else {
                console.log('Assertion passed:', message);
            }
        }

        assertEqual(actual[0], 'aaa bbb ccc ddd eee\n    \n  ', "Line 1");
        assertEqual(actual[1], `aaa bbb ccc ddd eee`, "Line 2");
        assertEqual(actual[2], "⹉", "Line 3 (empty line)");
        assertEqual(actual[3], "###  aaa bbb ccc ddd eee", "Line 4");
        assertEqual(actual[4], "####", "Line 5 (header only)");
        assertEqual(actual[5], "⹉", "Line 6 (empty line)");
        assertEqual(actual[6], "aaa bbb ccc ddd eee", "Line 7");

        // Selection range utilities for contenteditable elements (precision enhanced version)
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

            // innerText-based position calculation (most accurate)
            let startPos = 0;
            let endPos = 0;
            let foundStart = false;
            let foundEnd = false;

            // Process all text nodes sequentially
            let cumulativeLength = 0;

            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                const nodeText = textNode.textContent;
                const nodeLength = nodeText.length;

                // Identify start position
                if (!foundStart && textNode === range.startContainer) {
                    startPos = cumulativeLength + range.startOffset;
                    foundStart = true;
                }

                // Identify end position (exclusive)
                if (!foundEnd && textNode === range.endContainer) {
                    endPos = cumulativeLength + range.endOffset;
                    foundEnd = true;
                    break;
                }

                cumulativeLength += nodeLength;
            }

            // Fallback: Handle DOM structure and innerText inconsistencies
            if (!foundStart || !foundEnd) {
                console.warn('Using fallback position calculation');

                // Get text before selection range
                const preRange = document.createRange();
                preRange.selectNodeContents(element);
                preRange.setEnd(range.startContainer, range.startOffset);
                const preText = preRange.toString();

                // Get selected range text
                const selectedRangeText = range.toString();

                // Calculate accurate position by matching with innerText
                startPos = fullText.indexOf(preText) >= 0 ?
                    preText.length :
                    fullText.indexOf(selectedRangeText);

                if (startPos < 0) startPos = 0;
                endPos = startPos + selectedRangeText.length;
            }

            // Boundary checks
            startPos = Math.max(0, Math.min(startPos, fullText.length));
            endPos = Math.max(startPos, Math.min(endPos, fullText.length));

            // Get actual selected text from innerText
            let selectedText = fullText.substring(startPos, endPos);
            // --- 強化: range.toString()優先 ---
            const rangeText = range.toString();
            // どちらが正しいか比較（長い方を優先）
            if (rangeText.length >= selectedText.length) {
                selectedText = rangeText;
            }

            // === 厳密化: selectedTextがfullText.slice(startPos, endPos)と一致しない場合、fullText内でselectedTextの位置を検索 ===
            if (selectedText && fullText.slice(startPos, endPos) !== selectedText) {
                const idx = fullText.indexOf(selectedText);
                if (idx !== -1) {
                    startPos = idx;
                    endPos = idx + selectedText.length;
                }
            }

            // === デバッグ出力 ===
            console.log('[DEBUG] getContentEditableSelection');
            console.log('fullText:', JSON.stringify(fullText));
            console.log('startPos:', startPos, 'endPos:', endPos);
            console.log('selectedText:', JSON.stringify(selectedText));
            console.log('rangeText:', JSON.stringify(rangeText));
            console.log('textNodes:', textNodes.map(n => n.textContent));
            console.log('range.startContainer:', range.startContainer);
            console.log('range.startOffset:', range.startOffset);
            console.log('range.endContainer:', range.endContainer);
            console.log('range.endOffset:', range.endOffset);
            // ===================

            return {
                start: startPos,
                end: endPos,
                selectedText: selectedText
            };
        }
        // 外部公開
        window.getContentEditableSelection = getContentEditableSelection;

        // Set selection range at specified position (precision enhanced version)
        function setContentEditableSelection(element, start, end) {
            element.focus();

            const fullText = element.innerText;

            // Range validation
            start = Math.max(0, Math.min(start, fullText.length));
            end = Math.max(start, Math.min(end, fullText.length));

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

            // Fallback for missing text nodes
            if (textNodes.length === 0) {
                console.warn('No text nodes found, recreating content');
                element.textContent = fullText;

                // Get text nodes again
                const newWalker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                while (node = newWalker.nextNode()) {
                    textNodes.push(node);
                }
            }

            // Calculate cumulative positions of text nodes
            let cumulativeOffset = 0;
            let startNode = null, startOffset = 0;
            let endNode = null, endOffset = 0;

            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                const nodeLength = textNode.textContent.length;

                // Find start position
                if (!startNode && cumulativeOffset + nodeLength >= start) {
                    startNode = textNode;
                    startOffset = start - cumulativeOffset;
                }

                // Find end position
                if (!endNode && cumulativeOffset + nodeLength >= end) {
                    endNode = textNode;
                    endOffset = end - cumulativeOffset;
                    break;
                }

                cumulativeOffset += nodeLength;
            }

            // Enhanced fallback processing
            if (!startNode && textNodes.length > 0) {
                startNode = textNodes[textNodes.length - 1];
                startOffset = Math.min(start, startNode.textContent.length);
            }

            if (!endNode && textNodes.length > 0) {
                endNode = textNodes[textNodes.length - 1];
                endOffset = Math.min(end, endNode.textContent.length);
            }

            if (startNode && endNode) {
                try {
                    // Safe boundary setting
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
                    // Final fallback
                    try {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        range.collapse(false);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } catch (fallbackError) {
                        console.error('Fallback selection failed:', fallbackError);
                    }
                }
            } else {
                console.warn('Could not establish selection nodes');
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

        function getLineAndCharIndex(container, offset) {
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentOffset = 0;
            let lineNumber = 0;
            let charInLine = 0;
            let node;

            while (node = walker.nextNode()) {
                const nodeText = node.textContent;
                const nodeLength = nodeText.length;

                if (currentOffset + nodeLength >= offset) {
                    const offsetInNode = offset - currentOffset;
                    const textBeforeOffset = nodeText.substring(0, offsetInNode);

                    const allTextBefore = container.textContent.substring(0, currentOffset + offsetInNode);
                    const linesBeforeOffset = allTextBefore.split('\n');

                    lineNumber = linesBeforeOffset.length - 1;
                    charInLine = linesBeforeOffset[linesBeforeOffset.length - 1].length;

                    break;
                }

                currentOffset += nodeLength;
            }

            return { line: lineNumber, char: charInLine };
        }

        function getOffsetInContainer(container, node, offset) {
            // DOM構造をリニアに変換して位置を計算
            function buildLinearTextMap(container) {
                let textMap = [];
                let currentPos = 0;

                function processNode(node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent;
                        textMap.push({
                            node: node,
                            type: 'text',
                            start: currentPos,
                            end: currentPos + text.length,
                            text: text
                        });
                        currentPos += text.length;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'DIV') {
                            if (node.children.length === 1 && node.children[0].tagName === 'BR') {
                                textMap.push({
                                    node: node,
                                    type: 'div-br',
                                    start: currentPos,
                                    end: currentPos + 1,
                                    text: '\n'
                                });
                                currentPos += 1;
                                return;
                            } else if (node.innerHTML === '<br>' || node.innerHTML === '<br/>' || node.innerHTML === '') {
                                textMap.push({
                                    node: node,
                                    type: 'empty-div',
                                    start: currentPos,
                                    end: currentPos + 1,
                                    text: '\n'
                                });
                                currentPos += 1;
                                return;
                            }
                        } else if (node.tagName === 'BR') {
                            textMap.push({
                                node: node,
                                type: 'br',
                                start: currentPos,
                                end: currentPos + 1,
                                text: '\n'
                            });
                            currentPos += 1;
                            return;
                        }

                        // 子ノードを処理
                        for (let child of node.childNodes) {
                            processNode(child);
                        }
                    }
                }

                // コンテナの直接の子ノードから開始
                for (let child of container.childNodes) {
                    processNode(child);
                }

                return textMap;
            }

            const textMap = buildLinearTextMap(container);

            // 対象ノードを見つけて位置を計算
            for (let item of textMap) {
                if (item.node === node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return item.start + offset;
                    } else {
                        // 要素ノードの場合は内部オフセットを計算
                        let internalOffset = 0;
                        for (let i = 0; i < offset && i < node.childNodes.length; i++) {
                            const child = node.childNodes[i];
                            if (child.nodeType === Node.TEXT_NODE) {
                                internalOffset += child.textContent.length;
                            } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR') {
                                internalOffset += 1;
                            }
                        }
                        return item.start + internalOffset;
                    }
                }
            }

            return 0;
        }

        function selectLineNumberAndCharIndex(beginEndLenStrings, beginCharIndex, endCharIndex) {
            let retBeginLine = 0, retBeginCharIndex = 0;
            let retEndLine = 0, retEndCharIndex = 0;
            let emptyLineCount = 0;

            for (let i = 0; i < beginEndLenStrings.length; i++) {
                const line = beginEndLenStrings[i];

                if (line.str === "⹉") {
                    emptyLineCount++;
                }

                if (beginCharIndex >= line.begin && beginCharIndex <= line.end) {
                    retBeginLine = i;
                    retBeginCharIndex = beginCharIndex - line.begin + emptyLineCount;
                    break;
                }
            }

            emptyLineCount = 0;

            for (let i = 0; i < beginEndLenStrings.length; i++) {
                const line = beginEndLenStrings[i];

                if (line.str === "⹉") {
                    emptyLineCount++;
                }

                if (endCharIndex >= line.begin && endCharIndex <= line.end) {
                    retEndLine = i;
                    retEndCharIndex = endCharIndex - line.begin + emptyLineCount;
                    break;
                }
            }

            return { begin: { line: retBeginLine, char: retBeginCharIndex }, end: { line: retEndLine, char: retEndCharIndex } };
        }

        function replaceLineNumberAndCharIndex(beginEndLenStrings, targetTextPosition, before, after) {
            let newLines = [];
            for (let i = 0; i < beginEndLenStrings.length; i++) {
                const line = beginEndLenStrings[i];

                // 改行行は変更せずそのまま保持
                if (line.str === "⹉") {
                    newLines.push(line.str);
                    continue;
                }

                if (i === targetTextPosition.begin.line && i === targetTextPosition.end.line) {
                    const first = line.str.substring(0, targetTextPosition.begin.char);
                    const target = line.str.substring(targetTextPosition.begin.char, targetTextPosition.end.char);
                    const last = line.str.substring(targetTextPosition.end.char);
                    newLines.push(first + before + target + after + last);
                }
                else if (i === targetTextPosition.begin.line) {
                    const first = line.str.substring(0, targetTextPosition.begin.char);
                    const target = line.str.substring(targetTextPosition.begin.char);
                    newLines.push(first + before + target + after);
                }
                else if (i === targetTextPosition.end.line) {
                    const target = line.str.substring(0, targetTextPosition.end.char);
                    const last = line.str.substring(targetTextPosition.end.char);
                    newLines.push(before + target + after + last);
                }
                else {
                    newLines.push(line.str);
                }
            }
            return newLines;
        }

        function replaceLine(beginEndLenStrings, selectedLine, before, after) {

            let newLines = [];
            for (let i = 0; i < beginEndLenStrings.length; i++) {
                const line = beginEndLenStrings[i];
                if (i === selectedLine) {
                    let addingSpace = "";
                    if (!line.str.startsWith(" ")) {
                        addingSpace += " ";
                    }
                    newLines.push(before + addingSpace + line.str + after);
                } else {
                    newLines.push(line.str);
                }
            }

            return newLines;
        }

        function convertToInnerHtml(newLines) {
            let html = "";
            for (let i = 0; i < newLines.length; i++) {
                if (i === 0) {
                    html += newLines[i].split("⹉").join("");
                } else {
                    let insert = newLines[i];
                    if (insert === "⹉") {
                        insert = insert.split("⹉").join("<br>");
                    } else {
                        insert = insert.split("⹉").join("");
                    }
                    html += "<div>" + insert + "</div>";
                }
            }
            return html;
        }

        function getCurrentLineIndex(beginEndLenStrings) {
            const selection = window.getSelection();
            if (!selection.rangeCount) {
                return null;
            }

            const range = selection.getRangeAt(0);

            if (!range.collapsed) {
                return null;
            }

            const beforeCursorText = getTextBeforeCursor(range.startContainer, range.startOffset, beginEndLenStrings);
            const beforeCursorTextLength = beforeCursorText.length;
            let selectedLine = -1;
            for (let i = 0; i < beginEndLenStrings.length; i++) {
                const line = beginEndLenStrings[i];
                if (line.begin <= beforeCursorTextLength && beforeCursorTextLength <= line.end) {
                    selectedLine = i;
                    break;
                }
            }
            return {
                line: selectedLine
            };
        }

        function getTextBeforeCursor(container, offset, beginEndLenStrings) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return '';

            const range = selection.getRangeAt(0);
            const textarea = document.getElementById('editor_content');

            try {
                // 全テキストとカーソル位置を取得
                const fullText = textarea.innerText || '';
                const text = getCursorPositionInInnerText(textarea, range.startContainer, range.startOffset);
                return text;
            } catch (error) {
                console.error('Error in getTextBeforeCursor:', error);
                return '';
            }
        }

        function getCursorPositionInInnerText(container, cursorNode, cursorOffset) {
            try {
                const beforeRange = document.createRange();
                beforeRange.setStart(container, 0);
                beforeRange.setEnd(cursorNode, cursorOffset);

                // cloneContentsを使用してDOM構造を保持
                const fragment = beforeRange.cloneContents();
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(fragment);

                // innerTextで正確な文字数を取得（空行も含む）
                const r = analyzeHtml(tempDiv.innerHTML.replace('\n    \n  ', ''), true).join('');
                return r;

            } catch (error) {
                console.error('Position calculation failed:', error);
                return 0;
            }
        }

        const analyzeHtmlCache = new Map();

        function analyzeHtml(target, isCountEmptyDiv = false) {

            const cacheKey = `${target}_${isCountEmptyDiv}`;

            if (analyzeHtmlCache.has(cacheKey)) {
                return analyzeHtmlCache.get(cacheKey);
            }

            let lines = [];
            let remain = target;

            while (remain.length > 0) {
                // <div><br></div> パターン（改行）- 常に維持
                if (remain.startsWith("<div><br></div>")) {
                    lines.push("⹉");
                    remain = remain.substring(15);
                    continue;
                }

                // <div></div> パターン（空のdiv）- isCountEmptyDivで制御
                if (remain.startsWith("<div></div>")) {
                    if (isCountEmptyDiv) {
                        lines.push("⹉");
                    }
                    remain = remain.substring(11);
                    continue;
                }

                // <div>内容</div> パターン
                const divMatch = remain.match(/^<div>([^<]*)<\/div>/);
                if (divMatch) {
                    lines.push(divMatch[1]);
                    remain = remain.substring(divMatch[0].length);
                    continue;
                }

                // <br> パターン（単体の改行）
                if (remain.startsWith("<br>")) {
                    lines.push("⹉");
                    remain = remain.substring(4);
                    continue;
                }

                // <div> の開始を探す
                const divIndex = remain.indexOf("<div>");
                if (divIndex > 0) {
                    lines.push(remain.substring(0, divIndex));
                    remain = remain.substring(divIndex);
                    continue;
                }

                // その他のタグまたは残りのテキスト
                const nextTagIndex = remain.indexOf("<");
                if (nextTagIndex === -1) {
                    if (remain.trim()) {
                        lines.push(remain);
                    }
                    break;
                }

                if (nextTagIndex > 0) {
                    lines.push(remain.substring(0, nextTagIndex));
                    remain = remain.substring(nextTagIndex);
                } else {
                    const tagEnd = remain.indexOf(">");
                    if (tagEnd !== -1) {
                        remain = remain.substring(tagEnd + 1);
                    } else {
                        break;
                    }
                }
            }

            if (analyzeHtmlCache.size > 100) {
                const firstKey = analyzeHtmlCache.keys().next().value;
                analyzeHtmlCache.delete(firstKey);
            }

            analyzeHtmlCache.set(cacheKey, lines);
            return lines;
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

                let lines = analyzeHtml(textarea.innerHTML.replace('\n    \n  ', ''));

                // === 修正部分：DOM構造に基づいたテキスト表現を構築 ===
                let domBasedText = '';
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i] === "⹉") {
                        domBasedText += '\n'; // 改行として1文字
                    } else {
                        domBasedText += lines[i];
                    }
                }

                // beginEndLenStringsをDOM構造ベースで構築
                let offset = 0;
                let beginEndLenStrings = [];
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    let actualLength;

                    if (line === "⹉") {
                        actualLength = 1; // 改行として1文字
                    } else {
                        actualLength = line.length;
                    }

                    beginEndLenStrings.push({
                        begin: offset,
                        end: offset + actualLength,
                        len: actualLength,
                        str: line,
                    });
                    offset += actualLength;
                }
                // ===================================================

                // len:0のものを削除（元の処理を保持）
                beginEndLenStrings = beginEndLenStrings.filter(line => line.len > 0 || line.str === "⹉");
                if (beginEndLenStrings.length === 0) {
                    beginEndLenStrings.push({
                        begin: 0,
                        end: 1,
                        len: 1,
                        str: "⹉",
                        emptyLineCount: 1
                    });
                }

                // 選択範囲の取得
                const selection = window.getSelection();

                let selectLineMode = false;
                let selectedLinePos;

                if (!selection.rangeCount || selection.isCollapsed) {
                    // 行選択モード
                    selectLineMode = true;
                    selectedLinePos = getCurrentLineIndex(beginEndLenStrings);
                }

                const range = selection.getRangeAt(0);

                if (!textarea.contains(range.commonAncestorContainer) &&
                    range.commonAncestorContainer !== textarea) {
                    return;
                }

                const startOffset = getOffsetInContainer(textarea, range.startContainer, range.startOffset);
                const endOffset = getOffsetInContainer(textarea, range.endContainer, range.endOffset);

                // === デバッグ出力（削除可能）===
                console.log('DOM-based text:', JSON.stringify(domBasedText));
                console.log('beginEndLenStrings:', beginEndLenStrings);
                console.log('Selection offsets:', startOffset, endOffset);
                console.log('Selected text should be:', JSON.stringify(domBasedText.substring(startOffset, endOffset)));
                // =============================

                const startPos = getLineAndCharIndex(textarea, startOffset);
                const endPos = getLineAndCharIndex(textarea, endOffset);

                const selectedTextContent = selection.toString();

                const targetTextPosition = selectLineNumberAndCharIndex(beginEndLenStrings, startOffset, endOffset);

                const newLines = !selectLineMode
                    ? replaceLineNumberAndCharIndex(beginEndLenStrings, targetTextPosition, before, after)
                    : replaceLine(beginEndLenStrings, selectedLinePos.line, before, after);

                const newFullHTML = convertToInnerHtml(newLines);

                if (isContentEditable) {
                    textarea.innerHTML = newFullHTML;
                    textarea.focus();

                    // 挿入されたテキストノードを直接探してカーソルを設定
                    const insertedText = selectedTextContent.length > 0 ?
                        (before + selectedTextContent + after) :
                        (before + after);

                    // 新しく挿入されたテキストの終端を探す
                    const walker = document.createTreeWalker(
                        textarea,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    let foundNode = null;
                    let foundOffset = 0;
                    let node;

                    while (node = walker.nextNode()) {
                        if (node.textContent.includes(insertedText)) {
                            // 挿入されたテキストを含むノードを発見
                            const textIndex = node.textContent.indexOf(insertedText);
                            if (textIndex !== -1) {
                                foundNode = node;
                                foundOffset = textIndex + insertedText.length;
                                break;
                            }
                        }
                    }

                    if (foundNode) {
                        // 見つかったテキストノード内にカーソルを設定
                        const range = document.createRange();
                        range.setStart(foundNode, Math.min(foundOffset, foundNode.textContent.length));
                        range.collapse(true);

                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // フォールバック: 従来の方法
                        const newDomText = buildDomBasedText(textarea);
                        const targetPosition = Math.min(
                            startOffset + insertedText.length,
                            newDomText.length
                        );
                        setContentEditableSelection(textarea, targetPosition, targetPosition);
                    }
                }

                // Fire input event
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

            } catch (e) {
                console.error('Error inserting markdown:', e);
            }
        };

        function buildDomBasedText(element) {
            const lines = analyzeHtml(element.innerHTML);
            let domText = '';
            for (let line of lines) {
                if (line === "⹉") {
                    domText += '\n';
                } else {
                    domText += line;
                }
            }
            return domText;
        }

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

        // Apply Markdown formatting (generic and tested implementation)
        function applyMarkdownFormatting(before, after, options = {}) {
            // Default options
            const defaultOptions = {
                cursorBetweenMarkers: true,
                selectAfterApply: false,
                preserveSelection: false
            };
            const opts = { ...defaultOptions, ...options };

            // Check if we're working with contenteditable element
            const activeElement = document.activeElement;
            const isContentEditable = activeElement && activeElement.contentEditable === 'true';

            if (isContentEditable) {
                return applyMarkdownToContentEditable(activeElement, before, after, opts);
            } else if (textarea) {
                return applyMarkdownToTextarea(textarea, before, after, opts);
            }
        }

        // Apply Markdown to contenteditable element (main implementation with line break preservation)
        function applyMarkdownToContentEditable(element, before, after, options) {
            const selection = window.getSelection();

            // If no selection, insert markers at cursor position
            if (selection.rangeCount === 0) {
                const currentPos = getCaretPosition(element);
                insertTextAtPosition(element, currentPos, before + after);
                setTimeout(() => {
                    setCaretPosition(element, currentPos + before.length);
                }, 10);
                return { success: true };
            }

            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            console.log('Markdown apply debug:');
            console.log('Selected text:', JSON.stringify(selectedText));
            console.log('Before markup:', JSON.stringify(before));
            console.log('After markup:', JSON.stringify(after));

            if (selectedText.length === 0) {
                // No selection - insert markers at cursor position
                const currentPos = getCaretPosition(element);
                insertTextAtPosition(element, currentPos, before + after);
                setTimeout(() => {
                    setCaretPosition(element, currentPos + before.length);
                }, 10);
                return { success: true };
            }

            // Use DOM manipulation to preserve line breaks
            try {
                const newText = before + selectedText + after;

                // Delete selected content and insert new text node
                range.deleteContents();
                const textNode = document.createTextNode(newText);
                range.insertNode(textNode);

                // Set cursor position after the inserted text
                const newRange = document.createRange();
                newRange.setStartAfter(textNode);
                newRange.collapse(true);

                const newSelection = window.getSelection();
                newSelection.removeAllRanges();
                newSelection.addRange(newRange);

                console.log('DOM replacement completed successfully');

                // Fire input event for change detection
                element.dispatchEvent(new Event('input', { bubbles: true }));

                return {
                    success: true,
                    selectedText: selectedText,
                    appliedFormatting: { before, after }
                };

            } catch (error) {
                console.error('DOM replacement failed:', error);

                // Fallback: Use Range API for text replacement
                try {
                    const beforeRange = document.createRange();
                    beforeRange.selectNodeContents(element);
                    beforeRange.setEnd(range.startContainer, range.startOffset);
                    const beforeText = beforeRange.toString();

                    const afterRange = document.createRange();
                    afterRange.selectNodeContents(element);
                    afterRange.setStart(range.endContainer, range.endOffset);
                    const afterText = afterRange.toString();

                    const newFullText = beforeText + before + selectedText + after + afterText;
                    element.innerText = newFullText;

                    const newCursorPos = beforeText.length + before.length + selectedText.length + after.length;
                    setTimeout(() => {
                        setCaretPosition(element, newCursorPos);
                    }, 10);

                    element.dispatchEvent(new Event('input', { bubbles: true }));

                    return {
                        success: true,
                        selectedText: selectedText,
                        appliedFormatting: { before, after }
                    };

                } catch (fallbackError) {
                    console.error('Fallback replacement failed:', fallbackError);
                    return { success: false, error: fallbackError };
                }
            }
        }

        // Helper function to get caret position in contenteditable element
        function getCaretPosition(element) {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return 0;

            const range = selection.getRangeAt(0);
            const beforeRange = document.createRange();
            beforeRange.selectNodeContents(element);
            beforeRange.setEnd(range.startContainer, range.startOffset);
            return beforeRange.toString().length;
        }

        // Helper function to set caret position in contenteditable element
        function setCaretPosition(element, position) {
            const text = element.innerText;
            position = Math.max(0, Math.min(position, text.length));

            // Get text nodes using TreeWalker
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentPos = 0;
            let node;

            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;

                if (currentPos + nodeLength >= position) {
                    const offset = position - currentPos;
                    const range = document.createRange();
                    range.setStart(node, offset);
                    range.collapse(true);

                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                }

                currentPos += nodeLength;
            }

            // Fallback: set cursor at the end
            if (element.childNodes.length > 0) {
                const range = document.createRange();
                range.selectNodeContents(element);
                range.collapse(false);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        // Helper function to insert text at specific position in contenteditable element
        function insertTextAtPosition(element, position, text) {
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentPos = 0;
            let node;

            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;

                if (currentPos + nodeLength >= position) {
                    const offset = position - currentPos;

                    // Insert text at the specific position within the text node
                    const range = document.createRange();
                    range.setStart(node, offset);
                    range.collapse(true);

                    const textNode = document.createTextNode(text);
                    range.insertNode(textNode);
                    return;
                }

                currentPos += nodeLength;
            }

            // Fallback: append to the end
            const textNode = document.createTextNode(text);
            element.appendChild(textNode);
        }

        // Apply Markdown to textarea (fallback for traditional textarea)
        function applyMarkdownToTextarea(textarea, before, after, options) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);

            const beforeText = textarea.value.substring(0, start);
            const afterText = textarea.value.substring(end);

            let newText;
            let newCursorPos;

            if (selectedText.length > 0) {
                newText = beforeText + before + selectedText + after + afterText;

                if (options.preserveSelection) {
                    const newStart = start + before.length;
                    const newEnd = newStart + selectedText.length;
                    textarea.setSelectionRange(newStart, newEnd);
                } else if (options.selectAfterApply) {
                    const newStart = start;
                    const newEnd = start + before.length + selectedText.length + after.length;
                    textarea.setSelectionRange(newStart, newEnd);
                } else {
                    newCursorPos = start + before.length + selectedText.length + after.length;
                }
            } else {
                newText = beforeText + before + after + afterText;

                if (options.cursorBetweenMarkers) {
                    newCursorPos = start + before.length;
                } else {
                    newCursorPos = start + before.length + after.length;
                }
            }

            textarea.value = newText;
            textarea.focus();

            if (newCursorPos !== undefined) {
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }

            return {
                success: true,
                originalText: beforeText + selectedText + afterText,
                newText: newText,
                selectedText: selectedText,
                appliedFormatting: { before, after }
            };
        }

        // Specific formatting functions using the generic implementation
        function applyBold() {
            return applyMarkdownFormatting('**', '**', { cursorBetweenMarkers: true });
        }

        function applyItalic() {
            return applyMarkdownFormatting('*', '*', { cursorBetweenMarkers: true });
        }

        function applyStrikethrough() {
            return applyMarkdownFormatting('~~', '~~', { cursorBetweenMarkers: true });
        }

        function applyCode() {
            return applyMarkdownFormatting('`', '`', { cursorBetweenMarkers: true });
        }

        function applyLink() {
            return applyMarkdownFormatting('[', '](https://)', {
                cursorBetweenMarkers: false,
                selectAfterApply: false
            });
        }

        function applyHeading(level = 2) {
            const marker = '#'.repeat(Math.max(1, Math.min(6, level))) + ' ';
            return applyMarkdownFormatting(marker, '', {
                cursorBetweenMarkers: false
            });
        }

        function applyList() {
            return applyMarkdownFormatting('- ', '', {
                cursorBetweenMarkers: false
            });
        }

        function applyOrderedList() {
            return applyMarkdownFormatting('1. ', '', {
                cursorBetweenMarkers: false
            });
        }

        function applyBlockquote() {
            return applyMarkdownFormatting('> ', '', {
                cursorBetweenMarkers: false
            });
        }

        function applyTable() {
            const tableMarkdown = '| 列1 | 列2 | 列3 |<br>|-----|-----|-----|<br>| セル1 | セル2 | セル3 |<br>| セル4 | セル5 | セル6 |<br><br>';
            insertMarkdown(tableMarkdown, '');
        }

        // Enhanced code function with block detection
        function applyCodeSmart() {
            const activeElement = document.activeElement;
            const isContentEditable = activeElement && activeElement.contentEditable === 'true';

            let selectedText;
            if (isContentEditable) {
                const selection = getContentEditableSelection(activeElement);
                selectedText = selection.selectedText;
            } else if (textarea) {
                selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
            }

            if (selectedText && selectedText.includes('\n')) {
                // Use code block if line breaks are included
                return applyMarkdownFormatting('```\n', '\n```', {
                    cursorBetweenMarkers: false
                });
            } else {
                // Use inline code for single line
                return applyCode();
            }
        }

        // Expose functions globally
        window.applyMarkdownFormatting = applyMarkdownFormatting;
        window.applyBold = applyBold;
        window.applyItalic = applyItalic;
        window.applyStrikethrough = applyStrikethrough;
        window.applyCode = applyCode;
        window.applyCodeSmart = applyCodeSmart;
        window.applyLink = applyLink;
        window.applyHeading = applyHeading;
        window.applyList = applyList;
        window.applyOrderedList = applyOrderedList;
        window.applyBlockquote = applyBlockquote;
        window.applyTable = applyTable;

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
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #e91e63; text-decoration: none;">${text}</a>`;
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

    // === テスト用関数群 ===
    // 1. 選択範囲検出
    window.testGetSelection = function(element) {
        return getContentEditableSelection(element);
    };

    // 2. Boldデコレーション（trim処理なし、選択範囲そのまま）
    window.testDecorateBold = function(text) {
        return `**${text}**`;
    };

    // 3. テキスト上書き
    window.testReplaceTextAtRange = function(fullText, start, end, decoratedText, selectedText) {
        // 通常はstart～endで置換
        if (fullText.slice(start, end) === selectedText) {
            return fullText.slice(0, start) + decoratedText + fullText.slice(end);
        }
        // 一致しない場合は、fullText内でselectedTextの最初の出現位置を検索して置換
        const idx = fullText.indexOf(selectedText, start);
        if (idx !== -1) {
            return fullText.slice(0, idx) + decoratedText + fullText.slice(idx + selectedText.length);
        }
        // それでも見つからない場合は、start～endで強制置換
        return fullText.slice(0, start) + decoratedText + fullText.slice(end);
    };

})();
