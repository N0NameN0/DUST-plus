
function injectPrePromptButton() {
    const capabilitiesBtn = document.querySelector('button[aria-label="Capabilities"]');
    if (!capabilitiesBtn) return;

    const container = capabilitiesBtn.parentElement;
    if (!container || document.getElementById('dust-preprompt-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'dust-preprompt-btn';
    btn.role = 'button';
    btn.style.cursor = 'pointer';
    btn.className = 's-inline-flex s-items-center s-justify-center s-whitespace-nowrap s-ring-offset-background s-transition-colors s-ring-inset s-select-none focus-visible:s-outline-none focus-visible:s-ring-2 focus-visible:s-ring-ring focus-visible:s-ring-offset-0 dark:focus-visible:s-ring-0 dark:focus-visible:s-ring-offset-1 s-border s-border-border/0 dark:s-border-border-night/0 s-text-muted-foreground dark:s-text-muted-foreground-night hover:s-bg-primary-100 dark:hover:s-bg-primary-900 hover:s-text-primary-900 dark:hover:s-text-primary-900-night hover:s-border-border-dark dark:hover:s-border-border-night active:s-bg-primary-300 dark:active:s-bg-primary-900 disabled:s-text-primary-400 dark:disabled:s-text-primary-400-night s-h-7 s-px-2.5 s-label-xs s-gap-1.5 s-shrink-0 s-rounded-lg';
    btn.setAttribute('aria-label', 'DUST-Plus');
    btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-text"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
  `;

    const stopEvent = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    };

    btn.addEventListener('mousedown', (e) => {
        stopEvent(e);
        toggleDropdown();
    }, true);

    btn.addEventListener('mouseup', stopEvent, true);
    btn.addEventListener('click', stopEvent, true);

    // Tooltip logic
    let tooltip = null;
    btn.onmouseenter = () => {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.id = 'dust-plus-tooltip';
        tooltip.className = 'dust-tooltip';
        tooltip.textContent = 'DUST-Plus';
        document.body.appendChild(tooltip);

        const rect = btn.getBoundingClientRect();
        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
        tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    };

    btn.onmouseleave = () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    };

    container.appendChild(btn);
}

function toggleDropdown() {
    let dropdown = document.getElementById('dust-preprompt-dropdown');
    if (dropdown) {
        dropdown.remove();
        return;
    }

    if (!chrome || !chrome.storage || !chrome.storage.local) {
        console.error("DUST-Plus: chrome.storage.local is not available. Please ensure the extension is loaded correctly.");
        return;
    }

    dropdown = document.createElement('div');
    dropdown.id = 'dust-preprompt-dropdown';
    dropdown.className = 'dust-dropdown-container';

    chrome.storage.local.get(['prePrompts'], (result) => {
        let prompts = result.prePrompts || [
            "Corrige et reformule au besoin :\n\n",
            "Propose moi une autre tournure pour ce propos :\n\n",
            "Rends ce texte plus concis :\n\n",
            "Rends ce texte plus formel/professionnel :\n\n",
            "Explique-moi comme si j'avais 10 ans :\n\n"
        ];

        prompts.forEach((text, index) => {
            const item = document.createElement('div');
            item.className = 'dust-dropdown-item';

            const textSpan = document.createElement('span');
            textSpan.textContent = text ? (text.length > 50 ? text.substring(0, 50) + '...' : text) : '(Vide - Editer)';
            textSpan.className = 'dust-item-text';
            if (!text) textSpan.style.fontStyle = 'italic';

            textSpan.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (text) insertPrompt(text);
            }, true);

            const editBtn = document.createElement('span');
            editBtn.textContent = '✎';
            editBtn.className = 'dust-edit-btn';
            editBtn.style.cursor = 'pointer';
            editBtn.style.padding = '2px 8px';

            editBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            }, true);

            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (item.querySelector('input')) return;

                const currentText = prompts[index];
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentText;
                input.className = 'dust-edit-input';

                textSpan.style.display = 'none';
                item.insertBefore(input, editBtn);
                input.focus();

                const saveEdit = () => {
                    const newText = input.value.trim();
                    if (newText !== currentText) {
                        prompts[index] = newText;
                        chrome.storage.local.set({ prePrompts: prompts }, () => {
                            textSpan.textContent = newText ? (newText.length > 50 ? newText.substring(0, 50) + '...' : newText) : '(Vide - Editer)';
                            textSpan.style.fontStyle = newText ? 'normal' : 'italic';
                            cleanup();
                        });
                    } else {
                        cleanup();
                    }
                };

                const cleanup = () => {
                    input.remove();
                    textSpan.style.display = '';
                };

                input.onkeydown = (ke) => {
                    if (ke.key === 'Enter') saveEdit();
                    if (ke.key === 'Escape') cleanup();
                };

                input.onblur = saveEdit;
                input.onclick = (ie) => ie.stopPropagation();
            }, true);

            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'dust-delete-btn';
            deleteBtn.title = 'Supprimer';

            let confirmTimeout;
            deleteBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (deleteBtn.textContent === '×') {
                    deleteBtn.textContent = 'Sure?';
                    deleteBtn.style.color = '#ef4444';
                    deleteBtn.style.fontSize = '10px';
                    confirmTimeout = setTimeout(() => {
                        deleteBtn.textContent = '×';
                        deleteBtn.style.color = '';
                        deleteBtn.style.fontSize = '';
                    }, 3000);
                } else {
                    clearTimeout(confirmTimeout);
                    prompts.splice(index, 1);
                    chrome.storage.local.set({ prePrompts: prompts }, () => {
                        const currentDropdown = document.getElementById('dust-preprompt-dropdown');
                        if (currentDropdown) currentDropdown.remove();
                        toggleDropdown();
                    });
                }
            }, true);

            item.appendChild(textSpan);
            item.appendChild(editBtn);
            item.appendChild(deleteBtn);
            dropdown.appendChild(item);
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'dust-add-btn';
        addBtn.innerHTML = '+ Ajouter un prompt';

        addBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            prompts.push("");
            chrome.storage.local.set({ prePrompts: prompts }, () => {
                const currentDropdown = document.getElementById('dust-preprompt-dropdown');
                if (currentDropdown) currentDropdown.remove();
                toggleDropdown();
            });
        }, true);

        dropdown.appendChild(addBtn);

        const footer = document.createElement('div');
        footer.className = 'dust-dropdown-footer';
        footer.innerHTML = 'DUST-Plus - by <a href="https://github.com/N0NameN0/" target="_blank" style="color: inherit; text-decoration: underline;">Antoine Santo</a>';

        // Empêcher le clic sur le lien de fermer le menu de manière inattendue ou de perdre le focus
        footer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        }, true);

        dropdown.appendChild(footer);

        const btn = document.getElementById('dust-preprompt-btn');
        const rect = btn.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 250;

        dropdown.style.left = `${rect.left}px`;

        if (spaceAbove > dropdownHeight || spaceAbove > spaceBelow) {
            dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
            dropdown.style.top = 'auto';
        } else {
            dropdown.style.top = `${rect.bottom + 8}px`;
            dropdown.style.bottom = 'auto';
        }

        dropdown.style.maxHeight = `${Math.max(spaceAbove, spaceBelow) - 20}px`;
        dropdown.style.overflowY = 'auto';

        document.body.appendChild(dropdown);
    });
}

function insertPrompt(text) {
    const editor = document.querySelector('.tiptap.ProseMirror');
    if (editor) {
        // Ne PAS faire .focus() ici car cela peut réinitialiser la position du curseur.
        // Puisque nous utilisons mousedown + preventDefault sur les boutons, 
        // l'éditeur a déjà le focus et le curseur est à la bonne place.

        document.execCommand('insertText', false, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        const dropdown = document.getElementById('dust-preprompt-dropdown');
        if (dropdown) dropdown.remove();
    }
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('dust-preprompt-dropdown');
    const btn = document.getElementById('dust-preprompt-btn');
    if (dropdown && !dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        dropdown.remove();
    }
});

const observer = new MutationObserver(() => {
    injectPrePromptButton();
});

observer.observe(document.body, { childList: true, subtree: true });
injectPrePromptButton();
