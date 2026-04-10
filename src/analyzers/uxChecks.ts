import { createCheck } from "./checkHelpers.js";
import { text } from "../i18n/index.js";
import type { AnalysisCheck, Locale, PageData } from "../types/analysis.js";

export function runUxChecks(pageData: PageData, locale: Locale): AnalysisCheck[] {
  const linkDensity = pageData.wordCount === 0 ? pageData.links.length : pageData.links.length / pageData.wordCount;
  const paragraphsWithoutHeadings =
    pageData.headings.length === 0 && pageData.paragraphs.length >= 3 ? pageData.paragraphs.length : 0;
  const imageToTextBalance = pageData.wordCount === 0 ? pageData.images.length : pageData.images.length / pageData.wordCount;

  return [
    createCheck({
      id: "ux-link-density",
      category: "ux",
      status: linkDensity <= 0.08 ? "good" : linkDensity <= 0.15 ? "warning" : "bad",
      score: linkDensity <= 0.08 ? 8 : linkDensity <= 0.15 ? 4 : 0,
      maxScore: 8,
      message:
        linkDensity <= 0.08
          ? text(locale, {
              en: "Link density feels balanced.",
              de: "Die Linkdichte wirkt ausgewogen.",
            })
          : linkDensity <= 0.15
            ? text(locale, {
                en: "The page is relatively link-heavy.",
                de: "Die Seite ist relativ linklastig.",
              })
            : text(locale, {
                en: "Very high link density can feel noisy and reduce focus.",
                de: "Eine sehr hohe Linkdichte kann unruhig wirken und Fokus kosten.",
              }),
      details: {
        linkCount: pageData.links.length,
        wordCount: pageData.wordCount,
        linkDensity: Number(linkDensity.toFixed(3)),
      },
    }),
    createCheck({
      id: "ux-heading-structure",
      category: "ux",
      status: paragraphsWithoutHeadings === 0 ? "good" : paragraphsWithoutHeadings <= 4 ? "warning" : "bad",
      score: paragraphsWithoutHeadings === 0 ? 7 : paragraphsWithoutHeadings <= 4 ? 3 : 0,
      maxScore: 7,
      message:
        paragraphsWithoutHeadings === 0
          ? text(locale, {
              en: "The page has a recognizable visual text structure.",
              de: "Die Seite hat eine erkennbare visuelle Textstruktur.",
            })
          : paragraphsWithoutHeadings <= 4
            ? text(locale, {
                en: "More visual structure would make the page easier to read.",
                de: "Mehr visuelle Gliederung würde die Seite lesbarer machen.",
              })
            : text(locale, {
                en: "The page feels like a wall of text without clear structure.",
                de: "Die Seite wirkt wie eine Textwand ohne klare Struktur.",
              }),
      details: {
        headingCount: pageData.headings.length,
        paragraphCount: pageData.paragraphs.length,
      },
    }),
    createCheck({
      id: "ux-cta-presence",
      category: "ux",
      status: pageData.buttonCount >= 1 ? "good" : pageData.wordCount < 80 ? "warning" : "bad",
      score: pageData.buttonCount >= 1 ? 6 : pageData.wordCount < 80 ? 2 : 0,
      maxScore: 6,
      message:
        pageData.buttonCount >= 1
          ? text(locale, {
              en: "The page offers at least one clear interaction element.",
              de: "Die Seite bietet mindestens ein klares Interaktionselement.",
            })
          : pageData.wordCount < 80
            ? text(locale, {
                en: "On short pages, a CTA is not always required, but often helpful.",
                de: "Auf kurzen Seiten ist ein CTA nicht immer zwingend, aber oft hilfreich.",
              })
            : text(locale, {
                en: "A clearly recognizable interaction element or CTA is missing.",
                de: "Es fehlt ein klar erkennbares Interaktionselement oder CTA.",
              }),
      details: {
        buttonCount: pageData.buttonCount,
      },
    }),
    createCheck({
      id: "ux-image-balance",
      category: "ux",
      status: imageToTextBalance <= 0.03 ? "good" : imageToTextBalance <= 0.08 ? "warning" : "bad",
      score: imageToTextBalance <= 0.03 ? 5 : imageToTextBalance <= 0.08 ? 2 : 0,
      maxScore: 5,
      message:
        imageToTextBalance <= 0.03
          ? text(locale, {
              en: "Text and visual elements feel roughly balanced.",
              de: "Text und visuelle Elemente wirken grob ausgewogen.",
            })
          : imageToTextBalance <= 0.08
            ? text(locale, {
                en: "The page is fairly image-heavy.",
                de: "Die Seite ist recht bildlastig.",
              })
            : text(locale, {
                en: "Very high image density can overpower content and focus.",
                de: "Eine sehr hohe Bilddichte kann Inhalte und Fokus überlagern.",
              }),
      details: {
        imageCount: pageData.images.length,
        wordCount: pageData.wordCount,
        imageToTextBalance: Number(imageToTextBalance.toFixed(3)),
      },
    }),
  ];
}
