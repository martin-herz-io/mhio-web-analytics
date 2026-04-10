import { createCheck } from "./checkHelpers.js";
import { text } from "../i18n/index.js";
import type { AnalysisCheck, Locale, PageData } from "../types/analysis.js";

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export function runContentChecks(pageData: PageData, locale: Locale): AnalysisCheck[] {
  const paragraphWordCounts = pageData.paragraphs.map(countWords);
  const longParagraphs = paragraphWordCounts.filter((count) => count > 120).length;
  const averageParagraphLength =
    paragraphWordCounts.length === 0
      ? 0
      : Math.round(paragraphWordCounts.reduce((sum, count) => sum + count, 0) / paragraphWordCounts.length);
  const wordsPerHeading = pageData.wordCount === 0 ? 0 : Math.round(pageData.wordCount / Math.max(pageData.headings.length, 1));
  const averageSentenceLength =
    pageData.sentenceCount === 0 ? 0 : Math.round(pageData.wordCount / pageData.sentenceCount);

  return [
    createCheck({
      id: "content-word-count",
      category: "content",
      status: pageData.wordCount >= 300 ? "good" : pageData.wordCount >= 120 ? "warning" : "bad",
      score: pageData.wordCount >= 300 ? 8 : pageData.wordCount >= 120 ? 4 : 0,
      maxScore: 8,
      message:
        pageData.wordCount >= 300
          ? text(locale, {
              en: "The page contains enough body text for a meaningful content evaluation.",
              de: "Die Seite hat ausreichend Fließtext für eine inhaltliche Bewertung.",
            })
          : pageData.wordCount >= 120
            ? text(locale, {
                en: "The page has some content, but still feels rather short.",
                de: "Die Seite hat etwas Inhalt, wirkt aber noch eher knapp.",
              })
            : text(locale, {
                en: "The page contains very little body text.",
                de: "Die Seite enthält sehr wenig Fließtext.",
              }),
      details: { wordCount: pageData.wordCount },
    }),
    createCheck({
      id: "content-long-paragraphs",
      category: "content",
      status: longParagraphs === 0 ? "good" : longParagraphs <= 2 ? "warning" : "bad",
      score: longParagraphs === 0 ? 10 : longParagraphs <= 2 ? 5 : 0,
      maxScore: 10,
      message:
        longParagraphs === 0
          ? text(locale, {
              en: "Paragraph lengths look easy to read.",
              de: "Die Absatzlängen wirken gut lesbar.",
            })
          : longParagraphs <= 2
            ? text(locale, {
                en: "There are a few very long text blocks.",
                de: "Es gibt einzelne sehr lange Textblöcke.",
              })
            : text(locale, {
                en: "There are many very long text blocks that slow down readability.",
                de: "Es gibt viele sehr lange Textblöcke, die den Lesefluss bremsen.",
              }),
      details: {
        longParagraphs,
        averageParagraphLength,
      },
    }),
    createCheck({
      id: "content-heading-coverage",
      category: "content",
      status: wordsPerHeading <= 180 ? "good" : wordsPerHeading <= 260 ? "warning" : "bad",
      score: wordsPerHeading <= 180 ? 8 : wordsPerHeading <= 260 ? 4 : 0,
      maxScore: 8,
      message:
        wordsPerHeading <= 180
          ? text(locale, {
              en: "The content is structured well with headings.",
              de: "Der Inhalt ist ordentlich durch Überschriften strukturiert.",
            })
          : wordsPerHeading <= 260
            ? text(locale, {
                en: "The content could be broken up more clearly with additional subheadings.",
                de: "Der Inhalt könnte durch mehr Zwischenüberschriften besser gegliedert werden.",
              })
            : text(locale, {
                en: "There are too few subheadings for the amount of text.",
                de: "Es gibt zu wenig Zwischenüberschriften für die Textmenge.",
              }),
      details: {
        headingCount: pageData.headings.length,
        wordsPerHeading,
      },
    }),
    createCheck({
      id: "content-sentence-length",
      category: "content",
      status: averageSentenceLength <= 20 ? "good" : averageSentenceLength <= 28 ? "warning" : "bad",
      score: averageSentenceLength <= 20 ? 7 : averageSentenceLength <= 28 ? 3 : 0,
      maxScore: 7,
      message:
        averageSentenceLength <= 20
          ? text(locale, {
              en: "Sentence length feels comfortable to read.",
              de: "Die Satzlänge wirkt angenehm lesbar.",
            })
          : averageSentenceLength <= 28
            ? text(locale, {
                en: "Some sentences feel fairly long.",
                de: "Einige Sätze wirken recht lang.",
              })
            : text(locale, {
                en: "Very long sentences can noticeably hurt text flow.",
                de: "Sehr lange Sätze können den Textfluss deutlich verschlechtern.",
              }),
      details: {
        averageSentenceLength,
        sentenceCount: pageData.sentenceCount,
      },
    }),
    createCheck({
      id: "content-list-usage",
      category: "content",
      status: pageData.listCount >= 1 || pageData.wordCount < 200 ? "good" : pageData.headings.length >= 3 ? "warning" : "bad",
      score: pageData.listCount >= 1 || pageData.wordCount < 200 ? 5 : pageData.headings.length >= 3 ? 2 : 0,
      maxScore: 5,
      message:
        pageData.listCount >= 1 || pageData.wordCount < 200
          ? text(locale, {
              en: "The content either already uses lists or does not strongly need them.",
              de: "Der Inhalt nutzt oder benötigt keine auffällige Listenstruktur.",
            })
          : pageData.headings.length >= 3
            ? text(locale, {
                en: "Lists or bullet points could make the content easier to scan.",
                de: "Listen oder Aufzählungen könnten den Inhalt noch leichter scanbar machen.",
              })
            : text(locale, {
                en: "Longer content without lists is harder to skim.",
                de: "Längerer Inhalt ohne Listen wirkt schwerer überfliegbar.",
              }),
      details: {
        listCount: pageData.listCount,
        wordCount: pageData.wordCount,
      },
    }),
  ];
}
