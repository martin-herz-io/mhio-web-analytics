import { createCheck } from "./checkHelpers.js";
import type { AnalysisCheck, PageData } from "../types/analysis.js";

export function runUxChecks(pageData: PageData): AnalysisCheck[] {
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
          ? "Die Linkdichte wirkt ausgewogen."
          : linkDensity <= 0.15
            ? "Die Seite ist relativ linklastig."
            : "Sehr hohe Linkdichte kann unruhig wirken und Fokus kosten.",
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
          ? "Die Seite hat eine erkennbare visuelle Textstruktur."
          : paragraphsWithoutHeadings <= 4
            ? "Mehr visuelle Gliederung wuerde die Seite lesbarer machen."
            : "Die Seite wirkt wie eine Textwand ohne klare Struktur.",
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
          ? "Die Seite bietet mindestens ein klares Interaktionselement."
          : pageData.wordCount < 80
            ? "Auf kurzen Seiten ist ein CTA nicht immer zwingend, aber oft hilfreich."
            : "Es fehlt ein klar erkennbares Interaktionselement oder CTA.",
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
          ? "Text und visuelle Elemente wirken grob ausgewogen."
          : imageToTextBalance <= 0.08
            ? "Die Seite ist recht bildlastig."
            : "Sehr hohe Bilddichte kann Inhalte und Fokus ueberlagern.",
      details: {
        imageCount: pageData.images.length,
        wordCount: pageData.wordCount,
        imageToTextBalance: Number(imageToTextBalance.toFixed(3)),
      },
    }),
  ];
}
