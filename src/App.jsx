import { Fragment, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Asterisk, CaseLower, CaseUpper, Check, ChevronDown, Copy, Dice5, Code2, ExternalLink,
  Eye, EyeOff, Hash, Info, KeyRound, ListFilter, LoaderCircle, LockKeyhole,
  Languages, Minus, Plus, RefreshCw, ShieldCheck, WholeWord,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { generate, strength, MEMORABLE_LISTS } from './generator.js';
import { copyPassword, connectHost, openProjectLink } from './host.js';
import { buildInfo } from './build-info.js';

const sdk = globalThis.miniApp ?? null;
const modes = {
  random: { label: '随机密码', icon: Dice5, min: 8, max: 64, unit: '个字符', lengthLabel: '密码长度' },
  memorable: { label: '易记密码', icon: WholeWord, min: 4, max: 10, unit: '组', lengthLabel: '词组数量' },
  pin: { label: '数字 PIN', icon: Hash, min: 4, max: 20, unit: '位数字', lengthLabel: 'PIN 长度' },
};
const initialConfigs = {
  random: { mode: 'random', length: 20, upper: true, lower: true, digits: true, symbols: true, excludeSimilar: true },
  memorable: { mode: 'memorable', wordlist: 'english', length: 6, separator: '-', capitalize: true, digits: true, symbols: false },
  pin: { mode: 'pin', length: 6 },
};
const characterOptions = [
  { key: 'upper', label: '大写字母', sample: 'A–Z', icon: CaseUpper },
  { key: 'lower', label: '小写字母', sample: 'a–z', icon: CaseLower },
  { key: 'digits', label: '数字', sample: '0–9', icon: Hash },
  { key: 'symbols', label: '符号', sample: '!@#', icon: Asterisk },
];
const separatorOptions = [
  { value: '-', label: '连字符 -' },
  { value: ' ', label: '空格' },
  { value: '.', label: '句点 .' },
  { value: '_', label: '下划线 _' },
];

function generated(config) {
  try { return { result: generate(config), error: '' }; }
  catch { return { result: null, error: '无法使用安全随机数，请使用支持 Web Crypto 的浏览器重试。' }; }
}

function Option({ id, checked, onChange, label, sample, icon: Icon }) {
  return (
    <Label htmlFor={id} data-checked={checked} className="option-tile flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted/50">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-[13px]">{label}</span>
      <span className="ml-auto text-[11px] text-muted-foreground">{sample}</span>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} aria-label={label} className="ml-1" />
    </Label>
  );
}

function RadioOption({ id, value, children }) {
  return (
    <Label htmlFor={id} className="radio-option min-h-11 cursor-pointer gap-2 rounded-lg border px-3 py-2 text-xs font-normal whitespace-nowrap hover:bg-muted/50">
      <RadioGroupItem id={id} value={value} />
      {children}
    </Label>
  );
}

function Password({ result, hidden, separator }) {
  if (!result) return <span className="text-sm text-muted-foreground">未生成密码</span>;
  if (hidden) return <span aria-label="密码已隐藏">{'•'.repeat(Math.min(result.value.length, 20))}</span>;
  return [...result.value].map((char, index) => <Fragment key={index}><span className={/[0-9]/.test(char) ? 'digit' : /[^a-zA-Z]/.test(char) ? 'symbol' : undefined}>{char}</span>{separator && char === separator && <wbr />}</Fragment>);
}

