# Joplin Extract Paragraphs

Plugin to extract and combine paragraph blocks from any selected notes to a single new note based on a keyword, hashtag or custom tag contained within the paragraph. This is similar to block functionality in other note taking systems like Logseq.

Typical useage is to identify paragraphs with added hashtags (e.g., #mytag). Then, any paragraph with that tag in multiple notes can be copied and added to a single new note. However, keywords do not have to be hashtags and can just be a simple search word to identify and extract the paragraph.

Example screenshots can be found here: https://discourse.joplinapp.org/t/plugin-extract-paragraphs/35831

Bullet and sub-bullet lists are treated as single paragraphs in Joplin. Settings will allow for extracting single bullets (along with their sub-bullets) that contain the keyword rather than all the bullets in the paragraph.

**The full note can be extracted** if the hashtagged keyword is by iteself in the last paragraph. This is useful if you do not wish to add the same hashtag to every paragraph if the entire note is useful.

Any Joplin tags in the source notes will be combined as Joplin tags in the extracted note. Selected notes are not changed at all.

**Extracted notes can be refreshed from the source notes** if the setting to add extraction metadata is on. This will allow an extracted note to update if any of the source notes change. (NOTE: only one extracted note can be refrehed at a time)

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `Paragraph Extractor`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.djsudduth.paragraph-extractor.jpl`) from [here](https://github.com/djsudduth/joplin-plugin-paragraph-extractor/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

### Extracting Paragraphs

- Select multiple notes to extract sections based on keyword into a single note
- Click on `Tools > Extract paragraphs from notes` or use the command `Extract paragraphs from notes` from the context menu

### Refreshing Extracted Notes

- Select a single note that was previously extracted with the appended metadata (see settings to turn on metadata)
- Click on `Tools > Refresh extracted paragraphs note` or use the command `Refresh extracted paragraphs note` from the context menu

Complete Video Tutorial:  
https://youtu.be/tyk66PUjSCE

## Options

Go to `Tools > Options > Paragraph Extractor`

- `Preserve source note titles with backlinks`: Titles of source notes will be embedded at the top in new note with links back to the original source notes. Default `true`.
- `Embed source note titles at end of each extracted paragraph`: Titles of source notes will be embedded at the end of each extracted paragraph rather than at the top with a link back to the original source notes. Default `false`.
- `Extract content at the bulleted list item level`: Bullets will be extracted at the top bullet level (including sub-bullets) vs all bullets within a paragraph. Default `false`
- `Ignore the keyword case`: Any case for the keyword or hashtag keyword will be used for extraction. Default `false`
- `Include the header of the section extracted`: Any H1-H6 header will be included with the extracted paragraph or bullet (this is ignored for keywords embedded within the header which are always extracted). Default `false`
- `Default or Last Used Tag Prefix character`: Either the common hashtag # character (preferred) or $, %. Default `#`
- `Default or Last Used Paragraph Tag or Keyword`: The entered keyword to search in notes to extract the paragraph. If the prefix hashtag field is set, then the tag is added to the keyword for finding paragraph blocks.
- `Remove extracted paragraph keyword and add end tag`: Any tagged/hashtagged keyword will be removed from the paragraph and an endtag will be added in the new extraction note. Removal assumes the keyword has a hashtag prefix character - otherwise the setting is ignored. The end tag is always appended when this is selected. Default `false`
- `Append extracted note refresh metadata`: When paragraphs are extracted from one or many notes, the details of the plugin's settings and source note list will be appended as metadata in the form of a comment. This can be used to refresh an extracted note if the source note or notes change. Default `false`
- `Title of the combined note`: New title of the combined note. Default `Extracted paragraphs`.
- `Custom note title`: New note title with possible variables `{{FIRSTTITLE}}`, `{{LASTTITLE}}`, `{{ALLTITLE}}` and `{{DATE}}`.

## Keyboard Shortcuts

Under `Options > Keyboard Shortcuts` you can assign a keyboard shortcut for the following commands:

- `Extract paragraphs from notes`

## Build

See [BUILD](BUILD.md)

## Changelog

See [Changelog](CHANGELOG.md)

## Thanks

Special thanks to [Jack Gruber](https://github.com/JackGruber) for the inspiration and excellent code to help bootstrap this plugin!
