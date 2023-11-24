import joplin from "api";
import { extractParagraphs } from "./extractParagraphs";

joplin.plugins.register({
  onStart: async function () {
    console.info("Paragraph extractor plugin started");
    await extractParagraphs.init();
  },
});
