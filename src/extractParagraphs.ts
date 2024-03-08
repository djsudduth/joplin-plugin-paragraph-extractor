import joplin from "api";
import { I18n } from "i18n";
import * as path from "path";
import * as moment from "moment";
import { settings } from "./settings";
import { MenuItemLocation } from "api/types";

let i18n: any;
let phandle = null;

namespace extractParagraphs {
  export async function init() {
    await extractParagraphs.translate();
    await settings.register();
    await extractParagraphs.registerCommands();
    await extractParagraphs.registerdialog();
  }

  export async function setform(prefix, tname) {
    const dialogs = joplin.views.dialogs;
    await dialogs.setHtml(
      phandle,
      `
    <p>Enter a hashtag prefix(e.g. #) and-or keyword</p>
    <form name="extract">
    Tag:<br/><input type="text" name="tag" value="` +
        prefix +
        `"/>
    <br/>
    Name:<br/><input type="text" name="keyword" value="` +
        tname +
        `"/>
    <br/>
    <input type="checkbox" id="pfolder" name="pfolder" value="true">
    <label for="pfolder">All files within this folder:</label><br />
    </form>
    `
    );
  }

  export async function registerdialog() {
    const tName = await joplin.settings.value("tagName");
    const tPrefix = await joplin.settings.value("tagPrefix");
    const dialogs = joplin.views.dialogs;
    phandle = await dialogs.create("extractDialog");
    await extractParagraphs.setform(tPrefix, tName);
    await dialogs.setButtons(phandle, [
      {
        id: "ok",
      },
      {
        id: "cancel",
      },
    ]);
  }

