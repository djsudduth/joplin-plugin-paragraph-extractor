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
    Keyword:<br/><input type="text" name="keyword" value="` +
        tname +
        `"/>
    <br/>
    <input type="checkbox" id="ckbfolder" name="ckbfolder" value="true">
    <label for="ckbfolder">All files within this folder</label><br />
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
        await extractParagraphs.extract(false);
      },
    });

    await joplin.commands.register({
      name: "RefreshParagraphs",
      label: i18n.__("cmd.refreshPara"),
      execute: async () => {
        await extractParagraphs.extract(true);
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.Tools
    );
    await joplin.views.menuItems.create(
      "myMenuItemToolsRefresh",
      "RefreshParagraphs",
      MenuItemLocation.Tools
    );

    await joplin.views.menuItems.create(
      "contextMenuItemconcatExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.NoteListContextMenu
    );
    await joplin.views.menuItems.create(
      "contextMenuItemconcatRefresh",
      "RefreshParagraphs",
      MenuItemLocation.NoteListContextMenu
    );

    await joplin.views.menuItems.create(
      "contextFolderItemconcatExtractParagraphs",
      "ExtractParagraphs",
      MenuItemLocation.FolderContextMenu
    );
  }

  export async function extract(refreshNote) {
    // Paragraph extraction dialog
    const dialogs = joplin.views.dialogs;
    let tagName = await joplin.settings.value("tagName");
    let tagPrefix = await joplin.settings.value("tagPrefix");
    let ckbfolder = "false";
    let pexSettings = null;

    if (!refreshNote) {
      await extractParagraphs.setform(tagPrefix, tagName);

      const extract = await dialogs.open(phandle);
      if (extract.id === "cancel") {
        return;
      }
      const fresults = extract.formData["extract"];
      ckbfolder = fresults["ckbfolder"];
      tagName = fresults["keyword"];
      tagPrefix = fresults["tag"];
      if (tagName === "") {
        return;
      }

      // Save the last search
      await extractParagraphs.setform(tagPrefix, tagName);
    }

    let ids = [];
    if (ckbfolder === "true") {
      let sfolder = await joplin.workspace.selectedFolder();
      const folder_notes = await fetchAllItems(["search"], {
        query: `notebook:"${sfolder.title}"`,
        fields: ["id", "parent_id"],
      }); //, "title", "body"]});
      for (const fnote of folder_notes) {
        if (fnote.parent_id === sfolder.id) {
          ids.push(fnote.id);
        }
      }
    } else {
      ids = await joplin.workspace.selectedNoteIds();
    }

    if (refreshNote && ids.length > 1) {
      const userItem = dialogs.showMessageBox(
        "Mulitple note refresh is not supported - select only 1 note"
      );
      return;
    }

    // Check refresh here - ids can contain the list of notes to be refreshed
    let refreshnotes = [];
    let footer = "";
    let replaceID = null;
    let rnote = null;
    let nullRefresh = false;

    if (refreshNote && ids.length === 1) {
      for (const noteId of ids) {
        replaceID = noteId;
        rnote = await joplin.data.get(["notes", noteId], {
          fields: ["title", "body"],
        });

        if (rnote.body.includes("<!-- pex|")) {
          footer = rnote.body.split("<!-- pex|");
          const chunks = footer[1].split("|");
          for (const chunk of chunks) {
            const pexid = chunk.split(":");
            switch (pexid[0]) {
              case "n":
                refreshnotes = pexid[1].split(",");
                break;
              case "s":
                pexSettings = pexid[1].split(",");
                break;
            }
          }
        } else {
          const nullpick = dialogs.showMessageBox(
            "The note is missing refresh metadata. Turn on extract metadata in settings."
          );
          nullRefresh = true;
        }
      }
      if (!nullRefresh && footer.length > 0) {
        ids.length = 0;
        ids.push(...refreshnotes);
      }
    } else {
      nullRefresh = true;
    }

    if (ids.length >= 1) {
      const newNoteBody = [];
      let notebookId = null;
      const newTags = [];
      let listTags = [];
      let tagPages = {};

      // Save the last keyword extraction values in defaults
      await joplin.settings.setValue("tagName", tagName);
      await joplin.settings.setValue("tagPrefix", tagPrefix);

      let preserveSourceNoteTitles = await joplin.settings.value(
        "preserveSourceNoteTitles"
      );
      let embedSourceNoteTitles = await joplin.settings.value(
        "embedSourceNoteTitles"
      );
      if (embedSourceNoteTitles) {
        preserveSourceNoteTitles = true;
      }
      let replaceKeyword = await joplin.settings.value("replaceKeywordwithTag");
      let extractAtBulletLevel = await joplin.settings.value(
        "extractAtBulletLevel"
      );
      let ignoreCase = await joplin.settings.value("ignoreCase");
      let includeHeaders = await joplin.settings.value("includeHeaders");
      let refreshMetaData = await joplin.settings.value("refreshMetaData");

      const dateFormat = await joplin.settings.globalValue("dateFormat");
      const timeFormat = await joplin.settings.globalValue("timeFormat");
      const combineDate = await extractParagraphs.getDateFormated(
        new Date().getTime(),
        dateFormat,
        timeFormat
      );

      if (refreshNote && !nullRefresh) {
        preserveSourceNoteTitles = pexSettings[0] === "0" ? false : true;
        embedSourceNoteTitles = pexSettings[1] === "0" ? false : true;
        extractAtBulletLevel = pexSettings[2] === "0" ? false : true;
        ignoreCase = pexSettings[3] === "0" ? false : true;
        includeHeaders = pexSettings[4] === "0" ? false : true;
        replaceKeyword = pexSettings[5] === "0" ? false : true;
        refreshMetaData = pexSettings[6] === "0" ? false : true;
        tagPrefix = pexSettings[7];
        tagName = pexSettings[8];
      }

      // collect note data
      let titles = [];
      let nIDs = "";
      let title_count = 0;
      let t_prefix = "";

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
        let full_page = false;

        if (tagName.length >= 0) {
          const paragraphs = note.body
            .split("\n\n")
            .filter((str) => str.trim() !== "")
            .filter((str) => str.trim() !== "&nbsp;");

          const last_paragraph = paragraphs[paragraphs.length - 1].trim();
          // const regex = /^([#%$]?[a-zA-Z]+,\s*)*[#%$]?[a-zA-Z]+$/;
          if (
            last_paragraph[0] === tagPrefix &&
            last_paragraph.includes(tagPrefix + tagName)
          ) {
            full_page = true;
            if (preserveSourceNoteTitles === true && !embedSourceNoteTitles) {
              newNoteBody.push("### [" + note.title + "](:/" + noteId + ")\n");
            }
            if (replaceKeyword && tagPrefix.length > 0) {
              const regex = new RegExp(
                "(" + tagPrefix + tagName + ")\\b",
                "gi"
              );
              newNoteBody.push(note.body.replaceAll(regex, "") + "\n");

              //
              //replaceKeyword = false;
            } else {
              newNoteBody.push(note.body);
            }
            if (embedSourceNoteTitles) {
              newNoteBody.push(" ([" + note.title + "](:/" + noteId + "))\n");
            }
            if (preserveSourceNoteTitles === true) {
              newNoteBody.push("\n&nbsp;\n");
            }

            if (!nIDs.includes(noteId)) {
              nIDs += noteId + ",";
            }
          }

          if (!full_page) {
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
                    if (!nIDs.includes(noteId)) {
                      nIDs += noteId + ",";
                    }
                    extractedContent = true;
                    if (
                      preserveSourceNoteTitles === true &&
                      !savetitle &&
                      !embedSourceNoteTitles
                    ) {
                      if (title_count != 0) {
                        t_prefix = "\n&nbsp;\n";
                      }
                      newNoteBody.push(
                        t_prefix +
                          "### [" +
                          note.title +
                          "](:/" +
                          noteId +
                          ")\n"
                      );
                      savetitle = true;
                      title_count++;
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
                      var regex = new RegExp(
                        "( " + tagPrefix + tagName + ")\\b",
                        "gi"
                      );
                      const pass1 = b.replaceAll(regex, ""); //.replace(/\s{2,}/g, " ");
                      regex = new RegExp(
                        "(" + tagPrefix + tagName + ")\\b",
                        "gi"
                      );
                      const finalpara = pass1.replaceAll(regex, ""); //.replace(/\s{2,}/g, " ");

                      if (
                        preserveSourceNoteTitles === true &&
                        embedSourceNoteTitles
                      ) {
                        newNoteBody.push(
                          finalpara +
                            " ([" +
                            note.title +
                            "](:/" +
                            noteId +
                            "))\n"
                        );
                      } else {
                        newNoteBody.push(finalpara + "\n");
                      }
                    } else {
                      if (
                        preserveSourceNoteTitles === true &&
                        embedSourceNoteTitles
                      ) {
                        newNoteBody.push(
                          b + " ([" + note.title + "](:/" + noteId + "))\n"
                        );
                      } else {
                        newNoteBody.push(b + "\n");
                      }
                    }
                    if (preserveSourceNoteTitles === true) {
                      //newNoteBody.push("\n&nbsp;\n");
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
                  if (!nIDs.includes(noteId)) {
                    nIDs += noteId + ",";
                  }
                  extractedContent = true;
                  if (
                    preserveSourceNoteTitles === true &&
                    !savetitle &&
                    !embedSourceNoteTitles
                  ) {
                    if (title_count != 0) {
                      t_prefix = "\n&nbsp;\n";
                    }
                    newNoteBody.push(
                      t_prefix + "### [" + note.title + "](:/" + noteId + ")\n"
                    );
                    savetitle = true;
                    title_count++;
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
                    var regex = new RegExp(
                      "( " + tagPrefix + tagName + ")\\b",
                      "gi"
                    );
                    const pass1 = p.replaceAll(regex, ""); //.replace(/\s{2,}/g, " ");
                    regex = new RegExp(
                      "(" + tagPrefix + tagName + ")\\b",
                      "gi"
                    );
                    const finalpara = pass1.replaceAll(regex, ""); //.replace(/\s{2,}/g, " ");
                    if (
                      preserveSourceNoteTitles === true &&
                      embedSourceNoteTitles
                    ) {
                      newNoteBody.push(
                        finalpara +
                          " ([" +
                          note.title +
                          "](:/" +
                          noteId +
                          "))\n"
                      );
                    } else {
                      newNoteBody.push(finalpara + "\n");
                    }
                  } else {
                    if (
                      preserveSourceNoteTitles === true &&
                      embedSourceNoteTitles
                    ) {
                      newNoteBody.push(
                        p + " ([" + note.title + "](:/" + noteId + "))\n"
                      );
                    } else {
                      newNoteBody.push(p + "\n");
                    }
                  }
                  if (
                    preserveSourceNoteTitles === true &&
                    !embedSourceNoteTitles
                  ) {
                    //newNoteBody.push("\n&nbsp;\n");
                  }
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

      if (refreshMetaData) {
        // add the refresh information
        const now = new Date();
        const pexDate = now.getTime();
        newNoteBody.push(
          "<!-- pex" +
            "|s:" +
            Number(preserveSourceNoteTitles).toString() +
            "," +
            Number(embedSourceNoteTitles).toString() +
            "," +
            Number(extractAtBulletLevel).toString() +
            "," +
            Number(ignoreCase).toString() +
            "," +
            Number(includeHeaders).toString() +
            "," +
            Number(replaceKeyword).toString() +
            "," +
            Number(refreshMetaData).toString() +
            "," +
            tagPrefix +
            "," +
            tagName +
            "|n:" +
            nIDs.slice(0, -1) +
            "|d:" +
            pexDate.toString() +
            "| -->"
        );
      }

      const titleOption = await joplin.settings.value("combinedNoteTitle");
      let newTitle = i18n.__("settings.combinedNoteTitleValueDefault");
      if (titleOption == "first") {
        newTitle = titles[0];
      } else if (titleOption == "last") {
        newTitle = titles[titles.length - 1];
      } else if (titleOption == "custom") {
        newTitle = await joplin.settings.value("combinedNoteTitleCustom");
        newTitle = newTitle.replace("{{TAGKEYWORD}}", tagName);
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

      let newNote = null;
      if (refreshNote) {
        if (!nullRefresh) {
          const tempRefresh = nIDs.split(",")[0];
          //await joplin.commands.execute("openNote",todoID);
          //await joplin.commands.execute("textSelectAll");
          //await joplin.commands.execute("replaceSelection", newNoteData.body);
          await joplin.data.put(["notes", replaceID], null, {
            body: newNoteData.body,
          });
          //let i = await joplin.data.get(["notes", replaceID]);
          await joplin.commands.execute("openNote", tempRefresh);
          await joplin.commands.execute("openNote", replaceID);
          newNote = rnote;
        }
      } else {
        newNote = await joplin.data.post(["notes"], null, newNoteData);
      }

      if (!refreshNote) {
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
      pp.includes(tPrefix + tn + "\n") ||
      pp.includes(tPrefix + tn + "<") ||
      pp.includes(tPrefix + tn + "=")
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
