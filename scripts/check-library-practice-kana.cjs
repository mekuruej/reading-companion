// Exercise the actual review panel with local fixtures; no database connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/(protected)/library-study/practice/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)).map((node) => node.getText(ast)).join('\n');
const compile = (text) => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function loadLocal(file) {
  const module = { exports: {} };
  vm.runInNewContext(compile(fs.readFileSync(path.join(root, file), 'utf8')), {
    module, exports: module.exports,
    require(id) {
      if (id.startsWith('@/')) {
        const stem = id.slice(2);
        return loadLocal(stem + (fs.existsSync(path.join(root, stem + '.tsx')) ? '.tsx' : '.ts'));
      }
      return require(id);
    },
  });
  return module.exports;
}
const presentation = loadLocal('lib/studyCardPresentation.ts');
const badges = loadLocal('components/study/StudyCardBadges.tsx');
function setup(surface, reading, mode) {
  const states = []; let cursor = 0;
  const answers = [], misses = [];
  const context = {
    require, exports: {}, ...presentation,
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useMemo: (fn) => fn(), useRef: () => ({ current: null }), useEffect() {},
    LibraryPracticeCardBadges: badges.default,
    window: { setTimeout() {} },
  };
  vm.createContext(context);
  vm.runInContext(compile(functions), context);
  const card = { id: surface, surface, reading, meaning: 'surely; certainly; without doubt', studyIdentityKey: surface, jlpt: 'N1', colorStatus: { color: 'orange' }, definitionNumber: 1, encounterCount: 2 };
  const props = {
    card, cards: [card, { ...card, id: 'other', surface: '猫', reading: 'ねこ', meaning: 'cat' }], total: 2,
    practiceMode: mode, revealStep: 'surface', meaningReviewCount: 0,
    onMeaningAnswered: (...args) => answers.push(args), onTypingMissed: (...args) => misses.push(args),
  };
  const render = () => { cursor = 0; return context.LibraryPracticePanel(props); };
  const nodes = (node, match) => {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, match));
    if (typeof node !== 'object') return [];
    return [...(match(node) ? [node] : []), ...nodes(node.props?.children, match)];
  };
  const button = (text) => nodes(render(), (node) => node.type === 'button' && node.props.children === text)[0];
  return { card, answers, misses, props, render, nodes, button, html: () => renderToStaticMarkup(render()) };
}
for (const [surface, reading] of [['てっきり', 'てっきり'], ['テレビ', 'てれび']]) {
  const typed = setup(surface, reading, 'READING');
  let html = typed.html();
  assert(html.includes('Meaning Typing'));
  assert(!html.includes('Reading Typing'));
  assert(html.includes('Type the meaning'));
  assert(!html.includes(typed.card.meaning), 'Meaning must be hidden before an answer');
  const input = typed.nodes(typed.render(), (node) => node.type === 'input')[0];
  input.props.onChange({ target: { value: 'certainly' } });
  typed.button('Check answer').props.onClick();
  assert.equal(typed.answers.length, 1);
  assert.equal(typed.answers[0][2], typed.card.meaning);
  assert.equal(typed.answers[0][3], true);
  assert.equal(typed.misses.length, 0);
  assert(typed.html().includes('Looks right'));

  const mc = setup(surface, reading, 'READING_MC');
  html = mc.html();
  assert(html.includes('Meaning MC'));
  assert(html.includes('Choose Meaning'));
  assert(mc.button(mc.card.meaning), 'Correct option must be the meaning');
  assert(mc.button('cat'), 'Distractors must also be meanings');
  assert(!mc.button(reading), 'Reading must not be an answer option');
  mc.button(mc.card.meaning).props.onClick();
  assert.equal(mc.answers[0][3], true);
  assert(mc.html().includes('Looks right.'));
}
const kanji = setup('確実', 'かくじつ', 'READING');
assert(kanji.html().includes('Reading Typing'));
assert(kanji.html().includes('Type kana or Hepburn romaji'));
assert(kanji.html().includes(kanji.card.meaning), 'Reading cards should retain their meaning hint');
const kanjiMc = setup('確実', 'かくじつ', 'READING_MC');
assert(kanjiMc.html().includes('Choose Reading'));
assert(kanjiMc.button('かくじつ'));
assert(kanjiMc.button('ねこ'));
// The fallback is per card, not a change to the selected session mode.
kanji.props.card = { ...kanji.card, id: 'kana', surface: 'てっきり', reading: 'てっきり' };
assert(kanji.html().includes('Meaning Typing'));
kanji.props.card = kanji.card;
assert(kanji.html().includes('Reading Typing'));
console.log('PASS: hiragana/katakana typing and MC labels, hidden meaning, answer options and grading, kanji reading hints, and per-card mode switching.');

