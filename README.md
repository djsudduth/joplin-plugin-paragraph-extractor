# Joplin Extract Paragraphs

Plugin to extract and combine paragraph blocks from any selected notes to a single new note based on a keyword, hashtag or custom tag. This is similar to block functionality in other note taking systems.

Typical useage is to identify paragraphs with added hashtags (e.g., #mytag). Then, any paragraph with that tag in multiple notes can be copied and added to a single new note. However, keywords do not have to be hashtags and can just be a simple search word to identify and extract the paragraph.

Bullet and sub-bullet lists are treated as single paragraphs in Joplin. Settings will allow for extracting single bullets (along with their sub-bullets) that contain the keyword rather than all the bullets in the paragraph.

Any Joplin tags in the source notes will be combined as Joplin tags in the extracted note. Selected notes are not changed at all.

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `extract-paragraphs`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.djsudduth.paragraph-extractor.jpl`) from [here](https://github.com/djsudduth/joplin-plugin-paragraph-extractor/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

- Select multiple notes to extract sections based on keyword into a single note
- Click on `Tools > Extract paragraphs from notes` or use the command `Extract paragraphs from notes` from the context menu

## Options

Go to `Tools > Options > Paragraph Extractor`

- `Preserve Source Note Titles`: Titles of source notes will be embedded in new note. Default `true`.
- `Extract content at the bulleted list item level`: Bullets will be extracted at the top bullet level (including sub-bullets) vs all bullets within a paragraph. Default `false`
- `Ignore the keyword case`: Any case for the keyword or hashtag keyword will be used for extraction. Default `false`
- `Include the header of the section extracted`: Any H1-H6 header will be included with the extracted paragraph or bullet (this is ignored for keywords embedded within the header which are always extracted). Default `false`
- `Tag Prefix character`: Either the common hashtag # character (preferred) or $, %. Default `none`
- `Paragraph Tag or Keyword`: The entered keyword to search in notes to extract the paragraph. If the prefix hashtag field is set, then the tag is added to the keyword for finding paragraph blocks.
- `Remove extracted paragraph keyword and add end tag`: Any tagged/hashtagged keyword will be removed from the paragraph and an endtag will be addedin the new extraction note. Removal assumes the prefix character is entered. End tag is added always. Default `false`
- `Title of the combined note`: New title of the combined note. Default `Extracted paragraphs`.
- `Custom note title`: New note title with possible variables `{{FIRSTTITLE}}`, `{{LASTTITLE}}`, `{{ALLTITLE}}` and `{{DATE}}`.

## Keyboard Shortcuts

Under `Options > Keyboard Shortcuts` you can assign a keyboard shortcut for the following commands:

- `Extract paragraphs from notes`

## Build

See [BUILD](BUILD.md)

## Changelog

See [Changelog](CHANGELOG.md)
