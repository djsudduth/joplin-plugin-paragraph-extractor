# Joplin Extract Paragraphs

Plugin to extract and combine paragraphs from selected notes to a new note based on a keyword, hashtag or custom tag.

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `extract-paragraphs`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.djsudduth.paragraph-extractor.jpl`) from [here](https://github.com/djsudduth.paragraph-extractor/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

- Select multiple notes to extract sections based on keyword into a single note
- Click on `Tools > Extract paragraphs from notes` or use the command `Extract paragraphs from notes` from the context menu

## Options

Go to `Tools > Options > Paragraph Extractor`

- `Preserve Source Note Titles`: Titles of source notes will be embedded in new note. Default `true`.
- `Extract content at the bulleted list item level`: Bullets will be extracted at bullet level vs all bullets. Default `false`
- `Ignore the keyword case`: Any case for the keyword or hashtag keyword will be used for extraction. Default `false`
- `Include the header of the section extracted`: Any H1-H6 header will be included with the extracted paragraph or bullet (this is ignored for keywords within the header which are always extracted). Default `false`
- `Tag Prefix character`: Either the common hashtag # character (preferred) or $, %. Default `none`
- `Paragraph Tag or Keyword`: The entered keyword (or hashtag) to search in notes to extract the paragraph.
- `Remove extracted paragraph keyword with end tag`: Any tagged/hashtagged keyword will be removed fromt the paragraph and added as an endtag in the new extraction note. Assumes the prefix character is entered. Default `false`
- `Title of the combined note`: New title of the combined note. Default `Extracted paragraphs`.
- `Custom note title`: New note title with possible variables `{{FIRSTTITLE}}`, `{{LASTTITLE}}`, `{{ALLTITLE}}` and `{{DATE}}`.

## Keyboard Shortcuts

Under `Options > Keyboard Shortcuts` you can assign a keyboard shortcut for the following commands:

- `Extract paragraphs from notes`

## Build

See [BUILD](BUILD.md)

## Changelog

See [Changelog](CHANGELOG.md)
