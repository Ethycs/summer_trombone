/**
 * clipboard.js - Copy-to-clipboard with a fallback for non-secure contexts,
 * plus the transient confirmation toast shared by both themes.
 */

export async function copyText(text) {
    if (!text) return false;

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Permission denied or insecure origin - fall through to execCommand.
        }
    }

    // Fallback: an off-screen textarea driven by the legacy copy command.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(textarea);

    try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
}

export function showCopyToast(message, anchorElement) {
    document.querySelectorAll('.copy-toast').forEach(node => node.remove());

    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    if (anchorElement) {
        const rect = anchorElement.getBoundingClientRect();
        toast.style.top = `${Math.round(rect.bottom + 8)}px`;
        toast.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
    return toast;
}

/** Flash a control to acknowledge the copy without waiting for the toast. */
export function flashCopied(element) {
    if (!element) return;
    element.classList.add('copied');
    setTimeout(() => element.classList.remove('copied'), 900);
}

/**
 * Copy `url`, then acknowledge on `control` and via a toast. Kept here so the
 * terminal window buttons and the academic controls behave identically.
 */
export async function copyShareUrl(url, control) {
    if (!url) {
        showCopyToast('No article open to link to', control);
        return false;
    }

    const copied = await copyText(url);
    if (copied) {
        flashCopied(control);
        showCopyToast('Link copied', control);
    } else {
        showCopyToast(url, control);
    }
    return copied;
}
