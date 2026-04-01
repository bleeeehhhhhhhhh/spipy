import { useState, useRef, useEffect, useCallback } from 'react';
import { searchUsers } from '../lib/supabase';

export default function MentionInput({
    value,
    onChange,
    onSubmit,
    placeholder = 'Type a message...',
    className = '',
    multiline = false,
    disabled = false,
    autoFocus = false,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(-1);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const searchTimeout = useRef(null);

    // Extract mentioned usernames from value
    const getMentionedUsernames = useCallback(() => {
        const matches = value.match(/@(\w+)/g);
        return matches ? matches.map(m => m.slice(1)) : [];
    }, [value]);

    // Search users when mention query changes
    useEffect(() => {
        if (mentionQuery.length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await searchUsers(mentionQuery);
                setSuggestions(results.slice(0, 6));
                setShowSuggestions(results.length > 0);
                setSelectedIdx(0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            }
            setLoading(false);
        }, 200);

        return () => clearTimeout(searchTimeout.current);
    }, [mentionQuery]);

    const handleInput = (e) => {
        const newValue = e.target.value;
        onChange(newValue);

        // Detect @ mention
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtIdx = textBeforeCursor.lastIndexOf('@');

        if (lastAtIdx >= 0) {
            const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
            // Only show suggestions if no space after @
            if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
                setMentionStart(lastAtIdx);
                setMentionQuery(textAfterAt);
                return;
            }
        }

        setMentionQuery('');
        setShowSuggestions(false);
        setMentionStart(-1);
    };

    const insertMention = (username) => {
        if (mentionStart < 0) return;
        const before = value.slice(0, mentionStart);
        const cursorPos = inputRef.current?.selectionStart || value.length;
        const after = value.slice(cursorPos);
        const newValue = `${before}@${username} ${after}`;
        onChange(newValue);
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStart(-1);

        // Focus and set cursor after mention
        setTimeout(() => {
            if (inputRef.current) {
                const pos = before.length + username.length + 2;
                inputRef.current.focus();
                inputRef.current.setSelectionRange(pos, pos);
            }
        }, 10);
    };

    const handleKeyDown = (e) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx(prev => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                if (showSuggestions) {
                    e.preventDefault();
                    insertMention(suggestions[selectedIdx].username);
                    return;
                }
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey && !multiline && onSubmit) {
            e.preventDefault();
            if (value.trim()) {
                onSubmit(value, getMentionedUsernames());
            }
        }
    };

    // Render the display text with highlighted mentions
    const renderHighlightedValue = () => {
        if (!value) return null;
        const parts = value.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                return <span key={i} className="mention-highlight">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const Tag = multiline ? 'textarea' : 'input';

    return (
        <div className={`mention-input-wrap ${className}`}>
            <div className="mention-input-container">
                <Tag
                    ref={inputRef}
                    className="mention-input-field"
                    value={value}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    rows={multiline ? 3 : undefined}
                />
                {/* Overlay for highlighted mentions */}
                <div className="mention-input-overlay" aria-hidden="true">
                    {renderHighlightedValue()}
                </div>
            </div>

            {showSuggestions && (
                <div className="mention-suggestions" ref={suggestionsRef}>
                    {loading && <div className="mention-suggestion-loading">Searching...</div>}
                    {suggestions.map((user, i) => (
                        <button
                            key={user.id}
                            className={`mention-suggestion-item ${i === selectedIdx ? 'selected' : ''}`}
                            onClick={() => insertMention(user.username)}
                            onMouseEnter={() => setSelectedIdx(i)}
                        >
                            <div className="mention-suggestion-avatar">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="mention-avatar-img" />
                                ) : '🌸'}
                            </div>
                            <div className="mention-suggestion-info">
                                <span className="mention-suggestion-name">{user.display_name || user.username}</span>
                                <span className="mention-suggestion-username">@{user.username}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
