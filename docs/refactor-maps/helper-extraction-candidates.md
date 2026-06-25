# Helper Extraction Candidates

Generated from large page scan.

Use this as a working map for pure helper, mapper, formatter, sorter, and label-function extractions before moving into hooks/controller refactors.

```txt

================================================================================
app/(protected)/books/[userBookId]/page.tsx
    5581 app/(protected)/books/[userBookId]/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
40:type Book = {
75:type UserBook = {
110:type LookupRow = {
116:type ReadingSession = {
128:type HubTab = "bookInfo" | "study" | "reading" | "story" | "reflection";
129:type EditingPanel =
137:type VocabTab = "readAlong" | "bulk";
138:type ProfileRole = "teacher" | "member" | "student" | "super_teacher";
140:type Character = {
152:type ChapterSummary = {
163:type SettingItem = {
173:type CulturalItem = {
183:type KanjiMapRow = {
193:type VocabCacheQueueRow = {
205:type CommunityGenreRow = {
210:type CommunityContentNoteRow = {
215:type SavedKanjiReading = {
223:type SessionKanjiReading = {
229:function hasKanji(text: string) {
307:function safeDate(s: string | null) {
313:function formatYmd(d: Date) {
320:function linksToText(links: any): string {
338:function parseLinks(text: string) {
351:function displayLinkLabel(l: any) {
392:function displayLinkUrl(l: any) {
399:function clampRating5(n: number | null) {
408:function formatRating(value: number | null | undefined) {
417:function stars5(value: number | null) {
426:function ratingDescription(
435:function entertainmentRatingText(value: number | null) {
452:function languageLearningRatingText(value: number | null) {
469:function formatTypeLabel(value: string | null | undefined) {
486:function bookTypeLabel(value: string | null | undefined) {
492:function isDuplicateBookIsbnError(error: unknown) {
504:function progressModeLabel(value: string | null | undefined) {
519:function formatMinutes(total: number | null) {
530:function formatTimer(seconds: number) {
536:function pageToPercent(page: number | null, pageCount: number | null) {
541:function percentToPage(percent: number | null, pageCount: number | null) {
547:function genreLabel(value: string | null | undefined) {
555:function parseCommunityTags(value: string) {
562:function dedupeCommunityTags(tags: string[]) {
576:function joinCommunityTags(tags: string[]) {
580:function hiraToKata(text: string) {
586:function normalizeKanjiQueueKey(surface: string | null | undefined, reading: string | null | undefined) {
590:function isSuperTeacherFlag(value: unknown) {

================================================================================
app/(protected)/library-study/check/page.tsx
    3483 app/(protected)/library-study/check/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
44:type UserBookJoinRow = {
58:type UserBookWordRow = {
70:type LearningSettingsRow = {
78:type LibraryWordProgressRow = {
100:type LibraryWordSummaryRow = {
115:type LibraryWordClaimRow = {
126:type LibraryCheckGate = "readiness" | "reading" | "meaning";
128:type StudyCard = {
147:type MeaningReviewItem = {
156:type LibraryCheckDebug = {
170:type StudyMode =
174:type LibraryStudyMode = "check" | "practice";
175:type PracticeRevealStep = "word" | "reading" | "meaning";
176:type PracticeStudyMode = "reveal" | "typing";
177:type PracticeTypingStep = "reading" | "meaning";
178:type PracticeColorFilter =
217:type DailyCheckLevel = (typeof DAILY_CHECK_LEVELS)[number];
219:type DailyCheckPlan = {
226:function isDailyCheckLevel(value: string): value is DailyCheckLevel {
230:function cardMatchesDailyCheckLevels(card: StudyCard, levels: DailyCheckLevel[]) {
235:function dailyCheckLevelsLabel(levels: DailyCheckLevel[]) {
240:function loadDailyCheckPlanForToday() {
270:function saveDailyCheckPlanForToday(plan: DailyCheckPlan) {
289:function shuffleArray<T>(arr: T[]) {
298:function normalizeText(value: string) {
302:function normalizeKana(value: string) {
306:function normalizeJlpt(value: string | null | undefined) {
310:function isKatakanaOnly(value: string | null | undefined) {
315:function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
322:function isClaimCardId(id: string | null | undefined) {
326:function getBookMeta(row: UserBookJoinRow) {
334:function definitionNumberFromIndex(index: number | null | undefined) {
338:function definitionLabel(card: StudyCard | null | undefined) {
353:function latestWordCreatedAt(words: UserBookWordRow[]) {
426:function uniqueStrings(values: string[]) {
476:function progressWithWordSkyClaim(
521:function isReadyForReadingGateProgress(progress: LibraryWordProgressRow | null | undefined) {
532:function preReadingSupportCycle(progress: LibraryWordProgressRow | null | undefined) {
537:function makeClaimStudyCard(
595:function libraryStudyCardClass(status: LibraryStudyColorStatus | undefined) {
610:function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
624:function libraryStudyDotClass(status: LibraryStudyColorStatus | undefined) {
637:function libraryStudyColorName(status: LibraryStudyColorStatus | undefined) {
643:function hashString(value: string) {
651:function pickLibraryCheckGate(status: LibraryStudyColorStatus, _seed: string): LibraryCheckGate {
659:function includeLibraryCheckCard(status: LibraryStudyColorStatus) {
663:function daysSinceIso(value: string | null | undefined, now = new Date()) {
672:function missedGateRecheckDays(card: StudyCard) {
679:function regularGateRecheckDays(card: StudyCard) {
686:function appDayNumber(now = new Date()) {
691:function isInitialGateSlotDue(card: StudyCard, now = new Date()) {
700:function isInitialYellowReadinessSlotDue(card: StudyCard, now = new Date()) {
709:function lastStudiedTime(card: StudyCard) {
717:function rankDailyCheckCards(cards: StudyCard[]) {
729:function isCardSeenToday(card: StudyCard, seenTodayIds: Set<string>) {
733:function dedupeCardsByStudyIdentity(cards: StudyCard[]) {
744:function isMissedGateLimboDue(card: StudyCard, now = new Date()) {
768:function isBackToRedSupportCard(card: StudyCard) {
776:function isYellowReadinessCard(card: StudyCard) {
780:function isYellowReadinessCooldownDue(card: StudyCard, now = new Date()) {
790:function isRegularGateRecheckDue(card: StudyCard, now = new Date()) {
805:function isCardAvailableForLibraryCheck(
832:function availableDailyCheckCountForLevel(
844:function buildDailyCheckDeckSource(
865:function checkSessionSummary(deck: StudyCard[]) {
876:function checkSessionSummaryText(deck: StudyCard[]) {
887:function isCardAvailableForLibraryPractice(
901:function gatePromptText(card: StudyCard | undefined) {
915:function gatePromptClass(card: StudyCard | undefined) {
930:function checkModeLabel(card: StudyCard | undefined) {
938:function checkModeDescription(card: StudyCard | undefined) {
952:function studyModeForActiveGate(card: StudyCard | undefined): StudyMode {
1002:function promptModeClass(gate: LibraryCheckGate | undefined) {
1458:function errorMessage(error: unknown) {
1477:function normalizeMeaningAnswer(value: string) {
1486:function meaningAnswerCandidates(fullMeaning: string) {
1508:function matchesAnyMeaning(input: string, fullMeaning: string) {
1547:function shortMeaningRetypeHint(fullMeaning: string) {
1559:function getTodayKey() {
1563:function loadSeenForToday() {
1579:function saveSeenForToday(values: Set<string>) {
1596:function markAbilityCheckCompletedToday() {
1601:function hideAbilityCheckReminderForToday() {

================================================================================
app/(protected)/users/[username]/books/page.tsx
    2631 app/(protected)/users/[username]/books/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
38:type Book = {
51:type UserBookRow = {
73:type ProfileRole = "teacher" | "super_teacher" | "member" | "student";
75:type StudentOption = {
83:type AlertBoxState = {
92:type TeacherPrepItem = {
100:type KanjiEnrichmentAlertItem = {
107:type LearningTaskRow = {
122:type ReadingSessionStats = {
130:type MonthlyLibraryStats = {
139:type MonthOption = {
144:type UserBarVariant = "full" | "logoutOnly" | "labelOnly";
145:type LibrarySnapshotView = "monthly" | "colors";
146:type MekuruColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "grey";
147:type LibrarySortMode =
159:function isListeningFormat(value: string | null | undefined) {
164:type AbilityCheckReminderSettings = {
172:type AbilityCheckSummaryRow = {
182:type AbilityCheckProgressRow = {
212:function ymdInTimeZone(value: string | Date, timeZone: string) {
233:function getTodayKey() {
237:function loadAbilityCheckSeenForToday() {
251:function abilityCheckReminderHiddenToday() {
256:function abilityCheckCompletedToday() {
261:function hideAbilityCheckReminderForToday() {
266:function superTeacherKanjiReminderHiddenToday() {
271:function hideSuperTeacherKanjiReminderForToday() {
276:function pendingBookRequestsSignature(requests: Array<{ id?: string | null }>) {
284:function pendingBookRequestsAlertHidden(signature: string) {
289:function hidePendingBookRequestsAlert(signature: string) {
294:function isKatakanaOnly(value: string | null | undefined) {
299:function hashString(value: string) {
307:function daysSinceIso(value: string | null | undefined, now = new Date()) {
316:function appDayNumber(now = new Date()) {
322:function regularGateRecheckDays(studyIdentityKey: string) {
329:function isInitialGateSlotDue(studyIdentityKey: string, now = new Date()) {
337:function isReadyForReadingGateProgress(progress: AbilityCheckProgressRow | null | undefined) {
348:function isAbilityCheckCardInDailyPool(
426:function ymdToDayNumber(ymd: string) {
431:function getMonthOptions(count = 12): MonthOption[] {
445:function getMonthRange(monthValue: string) {
467:function formatMinutesAsReadableTime(totalMinutes: number) {
479:function formatRelativeDate(dateStr: string) {
624:function normalizeBookPart(value: string | null | undefined) {
628:function normalizeIsbn(isbn: string | null | undefined) {
632:function makeBookKey(title: string, author?: string | null) {
636:function mekuruColorLabel(color: MekuruColor) {
641:function mekuruColorDotClass(color: MekuruColor) {
676:function dateFromYmd(value: string) {

================================================================================
app/(protected)/books/[userBookId]/study/page.tsx
    2179 app/(protected)/books/[userBookId]/study/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
40:type StudySet =
50:type StepField = "word" | "reading" | "meaning";
52:function studySetLabel(s: StudySet) {
94:type KanjiMetaItem = {
99:type WordRow = {
126:type Flashcard = {
144:function normalizeJlpt(val: string | null | undefined) {
150:function chapterInfoFromRow(r: WordRow): { label: string; display: string } {
166:function kataToHira(s: string) {
172:function normalizeReading(s: string) {
176:function normalizeMeaning(s: string) {
184:function meaningWords(s: string) {
191:function meaningMatchesOneWord(input: string, meanings: (string | null | undefined)[]) {
201:function asStringArray(val: any): string[] {
215:function normalizeRepeatKey(surface: string) {
219:function hasKanji(text: string) {
223:function shuffleArray<T>(arr: T[]) {
232:function shuffledCandidatePool(card: Flashcard, pool: Flashcard[]) {
257:function getNextStudySet(studySet: StudySet) {
263:function bookFlashcardColorName(color: LibraryStudyColor) {
268:function bookFlashcardColorFilterLabel(colors: LibraryStudyColor[]) {
288:function bookFlashcardJlptFilterLabel(levels: string[]) {
300:function bookFlashcardChapterFilterLabel(
312:function buildBookFlashcardsStudyingNowLabel({

================================================================================
app/(protected)/library-study/practice/page.tsx
    2000 app/(protected)/library-study/practice/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
34:type UserBookJoinRow = {
48:type UserBookWordRow = {
60:type LearningSettingsRow = {
69:type LibraryWordProgressRow = {
91:type LibraryWordSummaryRow = {
106:type LibraryWordClaimRow = {
117:type LibraryCheckGate = "reading" | "meaning";
119:type StudyCard = {
137:type MeaningReviewItem = {
146:type ProfileRole = "teacher" | "super_teacher" | "member" | "student";
147:type PracticeRevealStep = "word" | "reading" | "meaning";
148:type PracticeStudyMode = "reveal" | "typing";
149:type PracticeTypingStep = "reading" | "meaning";
150:type PracticeTypingAdvance = "meaning" | "next";
151:type PracticeColorFilter =
167:function nextPracticeStudyMode(mode: PracticeStudyMode): PracticeStudyMode {
171:function practiceStudyModeLabel(mode: PracticeStudyMode) {
184:function shuffleArray<T>(arr: T[]) {
193:function rememberFirstPracticeCard(cards: StudyCard[]) {
206:function avoidRepeatingFirstPracticeCard(cards: StudyCard[]) {
233:function buildShuffledPracticeDeck(cards: StudyCard[]) {
239:function normalizeText(value: string) {
243:function normalizeKana(value: string) {
251:function normalizeJlpt(value: string | null | undefined) {
255:function isKatakanaOnly(value: string | null | undefined) {
260:function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
267:function isClaimCardId(id: string | null | undefined) {
271:function getBookMeta(row: UserBookJoinRow) {
279:function definitionNumberFromIndex(index: number | null | undefined) {
283:function definitionLabel(card: StudyCard | null | undefined) {
423:function uniqueStrings(values: string[]) {
473:function progressWithWordSkyClaim(
518:function preReadingSupportCycle(progress: LibraryWordProgressRow | null | undefined) {
523:function makeClaimStudyCard(
579:function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
593:function libraryStudyDotClass(status: LibraryStudyColorStatus | undefined) {
606:function libraryStudyColorName(status: LibraryStudyColorStatus | undefined) {
612:function pickLibraryCheckGate(status: LibraryStudyColorStatus, _seed: string): LibraryCheckGate {
618:function isCardAvailableForLibraryPractice(
1038:function errorMessage(error: unknown) {
1057:function uniqueByNormalized(
1076:function matchesAnyMeaning(input: string, fullMeaning: string) {
1111:function practiceColorFilterLabel(filter: PracticeColorFilter) {
1119:function jlptFilterLabel(levels: string[]) {
1145:function libraryReviewStudyingNowLabel({

================================================================================
app/(protected)/teacher/library/[teacherBookId]/page.tsx
    1600 app/(protected)/teacher/library/[teacherBookId]/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
29:type ItemType = "word" | "phrase" | "grammar" | "sentence" | "translation" | "note";
30:type PrepStep = "paste" | "definitions" | "details" | "done";
32:type BookMeta = {
40:type TeacherBookRow = {
47:type TeacherBookItem = {
65:type PrepItemDraft = {
82:type SavedItemEditDraft = {
98:function isTeacherRole(profile: any) {
107:function firstBook(book: TeacherBookRow["books"]) {
112:function itemTypeLabel(value: string) {
116:function parseItems(raw: string): string[] {
123:function normalizeJlpt(val: string): string {
134:function extractMeaningChoices(entry: any): string[] {
150:function toNullableInt(value: string): number | null {
157:function cleanNullable(value: string) {
162:function compactText(value: string | null | undefined) {
167:function readableSupabaseError(error: any) {
180:function isMissingOptionalTeacherBookItemColumn(error: any) {
190:function withoutOptionalTeacherBookItemColumns<T extends Record<string, any>>(row: T) {
195:function combinedTeacherNote(item: Pick<TeacherBookItem, "teacher_note" | "explanation">) {
202:function chapterDisplay(item: TeacherBookItem) {
209:function savedItemSearchText(item: TeacherBookItem) {
227:function editDraftFromItem(item: TeacherBookItem): SavedItemEditDraft {
243:function blankDraft(surfaceText: string, defaultType: ItemType): PrepItemDraft {

================================================================================
app/(protected)/teacher/kanji/page.tsx
    1600 app/(protected)/teacher/kanji/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
27:type ProfileRow = {
35:type UserBookRow = {
53:type WordRow = {
63:type KanjiMapRow = {
76:type VocabularyCacheRow = {
82:type QueueStatus =
92:type StatusFilter =
101:type QueueItem = {
120:function hasKanji(value: string) {
124:function kanjiChars(value: string) {
128:function hiraToKata(text: string) {
134:function getBookTitle(book: UserBookRow["books"]) {
139:function statusLabel(status: QueueStatus) {
160:function statusTone(status: QueueStatus) {
180:function statusDetailLabel(status: QueueStatus) {
203:function isNeedsReadingStatus(status: QueueStatus) {
207:function isNeedsWorkStatus(status: QueueStatus) {
211:function isActiveStatus(status: QueueStatus) {
215:function itemMatchesStatusFilter(item: QueueItem, statusFilter: StatusFilter) {
226:function effectiveReadingType(row: Pick<KanjiMapRow, "reading_type" | "base_reading" | "realized_reading">) {
231:function getQueueStatus(params: {

================================================================================
app/(protected)/books/[userBookId]/curiosity-reading/page.tsx
    1587 app/(protected)/books/[userBookId]/curiosity-reading/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
43:type QuickPreview = {
60:type QuickSessionWord = {
78:type QuickLookupCandidate = {
89:type LastSavedWordContext = {
94:function makeBlankQuickPreview(meta = { page: "", chapterNumber: "", chapterName: "" }): QuickPreview {
113:function formatTimer(seconds: number) {
119:function toNullableInt(value: string): number | null {
127:function sortQuickSessionWords(words: QuickSessionWord[]) {
145:function upsertAndSortQuickSessionWords(
152:function extractQuickMeanings(entry: any): string[] {
158:function isExactQuickLookupMatch(entry: any, query: string) {
170:function buildQuickLookupCandidates(entries: any[], fallbackWord: string): QuickLookupCandidate[] {
210:function isSmallViewport() {
215:function hasKanji(text: string) {

================================================================================
app/(protected)/library-study/kanji/page.tsx
    1543 app/(protected)/library-study/kanji/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
32:type UserBookWordRow = {
46:type VocabularyCacheRow = {
54:type KanjiMapRow = {
66:type QuizCard = {
90:type RecallResult = "correct" | "wrong" | "shown" | "unverified" | null;
91:type RecallMode = "wordForKanji" | "kanjiForReading";
92:type CardQuestionMode = "readingChoice" | "kanjiChoice";
93:type LevelFilter = KanjiLevelFilter;
94:type KanjiAnswerStyle = "multipleChoice" | "typing";
95:type KanjiStudyMode =
128:function normalizeJlpt(value: string | null | undefined) {
142:function normalizeKanjiLevel(jlpt: string | null | undefined): LevelFilter {
171:function matchesLevelFilters(
185:function kanjiLevelSummaryLabel(selectedLevels: LevelFilter[]) {
211:function readingTypeForStudyMode(mode: KanjiStudyMode): QuizCard["readingType"] {
215:function questionModeForStudyMode(mode: KanjiStudyMode): CardQuestionMode {
221:function studyModeSummary(mode: KanjiStudyMode) {
228:function studyModeDescription(mode: KanjiStudyMode) {
235:function correctAnswerForCard(card: QuizCard, mode: KanjiStudyMode) {
241:function promptLabelForStudyMode(mode: KanjiStudyMode) {
247:function promptTextForStudyMode(card: QuizCard, mode: KanjiStudyMode) {
253:function answerStyleForMode(mode: KanjiStudyMode, preferredStyle: KanjiAnswerStyle) {
259:function relatedReadingExamplesForCard(card: QuizCard, cards: QuizCard[]) {
284:function readingTypeLabel(val: "onyomi" | "kunyomi" | "other" | null | string) {
292:function shuffleArray<T>(arr: T[]) {
301:function normalizeReading(s: string) {
309:function normalizeReadingAnswer(s: string) {
439:function romajiToHiragana(value: string) {
495:function readingAnswerMatches(input: string, correctAnswer: string) {
503:function normalizeWord(s: string) {
511:function kanjiChars(text: string) {
515:function hasExactlyOneKanji(text: string) {
519:function stableNumberFromString(text: string) {
527:function localDateKey(date = new Date()) {
534:function meaningPreviewFromSenses(senses: any[] | null | undefined) {
553:function hiraToKata(s: string) {
559:function kataToHira(s: string) {
565:function formatReadingForType(
575:function isKunWithOkurigana(surface: string) {
581:function getTrailingReadingHint(sourceWord: string, kanji: string) {
591:function splitKunyomiPromptReading(sourceReading: string | null, realizedReading: string) {
612:function selectOneCardPerKanji(cards: QuizCard[]) {
625:function selectOneCardPerSourceWordForDay(cards: QuizCard[], dateKey: string) {
645:function chunkArray<T>(items: T[], size: number) {
653:function makeContextKey(surface: string | null | undefined, reading: string | null | undefined) {

================================================================================
app/(protected)/books/[userBookId]/add-word/page.tsx
    1432 app/(protected)/books/[userBookId]/add-word/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
41:type JishoChoice = {
50:type JishoCandidate = JishoChoice & {
54:type SessionWord = {
70:type LastSavedWordContext = {
75:function normalizeJlpt(val: string): string {
88:function extractMeaningChoices(entry: any): string[] {
107:function isExactJishoMatch(entry: any, query: string) {
119:function buildJishoCandidates(entries: any[], fallbackWord: string): JishoCandidate[] {
159:function toNullableInt(value: string): number | null {
167:function toDisplayString(value: number | null | undefined) {
171:function isSmallViewport() {
176:function hasKanji(text: string) {

================================================================================
app/(protected)/teacher/students/page.tsx
    1420 app/(protected)/teacher/students/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
23:type ProfileRole = "teacher" | "super_teacher" | "member" | "student" | string | null;
24:type StudentRelationshipStatus = "future" | "current" | "past" | "archived";
25:type StudentGroupKey = StudentRelationshipStatus;
27:type StudentProfile = {
38:type TeacherStudentLink = {
49:type UserBookRow = {
73:type StudentCard = StudentProfile & {
86:type TaskBookOption = {
92:type ActiveLearningTask = {
103:type LearningTaskType =
109:type RereadTaskMode =
115:type BookFlashcardFilter = "whole_book" | "chapter" | "page_range" | "saved_date_range";
136:function getBook(bookRow: UserBookRow["books"]) {
141:function formatLessonDay(value: string | null) {
146:function formatRelativeDate(dateStr: string | null) {
165:function isStudentProfile(profile: StudentProfile) {
171:function getStudentRelationshipStatus(profile: StudentProfile): StudentRelationshipStatus {
183:function normalizeRelationshipStatus(value: string | null | undefined): StudentRelationshipStatus | null {
214:function getLinkRelationshipStatus(link: TeacherStudentLink | null | undefined) {
222:function relationshipLabel(status: StudentRelationshipStatus) {
229:function relationshipClasses(status: StudentRelationshipStatus) {
236:function learningTaskTypeLabel(taskType: string) {

================================================================================
app/(protected)/teacher/books/add/page.tsx
    1270 app/(protected)/teacher/books/add/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
40:type BookRow = {
75:type EditingPanel = "bookInfoDetails" | "bookInfoPeople" | "bookInfoLinks" | null;
77:type IsbnLookupPreview = {
92:type BookRequestRow = {
101:function cleanText(value: string) {
105:function normalizeName(value: string) {
109:function metadataSourceLabel(value: IsbnLookupPreview["metadata_source"]) {
125:function bookTypeLabel(value: string | null | undefined) {
129:function messageTone(message: string): "neutral" | "success" | "error" {
158:function isErrorMessage(message: string) {
162:function linksToText(links: any): string {
179:function parseLinks(text: string) {
191:function displayLinkLabel(link: any) {
205:function displayLinkUrl(link: any) {
212:function requestTitleNeedsManualResearch(request: BookRequestRow | null) {

================================================================================
app/(protected)/books/[userBookId]/words/page.tsx
    1228 app/(protected)/books/[userBookId]/words/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
57:type WordRow = {
80:type ProfileRole = "teacher" | "student" | "super_teacher";
82:type LearningSettingsRow = {
89:type GlobalEncounterRow = {
94:type LibraryWordSummaryRow = {
101:type LibraryWordProgressRow = {
145:function normalizeJlpt(val: string | null | undefined) {
151:function chapterDisplayParts(w: WordRow) {
169:function chapterKey(w: WordRow) {
175:function asStringArray(val: any): string[] {
187:function normalizeText(val: string | null | undefined) {
191:function normalizeKana(val: string | null | undefined) {
199:function repeatKey(w: WordRow) {
214:function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
222:function csvCell(value: unknown) {
227:function commonCsvLabel(value: boolean | null | undefined) {
232:function chapterCsvLabel(w: WordRow) {
241:function safeCsvFilenamePart(value: string) {
251:function downloadCsv(filename: string, rows: unknown[][]) {

================================================================================
app/(protected)/vocab/bulk/page.tsx
    1099 app/(protected)/vocab/bulk/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
51:function normalizeJlpt(val: string): string {
64:function parseWords(raw: string): string[] {
71:function extractMeaningChoices(entry: any): string[] {
90:function toNullableInt(value: string): number | null {
101:type BulkItem = {
119:type BulkStep = "paste" | "definitions" | "details" | "done";
121:type LastSavedWordContext = {

================================================================================
app/(protected)/community/stats/vocabulary/page.tsx
    1061 app/(protected)/community/stats/vocabulary/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
20:type SessionMode = "fluid" | "curiosity" | "listening" | string;
22:type SessionRow = {
32:type WordRow = {
41:type StudyEventRow = {
54:type RawUserBookRow = {
72:type UserBookRow = {
82:type VocabularyBookMetric = {
92:type TypeMetric = {
100:type BookCategoryFilter =
154:function ymdLocal(date: Date) {
161:function startOfToday() {
167:function addDays(date: Date, days: number) {
173:function monthStartYmd() {
178:function isThisMonth(dateString: string | null | undefined) {
183:function sessionPages(row: SessionRow) {
193:function wordKey(word: WordRow | StudyEventRow) {
197:function bookTypeLabel(value: string | null | undefined) {
221:function bookCategoryForBookType(
256:function vocabularyGrowthTheme(value: BookCategoryFilter) {
308:function formatDecimal(value: number | null, digits = 1) {
313:function formatPercent(value: number | null) {
318:function isCorrectStudyEvent(event: StudyEventRow) {
322:function isIncorrectStudyEvent(event: StudyEventRow) {
326:function isSkippedStudyEvent(event: StudyEventRow) {
330:function isKanjiStudyEvent(event: StudyEventRow) {
337:function chunkArray<T>(items: T[], size: number) {

================================================================================
app/(protected)/books/[userBookId]/readalong/page.tsx
    1043 app/(protected)/books/[userBookId]/readalong/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
34:type ReadAlongWord = {
46:type SupportMode = "full" | "reading" | "meaning";
48:type PageChunk = {
54:function chunkArray<T>(arr: T[], size: number) {
62:function easeInOutQuad(t: number) {
66:function formatTimer(totalSeconds: number) {
79:function chapterKeyForWord(word: Pick<ReadAlongWord, "chapter_number" | "chapter_name">) {
88:function chapterLabelForWord(word: Pick<ReadAlongWord, "chapter_number" | "chapter_name">) {

================================================================================
app/(protected)/community/stats/reading-ability/page.tsx
     905 app/(protected)/community/stats/reading-ability/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
21:type SessionMode = "fluid" | "curiosity" | "listening" | string;
23:type SessionRow = {
33:type WordRow = {
41:type RawUserBookRow = {
61:type UserBookRow = {
72:type BookMetric = {
93:type ReadingAbilityFilter =
139:type TypeMetric = {
149:function formatDecimal(value: number | null, digits = 1) {
154:function sessionPages(row: SessionRow) {
164:function wordKey(surface: string | null, meaning: string | null) {
168:function bookTypeLabel(value: string | null | undefined) {
191:function readingAbilityGroupForBookType(
226:function bookTypeSortIndex(value: string | null | undefined) {
244:function paceLabel(item: BookMetric) {
253:function readingAbilityTheme(value: ReadingAbilityFilter) {

================================================================================
app/(protected)/library-study/word-sky/page.tsx
     772 app/(protected)/library-study/word-sky/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
24:type ClaimedColor = "green" | "blue" | "purple";
25:type SkyBubbleColor = ClaimedColor | LibraryStudyColor;
27:type SkyWord = {
36:type ClaimRow = {
42:type WordSkyPoolRow = {
52:type LibrarySummarySkyRow = {
61:type LibraryProgressSkyRow = {
71:type VisibleSkyWord = SkyWord & {
100:function clampPercent(value: number) {
104:function normalizeText(value: string | null | undefined) {
108:function normalizeKana(value: string | null | undefined) {
116:function studyIdentityKey(surface: string, reading: string) {
120:function colorClass(color: SkyBubbleColor | null) {
131:function colorLabel(color: ClaimedColor) {
137:function shuffleArray<T>(items: T[]) {
146:function levelForWord(row: WordSkyPoolRow, index: number): SkyWord["level"] {
154:function shouldIncludePersonalLibraryWord(
178:function libraryColorForWord(
197:function shouldHideFromWordSkyByLibraryColor(color: LibraryStudyColor | undefined) {
201:function normalizeJlpt(value: string | null | undefined) {
209:function makeVisibleWords(words: SkyWord[]) {
226:function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {

================================================================================
app/(protected)/community/stats/reading-habits/page.tsx
     764 app/(protected)/community/stats/reading-habits/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
21:type SessionMode = "fluid" | "curiosity" | "listening" | string;
22:type HabitTimeRange =
28:type SessionRow = {
38:function ymdLocal(date: Date) {
45:function sessionPages(row: SessionRow) {
55:function formatDecimal(value: number | null, digits = 1) {
60:function formatMinutesAsReadableTime(totalMinutes: number) {
100:function readingHabitsTheme(value: HabitTimeRange) {
163:function readingPersonality({

================================================================================
app/(protected)/books/[userBookId]/words/[wordId]/page.tsx
     711 app/(protected)/books/[userBookId]/words/[wordId]/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
24:type WordRow = {
40:type SeenInstance = {
55:type CollocationRow = {
65:type KanjiMeta = {
71:type RelatedWord = {
77:type KanjiGroup = {
85:function asStringArray(val: any): string[] {
99:function normalizeJlpt(val: string | null | undefined) {
105:function chapterDisplay(chNum: number | null, chName: string | null) {
115:function normalizeCollocation(s: string) {
119:function getUniqueKanji(surface: string) {

================================================================================
app/(protected)/community/stats/book-difficulty/page.tsx
     708 app/(protected)/community/stats/book-difficulty/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
17:type DifficultyTimeRange =
24:type RawBook = {
36:type RawUserBookRow = {
50:type UserBookRow = {
96:function difficultyTheme(value: DifficultyTimeRange) {
170:function ymdLocal(date: Date) {
178:function startDateForRange(value: DifficultyTimeRange) {
207:function readerFitDate(row: UserBookRow) {
211:function isInTimeRange(row: UserBookRow, range: DifficultyTimeRange) {
226:function formatDecimal(value: number | null, digits = 1) {
231:function formatRating(value: number | null | undefined) {
240:function bookTypeLabel(value: string | null | undefined) {
263:function ratingLabel(value: number | null | undefined) {
270:function difficultyLabel(value: number | null | undefined) {
288:function pageCountBucket(pageCount: number | null | undefined) {
296:function average(values: number[]) {
301:function countByLabel<T>(
317:function balancedBookTypeRows(

================================================================================
app/(protected)/books/[userBookId]/stats/page.tsx
     686 app/(protected)/books/[userBookId]/stats/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
20:type Book = {
29:type UserBook = {
39:type ReadingSession = {
51:type ComparisonBook = {
59:function formatMinutes(total: number | null) {
70:function bookTypeLabel(value: string | null | undefined) {
103:function statusLabel(row: UserBook | null) {
111:function difficultyText(value: number | null) {
128:function difficultyNeighborhood(percentHarderThan: number | null) {

================================================================================
app/(protected)/community/stats/monthly/page.tsx
     600 app/(protected)/community/stats/monthly/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
15:type SessionMode = "fluid" | "curiosity" | "listening" | string;
17:type SessionRow = {
27:type WordRow = {
35:type RawUserBookRow = {
48:type UserBookRow = {
54:type BookTypeMetric = {
61:type MonthlyStats = {
80:function emptyMonthlyStats(): MonthlyStats {
98:function ymdLocal(date: Date) {
106:function monthStartYmd() {
111:function isThisMonth(dateString: string | null | undefined) {
116:function sessionPages(row: SessionRow) {
126:function wordKey(surface: string | null, meaning: string | null) {
130:function bookTypeLabel(value: string | null | undefined) {
154:function buildStreakStats(activeDays: Set<string>) {
195:function formatMinutes(minutes: number) {
206:function formatPageCount(value: number) {
210:function chunkArray<T>(items: T[], size: number) {

================================================================================
app/(protected)/library-study/kana/page.tsx
     560 app/(protected)/library-study/kana/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
21:function isSameKanaItem(a: KanaItem, b: KanaItem): boolean {
29:function getMatchingKanaPool(item: KanaItem): KanaItem[] {
41:type StudyMode =
49:type StudyCard = {
59:type KanaSetOptions = {
112:function shuffleArray<T>(items: readonly T[]): T[] {
116:function pickRandom<T>(items: readonly T[]): T {
126:function makeChoices(
140:function resolveConcreteMode(mode: StudyMode): Exclude<StudyMode, "mixed"> {
148:function buildKanaPool({
243:function pronunciationHintForRomaji(romaji: string): string {
271:function createStudyCard(mode: StudyMode, item: KanaItem): StudyCard {
351:function createStudyDeck(mode: StudyMode, kanaPool: readonly KanaItem[]): StudyCard[] {
355:function nextStudyMode(mode: StudyMode): StudyMode {

================================================================================
app/(protected)/teacher/page.tsx
     552 app/(protected)/teacher/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
12:type TeacherHubCard = {
19:type TeacherAlertSummary = {
30:type GlobalBookRow = {
45:type ReadingFitCountUserBookRow = {
54:type TeacherRatingCountUserBookRow = {
62:type CreatedAtRow = {
66:type ReadingFitCountProfileRow = {
71:type KanjiCountWordRow = {
80:type KanjiCountMapRow = {
117:function isSuperTeacherFlag(value: unknown) {
121:function isTodayDate(value: string | null | undefined) {
134:function oldestDate(values: Array<string | null | undefined>) {
142:function sortTeacherAlerts(alerts: TeacherAlertSummary[]) {
157:function missingGlobalBookFields(book: GlobalBookRow) {
172:function hasKanji(value: string) {
176:function kanjiChars(value: string) {
180:function effectiveKanjiReadingType(
187:function isActiveKanjiQueueStatus(params: {

================================================================================
app/(protected)/teacher/assign/page.tsx
     532 app/(protected)/teacher/assign/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
29:type ProfileRow = {
39:type TeacherStudentLink = {
43:type BookRow = {
54:type UserBookRow = {
64:type PrepItemRow = {
74:type ActionMode = "add_to_library" | "prep_future";
76:function labelProfile(p: ProfileRow) {
85:function getPrepBook(bookRow: PrepItemRow["books"]) {
90:function missingBookInfo(book: BookRow | undefined) {
102:function bookSearchText(book: BookRow) {
109:function prospectiveLearnerLabel(notes: string | null | undefined) {

================================================================================
app/(protected)/books/add/page.tsx
     532 app/(protected)/books/add/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
15:type LookupBook = {
44:type DestinationUser = {
52:function getDisplayAuthor(book: LookupBook) {
61:function getCoverUrl(book: LookupBook) {
65:function getPublishedDate(book: LookupBook) {
69:function getPageCount(book: LookupBook) {

================================================================================
app/(protected)/teacher/needs-attention/page.tsx
     518 app/(protected)/teacher/needs-attention/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
19:type GlobalBookRow = {
33:type ReadingFitCountUserBookRow = {
42:type ReadingFitCountProfileRow = {
47:type TeacherRatingCountUserBookRow = {
55:type KanjiCountWordRow = {
63:type KanjiCountMapRow = {
134:function isSuperTeacherFlag(value: unknown) {
138:function missingGlobalBookFields(book: GlobalBookRow) {
153:function hasKanji(value: string) {
157:function kanjiChars(value: string) {
161:function effectiveKanjiReadingType(
168:function isActiveKanjiQueueStatus(params: {

================================================================================
app/(protected)/vocab/explore/page.tsx
     513 app/(protected)/vocab/explore/page.tsx
--------------------------------------------------------------------------------
Likely helper / mapper / formatter candidates:
18:type SeenInstance = {
33:type DictionaryEntry = {
41:type HistoryPatternItem = {
49:function normalizeJlpt(val: string | null | undefined) {
55:function chapterDisplay(chNum: number | null, chName: string | null) {
65:function asStringArray(val: any): string[] {
79:function uniqueStrings(values: (string | null | undefined)[]) {
```