// Both experiences render the same card badges and question styling.
const Shell = loadLocal('app/(protected)/library-study/check/components/AbilityCheckCardShell.tsx').default;
const Prompt = loadLocal('app/(protected)/library-study/check/components/AbilityCheckTypingPrompt.tsx').default;
const checkSource = fs.readFileSync(path.join(root, 'app/(protected)/library-study/check/page.tsx'), 'utf8');
const checkAst = ts.createSourceFile('check.tsx', checkSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const checkFns = checkAst.statements.filter((node) => ts.isFunctionDeclaration(node) && ['definitionGateChipClass', 'isNonPrimaryDefinition', 'gatePromptText'].includes(node.name?.text)).map((node) => node.getText(checkAst)).join('\n');
const checkContext = { ...presentation };
vm.createContext(checkContext); vm.runInContext(compile(checkFns), checkContext);
for (const color of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey']) {
  for (const number of [1, 2]) {
    const review = setup('確実', 'かくじつ', 'READING');
    review.card.colorStatus.color = color; review.card.definitionNumber = number;
    const tree = review.render();
    const props = review.nodes(tree, (node) => node.type === badges.default)[0].props;
    const abilityClass = checkContext.definitionGateChipClass({ ...review.card, activeGate: 'meaning' });
    assert.equal(props.definitionChipClassName, abilityClass, 'Definition styling must follow word color on both screens');
    assert.equal(abilityClass.includes('animate-pulse'), number > 1);
    const shell = Shell({ hasCard: true, gateLabel: props.modeLabel, modeTarget: props.modeTarget, jlpt: props.jlpt,
      colorDotClassName: props.colorDotClassName, colorName: props.colorName, showKatakanaBadge: props.showKatakanaBadge,
      definitionText: props.definitionText, definitionChipClassName: abilityClass, readChipClassName: props.readChipClassName, encounterCount: props.encounterCount });
    assert.equal(renderToStaticMarkup(shell.props.children[0]), renderToStaticMarkup(React.createElement(badges.default, props)));
  }
}
for (const target of ['reading', 'meaning']) {
  const review = setup('確実', 'かくじつ', target === 'reading' ? 'READING' : 'MEANING');
  const promptClassName = presentation.studyCardPromptClass(target);
  const html = renderToStaticMarkup(React.createElement(Prompt, {
    mode: target + '_typing', surface: review.card.surface, reading: review.card.reading, meaning: review.card.meaning,
    promptClassName, typingInput: '', checked: null, inputRef: { current: null },
  }));
  assert(review.nodes(review.render(), (node) => node.props.className === promptClassName).length);
  assert(promptClassName.includes('motion-safe:animate-pulse'));
  assert(html.includes('Check answer'));
  assert.equal(html.includes(review.card.meaning), target === 'reading', 'Meaning must only be shown as a reading hint');
  assert.equal(html.includes(review.card.reading), target === 'meaning', 'Reading answer must stay hidden');
  assert.equal(checkContext.gatePromptText({ activeGate: target }), target === 'reading' ? 'Reading Typing' : 'Meaning Typing');
}
console.log('PASS: shared badge markup, all seven progress colors, secondary-definition pulse, matching question labels and styles, and hidden answers in Ability Check.');