  export async function registerCommands() {
    await joplin.commands.register({
      name: "ExtractParagraphs",
      label: i18n.__("cmd.extractPara"),
      execute: async () => {
        await extractParagraphs.extract();
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.Tools
    );
    await joplin.views.menuItems.create(
      "contextMenuItemconcatExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.NoteListContextMenu
    );
    await joplin.views.menuItems.create(
      "contextFolderItemconcatExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.FolderContextMenu
    );
  }

  export async function extract() {
    // Paragraph extraction dialog
    const dialogs = joplin.views.dialogs;
    const extract = await dialogs.open(phandle);
    if (extract.id === "cancel") {
      return;
    }
    const fresults = extract.formData["extract"];
    const ckfolder = fresults["pfolder"];
    let tagName = fresults["keyword"];
    let tagPrefix = fresults["tag"];
    if (tagName === "") {
      return;
    }
    // Save the last search
    await extractParagraphs.setform(tagPrefix, tagName);
    let ids = [];
    if (ckfolder === "true") {
      let nfolder = await joplin.workspace.selectedFolder();
      const jnotes = await fetchAllItems(["search"], {
        query: `notebook:"${nfolder.title}"`,
        fields: ["id"],
      }); //, "title", "body"]});
      for (const jnote of jnotes) {
        ids.push(jnote.id);
      }
    } else {
      ids = await joplin.workspace.selectedNoteIds();
    }

    if (ids.length >= 1) {
      const newNoteBody = [];
      let notebookId = null;
      const newTags = [];
      let listTags = [];
      let tagPages = {};

      await joplin.settings.setValue("tagName", tagName);
      await joplin.settings.setValue("tagPrefix", tagPrefix);

      const preserveSourceNoteTitles = await joplin.settings.value(
        "preserveSourceNoteTitles"
      );
      const replaceKeyword = await joplin.settings.value(
        "replaceKeywordwithTag"
      );
      const extractAtBulletLevel = await joplin.settings.value(
        "extractAtBulletLevel"
      );
      const ignoreCase = await joplin.settings.value("ignoreCase");

      const includeHeaders = await joplin.settings.value("includeHeaders");

      const dateFormat = await joplin.settings.globalValue("dateFormat");
      const timeFormat = await joplin.settings.globalValue("timeFormat");
      const combineDate = await extractParagraphs.getDateFormated(
        new Date().getTime(),
        dateFormat,
        timeFormat
      );

      // collect note data
      let titles = [];
      for (const noteId of ids) {
        let extractedContent = false;
        const note = await joplin.data.get(["notes", noteId], {
          fields: [
            "title",
            "body",
            "parent_id",
            "source_url",
            "created_time",
            "updated_time",
            "latitude",
            "longitude",
            "altitude",
          ],
        });
        titles.push(note.title);

        // keep track of the last header in the note
        let last_header = "";
        let header_with_keyword = "";

        if (tagName.length >= 0) {
          const paragraphs = note.body.split("\n\n");
          let savetitle = false;
          for (let i = 0; i < paragraphs.length; i++) {
            let p = paragraphs[i];
            if (p[0] === "#" && includeHeaders === true) {
              last_header = p;
            }
            if (extractAtBulletLevel) {
              let bullets = p.split("\n-");
              for (let j = 0; j < bullets.length; j++) {
                let b = bullets[j];
                if (b[0] !== "-" && b[0] === " ") {
                  {
                    b = "-" + b;
                  }
                }

                let pfound = await extractParagraphs.findParagraphs(
                  b,
                  tagPrefix,
                  tagName,
                  ignoreCase
                );

                if (pfound) {
                  extractedContent = true;
                  if (preserveSourceNoteTitles === true && !savetitle) {
                    newNoteBody.push(
                      "### [" + note.title + "](:/" + noteId + ")\n"
                    );
                    savetitle = true;
                  }
                  if (
                    last_header.length > 0 &&
                    b[0] != "#" &&
                    last_header != header_with_keyword
                  ) {
                    newNoteBody.push(last_header + "\n");
                    last_header = "";
                  }
                  if (b[0] === "#") {
                    header_with_keyword = p;
                  }

                  if (replaceKeyword && tagPrefix.length > 0) {
                    const regex = new RegExp(
                      "(" + tagPrefix + tagName + ")\\b",
                      "gi"
                    );
                    newNoteBody.push(
                      b.replaceAll(regex, "").replace(/\s{2,}/g, " ") + "\n"
                    );
                  } else {
                    newNoteBody.push(b + "\n");
                  }
                }
              }
            } else {
              let pfound = await extractParagraphs.findParagraphs(
                p,
                tagPrefix,
                tagName,
                ignoreCase
              );

              if (pfound) {
                extractedContent = true;
                if (preserveSourceNoteTitles === true && !savetitle) {
                  newNoteBody.push(
                    "### [" + note.title + "](:/" + noteId + ")\n"
                  );
                  savetitle = true;
                }
                if (
                  last_header.length > 0 &&
                  p[0] != "#" &&
                  last_header != header_with_keyword
                ) {
                  newNoteBody.push(last_header + "\n");
                  last_header = "";
                }

                if (p[0] === "#") {
                  header_with_keyword = p;
                }
                if (replaceKeyword && tagPrefix.length > 0) {
                  const regex = new RegExp(
                    "(" + tagPrefix + tagName + ")\\b",
                    "gi"
                  );
                  newNoteBody.push(
                    p.replaceAll(regex, "").replace(/\s{2,}/g, " ") + "\n"
                  );
                } else {
                  //newNoteBody.push(JSON.stringify(jnotes) + "\n" + p + "\n");
                  // newNoteBody.push(jids + "\n" + p + "\n");
                  newNoteBody.push(p + "\n");
                }
              }
            }
          }

          if (extractedContent) {
            let pageNum = 0;
            do {
              var noteTags = await joplin.data.get(["notes", noteId, "tags"], {
                fields: "id",
                limit: 50,
                page: pageNum++,
              });
              for (const tag of noteTags.items) {
                if (newTags.indexOf(tag.id) === -1) {
                  newTags.push(tag.id);
                }
              }
            } while (noteTags.has_more);
          }
          if (!notebookId) notebookId = note.parent_id;
        }
      }

      // add hashtag to note body if replaced within text
      if (tagName.length >= 0 && replaceKeyword) {
        if (tagPrefix.length > 0) {
          newNoteBody.push(tagPrefix + tagName + "\n");
        } else {
          newNoteBody.push("#" + tagName + "\n");
        }
      }

      const titleOption = await joplin.settings.value("combinedNoteTitle");
      let newTitle = i18n.__("settings.combinedNoteTitleValueDefault");
      if (titleOption == "first") {
        newTitle = titles[0];
      } else if (titleOption == "last") {
        newTitle = titles[titles.length - 1];
      } else if (titleOption == "custom") {
        newTitle = await joplin.settings.value("combinedNoteTitleCustom");
        newTitle = newTitle.replace("{{FIRSTTITLE}}", titles[0]);
        newTitle = newTitle.replace("{{LASTTITLE}}", titles[titles.length - 1]);
        newTitle = newTitle.replace("{{ALLTITLE}}", titles.join(", "));
        newTitle = newTitle.replace("{{DATE}}", combineDate);
      }

      // create new note
      const newNoteData = {
        title: newTitle,
        body: newNoteBody.join("\n"),
        parent_id: notebookId,
        is_todo: false,
      };
      const newNote = await joplin.data.post(["notes"], null, newNoteData);

      // create new tag
      let foundtag = false;
      const ltagName = tagName.toLowerCase().trim();
      //const allTags = await joplin.data.get(["tags"]);

      let pageNum = 0;
      do {
        var allTags = await joplin.data.get(["tags"], {
          fields: ["title", "id"],
          limit: 50,
          page: pageNum++,
        });
        for (const currentTag of allTags.items) {
          if (currentTag.title === ltagName) {
            foundtag = true;
            newTags.push(currentTag.id);
          }
        }
      } while (allTags.has_more);

      if (!foundtag) {
        const newTag = await joplin.data.post(["tags"], null, {
          title: ltagName,
        });
        newTags.push(newTag.id);
      }

      // add tags
      for (const tag of newTags) {
        await joplin.data.post(["tags", tag, "notes"], null, {
          id: newNote.id,
        });
      }

      await joplin.commands.execute("openNote", newNote.id);
    }
  }

  export async function translate() {
    const joplinLocale = await joplin.settings.globalValue("locale");
    const installationDir = await joplin.plugins.installationDir();

    i18n = new I18n({
      locales: ["en_US", "de_DE"],
      defaultLocale: "en_US",
      fallbacks: { "en_*": "en_US" },
      updateFiles: false,
      retryInDefaultLocale: true,
      syncFiles: true,
      directory: path.join(installationDir, "locales"),
    });
    i18n.setLocale(joplinLocale);
  }

  export async function findParagraphs(
    paraGraphs: string,
    tPrefix: string,
    tName: string,
    iCase: boolean
  ): Promise<boolean> {
    let pp = paraGraphs;
    let tn = tName;
    if (iCase === true) {
      pp = paraGraphs.toLowerCase();
      tn = tName.toLowerCase();
    }

    pp = pp.replace(/[,?\/!\^&\*\];:{}=\`~()]/g, " ");
    pp = pp.replace(/\s{2,}/g, " ") + " ";

    if (
      pp.includes(tPrefix + tn + " ") ||
      pp.includes(tPrefix + tn + ".") ||
      pp.includes(tPrefix + tn + "\n")
    ) {
      return true;
    } else {
      return false;
    }
  }

  export async function extractHashtagsFromMarkdown(
    markdown: string,
    customtag: string
  ): Promise<Array<string>> {
    // Define the regex pattern
    const hashtagRegex = new RegExp(
      `(?<=^|\\s)${customtag}([\\w-]*[\\w-]+[\\w-]*)+`,
      "g"
    ); // /#(\w+)/g;

    // Extract hashtags from the markdown string
    const hashtags = [];
    let match;
    while ((match = hashtagRegex.exec(markdown))) {
      hashtags.push(match[1]);
    }

    return hashtags;
  }

  export const fetchAllItems = async (
    path: string[],
    query: any
  ): Promise<any[]> => {
    let pageNum = 1;
    let response;
    let items = [];

    do {
      response = await joplin.data.get(path, { ...query, page: pageNum });
      items = items.concat(response.items);
      pageNum++;
    } while (response.has_more);

    return items;
  };

  export async function getDateFormated(
    epoch: number,
    dateFormat: string,
    timeFormat: string
  ): Promise<string> {
    if (epoch !== 0) {
      const dateObject = new Date(epoch);
      const dateString =
        moment(dateObject.getTime()).format(dateFormat) +
        " " +
        moment(dateObject.getTime()).format(timeFormat);

      return dateString;
    } else {
      return "";
    }
  }
}

export { extractParagraphs, i18n };
