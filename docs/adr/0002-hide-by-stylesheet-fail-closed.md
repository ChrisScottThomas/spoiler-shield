# Hide comments with a stylesheet applied before the page draws, and fail closed

Comments are hidden by a stylesheet that is in place before YouTube draws the page. A Reveal just switches the hiding off; YouTube still loads comments in the background. When YouTube changes its layout and Spoiler Shield can't find the comments or the place for its Placeholder, comments stay hidden (fail closed), even if that means no Reveal until an update ships. Only this approach reliably guarantees comment text is never visible, not even for a moment, and it keeps permissions to running on youtube.com. A missing Reveal button is an annoyance; a spoiler can't be undone.

## Considered Options

- **Stop comments loading** (block YouTube's comment requests, load them on Reveal): rejected. It's fragile against YouTube changes, needs much wider permissions, and makes Web Store review harder.
- **Hide them with a script once they appear**: rejected, because there's always a moment when the text is on screen before the script reacts.
- **Fail open** (show comments when the extension breaks): rejected, because it produces exactly the spoiler the product exists to prevent.
