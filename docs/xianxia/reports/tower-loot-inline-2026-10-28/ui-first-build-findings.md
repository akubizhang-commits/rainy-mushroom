# Superseded first-build evidence

Verdict for the first artifact: **FAILED — production refund previews and feedback contain undefined names/ranks.** Parent subsequently fixed the iterator conversion and supplied a rebuilt artifact. The final matrix uses a separate `final-build` tag; retain these files as before-fix evidence.

All 20 effective functional cases completed across 390×844, 360×640, 1280×800, 720×1280 and 1080×2400. They used 245 actual pointer clicks. Including the initial harness failures and targeted application diagnostic, 257 clicks and 93 screenshots were recorded. Runtime exceptions, console errors, HTTP errors and failed requests were all zero.

## Application defect

The built `decreaseSkillQuote` and transaction branch returned `changes` as `[MapIterator]`, which serialized as `[{}]`. The iterator contained the correct `{id:"vajra",from:5,to:4}` object. Rendering read properties from the iterator itself, producing `未装备 undefined→undefined级` and a spurious `连退` message.

Observed in production, using read-only quote inspection and the built transaction branch against a detached state copy, followed by a real minus click. The detached diagnostic did not commit, replace live state or write storage.

- Diagnostic: `ui-browser-undefined-diagnostic.json`
- Preview: `ui-undefined-diagnostic-390x844-diagnostic-built-refund-preview.png`
- Feedback: `ui-undefined-diagnostic-390x844-diagnostic-built-refund-feedback.png`
- Small-screen details: `ui-camp-rerun-360x640-camp-inline-details.png`
- Landscape connections and invalid text: `ui-camp-rerun-1280x800-camp-parent-connections.png`
- Machine summary: `ui-first-build-summary.json`

The new production-label assertion fails on this artifact. Existing state/cost checks passing are not UI acceptance.

## Harness issues, separately resolved

1. The requested Playwright installation expected absent browser revision 1234. Runs used the existing Playwright headless revision 1247 through an explicit path. No user browser or profile was connected.
2. The artifact filename validator rejected underscores in skill IDs. The owned script was corrected, and all five camp cases were rerun. Raw failed reports remain preserved.

## First-build visual review

Reviewed representative actual images at all five sizes. Graded cores, rank labels, count/value summaries and explicit bonus labels were visible. Inline details stayed in the tree, horizontal card bounds were respected, and parent connection lines remained visible. Scrolling was required for the full tree and long details. The refund text defect was the identified application acceptance failure.

Captured warnings concerned screenshot ReadPixels GPU stalls and Cocos window-size/deprecation messages; they are retained in JSON and were not treated as runtime exceptions.