export function App() {
  const [state, setState] = useState(() => ({ mode: 'random', configs: initialConfigs, revision: 0, ...generated(initialConfigs.random) }));
  const stateRef = useRef(state);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState(null);
  const [lengthDraft, setLengthDraft] = useState('20');
  const [copyPending, setCopyPending] = useState(false);
  const pendingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef();
  const { mode, configs, result, error, revision } = state;
  const config = configs[mode];
  const metadata = modes[mode];
  const rating = result ? strength(result.entropy) : null;
  const wordlist = MEMORABLE_LISTS[configs.memorable.wordlist];

  function notify(message, tone = 'info') {
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, message, tone }));
  }

  async function openSource(event, url) {
    if (!sdk) return;
    event.preventDefault();
    try { await openProjectLink(url, sdk); }
    catch (error) {
      if (error?.code !== 'USER_CANCELLED') notify('打开失败，可复制链接后在浏览器中查看。', 'error');
    }
  }

  function replaceState(next) {
    stateRef.current = next;
    setState(next);
  }
  function update(nextMode = stateRef.current.mode, patch = {}) {
    const previous = stateRef.current;
    const nextConfig = { ...previous.configs[nextMode], ...patch };
    if (nextMode === 'random' && !characterOptions.some(({ key }) => nextConfig[key])) {
      notify('请至少保留一种字符。', 'error');
      return;
    }
    clearTimeout(copyTimer.current);
    setCopied(false);
    setLengthDraft(String(nextConfig.length));
    replaceState({ mode: nextMode, configs: { ...previous.configs, [nextMode]: nextConfig }, revision: previous.revision + 1, ...generated(nextConfig) });
  }
  function setLength(value) {
    if (Number.isInteger(value) && value >= metadata.min && value <= metadata.max) update(mode, { length: value });
  }
  function commitLength() {
    const value = Number(lengthDraft);
    if (!Number.isInteger(value) || value < metadata.min || value > metadata.max) {
      setLengthDraft(String(config.length));
      notify(`请输入 ${metadata.min}–${metadata.max} 范围内的整数。`, 'error');
    } else if (value !== config.length) setLength(value);
  }
  async function copy() {
    const snapshot = stateRef.current.result;
    if (!snapshot || pendingRef.current) return;
    pendingRef.current = true;
    setCopyPending(true);
    try {
      await copyPassword(snapshot.value, sdk);
      if (snapshot === stateRef.current.result) {
        setCopied(true);
        notify('已复制到剪贴板。', 'success');
        copyTimer.current = setTimeout(() => setCopied(false), 2200);
      } else notify('已复制操作开始时的密码；如需新密码，请再次复制。');
    } catch (error) {
      notify(error?.code === 'USER_CANCELLED'
        ? '复制已取消，可重新复制或选中密码手动复制。'
        : '复制失败，请允许剪贴板访问后重试，或显示并选中密码手动复制。', error?.code === 'USER_CANCELLED' ? 'info' : 'error');
    } finally {
      pendingRef.current = false;
      setCopyPending(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};
    let hostTheme = false;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(theme) {
      hostTheme = true;
      const root = document.documentElement;
      root.classList.toggle('dark', theme.mode === 'dark');
      root.dataset.reducedMotion = String(theme.reducedMotion);
      const colors = ['background', 'text', 'accent', 'border'];
      const hasPalette = colors.every((key) => typeof theme[key] === 'string'
        && CSS.supports('color', theme[key])
        && !/\b(?:var|env|attr)\s*\(|\b(?:currentcolor|inherit|initial|unset|revert(?:-layer)?)\b/i.test(theme[key]));
      for (const key of colors) {
        if (hasPalette) root.style.setProperty(`--community-${key}`, theme[key]);
        else root.style.removeProperty(`--community-${key}`);
      }
      root.toggleAttribute('data-community-theme', hasPalette);
    }
    function onSystemTheme(event) {
      if (!hostTheme) document.documentElement.classList.toggle('dark', event.matches);
    }
    async function initializeHost() {
      const cleanup = await connectHost(sdk, applyTheme, (message) => { if (!disposed) notify(message, 'error'); });
      if (disposed) cleanup();
      else unsubscribe = cleanup;
    }
    function pagehide() {
      clearTimeout(copyTimer.current);
      setNotice(null);
      const next = { ...stateRef.current, result: null };
      stateRef.current = next;
      flushSync(() => setState(next));
    }
    function pageshow(event) { if (event.persisted) update(); }
    systemTheme.addEventListener('change', onSystemTheme);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    void initializeHost();
    return () => {
      disposed = true;
      clearTimeout(copyTimer.current);
      unsubscribe();
      systemTheme.removeEventListener('change', onSystemTheme);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-[688px] px-4 py-8 sm:px-6 sm:py-14">
      <header className="page-header mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold tracking-tight">密码工坊</h1>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-3.5" />本地生成</span>
      </header>

      <section aria-label="密码工坊" className="workbench rounded-xl border bg-card p-4 shadow-xs sm:p-6">
        <Tabs value={mode} onValueChange={(value) => update(value)}>
          <TabsList className="mode-tabs mb-6 grid h-10 w-full grid-cols-3" aria-label="密码类型" data-mode={mode}>
            <span className="mode-indicator" aria-hidden="true" />
            {Object.entries(modes).map(([key, { label, icon: Icon }]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5 text-xs data-[state=active]:text-primary dark:data-[state=active]:text-primary sm:text-[13px]"><Icon className="size-4" aria-hidden="true" />{label}</TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(modes).map((key) => <TabsContent key={key} value={key} className="mode-panel">{key === mode && <>

        <div className="mb-2 flex items-center justify-between">
          <Label id="result-label" className="gap-2 text-xs font-normal text-muted-foreground"><KeyRound aria-hidden="true" className="size-3.5" />生成结果</Label>
          <Button id="visibility" variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={hidden ? '显示密码' : '隐藏密码'} title={hidden ? '显示密码' : '隐藏密码'} aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
            {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        <div className="result-frame flex min-h-28 items-center rounded-lg border px-4 py-5 sm:px-5">
          {!hidden && result && <span key={revision} className="result-glint" aria-hidden="true" />}
          <output key={`${revision}-${hidden}`} id="password" aria-labelledby="result-label" tabIndex={0} translate="no" className={`password-display block w-full ${mode} ${!hidden && result ? 'password-refresh' : ''}`}>
            <Password result={result} hidden={hidden} separator={mode === 'memorable' ? config.separator : undefined} />
          </output>
        </div>
        {!hidden && result?.mnemonic && <p aria-label="记忆提示" className="mt-2 break-words text-xs leading-6 text-muted-foreground">{result.mnemonic}</p>}
        {result?.value.length > 64 && <p className="mt-2 text-xs leading-6 text-muted-foreground">密码较长，请确认目标网站的长度上限。</p>}
        <div className="mb-5 mt-3 flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className={`flex items-center gap-2 text-xs ${rating?.level < 3 ? 'text-destructive' : 'text-primary'}`}>
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span id="strength-label">{rating?.label ?? '未生成'}</span>
            <span key={revision} className="strength-bars" data-weak={rating?.level < 3} aria-hidden="true">{[0, 1, 2, 3].map((index) => <i key={index} className={index < rating?.level ? 'active' : ''} />)}</span>
          </span>
          <span id="result-meta" className="font-mono text-[11px] text-muted-foreground">{result ? `${result.value.length} 位 · ≈ ${Math.floor(result.entropy)} bits` : ''}</span>
        </div>
        <div className="flex gap-2.5">
          <Button id="copy" variant="outline" data-copied={copied} className="copy-action h-10 flex-1 gap-2 font-normal" onClick={copy} disabled={!result || copyPending}>
            <span key={copyPending ? 'pending' : copied ? 'copied' : 'idle'} className="copy-feedback">
              {copyPending ? <LoaderCircle aria-hidden="true" className="size-4 text-primary motion-safe:animate-spin" /> : copied ? <Check aria-hidden="true" className="copy-check size-4 text-primary" /> : <Copy aria-hidden="true" className="size-4 text-primary" />}
            </span>
            {copied ? '已复制' : '复制密码'}
          </Button>
          <Button id="regenerate" variant="outline" className="h-10 flex-1 gap-2 font-normal" onClick={() => update()}><RefreshCw key={revision} className="refresh-feedback text-primary" aria-hidden="true" />换一组</Button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-destructive">{error}</p>}

        <div className="my-6 h-px bg-border" role="separator" />
        <div className="mb-5 flex items-center gap-2 text-[13px] font-medium"><ListFilter aria-hidden="true" className="size-4 text-muted-foreground" /><h2>生成设置</h2></div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Label htmlFor="length-number" className="text-[13px] font-normal">{metadata.lengthLabel}</Label>
          <div className="flex items-center gap-1">
            <Button id="decrease" variant="ghost" size="icon" className="size-8" aria-label="减少长度" disabled={config.length <= metadata.min} onClick={() => setLength(config.length - 1)}><Minus aria-hidden="true" className="size-3.5" /></Button>
            <Input id="length-number" type="number" min={metadata.min} max={metadata.max} step={1} aria-label={`${metadata.lengthLabel}数值`} value={lengthDraft} className="length-input h-8 w-14 px-1 text-center font-mono text-xs" onChange={(event) => {
              const draft = event.target.value;
              setLengthDraft(draft);
              const value = Number(draft);
              if (Number.isInteger(value) && value >= metadata.min && value <= metadata.max) setLength(value);
            }} onBlur={commitLength} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
            <Button id="increase" variant="ghost" size="icon" className="size-8" aria-label="增加长度" disabled={config.length >= metadata.max} onClick={() => setLength(config.length + 1)}><Plus aria-hidden="true" className="size-3.5" /></Button>
          </div>
        </div>
        <Slider id="length" aria-label={metadata.lengthLabel} min={metadata.min} max={metadata.max} step={1} value={[config.length]} onValueChange={([value]) => setLength(value)} className="min-h-6" />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{metadata.min} {metadata.unit}</span><span>{metadata.max} {metadata.unit}</span></div>

        {mode === 'random' && <div id="random-settings" className="mt-5">
          <div className="options-grid grid grid-cols-2 gap-2.5">
            {characterOptions.map(({ key, ...option }) => <Option key={key} {...option} id={key} checked={config[key]} onChange={(checked) => update(mode, { [key]: checked })} />)}
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">每种所选字符至少包含一个</p>
          <div className="mt-5 flex items-center justify-between gap-4">
            <Label htmlFor="exclude-similar" className="gap-2 text-xs font-normal"><CaseUpper aria-hidden="true" className="size-4 text-muted-foreground" />排除易混淆字符<span className="font-mono text-[11px] text-muted-foreground">O 0 I l 1</span></Label>
            <Switch id="exclude-similar" checked={config.excludeSimilar} onCheckedChange={(checked) => update(mode, { excludeSimilar: checked })} />
          </div>
        </div>}

        {mode === 'memorable' && <div id="memorable-settings" className="mt-5 space-y-4">
          <div className="space-y-2.5"><div id="wordlist-label" className="flex items-center gap-2 text-xs"><Languages aria-hidden="true" className="size-4 text-muted-foreground" />词库</div>
            <RadioGroup aria-labelledby="wordlist-label" value={config.wordlist} className="grid-cols-2 min-[400px]:grid-cols-3" onValueChange={(key) => {
              update(mode, { wordlist: key, length: MEMORABLE_LISTS[key].defaultLength });
            }}>
              {Object.entries(MEMORABLE_LISTS).map(([key, list]) => <RadioOption key={key} id={`wordlist-${key}`} value={key}>{list.label}</RadioOption>)}
            </RadioGroup>
          </div>
          <div className="space-y-2.5"><div id="separator-label" className="flex items-center gap-2 text-xs"><WholeWord aria-hidden="true" className="size-4 text-muted-foreground" />词组分隔符</div>
            <RadioGroup aria-labelledby="separator-label" value={config.separator} className="grid-cols-2 sm:grid-cols-4" onValueChange={(separator) => update(mode, { separator })}>
              {separatorOptions.map(({ value, label }, index) => <RadioOption key={value} id={`separator-${index}`} value={value}>{label}</RadioOption>)}
            </RadioGroup>
          </div>
          <div className="options-grid grid grid-cols-1 min-[400px]:grid-cols-2 gap-2.5">
            <Option id="word-capitalize" checked={config.capitalize} onChange={(checked) => update(mode, { capitalize: checked })} label="首字母大写" icon={CaseUpper} />
            <Option id="word-digits" checked={config.digits} onChange={(checked) => update(mode, { digits: checked })} label="末尾加数字" icon={Hash} />
            <Option id="word-symbols" checked={config.symbols} onChange={(checked) => update(mode, { symbols: checked })} label="末尾加符号" icon={Asterisk} />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">从 {wordlist.entries.length.toLocaleString('zh-CN')} 个{wordlist.label}中独立随机选取。建议至少 {Math.ceil(80 / Math.log2(wordlist.entries.length))} 组；强度按词库规模与随机选取数量估算。</p>
          {config.wordlist !== 'english' && <p className="text-[11px] leading-relaxed text-muted-foreground">拼音用 v 表示 ü。汉字用于辅助记忆，复制内容为拼音密码。</p>}
        </div>}

        {mode === 'pin' && <p id="pin-settings" className="mt-5 flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Info className="mt-1 size-4 shrink-0" aria-hidden="true" /><span>PIN 适合有尝试次数限制的设备解锁等场景。账号密码建议选择随机密码或易记密码。</span></p>}
          </>}</TabsContent>)}
        </Tabs>
      </section>

      <div className="privacy-note mt-5 flex items-start gap-2 px-1 text-[11px] leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><p>密码仅在本地生成，刷新即清除。复制后请妥善管理剪贴板。</p></div>
      <details className="safety-details group mt-5 border-t text-xs text-muted-foreground">
        <summary className="flex min-h-12 list-none items-center gap-2 py-3"><Info aria-hidden="true" className="size-3.5" />密码安全建议<ChevronDown aria-hidden="true" className="details-chevron ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
        <div className="safety-content space-y-2 pb-3 text-[11px] leading-6">
          <p>日常账号建议使用至少 16 位随机密码，或至少 6 个单词的易记密码。每个账号使用独立密码，并开启双重验证。</p>
          <p id="strength-hint">{rating?.hint}</p>
          <p>安全性按随机组合的熵值估算；尝试次数限制、密码泄露和重复使用也会影响实际风险。</p>
          <p>英文词库来自 EFF（CC BY 3.0）；拼音词库来自 Complete HSK Vocabulary（MIT）及 CC-CEDICT（CC BY-SA 4.0），已筛选并按拼音去重。</p>
        </div>
      </details>
      <footer className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t pt-4 text-[11px] text-muted-foreground">
        <a href={buildInfo.repository} target="_blank" rel="noopener noreferrer" onClick={(event) => openSource(event, buildInfo.repository)} className="inline-flex min-h-8 items-center gap-1.5 rounded-sm hover:text-primary">
          <Code2 className="size-3.5" aria-hidden="true" />开源代码<ExternalLink className="size-3" aria-hidden="true" />
        </a>
        <details className="max-w-full text-right">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-end gap-1.5 rounded-sm">v{buildInfo.version} · 版本信息<ChevronDown className="size-3" aria-hidden="true" /></summary>
          <div className="mt-2 max-w-[360px] space-y-2 text-left leading-5">
            {buildInfo.dirty && <p>本地构建</p>}
            <dl className="space-y-2">
              <div><dt>源码提交</dt><dd className="break-all font-mono select-all" translate="no">{buildInfo.commit ?? '未提交'}</dd></div>
              <div><dt>源码指纹 SHA-256</dt><dd className="break-all font-mono select-all" translate="no">{buildInfo.sourceSha256}</dd></div>
            </dl>
            <a href={buildInfo.releaseUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => openSource(event, buildInfo.releaseUrl)} className="inline-flex min-h-8 items-center gap-1 text-primary">查看 Release 与校验文件<ExternalLink className="size-3" aria-hidden="true" /></a>
          </div>
        </details>
      </footer>
      <Toaster notice={notice} />
    </main>
  );
}
