import { createCheck } from "./checkHelpers.js";
import type { AnalysisCheck, PageData } from "../types/analysis.js";

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export function runContentChecks(pageData: PageData): AnalysisCheck[] {
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
          ? "Die Seite hat ausreichend Fliesstext fuer eine inhaltliche Bewertung."
          : pageData.wordCount >= 120
            ? "Die Seite hat etwas Inhalt, wirkt aber noch eher knapp."
            : "Die Seite enthaelt sehr wenig Fliesstext.",
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
          ? "Die Absatzlaengen wirken gut lesbar."
          : longParagraphs <= 2
            ? "Es gibt einzelne sehr lange Textbloecke."
            : "Es gibt viele sehr lange Textbloecke, die den Lesefluss bremsen.",
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
          ? "Der Inhalt ist ordentlich durch Ueberschriften strukturiert."
          : wordsPerHeading <= 260
            ? "Der Inhalt koennte durch mehr Zwischenueberschriften besser gegliedert werden."
            : "Es gibt zu wenig Zwischenueberschriften fuer die Textmenge.",
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
          ? "Die Satzlaenge wirkt angenehm lesbar."
          : averageSentenceLength <= 28
            ? "Einige Saetze wirken recht lang."
            : "Sehr lange Saetze koennen den Textfluss deutlich verschlechtern.",
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
          ? "Der Inhalt nutzt oder benoetigt keine auffaellige Listenstruktur."
          : pageData.headings.length >= 3
            ? "Listen oder Aufzaehlungen koennten den Inhalt noch leichter scanbar machen."
            : "Laengerer Inhalt ohne Listen wirkt schwerer ueberfliegbar.",
      details: {
        listCount: pageData.listCount,
        wordCount: pageData.wordCount,
      },
    }),
  ];
}
