# Spoiler Shield

A Chrome extension that keeps the result of a sports game from being given away by YouTube comments, so a viewer can watch a replay or highlights without being spoiled.

## Language

**Spoiler**:
Any text that gives away what happens in a game (most often its result) before the viewer has watched it.
_Avoid_: Leak, giveaway

**Comments**:
Any viewer comment text anywhere on the **Watch Page**: the comments section, the one-comment teaser, a highlighted or pinned comment, and the comments side panel. Does not include **Live Chat Replay**.
_Avoid_: Comment section, replies, discussion

**Live Chat Replay**:
The replayed chat that runs alongside a video that was first streamed live. Out of scope: it plays in step with the video, so it can't run ahead of the viewer, and YouTube already lets the viewer close it.
_Avoid_: Chat

**Watch Page**:
The page on the desktop youtube.com site where a single video plays. Shorts, the mobile site and embedded players are not **Watch Pages**.
_Avoid_: Video page, player page

**Hidden**:
The default state of **Comments** on every **Watch Page**: replaced by the **Placeholder**, so no comment text is ever on screen, not even for a moment.
_Avoid_: Blocked, filtered, muted

**Placeholder**:
The neutral stand-in shown where **Hidden** **Comments** would be. It says the extension hid them and offers a **Reveal**.
_Avoid_: Banner, overlay, cover

**Reveal**:
The viewer's deliberate, one-click choice to show **Comments** for the video they are watching. It belongs to that one loaded video: going to another video (including autoplay), pressing Back, refreshing or opening the video in another tab all leave **Comments** **Hidden** again. It can be undone by hiding them again.
The on-screen button label "Show comments" is user-facing copy, not domain language.
_Avoid_: Unhide, unblock, show

**Safe List**:
The channels whose **Comments** the viewer has chosen never to hide. Every channel not on it is **Hidden**, in the same way a firewall blocks everything except what is allowed through.
_Avoid_: Allowlist, whitelist, exceptions, block list

**Safe Channel**:
A channel on the **Safe List**.
_Avoid_: Trusted channel, allowed channel
