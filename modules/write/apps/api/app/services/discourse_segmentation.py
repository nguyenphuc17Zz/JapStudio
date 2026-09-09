"""Deterministic Pushdown Automaton (PDA) for Japanese Sentence Segmentation.

Implements a formal Pushdown Automaton with a bracket/quotation nesting stack:
  M = (Q, Sigma, Gamma, delta, q0, Z0, F)
where Gamma tracks opening delimiters 「...」, 『...』, （...）, 【...】, “...”.

Sentence delimiters (。！？!?) only trigger macro-syntactic splits when nesting depth d == 0.
Internal sentence punctuation within dialogue or parentheticals (d > 0) never breaks
the enclosing matrix sentence.
"""

import re

_TERMINAL_MARKS = set("。！？!?")
_OPENING_BRACKETS = {"「": "」", "『": "』", "（": "）", "(": ")", "【": "】", "“": "”", '"': '"'}
_CLOSING_BRACKETS = {"」": "「", "』": "『", "）": "（", ")": "(", "】": "【", "”": "“", '"': '"'}

_END_MARK = re.compile(r"[。！？!?」』”\")]?$")


def split_sentences_pda(text: str, max_sentences: int = 30) -> list[str]:
    """Segment Japanese text using a deterministic Pushdown Automaton tracking quote depth."""
    raw = text.strip()
    if not raw:
        return []

    sentences: list[str] = []
    stack: list[str] = []
    curr: list[str] = []
    i = 0
    n = len(raw)

    while i < n:
        ch = raw[i]

        # Stack manipulation for nested quotation/parentheses
        if ch in _OPENING_BRACKETS:
            # Handle symmetrical quotes (e.g. ")
            if ch == '"' and stack and stack[-1] == '"':
                stack.pop()
            else:
                stack.append(ch)
            curr.append(ch)
            i += 1
            continue
        elif ch in _CLOSING_BRACKETS:
            if stack and stack[-1] == _CLOSING_BRACKETS[ch]:
                stack.pop()
            curr.append(ch)
            i += 1
            continue

        # Check for sentence boundary at depth 0
        depth = len(stack)
        if depth == 0:
            if ch in _TERMINAL_MARKS:
                curr.append(ch)
                # Consume any immediately following closing quotes
                while i + 1 < n and raw[i + 1] in "」』）)”\"'":
                    i += 1
                    curr.append(raw[i])

                sentence_str = "".join(curr).strip(" \t\u3000\n\r")
                if sentence_str:
                    sentences.append(sentence_str)
                curr = []
                # Skip any trailing whitespace/newlines
                while i + 1 < n and raw[i + 1] in " \t\u3000\n\r":
                    i += 1
                i += 1
                continue
            elif ch == "\n":
                sentence_str = "".join(curr).strip(" \t\u3000\n\r")
                if sentence_str:
                    sentences.append(sentence_str)
                curr = []
                while i + 1 < n and raw[i + 1] in " \t\u3000\n\r":
                    i += 1
                i += 1
                continue

        curr.append(ch)
        i += 1

    remaining = "".join(curr).strip(" \t\u3000\n\r")
    if remaining:
        sentences.append(remaining)

    # Attach trailing non-delimited fragment to previous sentence if applicable
    if len(sentences) > 1:
        last_sentence = sentences[-1]
        if not any(last_sentence.endswith(mark) for mark in ("。", "！", "？", "!", "?")):
            sentences[-2] = f"{sentences[-2]}{sentences[-1]}"
            sentences.pop()

    return sentences[:max_sentences]


def split_sentences(text: str, max_sentences: int = 30) -> list[str]:
    """Split Japanese text into sentences (whitespace-stripped, non-empty).

    Sentence indexes in discourse issues refer to this exact ordering.
    """
    return split_sentences_pda(text, max_sentences=max_sentences)


def sentence_offsets(text: str, max_sentences: int = 30) -> list[int]:
    """Character offsets where each sentence starts in the original text."""
    offsets: list[int] = []
    cursor = 0
    for sentence in split_sentences(text, max_sentences):
        index = text.find(sentence, cursor)
        if index < 0:
            return offsets
        offsets.append(index)
        cursor = index + len(sentence)
    return offsets
